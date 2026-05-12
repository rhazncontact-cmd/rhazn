/**
 * banq/suspentz.tsx — VERSION PRODUCTION CORRIGÉE
 *
 * ARCHITECTURE AUDIO (TikTok/CapCut style) :
 * ─ player.muted = true  → son natif vidéo TOUJOURS coupé
 * ─ Audio.Sound(audio_path, start=audio_start_sec) → segment studio joue
 * ─ UN SEUL Audio.Sound par item actif → zéro cacophonie
 * ─ Sync : play/pause/scroll couplés vidéo ↔ audio
 */

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import RHAZN_LOGO from "../../assets/images/rz-logo.png";
import { avatarStore } from "../../lib/avatarStore";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#000", white: "#FFF", muted: "rgba(255,255,255,0.55)",
  mutedStrong: "rgba(255,255,255,0.80)", gold: "#D4AF37",
  goldDim: "rgba(212,175,55,0.18)", glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.14)",
};
const SUSPENTZ_PRICE_TAN = 2;
const FOOTER_H           = 95;
const PAYWALL_DELAY      = 15000;
const ACSET_MILESTONE    = 20;

// ─────────────────────────────────────────────────────────────────
// AUDIO GLOBAL — UN SEUL SON À LA FOIS DANS TOUT LE FEED
// Quand un item scroll hors vue, son audio s'arrête IMMÉDIATEMENT
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// CACHE OFFLINE
// ─────────────────────────────────────────────────────────────────
const CACHE_KEY = "rhazn_suspentz_cache_v2";
const VIDEO_DIR = `${FileSystem.cacheDirectory}rhazn_videos/`;

const ensureDir = async () => {
  try {
    const i = await FileSystem.getInfoAsync(VIDEO_DIR);
    if (!i.exists) await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  } catch {}
};



const dlVideo = async (uri: string, id: string): Promise<string> => {
  try {
    await ensureDir();
    const dest = `${VIDEO_DIR}${id}.mp4`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;
    return (await FileSystem.downloadAsync(uri, dest)).uri;
  } catch { return uri; }
};
const getOfflineUri = async (id: string): Promise<string | null> => {
  try {
    const i = await FileSystem.getInfoAsync(`${VIDEO_DIR}${id}.mp4`);
    return i.exists ? `${VIDEO_DIR}${id}.mp4` : null;
  } catch { return null; }
};
const saveCache = async (rows: Row[]) => {
  try {
    const top50 = rows.slice(0, 50);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(top50));
    // Téléchargement en arrière-plan des 50 vidéos
    top50.forEach(r => {
      const u = safeUri(r.media_path);
      if (u) dlVideo(u, r.id).catch(() => {});
    });
  } catch {}
};


// ─────────────────────────────────────────────────────────────────
// TYPES & UTILS
// ─────────────────────────────────────────────────────────────────
type Row = {
  id: string; title: string | null; media_path: string; author_id: string;
  qob_count?: number | null;
  audio_path?: string | null;       // ← piste studio RHAZN
  audio_start_sec?: number | null;  // ← position début segment
};

const fmt  = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("fr-FR").replace(/\u202f/g, " ");
const mkId = () => `fe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const SUP  = "https://mxxlchaygarszkygmylo.supabase.co";

const safeUri = (raw: any): string | null => {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("file://")) {
    const f = s.startsWith("http://") ? `https://${s.slice(7)}` : s;
    try { return encodeURI(f); } catch { return f; }
  }
  try { return encodeURI(`${SUP}/storage/v1/object/public/suspentz/${s}`); }
  catch { return `${SUP}/storage/v1/object/public/suspentz/${s}`; }
};

const preloaded: Record<string, boolean> = {};
async function preload(uri: string) {
  if (!uri || preloaded[uri]) return;
  try { await fetch(uri, { method: "HEAD" }).catch(() => {}); preloaded[uri] = true; } catch {}
}

// ─────────────────────────────────────────────────────────────────
// PROGRESS RING
// ─────────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const SZ = 44, SW = 2.5, r = (SZ - SW) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={SZ} height={SZ} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={SZ/2} cy={SZ/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={SW} fill="none" />
        <Circle cx={SZ/2} cy={SZ/2} r={r} stroke={C.gold} strokeWidth={SW} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </Svg>
      <Text style={{ position: "absolute", color: C.gold, fontSize: 9.5, fontWeight: "900" }}>{pct}%</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAY MODAL
// ─────────────────────────────────────────────────────────────────
function PayModal({ visible, title, walletTan, onPay, onCancel, isPaying }: {
  visible: boolean; title: string | null; walletTan: number;
  onPay: () => void; onCancel: () => void; isPaying: boolean;
}) {
  if (!visible) return null;
  return (
    <View style={pm.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <View style={pm.iconRing}><Ionicons name="lock-open-outline" size={30} color={C.gold} /></View>
        <Text style={pm.titleLarge}>Déverrouiller ce contenu</Text>
        <Text style={pm.subtitle} numberOfLines={2}>{title ?? "SUSPENTZ"}</Text>
        <View style={pm.priceRow}>
          <Text style={pm.priceLabel}>{SUSPENTZ_PRICE_TAN} TAN</Text>
          <View style={pm.balancePill}><Text style={pm.balanceText}>Solde : {fmt(walletTan)} TAN</Text></View>
        </View>
        <View style={pm.validityBadge}>
          <Ionicons name="calendar-outline" size={12} color={C.gold} />
          <Text style={pm.validityText}>Accès valable 30 jours</Text>
        </View>
        <Pressable style={[pm.payBtn, isPaying && { opacity: 0.7 }]} onPress={onPay} disabled={isPaying}>
          {isPaying
            ? <ActivityIndicator color="#000" size="small" />
            : <><Ionicons name="flash" size={16} color="#000" /><Text style={pm.payBtnText}>Payer {SUSPENTZ_PRICE_TAN} TAN</Text></>
          }
        </Pressable>
        <Pressable style={pm.cancelBtn} onPress={onCancel} disabled={isPaying}>
          <Text style={pm.cancelText}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}
const pm = StyleSheet.create({
  overlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end", zIndex: 3000 },
  sheet:        { backgroundColor: "#0E0E0E", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 38 + FOOTER_H, alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.glassBorder },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 8 },
  iconRing:     { width: 68, height: 68, borderRadius: 34, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.gold, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  titleLarge:   { color: C.white, fontSize: 20, fontWeight: "900", textAlign: "center" },
  subtitle:     { color: C.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
  priceRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", backgroundColor: C.glass, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder },
  priceLabel:   { color: C.gold, fontSize: 18, fontWeight: "900" },
  balancePill:  { backgroundColor: C.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.gold },
  balanceText:  { color: C.gold, fontSize: 11, fontWeight: "800" },
  validityBadge:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder },
  validityText: { color: C.muted, fontSize: 11, fontWeight: "700" },
  payBtn:       { width: "100%", backgroundColor: C.gold, borderRadius: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  payBtnText:   { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn:    { width: "100%", paddingVertical: 13, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder },
  cancelText:   { color: C.mutedStrong, fontSize: 14, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────────
// DOUBLE TAP
// ─────────────────────────────────────────────────────────────────
function DoubleTapZone({ onSingleTap, onDoubleTap }: { onSingleTap?: () => void; onDoubleTap?: () => void }) {
  const last = useRef(0);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const handle = () => {
    const now = Date.now(), d = now - last.current; last.current = now;
    if (d < 300) {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      onDoubleTap?.();
    } else {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { onSingleTap?.(); timer.current = null; }, 300);
    }
  };
  return <Pressable style={[StyleSheet.absoluteFill, { zIndex: 1 }]} onPress={handle} />;
}

// ─────────────────────────────────────────────────────────────────
// ACTIVE VIDEO ITEM — video muette + audio studio synchronisé
// ─────────────────────────────────────────────────────────────────
function ActiveSuspentzVideo({
  item, itemHeight, isActive, isOnline,
  walletTan, walletAcset, isPaid, paidCountMonth,
  onPaidNow, onNoTan, onVideoFinished, onProgress, onTimerUpdate, onDoubleTap,
}: {
  item: Row; itemHeight: number; isActive: boolean; isOnline: boolean;
  walletTan: number; walletAcset: number; isPaid: boolean; paidCountMonth: number;
  onPaidNow: (id: string, acset: number) => Promise<void>;
  onNoTan: () => void; onVideoFinished: () => void;
  onProgress?: (pct: number) => void;
  onTimerUpdate?: (w: number, d: number) => void;
  onDoubleTap?: () => void;
}) {
  const [creatorName,  setCreatorName]  = useState<string | null>(null);
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [creatorEmail, setCreatorEmail] = useState<string | null>(null);
  const [creatorCode,  setCreatorCode]  = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!item.author_id) return;
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("full_name, avatar_url, email, user_code")
        .eq("id", item.author_id).single();
      setCreatorName(data?.full_name ?? "Créateur RHAZN");
      setAvatarUrl(avatarStore.bust(data?.avatar_url ?? null, item.author_id));
      setCreatorEmail(data?.email ?? null);
      setCreatorCode(data?.user_code ?? null);
    })();
  }, [item.author_id]);

  const aliveRef        = useRef(true);
  const sessionIdRef    = useRef(mkId());
  const paidRef         = useRef(Boolean(isPaid));
  const payTriggeredRef = useRef(false);
  const lastStatusRef   = useRef(0);
  const paywallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimerRef   = useRef<NodeJS.Timeout | null>(null);

  // UI state
  const [acsetAmount,    setAcsetAmount]    = useState(0);
  const [showAcset,      setShowAcset]      = useState(false);
  const [acsetCollapsed, setAcsetCollapsed] = useState(false);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [buffering,        setBuffering]         = useState(false);
  const [isFollowing,      setIsFollowing]       = useState(false);
  const [followersCount,   setFollowersCount]    = useState(0);
  const [durationSec,      setDurationSec]       = useState(0);
  const [watchedSec,       setWatchedSec]        = useState(0);
  const [showPremiumToast, setShowPremiumToast]  = useState(false);
  const [showWalletCard,   setShowWalletCard]    = useState(false);
  const [showPayModal,     setShowPayModal]      = useState(false);
  const [isPaying,         setIsPaying]          = useState(false);

  // Offline
  const [offlineUri, setOfflineUri] = useState<string | null>(null);
  const networkUri = useMemo(() => safeUri(item.media_path), [item.media_path]);
  const uri = useMemo(
    () => (!isOnline && offlineUri) ? offlineUri : networkUri,
    [isOnline, offlineUri, networkUri]
  );

  // ✅ Audio metadata
  useEffect(() => {
    (async () => { const c = await getOfflineUri(item.id); if (c) setOfflineUri(c); })();
  }, [item.id]);

  useEffect(() => {
    if (!isActive || !isOnline || !networkUri || offlineUri) return;
    (async () => {
      const lp = await dlVideo(networkUri, item.id);
      if (lp !== networkUri) setOfflineUri(lp);
    })();
  }, [isActive, isOnline, networkUri]);

  // ✅ VIDEO PLAYER — TOUJOURS MUET
  // Le son vient de feedAudioPlay() via Audio.Sound
  const player = useVideoPlayer(uri ?? "file://invalid", p => {
  p.loop = false;
  p.muted = false; // ✅ IMPORTANT
});

  // ✅ Quand inactif (scroll) → arrêt immédiat vidéo + audio
  useEffect(() => {
    if (!isActive) {
      try { player.pause?.(); } catch {}
      setIsPlaying(false);
      // ✅ Arrêter l'audio global si c'est cet item qui joue
      
    }
  }, [isActive]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" || next === "inactive") {
        try { player.pause?.(); } catch {}
        if (aliveRef.current) setIsPlaying(false);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
      if (startTimerRef.current)   clearTimeout(startTimerRef.current);
      try { player.pause?.(); } catch {}
      // Arrêter l'audio si c'est notre item
    };
  }, [item.id]);

  useEffect(() => {
    sessionIdRef.current    = mkId();
    paidRef.current         = Boolean(isPaid);
    payTriggeredRef.current = Boolean(isPaid);
    setIsPlaying(false); setBuffering(false);
    setDurationSec(0); setWatchedSec(0);
    setShowPremiumToast(false); setShowPayModal(false); setIsPaying(false);
    setShowAcset(false); setAcsetCollapsed(false);
  }, [item.id, isPaid]);

  // Paywall
  useEffect(() => {
    if (!isActive) return;
    if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
    paywallTimerRef.current = setTimeout(() => {
      if (paidRef.current || payTriggeredRef.current) return;
      payTriggeredRef.current = true;
      try { player.pause?.(); } catch {}
      
      setIsPlaying(false);
      if (walletTan <= 0) onNoTan(); else setShowPayModal(true);
    }, PAYWALL_DELAY);
    return () => {
      if (paywallTimerRef.current) { clearTimeout(paywallTimerRef.current); paywallTimerRef.current = null; }
    };
  }, [isActive, item.id]);

  // ✅ Démarrage — vidéo muette + audio studio
  useEffect(() => {
    if (!uri || !isActive) return;
    setIsPlaying(false); setWatchedSec(0);
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    startTimerRef.current = setTimeout(async () => {
      if (!aliveRef.current || !isActive) return;
      if (!isOnline && !offlineUri) return;
      try {
        // 1. Lancer la vidéo (muette)
        await player.play?.();
        if (aliveRef.current) setIsPlaying(true);

        // 2. ✅ Lancer l'audio studio en parallèle
        
      } catch {}
    }, Platform.OS === "android" ? 200 : 50);
    return () => {
      if (startTimerRef.current) { clearTimeout(startTimerRef.current); startTimerRef.current = null; }
    };
  }, [item.id, uri, isActive]);

  // Follow + followers
  useEffect(() => {
    let alive = true, ch: any;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) return;
      const { data: f1 } = await supabase.rpc("is_following_creator", { p_creator_id: item.author_id });
      if (!alive) return; setIsFollowing(Boolean(f1));
      const { data: f2 } = await supabase.rpc("creator_followers_count", { p_creator_id: item.author_id });
      if (!alive) return; setFollowersCount(Number(f2 ?? 0));
      ch = supabase.channel(`cf-${item.author_id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "creator_follows", filter: `creator_id=eq.${item.author_id}` },
          async () => {
            const { data } = await supabase.rpc("creator_followers_count", { p_creator_id: item.author_id });
            if (alive) setFollowersCount(Number(data ?? 0));
          })
        .subscribe();
    })();
    return () => { alive = false; if (ch) supabase.removeChannel(ch); };
  }, [item.author_id]);

  useEffect(() => {
    return avatarStore.subscribe(() => {
      if (!item.author_id) return;
      supabase.from("profiles").select("avatar_url").eq("id", item.author_id).single()
        .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(avatarStore.bust(data.avatar_url, item.author_id)); });
    });
  }, [item.author_id]);

  const progressPct = useMemo(() => {
    if (durationSec <= 0) return 0;
    return Math.max(0, Math.min(100, Math.floor((watchedSec / durationSec) * 100)));
  }, [watchedSec, durationSec]);

  useEffect(() => {
    if (onProgress) onProgress(progressPct);
    if (onTimerUpdate) onTimerUpdate(watchedSec, durationSec);
  }, [progressPct]);

  const handleConfirmPay = async () => {
    if (isPaying || paidRef.current) return;
    setIsPaying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsPaying(false); return; }
      const { data: rpcData, error } = await supabase.rpc("process_payment_universal", {
        p_user_id: session.user.id, p_target_id: item.id,
        p_amount_tan: SUSPENTZ_PRICE_TAN, p_type: "SUSPENTZ",
        p_session_id: sessionIdRef.current,
      });
      if (rpcData?.status === "ALREADY_PAID") {
        paidRef.current = true; setShowPayModal(false); setIsPaying(false); return;
      }
      if (error || !rpcData?.success) { setIsPaying(false); return; }
      const earned = Number(rpcData.acset_rewards_earned ?? 0);
      paidRef.current = true;
      await onPaidNow(item.id, earned);
      setShowPayModal(false); setIsPaying(false);
      if (earned > 0) { setAcsetAmount(earned); setShowAcset(true); setAcsetCollapsed(false); }
      if (aliveRef.current) {
        setShowPremiumToast(true);
        setTimeout(() => { if (aliveRef.current) setShowPremiumToast(false); }, 2400);
      }
      // ✅ Reprendre la lecture après paiement
      setTimeout(async () => {
        if (!aliveRef.current) return;
        try {
          await player.play?.();
          setIsPlaying(true);
  
        } catch {}
      }, Platform.OS === "android" ? 200 : 0);
    } catch { setIsPaying(false); }
  };

  const handleCancelPay = () => { setShowPayModal(false); onVideoFinished(); };

  const handleShare = () => {
    const msg = `🎬 ${item.title ?? "SUSPENTZ"} sur RHAZN\n\n👉 rhazn://suspentz/${item.id}\n\n📲 https://play.google.com/store/apps/details?id=com.rhzn.dev`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg.trim())}`)
      .catch(() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg.trim())}`));
  };

  const handleGiveTan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({ pathname: "/user-send-tan", params: { prefillQuery: creatorCode ?? creatorEmail ?? "", prefillUid: item.author_id, prefillName: creatorName ?? "Créateur RHAZN" } } as any);
  };

  // ✅ togglePlay — synchronise vidéo + audio
 const togglePlay = async () => {
  if (isPlaying) {
    try { await player.pause?.(); } catch {}
    setIsPlaying(false);
  } else {
    if (!isOnline && !offlineUri) return;
    try {
      await player.play?.();
      setIsPlaying(true);
    } catch {}
  }
};

  const acsetPct       = Math.min(100, Math.round((walletTan % ACSET_MILESTONE) / ACSET_MILESTONE * 100));
  const acsetRemaining = Math.max(0, ACSET_MILESTONE - (walletTan % ACSET_MILESTONE));
  const RS = 30, SW = 2.5, Rr = (RS - SW) / 2, Rc = 2 * Math.PI * Rr;

  if (!uri) {
    return (
      <View style={[s.item, { height: itemHeight }]}>
        <View style={s.center} pointerEvents="none">
          <Ionicons name="alert-circle-outline" size={52} color={C.muted} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.item, { height: itemHeight }]}>

      {/* ✅ VIDEO — MUETTE, son vient de Audio.Sound */}
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
        onPlaybackStatusUpdate={(st: any) => {
          const now = Date.now();
          if (now - lastStatusRef.current < 200) return;
          lastStatusRef.current = now;
          if (!st || !aliveRef.current) return;
          if (typeof st.isPlaying   === "boolean") setIsPlaying(st.isPlaying);
          if (typeof st.isBuffering === "boolean") setBuffering(st.isBuffering);
          if (typeof st.positionMillis === "number") {
            const sec = Math.floor(st.positionMillis / 1000);
            setWatchedSec(p => p === sec ? p : sec);
          }
          const dms = st.durationMillis ?? st.duration ?? null;
          if (dms && Number.isFinite(dms)) setDurationSec(Math.floor(Number(dms) / 1000));
          if (st.didJustFinish) {
            // ✅ Fin vidéo → arrêter l'audio aussi
            
            setTimeout(() => { if (aliveRef.current) onVideoFinished(); }, 200);
          }
        }}
      />

      <DoubleTapZone onSingleTap={togglePlay} onDoubleTap={onDoubleTap} />

      {!isPlaying && (
        <View style={[s.center, { zIndex: 2 }]} pointerEvents="none">
          {!isOnline && !offlineUri
            ? <View style={s.offlineBadgePlayer}>
                <Ionicons name="wifi-outline" size={22} color={C.muted} />
                <Text style={s.offlineBadgeText}>Non disponible hors ligne</Text>
              </View>
            : isPaid
              ? <View style={s.playBadge}><Ionicons name="play" size={32} color={C.white} /></View>
              : <View style={s.lockBadge}><Ionicons name="lock-closed" size={28} color={C.gold} /></View>
          }
        </View>
      )}

      <View style={s.topBar} pointerEvents="box-none">
        {Platform.OS === "ios" ? <ProgressRing pct={progressPct} /> : <View style={{ width: 44 }} />}
      
        
        <View style={{ width: 44 }} />
      </View>

      <View style={s.watermarkWrap} pointerEvents="none">
        <Image source={RHAZN_LOGO} style={s.watermarkLogo} resizeMode="contain" />
        <Text style={s.watermarkText}>RHAZN</Text>
      </View>

      {showAcset && (
        <View style={s.acsetWrap}>
          {acsetCollapsed ? (
            <Pressable style={s.acsetPill}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setAcsetCollapsed(false); }}>
              <Ionicons name="flash" size={13} color="#000" />
              <Text style={s.acsetPillText}>+{acsetAmount}</Text>
            </Pressable>
          ) : (
            <Pressable style={s.acsetCard}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setAcsetCollapsed(true); }}>
              <View style={{ width: RS, height: RS, alignItems: "center", justifyContent: "center" }}>
                <Svg width={RS} height={RS} style={{ transform: [{ rotate: "-90deg" }] }}>
                  <Circle cx={RS/2} cy={RS/2} r={Rr} stroke="rgba(212,175,55,0.18)" strokeWidth={SW} fill="none" />
                  <Circle cx={RS/2} cy={RS/2} r={Rr} stroke={C.gold} strokeWidth={SW} fill="none"
                    strokeDasharray={Rc} strokeDashoffset={Rc * (1 - acsetPct / 100)} strokeLinecap="round" />
                </Svg>
                <Text style={s.acsetRingPct}>{acsetPct}%</Text>
              </View>
              <View style={{ gap: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="flash" size={10} color={C.gold} />
                  <Text style={s.acsetAmt}>ACSET +{acsetAmount}</Text>
                </View>
                <Text style={s.acsetTan}>{walletTan}/{ACSET_MILESTONE} TAN</Text>
                <Text style={s.acsetRemain}>encore {acsetRemaining} TAN</Text>
              </View>
              <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
        </View>
      )}

      <View style={s.bottomBar} pointerEvents="box-none">
        <View style={s.creatorRow}>
          <Pressable style={s.creatorLeft}
            onPress={() => router.push({ pathname: "/rz-channel/auteur", params: { uid: item.author_id } } as any)}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={s.avatar} />
              : <View style={s.avatarPlaceholder}><Ionicons name="person" size={22} color={C.muted} /></View>
            }
            <View style={s.creatorInfo}>
              <Text style={s.creatorName} numberOfLines={1}>{creatorName ?? "Créateur RHAZN"}</Text>
              <Text style={s.followersText}>{fmt(followersCount)} abonnés</Text>
              <Text style={s.followersText}>{fmt(item.qob_count ?? 0)} QOB</Text>
              <Text style={s.videoTitle} numberOfLines={1}>{item.title ?? "SUSPENTZ"}</Text>
              {isPaid
                ? <Pressable style={s.paidBadge} onPress={() => setShowWalletCard(true)}>
                    <Ionicons name="checkmark-circle" size={12} color={C.gold} />
                    <Text style={s.paidText}>Payé</Text>
                  </Pressable>
                : <Pressable style={s.lockedBadge} onPress={() => setShowWalletCard(true)}>
                    <Ionicons name="lock-closed" size={11} color={C.muted} />
                    <Text style={s.lockedText}>Premium</Text>
                  </Pressable>
              }
            </View>
          </Pressable>

          <View style={s.actions}>
            <Pressable style={[s.followBtn, isFollowing && s.followBtnActive]}
              onPress={async () => {
                const { data } = await supabase.rpc("toggle_follow_creator", { p_creator_id: item.author_id });
                setIsFollowing(Boolean(data));
              }}>
              <Text style={[s.followBtnText, isFollowing && { color: C.gold }]}>
                {isFollowing ? "Suivi ✓" : "Suivre"}
              </Text>
            </Pressable>
            <Pressable style={s.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color={C.white} />
            </Pressable>
            <Pressable style={s.giveTanBtn} onPress={handleGiveTan}>
              <Ionicons name="flash" size={14} color="#000" />
              <Text style={s.giveTanTxt}>Donner TAN</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {showWalletCard && (
        <View style={wl.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowWalletCard(false)} />
          <View style={wl.card}>
            <View style={wl.row}><Text style={wl.label}>TAN</Text><Text style={wl.value}>{fmt(walletTan)}</Text></View>
            <View style={wl.sep} />
            <View style={wl.row}><Text style={wl.label}>ACSET</Text><Text style={wl.value}>{fmt(walletAcset)}</Text></View>
            <View style={wl.sep} />
            <View style={wl.row}><Text style={wl.label}>PAYÉ</Text><Text style={wl.value}>{paidCountMonth}</Text></View>
          </View>
        </View>
      )}

      {showPremiumToast && (
        <View style={s.premiumToast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={C.gold} />
          <Text style={s.premiumToastText}>Accès déverrouillé · 30 jours</Text>
        </View>
      )}

      {buffering && !showPayModal && (
        <View style={s.bufferOverlay} pointerEvents="none">
          <ActivityIndicator color={C.gold} size="small" />
        </View>
      )}

      <PayModal visible={showPayModal} title={item.title} walletTan={walletTan}
        onPay={handleConfirmPay} onCancel={handleCancelPay} isPaying={isPaying} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// INACTIVE PLACEHOLDER
// ─────────────────────────────────────────────────────────────────
function InactiveSuspentzItem({ itemHeight, isPaid }: { itemHeight: number; isPaid: boolean }) {
  return (
    <View style={[s.item, { height: itemHeight }]}>
      <View style={s.center} pointerEvents="none">
        {isPaid
          ? <View style={s.playBadge}><Ionicons name="play" size={28} color="rgba(255,255,255,0.35)" /></View>
          : <View style={s.lockBadge}><Ionicons name="lock-closed" size={24} color="rgba(212,175,55,0.4)" /></View>
        }
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN — identique à l'original, aucun changement
// ─────────────────────────────────────────────────────────────────
export default function BanqSuspentz() {
  const { height } = useWindowDimensions();
  const insets     = useSafeAreaInsets();
  const ITEM_H     = Platform.OS === "android" ? height - FOOTER_H : height - FOOTER_H - insets.top;

  const { focusId } = useLocalSearchParams<{ focusId?: string }>();
  const router      = useRouter();

  const [authReady,      setAuthReady]      = useState(false);
  const [showNoTan,      setShowNoTan]      = useState(false);
  const [noTanMode,      setNoTanMode]      = useState<"ENTRY" | "INSIDE" | null>(null);
  const [rows,           setRows]           = useState<Row[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isOnline,       setIsOnline]       = useState(true);
  const [activeIndex,    setActiveIndex]    = useState(0);
  const [walletTan,      setWalletTan]      = useState(0);
  const [walletAcset,    setWalletAcset]    = useState(0);
  const [walletReady,    setWalletReady]    = useState(false);
  const [paidSet,        setPaidSet]        = useState<Set<string>>(new Set());
  const [paidCountMonth, setPaidCountMonth] = useState(0);
  const [timerWatched,   setTimerWatched]   = useState(0);
  const [timerDuration,  setTimerDuration]  = useState(0);
  const [currentPct,     setCurrentPct]     = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    NetInfo.fetch().then(s => setIsOnline(!!(s.isConnected && s.isInternetReachable !== false)));
    return NetInfo.addEventListener(s => setIsOnline(!!(s.isConnected && s.isInternetReachable !== false)));
  }, []);

  // ✅ Arrêter l'audio quand on quitte l'écran
  useEffect(() => {
    return () => {  };
  }, []);

  useEffect(() => {
    if (!rows.length) return;
    [rows[activeIndex + 1], rows[activeIndex + 2]].forEach(r => {
      if (r) { const u = safeUri(r.media_path); if (u) preload(u); }
    });
  }, [activeIndex, rows]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    }
  }, []);

  const showSysUI = useCallback(() => {}, []);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 || Math.abs(g.dy) > 20,
    onPanResponderRelease: (_, g) => { if (g.dy < -40) showSysUI(); },
  })).current;

  const scrollToNext = useCallback(() => {
    const next = activeIndex + 1;
    if (next < rows.length) listRef.current?.scrollToIndex({ index: next, animated: true });
  }, [activeIndex, rows.length]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setAuthReady(Boolean(data?.session?.user?.id)); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive) setAuthReady(Boolean(session?.user?.id));
    });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!authReady) return;
    const { data: auth } = await supabase.auth.getUser(); if (!auth?.user?.id) return;
    const { data: w } = await supabase.from("wallets").select("tan_balance, acset_balance").eq("user_id", auth.user.id).single();
    setWalletTan(Number(w?.tan_balance ?? 0));
    setWalletAcset(Number((w as any)?.acset_balance ?? 0));
    setWalletReady(true);
  }, [authReady]);

  const loadPaidSet = useCallback(async () => {
    if (!authReady) return;
    const { data: auth } = await supabase.auth.getUser(); const uid = auth?.user?.id; if (!uid) return;
    const { data } = await supabase.from("user_content_access").select("content_id")
      .eq("user_id", uid).gt("expires_at", new Date().toISOString());
    const set = new Set<string>();
    (data ?? []).forEach((r: any) => { if (r?.content_id) set.add(String(r.content_id)); });
    setPaidSet(set);
  }, [authReady]);

  const loadMonthPaidCount = useCallback(async () => {
    if (!authReady) return;
    const { data: auth } = await supabase.auth.getUser(); const uid = auth?.user?.id; if (!uid) return;
    const { data } = await supabase.from("user_content_access").select("id")
      .eq("user_id", uid).gt("expires_at", new Date().toISOString());
    setPaidCountMonth(Array.isArray(data) ? data.length : 0);
  }, [authReady]);

  const onPaidNow = useCallback(async (contentId: string, _acset: number) => {
    setPaidSet(p => { const n = new Set(p); n.add(String(contentId)); return n; });
    setPaidCountMonth(p => p + 1);
    setRows(p => p.map(r => r.id === contentId ? { ...r, qob_count: (r.qob_count ?? 0) + 1 } : r));
    await Promise.all([refreshWallet(), loadPaidSet(), loadMonthPaidCount()]);
  }, [refreshWallet, loadPaidSet, loadMonthPaidCount]);

  const onNoTan = useCallback(() => { setNoTanMode("INSIDE"); setShowNoTan(true); }, []);

  useEffect(() => {
    if (loading || !walletReady) return;
    if (walletTan < SUSPENTZ_PRICE_TAN) { setNoTanMode("ENTRY"); setShowNoTan(true); }
    else { setShowNoTan(false); setNoTanMode(null); }
  }, [walletTan, loading, walletReady]);

  useEffect(() => {
    if (!authReady) return;
    let alive = true, ch: any;
    (async () => {
      const { data: auth } = await supabase.auth.getUser(); const uid = auth?.user?.id; if (!uid || !alive) return;
      await refreshWallet();
      ch = supabase.channel("wallet-live-sus")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
          p => { setWalletTan(Number(p.new.tan_balance || 0)); setWalletAcset(Number((p.new as any).acset_balance || 0)); })
        .subscribe();
    })();
    return () => { alive = false; if (ch) supabase.removeChannel(ch); };
  }, [authReady, refreshWallet]);

  useEffect(() => {
    if (!authReady) return;
    let m = true;
    (async () => { if (m) { await loadPaidSet(); await loadMonthPaidCount(); } })();
    return () => { m = false; };
  }, [authReady, loadPaidSet, loadMonthPaidCount]);

  const loadRows = useCallback(async () => {
    const { data, error } = await supabase.from("store_products")
      .select("id, title, media_path, qob_count, author_id, created_at, category_code, audio_path, audio_start_sec")
      .eq("category_code", "SUSPENTZ").eq("is_public", true)
      .not("media_path", "eq", "").not("media_path", "is", null)
      .order("created_at", { ascending: false }).limit(125);
    if (error) return;
    const list = (data as Row[]) ?? [];
    setRows(list); if (list.length > 0) await saveCache(list);
  }, []);

  useEffect(() => {
    if (!authReady || rows.length === 0) return;
    const ch = supabase.channel("content-live-sus")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "store_products", filter: "category_code=eq.SUSPENTZ" }, () => loadRows())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "store_products", filter: "category_code=eq.SUSPENTZ" }, payload => {
        const u = payload.new as any; if (!u?.id) return;
        setRows(p => p.map(r => r.id === u.id ? { ...r, qob_count: Number(u.qob_count ?? r.qob_count ?? 0) } : r));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady, rows.length, loadRows]);

  useEffect(() => {
    if (!authReady) return;
    let m = true;
    (async () => {
      try {
        setLoading(true);
        if (!isOnline) {
          const cached = await loadCache();
          if (m && cached.length > 0) {
            setRows(cached);
            
            if (focusId) {
  const i = cached.findIndex(r => r.id === focusId);
  if (i >= 0) {
    setActiveIndex(i);
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: i, animated: false });
    }, 300);
  }
}

          }
          return;
        }
        const { data, error } = await supabase.from("store_products")
          .select("id, title, media_path, qob_count, author_id, created_at, category_code, audio_path, audio_start_sec")
          .eq("category_code", "SUSPENTZ").eq("is_public", true)
          .not("media_path", "eq", "").not("media_path", "is", null)
          .order("created_at", { ascending: false }).limit(125);
        if (!m) return;
        if (error) { const c = await loadCache(); if (c.length > 0) setRows(c); return; }
        const list = (data as Row[]) ?? [];
        setRows(list);
        if (list.length > 0) { await saveCache(list); const u = safeUri(list[0].media_path); if (u) preload(u); }
        if (focusId) {
  const i = list.findIndex(r => r.id === focusId);
  if (i >= 0) {
    setActiveIndex(i);
    // scroll physique après le premier rendu
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: i, animated: false });
    }, 300);
  }
}

      } finally { if (m) setLoading(false); }
    })();
    return () => { m = false; };
  }, [authReady, focusId, isOnline]);

  const viewConfig    = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const ni = viewableItems[0].index;
      setActiveIndex(p => p === ni ? p : ni);
      setCurrentPct(0); setTimerWatched(0); setTimerDuration(0);
    }
  }).current;

  if (!authReady || loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={C.gold} />
        {!authReady && <Text style={{ color: C.muted, marginTop: 12, fontSize: 13, fontWeight: "700" }}>Initialisation sécurisée…</Text>}
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={s.loader}>
        <Ionicons name="film-outline" size={48} color={C.muted} />
        <Text style={{ color: C.muted, marginTop: 12, fontSize: 14, fontWeight: "700" }}>Aucun contenu pour le moment</Text>
      </View>
    );
  }

  return (
    <View style={s.screen} {...pan.panHandlers}>
      {!isOnline && rows.length > 0 && (
        <View style={s.offlineBanner} pointerEvents="none">
          <Ionicons name="warning-outline" size={13} color="#FF9500" />
          <Text style={s.offlineBannerText}>Hors ligne — contenus mis en cache</Text>
        </View>
      )}

      <Pressable style={s.searchFab} onPress={() => router.push("/banq/suspentz-grid")}>
        <Ionicons name="search" size={20} color={C.white} />
      </Pressable>

      {showNoTan && (
        <View style={s.noTanOverlay}>
          <View style={s.noTanCard}>
            <View style={s.noTanIconRing}><Ionicons name="diamond" size={28} color={C.gold} /></View>
            <Text style={s.noTanTitle}>{noTanMode === "ENTRY" ? "Accès Premium" : "Solde insuffisant"}</Text>
            <Text style={s.noTanMsg}>
              {noTanMode === "ENTRY"
                ? "Rechargez votre solde TAN pour accéder aux contenus RHAZN Premium."
                : "Votre solde TAN est épuisé."}
            </Text>
            <Pressable style={s.noTanPrimary} onPress={() => { setShowNoTan(false); router.push("/rz-agents-liste"); }}>
              <Text style={s.noTanPrimaryTxt}>{noTanMode === "ENTRY" ? "Recharger maintenant" : "Trouver un Agent"}</Text>
            </Pressable>
            <Pressable style={s.noTanSecondary} onPress={() => { setShowNoTan(false); router.push("/user-space/mon-espace"); }}>
              <Text style={s.noTanSecondaryTxt}>Plus tard</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        ref={listRef}
        scrollEnabled={!showNoTan}
        data={rows}
        keyExtractor={i => i.id}
        extraData={activeIndex}
        pagingEnabled
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        scrollEventThrottle={16}
        removeClippedSubviews
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={80}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        renderItem={({ item, index }) => {
          const isActive = index === activeIndex;
          const isPaid   = paidSet.has(item.id);
          if (!isActive || !walletReady)
            return <InactiveSuspentzItem itemHeight={ITEM_H} isPaid={isPaid} />;
          return (
            <ActiveSuspentzVideo
              item={item} itemHeight={ITEM_H} isActive={isActive} isOnline={isOnline}
              walletTan={walletTan} walletAcset={walletAcset}
              isPaid={isPaid} paidCountMonth={paidCountMonth}
              onPaidNow={onPaidNow} onNoTan={onNoTan}
              onVideoFinished={scrollToNext}
              onProgress={setCurrentPct}
              onTimerUpdate={(w, d) => { setTimerWatched(w); setTimerDuration(d); }}
              onDoubleTap={showSysUI}
            />
          );
        }}
        onViewableItemsChanged={onViewChanged}
        viewabilityConfig={viewConfig.current}
      />

      {timerDuration > 0 && timerWatched > 0 && (
        <View style={s.timerWrap}>
          <Text style={s.timerTxt}>
            {String(Math.floor(timerWatched / 60)).padStart(2,"0")}:{String(timerWatched % 60).padStart(2,"0")}
            {" / "}
            {String(Math.floor(timerDuration / 60)).padStart(2,"0")}:{String(timerDuration % 60).padStart(2,"0")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const wl = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end", alignItems: "flex-start", paddingLeft: 20, paddingBottom: FOOTER_H + 120, zIndex: 5000 },
  card:    { width: 140, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  row:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  label:   { fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: "500" },
  value:   { fontSize: 12, color: "#FFF", fontWeight: "700" },
  sep:     { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 3 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  item:   { width: "100%", backgroundColor: "#000", overflow: "hidden" },
  offlineBanner:     { position: "absolute", top: 0, left: 0, right: 0, zIndex: 200, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.75)", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "rgba(255,149,0,0.35)" },
  offlineBannerText: { color: "#FF9500", fontWeight: "700", fontSize: 11 },
  offlineBadgePlayer:{ alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  offlineBadgeText:  { color: C.muted, fontWeight: "700", fontSize: 12 },
  center:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  playBadge: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.20)", justifyContent: "center", alignItems: "center" },
  lockBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.gold, justifyContent: "center", alignItems: "center", elevation: 6 },
  topBar:       { position: "absolute", top: 52, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, zIndex: 10 },
  // ✅ Badge audio studio
  audioBadge:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(212,175,55,0.40)" },
  audioBadgeTxt:{ color: C.gold, fontSize: 9, fontWeight: "800" },
  watermarkWrap:{ position: "absolute", top: 56, right: 12, zIndex: 12, alignItems: "flex-end", gap: 3 },
  watermarkLogo:{ width: 68, height: 20, opacity: 0.80, tintColor: "#00C851" },
  watermarkText:{ fontSize: 8, fontWeight: "900", color: "rgba(255,255,255,0.50)", letterSpacing: 2 },
  acsetWrap:    { position: "absolute", right: 14, bottom: 162, zIndex: 500, alignItems: "flex-end" },
  acsetCard:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(6,6,6,0.93)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(212,175,55,0.45)", paddingHorizontal: 10, paddingVertical: 9, shadowColor: C.gold, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  acsetRingPct: { position: "absolute", color: C.gold, fontSize: 8, fontWeight: "900" },
  acsetAmt:     { color: C.gold, fontWeight: "900", fontSize: 12 },
  acsetTan:     { color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 10 },
  acsetRemain:  { color: C.muted, fontWeight: "600", fontSize: 9 },
  acsetPill:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.gold, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, shadowColor: C.gold, shadowOpacity: 0.55, shadowRadius: 8, elevation: 6 },
  acsetPillText:{ color: "#000", fontWeight: "900", fontSize: 11 },
  bottomBar:  { position: "absolute", bottom: 14, left: 0, right: 0, paddingHorizontal: 16, zIndex: 10, overflow: "visible" },
  creatorRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  creatorLeft:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar:            { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.28)" },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder, justifyContent: "center", alignItems: "center" },
  creatorInfo:  { flex: 1, gap: 2, overflow: "visible" },
  creatorName:  { color: C.white, fontSize: 14, fontWeight: "800" },
  followersText:{ color: C.muted, fontSize: 11, fontWeight: "600" },
  videoTitle:   { color: "rgba(255,255,255,0.80)", fontSize: 13, fontWeight: "700" },
  paidBadge:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(212,175,55,0.40)" },
  paidText:     { color: C.gold, fontSize: 11, fontWeight: "900" },
  lockedBadge:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(212,175,55,0.35)" },
  lockedText:   { color: C.gold, fontSize: 10, fontWeight: "900" },
  actions:        { alignItems: "center", gap: 8, paddingBottom: 2 },
  followBtn:      { backgroundColor: C.gold, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  followBtnActive:{ backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: C.gold },
  followBtnText:  { color: "#000", fontSize: 12, fontWeight: "900" },
  shareBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder, justifyContent: "center", alignItems: "center" },
  giveTanBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, elevation: 4 },
  giveTanTxt:     { color: "#000", fontWeight: "900", fontSize: 12 },
  timerWrap:        { position: "absolute", bottom: 88, right: 16, backgroundColor: "rgba(0,0,0,0.60)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(212,175,55,0.40)", zIndex: 9998 },
  timerTxt:         { color: C.gold, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  premiumToast:     { position: "absolute", top: 100, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(10,10,10,0.88)", borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder },
  premiumToastText: { color: C.white, fontSize: 13, fontWeight: "800" },
  bufferOverlay:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  searchFab:        { position: "absolute", top: 52, left: 16, zIndex: 50, width: 42, height: 42, borderRadius: 21, backgroundColor: C.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder, justifyContent: "center", alignItems: "center" },
  noTanOverlay:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  noTanCard:        { backgroundColor: "#0D0D0D", borderRadius: 28, paddingHorizontal: 28, paddingVertical: 32, width: "82%", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder, elevation: 22, gap: 12 },
  noTanIconRing:    { width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.gold, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  noTanTitle:       { color: C.white, fontSize: 20, fontWeight: "900", textAlign: "center" },
  noTanMsg:         { color: C.muted, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 21 },
  noTanPrimary:     { width: "100%", backgroundColor: C.gold, paddingVertical: 15, borderRadius: 18, alignItems: "center", marginTop: 8 },
  noTanPrimaryTxt:  { color: "#000", fontSize: 15, fontWeight: "900" },
  noTanSecondary:   { width: "100%", backgroundColor: "rgba(255,255,255,0.06)", paddingVertical: 13, borderRadius: 18, alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: C.glassBorder },
  noTanSecondaryTxt:{ color: C.mutedStrong, fontSize: 14, fontWeight: "700" },
});