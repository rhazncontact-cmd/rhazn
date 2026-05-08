/**
 * components/BroadcastOverlay.tsx
 * ──────────────────────────────────────────────────────────────
 * 3 types de broadcast RHAZN :
 *
 *   PONCTUEL    — événement unique, date précise (Keynote)
 *   HEBDOMADAIRE — chaque semaine le même jour à la même heure
 *   QUOTIDIEN   — chaque jour à 8h00 avec vidéo selon le jour
 *
 * Phases pour chaque type :
 *   idle  → rien d'affiché
 *   alert → bandeau countdown doré (non-bloquant)
 *   live  → overlay plein écran bloquant
 * ──────────────────────────────────────────────────────────────
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    BackHandler,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const { width: W, height: H } = Dimensions.get("window");

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#0E0E0E",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.18)",
  goldBorder: "rgba(212,175,55,0.40)",
  text:       "#FFFFFF",
  sub:        "rgba(255,255,255,0.60)",
  muted:      "rgba(255,255,255,0.35)",
  red:        "#FF453A",
  green:      "#30D158",
  blue:       "#0A84FF",
};

type BroadcastType = "ponctuel" | "hebdomadaire" | "quotidien";
type MediaType     = "text" | "image" | "video";
type Phase         = "idle" | "alert" | "live";

interface Broadcast {
  id:               string;
  broadcast_type:   BroadcastType;
  title:            string;
  message:          string;
  media_type:       MediaType;
  media_url:        string | null;
  signed_by:        string;
  signed_role:      "CVSO" | "CTO" | "SUPREME";
  // PONCTUEL
  alert_at:         string | null;
  scheduled_at:     string | null;
  // HEBDOMADAIRE
  recur_day:        number | null;  // 0=dim … 6=sam
  recur_time:       string | null;  // "20:00:00" heure Haïti
  recur_alert_min:  number | null;
  // QUOTIDIEN
  daily_time:       string | null;  // "08:00:00" heure Haïti
  daily_alert_min:  number | null;
  // État
  is_active:    boolean;
  is_dismissed: boolean;
}

interface DailyVideo {
  day_of_week: number;
  video_url:   string;
  title:       string | null;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// ── Haïti UTC-5 : convertir "now" en date locale Haïti ─────────
function haitiDate(): Date {
  return new Date(Date.now() - 5 * 3600 * 1000);
}

// ── Countdown vers une cible (ms UTC) ──────────────────────────
function getCountdown(targetMs: number) {
  const total = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  return { total, h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

// ── Prochaine occurrence hebdo ──────────────────────────────────
// dayOfWeek = 0-6, timeHHMM = "20:00" heure Haïti
function nextWeeklyUtcMs(dayOfWeek: number, timeHHMM: string, alertMin: number) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const haiti  = haitiDate();            // UTC time - 5h, exprimé comme UTC pour .getUTCDay()
  const todayDay = haiti.getUTCDay();

  // Construire l'occurrence d'aujourd'hui en ms "Haïti"
  const todayBase = new Date(haiti);
  todayBase.setUTCHours(h, m, 0, 0);

  let daysUntil = (dayOfWeek - todayDay + 7) % 7;
  // Si c'est aujourd'hui mais que l'heure est déjà passée → next week
  if (daysUntil === 0 && Date.now() - 5 * 3600 * 1000 >= todayBase.getTime()) {
    daysUntil = 7;
  }

  const scheduledHaitiMs = todayBase.getTime() + daysUntil * 86400 * 1000;
  const scheduledUtcMs   = scheduledHaitiMs + 5 * 3600 * 1000;
  const alertUtcMs       = scheduledUtcMs - alertMin * 60 * 1000;
  return { scheduledUtcMs, alertUtcMs };
}

// ── Prochaine occurrence quotidienne ───────────────────────────
function nextDailyUtcMs(timeHHMM: string, alertMin: number) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const haiti  = haitiDate();

  const todayBase = new Date(haiti);
  todayBase.setUTCHours(h, m, 0, 0);

  let offset = 0;
  // Si l'heure est déjà passée aujourd'hui → demain
  if (Date.now() - 5 * 3600 * 1000 >= todayBase.getTime()) {
    offset = 86400 * 1000;
  }
  const scheduledHaitiMs = todayBase.getTime() + offset;
  const scheduledUtcMs   = scheduledHaitiMs + 5 * 3600 * 1000;
  const alertUtcMs       = scheduledUtcMs - alertMin * 60 * 1000;
  return { scheduledUtcMs, alertUtcMs };
}

// ─────────────────────────────────────────────────────────────
// Player vidéo autoplay pour l'overlay live
// ─────────────────────────────────────────────────────────────
function BroadcastVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = true; p.play(); });
  useEffect(() => () => { try { player.pause?.(); } catch {} }, []);
  return <VideoView player={player} style={ov.video} contentFit="contain" nativeControls={false} />;
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function BroadcastOverlay() {
  const [broadcast,   setBroadcast]   = useState<Broadcast | null>(null);
  const [dailyVideos, setDailyVideos] = useState<DailyVideo[]>([]);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [countdown,   setCountdown]   = useState({ h: 0, m: 0, s: 0, total: 0 });
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Animations
  const bannerY   = useRef(new Animated.Value(120)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Fetch broadcast actif ──
  const fetchBroadcast = async () => {
    const { data } = await supabase
      .from("app_broadcasts")
      .select("*")
      .eq("is_active", true)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setBroadcast(data ?? null);

    // Si quotidien → charger les vidéos
    if (data?.broadcast_type === "quotidien") {
      const { data: vids } = await supabase
        .from("app_daily_videos")
        .select("day_of_week, video_url, title")
        .eq("broadcast_id", data.id);
      setDailyVideos(vids ?? []);
    }
  };

  // ── Realtime ──
  useEffect(() => {
    fetchBroadcast();
    const ch = supabase
      .channel("rhazn_broadcast_v2")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "app_broadcasts" }, fetchBroadcast)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Timer — calcul des phases chaque seconde ──
  useEffect(() => {
    const tick = () => {
      if (!broadcast || !broadcast.is_active || broadcast.is_dismissed) {
        setPhase("idle"); return;
      }

      const now = Date.now();
      let scheduledUtcMs: number;
      let alertUtcMs:     number;

      // ── Calculer les timestamps selon le type ──
      if (broadcast.broadcast_type === "ponctuel") {
        if (!broadcast.scheduled_at || !broadcast.alert_at) { setPhase("idle"); return; }
        scheduledUtcMs = new Date(broadcast.scheduled_at).getTime();
        alertUtcMs     = new Date(broadcast.alert_at).getTime();

      } else if (broadcast.broadcast_type === "hebdomadaire") {
        if (broadcast.recur_day == null || !broadcast.recur_time) { setPhase("idle"); return; }
        const res = nextWeeklyUtcMs(
          broadcast.recur_day,
          broadcast.recur_time.substring(0, 5),
          broadcast.recur_alert_min ?? 60,
        );
        scheduledUtcMs = res.scheduledUtcMs;
        alertUtcMs     = res.alertUtcMs;

      } else { // quotidien
        if (!broadcast.daily_time) { setPhase("idle"); return; }
        const res = nextDailyUtcMs(
          broadcast.daily_time.substring(0, 5),
          broadcast.daily_alert_min ?? 30,
        );
        scheduledUtcMs = res.scheduledUtcMs;
        alertUtcMs     = res.alertUtcMs;

        // Choisir la vidéo du jour (jour Haïti)
        const todayDow = haitiDate().getUTCDay();
        const todayVid = dailyVideos.find((v) => v.day_of_week === todayDow);
        setActiveVideoUrl(todayVid?.video_url ?? broadcast.media_url ?? null);
      }

      if (now >= scheduledUtcMs) {
        setPhase("live");
      } else if (now >= alertUtcMs) {
        setPhase("alert");
        setCountdown(getCountdown(scheduledUtcMs));
      } else {
        setPhase("idle");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [broadcast, dailyVideos]);

  // ── Animations bandeau ──
  useEffect(() => {
    if (phase === "alert") {
      Animated.spring(bannerY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])).start();
    } else {
      Animated.timing(bannerY, { toValue: 120, duration: 300, useNativeDriver: true }).start();
      pulseAnim.stopAnimation();
    }
  }, [phase]);

  // ── Animation overlay ──
  useEffect(() => {
    if (phase === "live") {
      Animated.parallel([
        Animated.timing(overlayOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      overlayOp.setValue(0);
      logoScale.setValue(0.7);
    }
  }, [phase]);

  // ── Bloquer retour Android ──
  useEffect(() => {
    if (Platform.OS !== "android" || phase !== "live") return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => h.remove();
  }, [phase]);

  if (!broadcast) return null;

  const roleColors: Record<string, string> = {
    CVSO: C.blue, CTO: C.green, SUPREME: C.gold,
  };

  // Badge de type
  const typeLabel: Record<BroadcastType, string> = {
    ponctuel:      "KEYNOTE",
    hebdomadaire:  "HEBDO",
    quotidien:     "QUOTIDIEN",
  };
  const typeColor: Record<BroadcastType, string> = {
    ponctuel:     C.gold,
    hebdomadaire: C.blue,
    quotidien:    C.green,
  };

  // Vidéo à afficher (quotidien → vidéo du jour, sinon media_url)
  const displayVideoUrl = broadcast.broadcast_type === "quotidien"
    ? (activeVideoUrl ?? broadcast.media_url)
    : broadcast.media_url;

  const displayMediaType: MediaType = broadcast.broadcast_type === "quotidien" && displayVideoUrl
    ? "video"
    : broadcast.media_type;

  return (
    <>
      {/* ═══════════════════════════════════
          PHASE 1 — BANDEAU COUNTDOWN
      ═══════════════════════════════════ */}
      {phase === "alert" && (
        <Animated.View
          style={[bn.wrap, { transform: [{ translateY: bannerY }] }]}
          pointerEvents="none"
        >
          <Animated.View style={[bn.pill, { transform: [{ scale: pulseAnim }] }]}>

            {/* Icône type */}
            <View style={[bn.iconWrap, { borderColor: typeColor[broadcast.broadcast_type] }]}>
              <Ionicons
                name={
                  broadcast.broadcast_type === "quotidien" ? "flag" :
                  broadcast.broadcast_type === "hebdomadaire" ? "calendar" : "radio"
                }
                size={15}
                color={typeColor[broadcast.broadcast_type]}
              />
            </View>

            {/* Texte */}
            <View style={bn.textCol}>
              <View style={bn.titleRow}>
                <View style={[bn.typePill, { backgroundColor: `${typeColor[broadcast.broadcast_type]}22`, borderColor: `${typeColor[broadcast.broadcast_type]}55` }]}>
                  <Text style={[bn.typePillTxt, { color: typeColor[broadcast.broadcast_type] }]}>
                    {typeLabel[broadcast.broadcast_type]}
                  </Text>
                </View>
              </View>
              <Text style={bn.eventTitle} numberOfLines={1}>{broadcast.title}</Text>
              <Text style={bn.sub}>
                Dans{" "}
                <Text style={bn.time}>{pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}</Text>
              </Text>
            </View>

            {/* Signataire */}
            <View style={[bn.sigBadge, { borderColor: roleColors[broadcast.signed_role] ?? C.gold }]}>
              <Text style={[bn.sigRole, { color: roleColors[broadcast.signed_role] ?? C.gold }]}>
                {broadcast.signed_role}
              </Text>
              <Text style={bn.sigName} numberOfLines={1}>{broadcast.signed_by}</Text>
            </View>

          </Animated.View>
        </Animated.View>
      )}

      {/* ═══════════════════════════════════
          PHASE 2 — OVERLAY PLEIN ÉCRAN
      ═══════════════════════════════════ */}
      <Modal
        visible={phase === "live"}
        transparent={false}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <Animated.View style={[ov.screen, { opacity: overlayOp }]}>

          {/* Bande colorée top selon type */}
          <View style={[ov.topBar, { backgroundColor: typeColor[broadcast.broadcast_type] }]} />

          {/* Header */}
          <View style={ov.header}>
            <Animated.View style={[ov.logoWrap, { transform: [{ scale: logoScale }] }]}>
              <Text style={ov.logoText}>RHAZN</Text>
              <View style={[ov.liveDot, { backgroundColor: typeColor[broadcast.broadcast_type] }]} />
            </Animated.View>
            <View style={ov.headerRight}>
              {/* Badge type */}
              <View style={[ov.typeBadge, { borderColor: typeColor[broadcast.broadcast_type] }]}>
                <Text style={[ov.typeBadgeTxt, { color: typeColor[broadcast.broadcast_type] }]}>
                  {typeLabel[broadcast.broadcast_type]}
                </Text>
              </View>
              {/* Badge signataire */}
              <View style={[ov.sigBadge, { borderColor: roleColors[broadcast.signed_role] ?? C.gold }]}>
                <Text style={[ov.sigRole, { color: roleColors[broadcast.signed_role] ?? C.gold }]}>
                  {broadcast.signed_role}
                </Text>
                <Text style={ov.sigName}>{broadcast.signed_by}</Text>
              </View>
            </View>
          </View>

          {/* Titre */}
          <Text style={ov.title}>{broadcast.title}</Text>

          {/* Séparateur */}
          <View style={[ov.divider, { backgroundColor: typeColor[broadcast.broadcast_type] }]} />

          {/* ── Contenu média ── */}
          <View style={ov.mediaWrap}>
            {displayMediaType === "image" && displayVideoUrl && (
              <Image source={{ uri: displayVideoUrl }} style={ov.image} contentFit="contain" />
            )}
            {displayMediaType === "video" && displayVideoUrl && (
              <BroadcastVideo url={displayVideoUrl} />
            )}
            {(displayMediaType === "text" || (!displayVideoUrl && displayMediaType !== "image")) && (
              <View style={ov.textWrap}>
                <Text style={ov.message}>{broadcast.message}</Text>
              </View>
            )}
          </View>

          {/* Caption si image ou vidéo */}
          {displayMediaType !== "text" && broadcast.message.trim() !== "" && (
            <Text style={ov.caption}>{broadcast.message}</Text>
          )}

          {/* Footer */}
          <View style={ov.footer}>
            <View style={ov.liveRow}>
              <View style={[ov.liveDotSm, { backgroundColor: typeColor[broadcast.broadcast_type] }]} />
              <Text style={[ov.liveTxt, { color: typeColor[broadcast.broadcast_type] }]}>
                {broadcast.broadcast_type === "quotidien" ? "MONTÉE DU DRAPEAU" :
                 broadcast.broadcast_type === "hebdomadaire" ? "ÉVÉNEMENT HEBDOMADAIRE" :
                 "MESSAGE OFFICIEL"}
              </Text>
            </View>
            <Text style={ov.footerSub}>RHAZN — Tous droits réservés</Text>
          </View>

          {/* Bande colorée bottom */}
          <View style={[ov.bottomBar, { backgroundColor: typeColor[broadcast.broadcast_type] }]} />

        </Animated.View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES BANDEAU
// ─────────────────────────────────────────────────────────────
const bn = StyleSheet.create({
  wrap:     { position: "absolute", bottom: 100, left: 16, right: 16, zIndex: 9999 },
  pill:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0E0E0E", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.40)", shadowColor: C.gold, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(212,175,55,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1 },
  textCol:  { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  typePill: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  typePillTxt:{ fontWeight: "900", fontSize: 8, letterSpacing: 0.8 },
  eventTitle: { color: C.text, fontWeight: "900", fontSize: 13, letterSpacing: 0.2 },
  sub:      { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 1 },
  time:     { color: C.gold, fontWeight: "900" },
  sigBadge: { alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  sigRole:  { fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  sigName:  { color: C.sub, fontWeight: "700", fontSize: 9, marginTop: 1, maxWidth: 60 },
});

// ─────────────────────────────────────────────────────────────
// STYLES OVERLAY
// ─────────────────────────────────────────────────────────────
const ov = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg, alignItems: "center" },
  topBar:    { width: "100%", height: 4 },
  bottomBar: { width: "100%", height: 4, marginTop: "auto" as any },

  header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 24, paddingTop: 52, paddingBottom: 16 },
  logoWrap:  { flexDirection: "row", alignItems: "center", gap: 10 },
  logoText:  { color: C.gold, fontWeight: "900", fontSize: 26, letterSpacing: 3 },
  liveDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  headerRight:{ alignItems: "flex-end", gap: 6 },

  typeBadge:    { borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeTxt: { fontWeight: "900", fontSize: 9, letterSpacing: 1 },
  sigBadge:     { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center" },
  sigRole:      { fontWeight: "900", fontSize: 10, letterSpacing: 1 },
  sigName:      { color: C.sub, fontWeight: "700", fontSize: 10, marginTop: 2 },

  title:   { color: C.text, fontWeight: "900", fontSize: 24, textAlign: "center", letterSpacing: 0.3, lineHeight: 30, paddingHorizontal: 24, marginBottom: 14 },
  divider: { width: 60, height: 3, borderRadius: 2, marginBottom: 18 },

  mediaWrap: { width: W - 32, flex: 1, maxHeight: H * 0.44, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  image:     { width: "100%", height: "100%" },
  video:     { width: "100%", height: "100%" },
  textWrap:  { flex: 1, backgroundColor: "#0E0E0E", alignItems: "center", justifyContent: "center", padding: 28 },
  message:   { color: C.text, fontWeight: "700", fontSize: 17, lineHeight: 26, textAlign: "center", letterSpacing: 0.2 },
  caption:   { color: C.sub, fontWeight: "600", fontSize: 13, textAlign: "center", paddingHorizontal: 24, marginTop: 14, lineHeight: 19 },

  footer:    { alignItems: "center", gap: 6, paddingVertical: 18 },
  liveRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDotSm: { width: 6, height: 6, borderRadius: 3 },
  liveTxt:   { fontWeight: "900", fontSize: 10, letterSpacing: 1.5 },
  footerSub: { color: C.muted, fontWeight: "600", fontSize: 10 },
});