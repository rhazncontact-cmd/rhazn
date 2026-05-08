// app/rz-admin-governance/cadna/cadna-dossiers.tsx
// ✅ FIX 1 — UUID : cadna_reviewed_by = UID pur (plus de préfixe "SUPREME:")
// ✅ FIX 2 — Error handling : updateStatus + executeSupremeAction capturent les erreurs
// ✅ FIX 3 — Layout : bouton Supprimer séparé du QOB (nouvelle ligne dédiée)
// ✅ NOUVEAU — Créateur affiché dans chaque carte (photo + nom)
// ✅ NOUVEAU — Mode sélection (long press → checkboxes → bulk delete max 50)
// ✅ NOUVEAU — "Supprimer tout" pour Supreme
// ─── LAYOUT : structure originale conservée à l'identique ───

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminGuard from "../../../components/AdminGuard";
import { useSoftDelete } from "../../../hooks/useSoftDelete";
import { supabase } from "../../../lib/supabase";

// ─── Palette ──────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.28)";
const BG       = "#F2F2F7";
const CARD     = "#FFFFFF";
const SOFT     = "#E5E5EA";
const TEXT     = "#111111";
const MUTED    = "#6E6E73";
const GREEN    = "#34C759";
const RED      = "#FF3B30";
const BLUE     = "#007AFF";
const PURPLE   = "#AF52DE";
const DARK     = "#000000";

const SUPABASE_URL  = "https://mxxlchaygarszkygmylo.supabase.co";
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
const MAX_SEL       = 50;

const { width: SW } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────
type CadnaStatus = "pending" | "approved" | "rejected";

type Dossier = {
  id:                string;
  title:             string | null;
  category_code:     string;
  product_type:      string | null;
  media_path:        string | null;
  cadna_status:      CadnaStatus;
  created_at:        string;
  approved_at?:      string;
  rejected_at?:      string;
  cadna_reviewed_by?: string;
  owner_uid?:        string | null;
  owner_name?:       string | null;
  owner_avatar?:     string | null;
  qob_count?:        number;
};

type ReviewerProfile = {
  id:         string;
  full_name:  string | null;
  avatar_url: string | null;
  role:       string | null;
};

const TABS: { key: CadnaStatus; label: string; icon: string; color: string }[] = [
  { key: "pending",  label: "En attente", icon: "time-outline",             color: GOLD  },
  { key: "approved", label: "Approuvés",  icon: "checkmark-circle-outline", color: GREEN },
  { key: "rejected", label: "Rejetés",    icon: "close-circle-outline",     color: RED   },
];

// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (d?: string) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

const fmtN = (n: any) => Number(n ?? 0).toLocaleString("fr-FR");

const hoursBetween = (a?: string, b?: string) => {
  if (!a || !b) return null;
  const h = (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
  return isFinite(h) ? Math.max(0, h) : null;
};

const statusColor = (s: CadnaStatus) =>
  s === "approved" ? GREEN : s === "rejected" ? RED : GOLD;

// ✅ FIX 1 : compare le UID pur (sans préfixe "SUPREME:")
function isSupremeLocked(d: Dossier, supremeUid: string | null): boolean {
  if (!supremeUid || !d.cadna_reviewed_by) return false;
  return d.cadna_reviewed_by === supremeUid;
}

function resolveVideoUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/suspentz/${path}`;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1
    ? (p[0][0] || "?").toUpperCase()
    : ((p[0][0] || "") + (p[1][0] || "")).toUpperCase();
}

// ─── Toast iOS ────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success"|"error"|"info"|"warning" } | null;
  anim:  Animated.Value;
}) {
  if (!toast) return null;
  const color =
    toast.type === "success" ? GREEN :
    toast.type === "error"   ? RED   :
    toast.type === "warning" ? "#FF9500" : BLUE;
  const icon: any =
    toast.type === "success" ? "checkmark-circle" :
    toast.type === "error"   ? "close-circle"     :
    toast.type === "warning" ? "warning"           : "information-circle";
  return (
    <Animated.View style={[styles.iosToast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }]}>
      <View style={[styles.iosToastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.iosToastTitle}>{toast.title}</Text>
        <Text style={styles.iosToastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Lecteur vidéo inline ─────────────────────────────────
function InlineVideoPlayer({ videoUrl, isPlaying, onToggle }: {
  videoUrl: string; isPlaying: boolean; onToggle: () => void;
}) {
  const player = useVideoPlayer(videoUrl, (p) => { p.loop = false; });
  useEffect(() => {
    try { isPlaying ? player.play?.() : player.pause?.(); } catch {}
  }, [isPlaying]);
  useEffect(() => { return () => { try { player.pause?.(); } catch {} }; }, []);
  return (
    <Pressable style={vp.wrap} onPress={onToggle}>
      <VideoView player={player} style={vp.video} contentFit="contain" nativeControls={false} />
      {!isPlaying && (
        <View style={vp.overlay}>
          <View style={vp.playBtn}>
            <Ionicons name="play" size={28} color="#FFF" />
          </View>
        </View>
      )}
    </Pressable>
  );
}
const vp = StyleSheet.create({
  wrap:    { width: "100%", height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: DARK, marginBottom: 14 },
  video:   { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.32)" },
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,0,0,0.60)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
});

// ─── Fiche Revieweur ──────────────────────────────────────
function ReviewerCard({ visible, profile, decision, onClose }: {
  visible:  boolean; profile: ReviewerProfile | null;
  decision: CadnaStatus; onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(op,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.85); op.setValue(0); }
  }, [visible]);
  if (!visible) return null;
  const dc = decision === "approved" ? GREEN : decision === "rejected" ? RED : GOLD;
  const dl = decision === "approved" ? "Approuvé" : decision === "rejected" ? "Rejeté" : "En attente";
  const di = decision === "approved" ? "checkmark-circle" : decision === "rejected" ? "close-circle" : "time";
  const SZ = 88;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={rc.backdrop} onPress={onClose}>
        <Animated.View style={[rc.card, { transform: [{ scale }], opacity: op }]} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={rc.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={16} color={MUTED} />
          </TouchableOpacity>
          <View style={rc.headerBand}>
            <Ionicons name="shield-checkmark" size={13} color={GOLD} />
            <Text style={rc.headerTxt}>Révisé par</Text>
          </View>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={[rc.avatar, { width: SZ, height: SZ, borderRadius: SZ/2 }]} />
            : <View style={[rc.avatar, rc.avatarFB, { width: SZ, height: SZ, borderRadius: SZ/2 }]}><Text style={rc.avatarI}>{getInitials(profile?.full_name)}</Text></View>
          }
          <Text style={rc.name} numberOfLines={2}>{profile?.full_name ?? "Inconnu"}</Text>
          {profile?.role && <View style={rc.roleBadge}><Text style={rc.roleTxt}>{profile.role.toUpperCase()}</Text></View>}
          <View style={rc.divider} />
          <View style={[rc.decisionRow, { backgroundColor: `${dc}10`, borderColor: `${dc}30` }]}>
            <Ionicons name={di as any} size={18} color={dc} />
            <View style={{ flex: 1 }}>
              <Text style={[rc.decisionLabel, { color: dc }]}>Décision : {dl}</Text>
              <Text style={rc.decisionSub}>Commission CADNA · RHAZN</Text>
            </View>
          </View>
          {profile?.id && (
            <View style={rc.idRow}>
              <Ionicons name="finger-print-outline" size={11} color={MUTED} />
              <Text style={rc.idTxt} numberOfLines={1}>{profile.id}</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
const rc = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  card:       { width: "100%", backgroundColor: CARD, borderRadius: 26, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 18, borderWidth: 1, borderColor: SOFT },
  closeBtn:   { position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: BG, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  headerBand: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD_DIM, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: GOLD_BD, marginBottom: 4 },
  headerTxt:  { color: GOLD, fontWeight: "900", fontSize: 11, letterSpacing: 0.4 },
  avatar:     { borderWidth: 2.5, borderColor: GOLD, marginVertical: 4 },
  avatarFB:   { backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  avatarI:    { color: GOLD, fontWeight: "900", fontSize: 28 },
  name:       { color: TEXT, fontWeight: "900", fontSize: 19, textAlign: "center", letterSpacing: -0.2 },
  roleBadge:  { backgroundColor: "rgba(0,122,255,0.10)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(0,122,255,0.25)" },
  roleTxt:    { color: BLUE, fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  divider:    { width: "100%", height: 1, backgroundColor: SOFT, marginVertical: 4 },
  decisionRow:  { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  decisionLabel:{ fontWeight: "900", fontSize: 13 },
  decisionSub:  { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },
  idRow:      { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  idTxt:      { color: MUTED, fontSize: 10, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", maxWidth: SW * 0.55 },
});

// ─── Modal Supreme ────────────────────────────────────────
function SupremeActionModal({ visible, dossier, action, bulkCount, onConfirm, onCancel, busy }: {
  visible:    boolean;
  dossier:    Dossier | null;
  action:     "reject"|"approve"|"delete"|"bulk_delete"|"delete_all"|null;
  bulkCount?: number;
  onConfirm:  () => void;
  onCancel:   () => void;
  busy:       boolean;
}) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(op,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.88); op.setValue(0); }
  }, [visible]);
  if (!visible || !action) return null;

  const cfg = {
    reject:     { icon: "close-circle"     as const, color: RED,   title: "Rejeter ce contenu",        sub: "Ce contenu approuvé sera rejeté par Supreme.",               confirm: "Rejeter maintenant" },
    approve:    { icon: "checkmark-circle" as const, color: GREEN, title: "Restaurer ce contenu",       sub: "Ce contenu rejeté sera approuvé et publié par Supreme.",     confirm: "Approuver maintenant" },
    delete:     { icon: "trash"            as const, color: RED,   title: "Supprimer définitivement",   sub: "Suppression permanente. Aucune récupération possible.",       confirm: "Supprimer définitivement" },
    bulk_delete:{ icon: "trash"            as const, color: RED,   title: `Supprimer ${bulkCount ?? 0} contenus`, sub: `${bulkCount ?? 0} contenus sélectionnés seront supprimés.`, confirm: `Supprimer ${bulkCount ?? 0}` },
    delete_all: { icon: "trash"            as const, color: RED,   title: "Supprimer TOUS",             sub: "Tous les contenus de cet onglet supprimés. Irréversible.",    confirm: "Supprimer TOUT" },
  }[action];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Pressable style={sa.backdrop} onPress={onCancel}>
        <Animated.View style={[sa.card, { transform: [{ scale }], opacity: op }]} onStartShouldSetResponder={() => true}>
          <View style={[sa.iconRing, { backgroundColor: `${cfg.color}12`, borderColor: `${cfg.color}35` }]}>
            <Ionicons name={cfg.icon} size={30} color={cfg.color} />
          </View>
          <Text style={sa.title}>{cfg.title}</Text>
          <Text style={sa.sub}>{cfg.sub}</Text>
          {dossier && action !== "bulk_delete" && action !== "delete_all" && (
            <View style={sa.targetBox}>
              <Text style={sa.targetLabel}>Contenu ciblé</Text>
              <Text style={sa.targetTitle} numberOfLines={2}>{dossier.title || "Sans titre"}</Text>
              {dossier.owner_name && (
                <View style={sa.creatorRow}>
                  {dossier.owner_avatar
                    ? <Image source={{ uri: dossier.owner_avatar }} style={sa.creatorAv} />
                    : <View style={[sa.creatorAv, { backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: GOLD, fontWeight: "900", fontSize: 9 }}>{getInitials(dossier.owner_name)}</Text></View>
                  }
                  <Text style={sa.creatorName} numberOfLines={1}>{dossier.owner_name}</Text>
                  {(dossier.qob_count ?? 0) > 0 && (
                    <View style={sa.qobPill}>
                      <Ionicons name="glasses-outline" size={10} color={GOLD} />
                      <Text style={sa.qobTxt}>{fmtN(dossier.qob_count)} QOB</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          <View style={sa.irrevRow}>
            <Ionicons name="shield-checkmark" size={13} color={GOLD} />
            <Text style={sa.irrevTxt}>Décision Supreme · Irrevocable par les membres CADNA</Text>
          </View>
          <View style={sa.btnRow}>
            <TouchableOpacity style={sa.cancelBtn} onPress={onCancel} disabled={busy} activeOpacity={0.8}>
              <Text style={sa.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sa.confirmBtn, { backgroundColor: cfg.color }, busy && { opacity: 0.55 }]}
              onPress={onConfirm} disabled={busy} activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={sa.confirmTxt}>{cfg.confirm}</Text>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
const sa = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card:        { width: "100%", backgroundColor: CARD, borderRadius: 26, padding: 24, gap: 14, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 18, borderWidth: 1, borderColor: SOFT },
  iconRing:    { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  title:       { color: TEXT, fontWeight: "900", fontSize: 18, textAlign: "center" },
  sub:         { color: MUTED, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  targetBox:   { width: "100%", backgroundColor: BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SOFT, gap: 8 },
  targetLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  targetTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  creatorRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  creatorAv:   { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: GOLD_BD },
  creatorName: { flex: 1, color: MUTED, fontWeight: "700", fontSize: 11 },
  qobPill:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: GOLD_BD },
  qobTxt:      { color: GOLD, fontWeight: "800", fontSize: 10 },
  irrevRow:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: GOLD_DIM, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: GOLD_BD, width: "100%" },
  irrevTxt:    { flex: 1, color: GOLD, fontSize: 11, fontWeight: "700" },
  btnRow:      { flexDirection: "row", gap: 10, width: "100%" },
  cancelBtn:   { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 14, backgroundColor: BG, borderWidth: 1, borderColor: SOFT },
  cancelTxt:   { color: MUTED, fontWeight: "800", fontSize: 14 },
  confirmBtn:  { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 14 },
  confirmTxt:  { color: "#FFF", fontWeight: "900", fontSize: 14 },
});

// ─── Modal Détail ─────────────────────────────────────────
function DossierDetailModal({ dossier, supremeUid, onClose, onApprove, onReject, speedKpi }: {
  dossier: Dossier | null; supremeUid: string | null;
  onClose: () => void; onApprove: (id: string) => void; onReject: (id: string) => void;
  speedKpi: { avgH: number | null; topReviewers: { uid: string; approved: number; rejected: number; total: number }[] };
}) {
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [reviewerProfile,  setReviewerProfile]  = useState<ReviewerProfile | null>(null);
  const [reviewerCardOpen, setReviewerCardOpen] = useState(false);
  const [loadingReviewer,  setLoadingReviewer]  = useState(false);
  const videoUrl = dossier ? resolveVideoUrl(dossier.media_path) : null;
  const locked   = dossier ? isSupremeLocked(dossier, supremeUid) : false;
  useEffect(() => { setIsPlaying(false); setReviewerCardOpen(false); }, [dossier?.id]);

  const handleReviewerPress = async (uid: string) => {
    if (!uid || uid === "—") return;
    setLoadingReviewer(true);
    const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, role").eq("id", uid).maybeSingle();
    setReviewerProfile(data ?? { id: uid, full_name: null, avatar_url: null, role: null });
    setLoadingReviewer(false);
    setReviewerCardOpen(true);
  };

  if (!dossier) return null;
  const statusC = statusColor(dossier.cadna_status);

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={dm.backdrop} onPress={onClose} />
        <View style={dm.sheetOuter}>
          <ScrollView style={dm.sheet} showsVerticalScrollIndicator={false}>
            <View style={dm.handle} />
            {locked && (
              <View style={dm.lockBanner}>
                <Ionicons name="lock-closed" size={14} color={PURPLE} />
                <View style={{ flex: 1 }}>
                  <Text style={dm.lockBannerTitle}>Contenu verrouillé par Supreme</Text>
                  <Text style={dm.lockBannerSub}>Seul CAD SUPRÊME peut modifier ce statut</Text>
                </View>
                <Ionicons name="shield-checkmark" size={16} color={PURPLE} />
              </View>
            )}
            <View style={dm.header}>
              <View style={{ flex: 1 }}>
                <Text style={dm.title} numberOfLines={2}>{dossier.title || "Sans titre"}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <View style={dm.catBadge}><Text style={dm.catBadgeTxt}>{dossier.category_code}</Text></View>
                  {dossier.product_type && <View style={dm.typeBadge}><Text style={dm.typeBadgeTxt}>{dossier.product_type}</Text></View>}
                  {locked && <View style={dm.lockBadge}><Ionicons name="lock-closed" size={9} color={PURPLE} /><Text style={dm.lockBadgeTxt}>SUPREME</Text></View>}
                </View>
              </View>
              <View style={[dm.statusPill, { backgroundColor: `${statusC}15`, borderColor: `${statusC}35` }]}>
                <Ionicons name={dossier.cadna_status === "approved" ? "checkmark-circle" : dossier.cadna_status === "rejected" ? "close-circle" : "time"} size={13} color={statusC} />
                <Text style={[dm.statusPillTxt, { color: statusC }]}>
                  {dossier.cadna_status === "pending" ? "ATTENTE" : dossier.cadna_status === "approved" ? "VALIDÉ" : "REJETÉ"}
                </Text>
              </View>
            </View>

            {/* Créateur */}
            {dossier.owner_name && (
              <View style={dm.creatorCard}>
                {dossier.owner_avatar
                  ? <Image source={{ uri: dossier.owner_avatar }} style={dm.creatorAv} />
                  : <View style={[dm.creatorAv, { backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: GOLD, fontWeight: "900", fontSize: 12 }}>{getInitials(dossier.owner_name)}</Text></View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={dm.creatorName} numberOfLines={1}>{dossier.owner_name}</Text>
                  <Text style={dm.creatorSub}>Créateur du contenu</Text>
                </View>
                {(dossier.qob_count ?? 0) > 0 && (
                  <View style={dm.qobBadge}>
                    <Ionicons name="glasses-outline" size={12} color={GOLD} />
                    <Text style={dm.qobBadgeTxt}>{fmtN(dossier.qob_count)} QOB</Text>
                  </View>
                )}
              </View>
            )}

            {videoUrl ? (
              <View style={{ marginBottom: 8 }}>
                <View style={dm.sectionLabelRow}>
                  <Ionicons name="play-circle-outline" size={13} color={MUTED} />
                  <Text style={dm.sectionLabel}>APERÇU VIDÉO</Text>
                </View>
                <InlineVideoPlayer videoUrl={videoUrl} isPlaying={isPlaying} onToggle={() => setIsPlaying(p => !p)} />
                <TouchableOpacity
                  style={[dm.playControlBtn, isPlaying && { backgroundColor: `${MUTED}15`, borderColor: `${MUTED}30` }]}
                  onPress={() => setIsPlaying(p => !p)} activeOpacity={0.80}
                >
                  <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={18} color={isPlaying ? MUTED : GREEN} />
                  <Text style={[dm.playControlTxt, { color: isPlaying ? MUTED : GREEN }]}>
                    {isPlaying ? "Mettre en pause" : "Lire la vidéo"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={dm.noPreview}>
                <Ionicons name="videocam-off-outline" size={28} color={MUTED} />
                <Text style={{ color: MUTED, fontWeight: "700", marginTop: 8 }}>Aucun média vidéo</Text>
              </View>
            )}

            <View style={dm.infoCard}>
              <Text style={dm.infoCardTitle}>⚡ Vitesse de décision</Text>
              <Text style={[dm.infoCardValue, { color: BLUE }]}>{speedKpi.avgH == null ? "—" : `${speedKpi.avgH.toFixed(1)} h (moy.)`}</Text>
              <Text style={dm.infoCardHint}>Création → décision finale</Text>
            </View>

            <View style={dm.infoCard}>
              <Text style={dm.infoCardTitle}>📋 Détails</Text>
              <View style={dm.infoRow}>
                <Text style={dm.infoKey}>Créé le</Text>
                <Text style={dm.infoVal}>{fmtDate(dossier.created_at)}</Text>
              </View>
              <View style={dm.infoRow}>
                <Text style={dm.infoKey}>Décidé le</Text>
                <Text style={dm.infoVal}>{fmtDate(dossier.approved_at || dossier.rejected_at)}</Text>
              </View>
              <View style={dm.infoRow}>
                <Text style={dm.infoKey}>Révisé par</Text>
                {dossier.cadna_reviewed_by ? (
                  <TouchableOpacity
                    style={[dm.reviewerBtn, locked && { backgroundColor: `${PURPLE}12`, borderColor: `${PURPLE}30` }]}
                    onPress={() => handleReviewerPress(dossier.cadna_reviewed_by!)}
                    activeOpacity={0.75} disabled={loadingReviewer}
                  >
                    {loadingReviewer
                      ? <ActivityIndicator size="small" color={locked ? PURPLE : GOLD} />
                      : <>
                          <Ionicons name={locked ? "shield-checkmark" : "person-circle-outline"} size={14} color={locked ? PURPLE : GOLD} />
                          <Text style={[dm.reviewerBtnTxt, locked && { color: PURPLE }]} numberOfLines={1}>
                            {locked ? "⚡ Supreme" : dossier.cadna_reviewed_by.slice(0, 8) + "…"}
                          </Text>
                          <View style={[dm.reviewerArrow, locked && { backgroundColor: `${PURPLE}20` }]}>
                            <Ionicons name="chevron-forward" size={11} color={locked ? PURPLE : GOLD} />
                          </View>
                        </>
                    }
                  </TouchableOpacity>
                ) : <Text style={dm.infoVal}>—</Text>}
              </View>
              <View style={dm.infoRow}>
                <Text style={dm.infoKey}>ID</Text>
                <Text style={[dm.infoVal, { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }]} numberOfLines={1}>{dossier.id.slice(0, 12)}…</Text>
              </View>
            </View>

            {speedKpi.topReviewers.length > 0 && (
              <View style={dm.infoCard}>
                <Text style={dm.infoCardTitle}>🏆 Top Reviewers</Text>
                {speedKpi.topReviewers.map((r, idx) => (
                  <TouchableOpacity key={r.uid} style={[dm.rankRow, { borderTopWidth: idx === 0 ? 0 : 1 }]}
                    onPress={() => handleReviewerPress(r.uid)} activeOpacity={0.75}
                  >
                    <View style={[dm.rankIdx, { backgroundColor: idx === 0 ? GOLD_DIM : BG }]}>
                      <Text style={{ color: idx === 0 ? GOLD : MUTED, fontWeight: "900", fontSize: 12 }}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rankUid} numberOfLines={1}>{r.uid.slice(0, 14)}…</Text>
                      <Text style={dm.rankMeta}>✅ {r.approved} · ❌ {r.rejected} · Total {r.total}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={13} color={SOFT} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {dossier.cadna_status === "pending" && !locked && (
              <View style={dm.actionsRow}>
                <TouchableOpacity style={[dm.actionBtn, { backgroundColor: `${GREEN}15`, borderColor: `${GREEN}40` }]}
                  onPress={() => { setIsPlaying(false); onApprove(dossier.id); }} activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={GREEN} />
                  <Text style={[dm.actionBtnTxt, { color: GREEN }]}>Approuver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[dm.actionBtn, { backgroundColor: `${RED}12`, borderColor: `${RED}35` }]}
                  onPress={() => { setIsPlaying(false); onReject(dossier.id); }} activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={18} color={RED} />
                  <Text style={[dm.actionBtnTxt, { color: RED }]}>Rejeter</Text>
                </TouchableOpacity>
              </View>
            )}

            {locked && dossier.cadna_status !== "pending" && (
              <View style={dm.blockedNotice}>
                <Ionicons name="lock-closed" size={16} color={PURPLE} />
                <View style={{ flex: 1 }}>
                  <Text style={dm.blockedNoticeTitle}>Action bloquée</Text>
                  <Text style={dm.blockedNoticeSub}>Ce contenu a été décidé par CAD SUPRÊME. Seul Supreme peut le modifier.</Text>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={() => { setIsPlaying(false); onClose(); }} style={dm.closeBtn}>
              <Text style={dm.closeBtnTxt}>Fermer</Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>
      <ReviewerCard visible={reviewerCardOpen} profile={reviewerProfile} decision={dossier.cadna_status} onClose={() => setReviewerCardOpen(false)} />
    </>
  );
}

const dm = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetOuter:  { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%" },
  sheet:       { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderColor: SOFT },
  handle:      { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 14 },
  lockBanner:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: `${PURPLE}10`, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: `${PURPLE}30` },
  lockBannerTitle: { color: PURPLE, fontWeight: "900", fontSize: 13 },
  lockBannerSub:   { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },
  header:      { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  title:       { color: TEXT, fontWeight: "900", fontSize: 17 },
  catBadge:    { backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  catBadgeTxt: { color: GOLD, fontSize: 10, fontWeight: "800" },
  typeBadge:   { backgroundColor: "rgba(0,122,255,0.10)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(0,122,255,0.25)" },
  typeBadgeTxt:{ color: BLUE, fontSize: 10, fontWeight: "800" },
  lockBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${PURPLE}10`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: `${PURPLE}30` },
  lockBadgeTxt:{ color: PURPLE, fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  statusPill:  { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  statusPillTxt:{ fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  // Créateur
  creatorCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: SOFT },
  creatorAv:   { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: GOLD_BD, flexShrink: 0 },
  creatorName: { color: TEXT, fontWeight: "800", fontSize: 13 },
  creatorSub:  { color: MUTED, fontSize: 11, fontWeight: "600" },
  qobBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GOLD_DIM, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: GOLD_BD },
  qobBadgeTxt: { color: GOLD, fontWeight: "900", fontSize: 11 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  sectionLabel:    { color: MUTED, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  playControlBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: `${GREEN}12`, borderWidth: 1, borderColor: `${GREEN}30`, borderRadius: 12, paddingVertical: 10, marginBottom: 14 },
  playControlTxt:  { fontWeight: "800", fontSize: 13 },
  noPreview:   { height: 100, borderRadius: 16, backgroundColor: BG, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: SOFT },
  infoCard:    { backgroundColor: BG, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SOFT },
  infoCardTitle:{ color: TEXT, fontWeight: "800", fontSize: 14, marginBottom: 10 },
  infoCardValue:{ fontSize: 18, fontWeight: "900", marginBottom: 4 },
  infoCardHint: { color: MUTED, fontSize: 11, fontWeight: "600" },
  infoRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: SOFT },
  infoKey:     { color: MUTED, fontWeight: "700", fontSize: 13 },
  infoVal:     { color: TEXT, fontWeight: "700", fontSize: 13, textAlign: "right", flex: 1 },
  reviewerBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD_DIM, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: GOLD_BD, maxWidth: 160 },
  reviewerBtnTxt: { color: GOLD, fontWeight: "800", fontSize: 12, flex: 1 },
  reviewerArrow:  { width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(212,175,55,0.20)", alignItems: "center", justifyContent: "center" },
  rankRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopColor: SOFT },
  rankIdx:  { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankUid:  { color: TEXT, fontWeight: "800", fontSize: 12 },
  rankMeta: { color: MUTED, fontSize: 11, marginTop: 2 },
  actionsRow:   { flexDirection: "row", gap: 12, marginBottom: 12 },
  actionBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1.5 },
  actionBtnTxt: { fontWeight: "900", fontSize: 14 },
  blockedNotice:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: `${PURPLE}10`, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: `${PURPLE}30` },
  blockedNoticeTitle: { color: PURPLE, fontWeight: "900", fontSize: 14 },
  blockedNoticeSub:   { color: MUTED, fontSize: 12, fontWeight: "600", marginTop: 2, lineHeight: 17 },
  closeBtn:    { alignItems: "center", paddingVertical: 13, borderRadius: 16, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, marginBottom: 8 },
  closeBtnTxt: { color: GOLD, fontWeight: "900", fontSize: 14 },
});

// ─── Export ───────────────────────────────────────────────
export default function CadnaDossiers() {
  return <AdminGuard><Screen /></AdminGuard>;
}

// ─── Screen ───────────────────────────────────────────────
function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();   // ← identique à l'original

  const [loading,       setLoading]       = useState(true);
  const [rows,          setRows]          = useState<Dossier[]>([]);
  const [countPending,  setCountPending]  = useState(0);
  const [countApproved, setCountApproved] = useState(0);
  const [countRejected, setCountRejected] = useState(0);
  const [tab,           setTab]           = useState<CadnaStatus>("pending");
  const [selected,      setSelected]      = useState<Dossier | null>(null);

  const [isSupreme,    setIsSupreme]    = useState(false);
  const [supremeUid,   setSupremeUid]   = useState<string | null>(null);  // ✅ FIX 1 — UID pur
  const [supremeAction, setSupremeAction] = useState<"approve"|"reject"|"delete"|"bulk_delete"|"delete_all"|null>(null);
  const [supremeTarget, setSupremeTarget] = useState<Dossier | null>(null);
  const [supremeBusy,   setSupremeBusy]   = useState(false);

  const { supremeDelete } = useSoftDelete();

  // Sélection
  const [selMode,    setSelMode]    = useState(false);
  const [selIds,     setSelIds]     = useState<Set<string>>(new Set());

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success"|"error"|"info"|"warning" } | null>(null);

  const showToast = (title: string, sub: string, type: "success"|"error"|"info"|"warning" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3500);
  };

  // ✅ FIX 1 : stocker UID pur
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isS = (user?.email ?? "").toLowerCase() === SUPREME_EMAIL.toLowerCase();
      setIsSupreme(isS);
      if (isS && user?.id) setSupremeUid(user.id);
    })();
  }, []);

  const loadCounts = async () => {
    const [{ count: p }, { count: a }, { count: r }] = await Promise.all([
      supabase.from("store_products").select("*", { count: "exact", head: true }).eq("cadna_status", "pending"),
      supabase.from("store_products").select("*", { count: "exact", head: true }).eq("cadna_status", "approved"),
      supabase.from("store_products").select("*", { count: "exact", head: true }).eq("cadna_status", "rejected"),
    ]);
    setCountPending(p ?? 0);
    setCountApproved(a ?? 0);
    setCountRejected(r ?? 0);
  };

  const loadRows = async () => {
    const { data, error } = await supabase.rpc("rz_get_all_cadna_products", { p_status: tab });
    if (error) { setRows([]); return; }
    const base = (data || []) as Dossier[];
    // Enrichir avec infos créateur
    const ownerIds = [...new Set(base.map((r: any) => r.owner_uid).filter(Boolean))];
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, avatar_url").in("id", ownerIds);
      const pm: Record<string, any> = {};
      (profiles ?? []).forEach((p: any) => { pm[p.id] = p; });
      setRows(base.map((r: any) => ({
        ...r,
        owner_name:   pm[r.owner_uid]?.full_name  ?? null,
        owner_avatar: pm[r.owner_uid]?.avatar_url ?? null,
      })));
    } else {
      setRows(base);
    }
  };

  const load = async () => {
    setLoading(true);
    await Promise.all([loadCounts(), loadRows()]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cadna-dossiers-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_products" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  // ✅ FIX 2 : updateStatus avec vérification erreur
  const updateStatus = async (productId: string, status: CadnaStatus) => {
    const dossier = rows.find(r => r.id === productId);
    if (dossier && isSupremeLocked(dossier, supremeUid)) {
      showToast("🔒 Action bloquée", "Ce contenu est verrouillé par CAD SUPRÊME.", "error");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) { showToast("Erreur", "Session invalide.", "error"); return; }

    const patch: any = { cadna_status: status, cadna_reviewed_by: uid };
    if (status === "approved") { patch.is_public = true;  patch.approved_at = new Date().toISOString(); }
    if (status === "rejected") { patch.is_public = false; patch.rejected_at = new Date().toISOString(); }

    // ✅ FIX 2 : vérifier l'erreur avant d'afficher succès
    const { error } = await supabase.from("store_products").update(patch).eq("id", productId);
    if (error) {
      showToast("Erreur", error.message, "error");
      return;
    }
    showToast(
      status === "approved" ? "Contenu approuvé ✅" : "Contenu rejeté ❌",
      "Dossier mis à jour avec succès.",
      status === "approved" ? "success" : "error"
    );
    setSelected(null);
    load();
  };

  const openSupremeAction = (dossier: Dossier, action: "approve"|"reject"|"delete") => {
    setSupremeTarget(dossier);
    setSupremeAction(action);
  };

  // ✅ FIX 1+2 : executeSupremeAction — UID pur + error check
  const executeSupremeAction = async () => {
    if (!supremeAction) return;
    setSupremeBusy(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) { setSupremeBusy(false); showToast("Erreur", "Session expirée.", "error"); return; }

    if (supremeAction === "delete_all") {
      const idsToDelete = rows.map(r => r.id);
      let hasError = false;
      for (const id of idsToDelete) {
        const ok = await supremeDelete(id, "PRODUCT", undefined );
        if (!ok) { hasError = true; }
      }
      setSupremeBusy(false);
      if (hasError) {
        showToast("Erreur partielle", "Certains contenus n'ont pas pu être supprimés.", "error");
      } else {
        showToast("🗑️ Corbeille", `${idsToDelete.length} contenus déplacés dans la corbeille.`, "warning");
      }

    } else if (supremeAction === "bulk_delete") {
      const ids = Array.from(selIds);
      let hasError = false;
      for (const id of ids) {
        const ok = await supremeDelete(id, "PRODUCT", undefined );
        if (!ok) { hasError = true; }
      }
      setSupremeBusy(false);
      if (hasError) {
        showToast("Erreur partielle", "Certains contenus n'ont pas pu être supprimés.", "error");
      } else {
        showToast("🗑️ Corbeille", `${ids.length} contenu(s) déplacés dans la corbeille.`, "warning");
      }
      setSelIds(new Set());
      setSelMode(false);

    } else if (supremeAction === "delete" && supremeTarget) {
      const ok = await supremeDelete(
        supremeTarget.id,
        "PRODUCT",
        supremeTarget.title ?? "Ce contenu",
      
      );
      setSupremeBusy(false);
      if (!ok) {
        showToast("Erreur", "Suppression impossible. Vérifie les permissions.", "error");
        return;
      }
      showToast("🗑️ Corbeille", "Contenu déplacé dans la corbeille · Récupérable 30 jours.", "warning");

    } else if (supremeTarget) {
      const status: CadnaStatus = supremeAction === "approve" ? "approved" : "rejected";
      const patch: any = {
        cadna_status:      status,
        cadna_reviewed_by: uid,
        is_public:         status === "approved",
      };
      if (status === "approved") patch.approved_at = new Date().toISOString();
      if (status === "rejected") patch.rejected_at = new Date().toISOString();

      const { error } = await supabase.from("store_products").update(patch).eq("id", supremeTarget.id);
      setSupremeBusy(false);
      if (error) { showToast("Erreur", error.message, "error"); return; }
      showToast(
        status === "approved" ? "✅ Restauré par Supreme" : "❌ Rejeté par Supreme",
        "Décision enregistrée.",
        status === "approved" ? "success" : "error"
      );
    }

    setSupremeTarget(null);
    setSupremeAction(null);
    load();
  };


  const toggleSel = (id: string) => {
    setSelIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); }
      else if (n.size < MAX_SEL) { n.add(id); }
      else { showToast("Limite atteinte", `Max ${MAX_SEL} contenus sélectionnables.`, "warning"); }
      return n;
    });
  };

  const speedKpi = useMemo(() => {
    const decided = rows
      .map(r => hoursBetween(r.created_at, r.approved_at || r.rejected_at))
      .filter((x): x is number => x !== null);
    const avgH = decided.length === 0 ? null : decided.reduce((a, b) => a + b, 0) / decided.length;
    const map: Record<string, { approved: number; rejected: number; total: number }> = {};
    for (const r of rows) {
      if (r.cadna_status === "pending") continue;
      const k = r.cadna_reviewed_by || "INCONNU";
      if (!map[k]) map[k] = { approved: 0, rejected: 0, total: 0 };
      if (r.cadna_status === "approved") map[k].approved++;
      if (r.cadna_status === "rejected") map[k].rejected++;
      map[k].total++;
    }
    const topReviewers = Object.entries(map)
      .map(([uid, v]) => ({ uid, ...v }))
      .sort((a, b) => b.total - a.total).slice(0, 5);
    return { avgH, topReviewers };
  }, [rows]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement CADNA…</Text>
      </View>
    );
  }

  const total = countPending + countApproved + countRejected;

  // ─── RENDER — structure identique à l'original ────────
  return (
    <View style={styles.screen}>

      <IOSToast toast={toast} anim={toastAnim} />

      {/* ── Header — identique à l'original ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => { if (selMode) { setSelMode(false); setSelIds(new Set()); } else router.back(); }}
          style={styles.backBtn}
        >
          <Ionicons name={selMode ? "close" : "chevron-back"} size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>{selMode ? `Sélection (${selIds.size}/${MAX_SEL})` : "Dossiers CADNA"}</Text>
          <Text style={styles.hSub}>{total} dossiers · {tab}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isSupreme && (
            <View style={styles.supremeHeaderBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#000" />
              <Text style={styles.supremeHeaderBadgeTxt}>SUPREME</Text>
            </View>
          )}
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* ── Actions Supreme — bandeau sous le header (pas dans le header) ── */}
      {isSupreme && !selMode && (
        <View style={styles.supremeActionBar}>
          <TouchableOpacity style={styles.supremeActionBtn} onPress={() => setSelMode(true)} activeOpacity={0.8}>
            <Ionicons name="checkmark-done-outline" size={13} color={GOLD} />
            <Text style={styles.supremeActionBtnTxt}>Sélectionner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.supremeActionBtn, { backgroundColor: `${RED}08`, borderColor: `${RED}25` }]}
            onPress={() => { setSupremeAction("delete_all"); setSupremeTarget(null); }} activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={13} color={RED} />
            <Text style={[styles.supremeActionBtnTxt, { color: RED }]}>Supprimer tout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Barre sélection active ── */}
      {selMode && (
        <View style={styles.selBar}>
          <TouchableOpacity onPress={() => { const ids = rows.slice(0, MAX_SEL).map(r => r.id); setSelIds(new Set(ids)); }} activeOpacity={0.8}>
            <Text style={styles.selBarTxt}>Tout sélect.</Text>
          </TouchableOpacity>
          <Text style={styles.selBarCount}>{selIds.size} / {MAX_SEL}</Text>
          <TouchableOpacity
            style={[styles.selBarDeleteBtn, selIds.size === 0 && { opacity: 0.4 }]}
            onPress={() => { if (selIds.size > 0) { setSupremeAction("bulk_delete"); setSupremeTarget(null); } }}
            disabled={selIds.size === 0} activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={14} color="#FFF" />
            <Text style={styles.selBarDeleteTxt}>Supprimer ({selIds.size})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── KPI ── */}
      <View style={styles.kpiRow}>
        {[
          { label: "En attente", value: countPending,  color: GOLD,  icon: "time-outline",             tabKey: "pending"  as CadnaStatus },
          { label: "Approuvés",  value: countApproved, color: GREEN, icon: "checkmark-circle-outline", tabKey: "approved" as CadnaStatus },
          { label: "Rejetés",    value: countRejected, color: RED,   icon: "close-circle-outline",     tabKey: "rejected" as CadnaStatus },
        ].map(k => (
          <TouchableOpacity
            key={k.label}
            style={[styles.kpiCard, tab === k.tabKey && { borderColor: k.color, borderWidth: 2 }]}
            onPress={() => { setTab(k.tabKey); setSelMode(false); setSelIds(new Set()); }} activeOpacity={0.75}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: `${k.color}15` }]}>
              <Ionicons name={k.icon as any} size={16} color={k.color} />
            </View>
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map(t => {
          const count = t.key === "pending" ? countPending : t.key === "approved" ? countApproved : countRejected;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabChip, tab === t.key && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => { setTab(t.key); setSelMode(false); setSelIds(new Set()); }} activeOpacity={0.8}
            >
              <Ionicons name={t.icon as any} size={13} color={tab === t.key ? "#fff" : MUTED} />
              <Text style={[styles.tabChipTxt, tab === t.key && { color: "#fff" }]}>{t.label}</Text>
              <View style={[styles.tabCount, tab === t.key && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={[styles.tabCountTxt, tab === t.key && { color: "#fff" }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isSupreme && (tab === "approved" || tab === "rejected") && !selMode && (
        <View style={styles.supremeInfoBanner}>
          <Ionicons name="flash" size={13} color={GOLD} />
          <Text style={styles.supremeInfoTxt}>
            {tab === "approved" ? "Supreme : appuyez « Modifier statut » pour rejeter" : "Supreme : appuyez « Restaurer » pour approuver"}
          </Text>
        </View>
      )}

      {/* ── Liste ── */}
      <FlatList
        data={rows}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 150, paddingTop: 6 }}
        renderItem={({ item }) => {
          const locked    = isSupremeLocked(item, supremeUid);
          const isChecked = selIds.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.card, locked && styles.cardLocked, isChecked && styles.cardSelected]}
              onPress={() => { if (selMode) toggleSel(item.id); else setSelected(item); }}
              onLongPress={() => { if (isSupreme && !selMode) { setSelMode(true); toggleSel(item.id); } }}
              activeOpacity={0.75}
            >
              {/* ── Top row ── */}
              <View style={styles.cardTop}>
                {/* Checkbox */}
                {selMode && (
                  <View style={[styles.checkbox, isChecked && styles.checkboxOn]}>
                    {isChecked && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                )}
                {/* Vignette */}
                <View style={styles.thumbWrap}>
                  {item.media_path ? (
                    <>
                      <Image source={{ uri: item.media_path }} style={styles.cardThumb} />
                      <View style={styles.thumbPlayOverlay}>
                        <View style={styles.thumbPlayBtn}><Ionicons name="play" size={14} color="#FFF" /></View>
                      </View>
                    </>
                  ) : (
                    <View style={[styles.cardThumb, styles.cardThumbEmpty]}>
                      <Ionicons name="videocam-off-outline" size={20} color={SOFT} />
                    </View>
                  )}
                </View>

                {/* Infos */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title || "Sans titre"}</Text>
                    {locked && <Ionicons name="lock-closed" size={12} color={PURPLE} />}
                  </View>
                  <View style={{ flexDirection: "row", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                    <View style={styles.catBadge}><Text style={styles.catBadgeTxt}>{item.category_code}</Text></View>
                    {item.media_path && (
                      <View style={styles.videoBadge}>
                        <Ionicons name="play-circle" size={10} color={BLUE} />
                        <Text style={styles.videoBadgeTxt}>VIDÉO</Text>
                      </View>
                    )}
                    {locked && (
                      <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={9} color={PURPLE} />
                        <Text style={styles.lockBadgeTxt}>SUPREME</Text>
                      </View>
                    )}
                  </View>
                  {/* ✅ Créateur — bien en dessous, pas à côté du QOB */}
                  {item.owner_name && (
                    <View style={styles.cardCreatorRow}>
                      {item.owner_avatar
                        ? <Image source={{ uri: item.owner_avatar }} style={styles.cardCreatorAv} />
                        : <View style={[styles.cardCreatorAv, { backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }]}><Text style={{ color: GOLD, fontWeight: "900", fontSize: 7 }}>{getInitials(item.owner_name)}</Text></View>
                      }
                      <Text style={styles.cardCreatorName} numberOfLines={1}>{item.owner_name}</Text>
                    </View>
                  )}
                  <Text style={styles.cardDate}>{fmtDate(item.created_at)}</Text>
                </View>

                {/* ✅ FIX 3 : Statut + QOB empilés verticalement à droite — plus d'overlap */}
                <View style={styles.cardRight}>
                  <View style={[styles.statusPill, {
                    backgroundColor: `${statusColor(item.cadna_status)}15`,
                    borderColor:     `${statusColor(item.cadna_status)}35`,
                  }]}>
                    <Ionicons name={item.cadna_status === "approved" ? "checkmark-circle" : item.cadna_status === "rejected" ? "close-circle" : "time"} size={12} color={statusColor(item.cadna_status)} />
                    <Text style={[styles.statusPillTxt, { color: statusColor(item.cadna_status) }]}>
                      {item.cadna_status === "pending" ? "ATTENTE" : item.cadna_status === "approved" ? "VALIDÉ" : "REJETÉ"}
                    </Text>
                  </View>
                  {/* ✅ QOB clairement visible, séparé du bouton Supprimer */}
                  {(item.qob_count ?? 0) > 0 && (
                    <View style={styles.cardQobPill}>
                      <Ionicons name="glasses-outline" size={10} color={GOLD} />
                      <Text style={styles.cardQobTxt}>{fmtN(item.qob_count)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ✅ FIX 3 : Boutons Supreme sur ligne dédiée, sous le contenu */}
              {isSupreme && !selMode && (
                <View style={styles.supremeCardActions}>
                  {item.cadna_status === "approved" && (
                    <TouchableOpacity style={styles.scaRejectBtn} onPress={() => openSupremeAction(item, "reject")} activeOpacity={0.82}>
                      <Ionicons name="close-circle-outline" size={13} color={RED} />
                      <Text style={styles.scaRejectTxt}>Modifier statut</Text>
                    </TouchableOpacity>
                  )}
                  {item.cadna_status === "rejected" && (
                    <TouchableOpacity style={styles.scaRestoreBtn} onPress={() => openSupremeAction(item, "approve")} activeOpacity={0.82}>
                      <Ionicons name="refresh-circle-outline" size={13} color={GREEN} />
                      <Text style={styles.scaRestoreTxt}>Restaurer</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={styles.scaDeleteBtn} onPress={() => openSupremeAction(item, "delete")} activeOpacity={0.82}>
                    <Ionicons name="trash-outline" size={13} color={RED} />
                    <Text style={styles.scaDeleteTxt}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
            <Ionicons name="folder-open-outline" size={42} color={SOFT} />
            <Text style={{ color: MUTED, fontWeight: "600" }}>Aucun dossier</Text>
          </View>
        }
      />

      {/* ── Modals ── */}
      {selected && !selMode && (
        <DossierDetailModal
          dossier={selected}
          supremeUid={supremeUid}
          onClose={() => setSelected(null)}
          onApprove={(id) => updateStatus(id, "approved")}
          onReject={(id)  => updateStatus(id, "rejected")}
          speedKpi={speedKpi}
        />
      )}

      <SupremeActionModal
        visible={!!supremeAction}
        dossier={supremeTarget}
        action={supremeAction}
        bulkCount={selIds.size}
        onConfirm={executeSupremeAction}
        onCancel={() => { setSupremeTarget(null); setSupremeAction(null); }}
        busy={supremeBusy}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Header — IDENTIQUE À L'ORIGINAL ──
  header:    { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:    { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:      { color: MUTED, fontSize: 12, marginTop: 2 },

  supremeHeaderBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GOLD, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  supremeHeaderBadgeTxt: { color: "#000", fontSize: 10, fontWeight: "900" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${GREEN}18`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: `${GREEN}35` },
  liveDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  liveTxt:   { color: GREEN, fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },

  // ── Actions Supreme — bandeau SOUS le header, pas DANS le header ──
  supremeActionBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  supremeActionBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD_DIM, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: GOLD_BD },
  supremeActionBtnTxt: { color: GOLD, fontWeight: "800", fontSize: 12 },

  // ── Barre sélection ──
  selBar:           { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  selBarTxt:        { color: GOLD, fontWeight: "800", fontSize: 12 },
  selBarCount:      { flex: 1, textAlign: "center", color: MUTED, fontWeight: "700", fontSize: 12 },
  selBarDeleteBtn:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: RED, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  selBarDeleteTxt:  { color: "#FFF", fontWeight: "900", fontSize: 12 },

  // ── KPI ──
  kpiRow:      { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  kpiCard:     { flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: SOFT, alignItems: "center", gap: 4 },
  kpiIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  kpiValue:    { fontSize: 22, fontWeight: "900" },
  kpiLabel:    { color: MUTED, fontSize: 10, fontWeight: "700", textAlign: "center" },

  // ── Tabs ──
  tabsRow:     { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tabChip:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: SOFT },
  tabChipTxt:  { color: TEXT, fontWeight: "800", fontSize: 12 },
  tabCount:    { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: "center" },
  tabCountTxt: { color: MUTED, fontWeight: "900", fontSize: 11 },

  supremeInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: GOLD_DIM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: GOLD_BD },
  supremeInfoTxt:    { flex: 1, color: GOLD, fontSize: 11, fontWeight: "700", lineHeight: 15 },

  // ── Cartes ──
  card:         { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: SOFT, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardLocked:   { borderColor: `${PURPLE}40`, borderWidth: 1.5 },
  cardSelected: { borderColor: GOLD, borderWidth: 2 },

  // ── Même structure que l'original — alignItems: center pour le cardTop ──
  cardTop:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 10 },

  checkbox:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: SOFT, backgroundColor: CARD, alignItems: "center", justifyContent: "center" },
  checkboxOn:   { backgroundColor: GOLD, borderColor: GOLD },

  thumbWrap:      { width: 72, height: 72, borderRadius: 12, overflow: "hidden", position: "relative", flexShrink: 0 },
  cardThumb:      { width: 72, height: 72 },
  cardThumbEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: BG },
  thumbPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.30)", alignItems: "center", justifyContent: "center" },
  thumbPlayBtn:     { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.50)" },

  cardTitle: { color: TEXT, fontWeight: "800", fontSize: 14, flex: 1 },
  cardDate:  { color: MUTED, fontSize: 11, marginTop: 4 },

  // Créateur dans la carte
  cardCreatorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  cardCreatorAv:  { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: GOLD_BD, flexShrink: 0 },
  cardCreatorName:{ color: MUTED, fontWeight: "700", fontSize: 10, flex: 1 },

  catBadge:    { backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  catBadgeTxt: { color: GOLD, fontSize: 10, fontWeight: "800" },
  videoBadge:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,122,255,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(0,122,255,0.20)" },
  videoBadgeTxt:{ color: BLUE, fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  lockBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${PURPLE}10`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: `${PURPLE}30` },
  lockBadgeTxt:{ color: PURPLE, fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },

  // ✅ FIX 3 : Colonne droite — statut + QOB empilés, pas côte à côte avec Supprimer
  cardRight:    { alignItems: "flex-end", gap: 5, flexShrink: 0 },
  statusPill:   { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  statusPillTxt:{ fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  cardQobPill:  { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  cardQobTxt:   { color: GOLD, fontWeight: "800", fontSize: 10 },

  // ✅ FIX 3 : Boutons Supreme — ligne séparée SOUS le contenu
  supremeCardActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: BG },
  scaRejectBtn:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${RED}10`, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: `${RED}28` },
  scaRejectTxt:  { color: RED, fontWeight: "800", fontSize: 11 },
  scaRestoreBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${GREEN}10`, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: `${GREEN}28` },
  scaRestoreTxt: { color: GREEN, fontWeight: "800", fontSize: 11 },
  scaDeleteBtn:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${RED}08`, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: `${RED}20` },
  scaDeleteTxt:  { color: RED, fontWeight: "700", fontSize: 11 },

  // ── Toast ──
  iosToast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  iosToastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});