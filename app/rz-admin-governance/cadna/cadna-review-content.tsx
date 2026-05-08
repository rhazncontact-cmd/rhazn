/* ======================================================
🛡️ CAD SUPRÊME — Override Panel
RHAZN • Accès Supreme uniquement

✅ Voit TOUT le contenu (pending + approved + rejected)
✅ Approuver / Rejeter / Restaurer n'importe quel contenu
✅ Modifier le titre d'un contenu (Supreme only)
✅ Supprimer définitivement un contenu (Supreme only)
✅ Décision Supreme = verrou SUPREME_LOCK — irrevocable
   sauf par Supreme lui-même
====================================================== */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

// ─── Palette ───────────────────────────────────────────────
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
const ORANGE   = "#FF9500";
const PURPLE   = "#AF52DE";
const DARK     = "#000000";

// ✅ Préfixe verrou Supreme — stocké dans cadna_reviewed_by
export const SUPREME_LOCK_PREFIX = "SUPREME:";

const SUPABASE_URL = "https://mxxlchaygarszkygmylo.supabase.co";
const { width: SW } = Dimensions.get("window");

// ─── Types ─────────────────────────────────────────────────
type CadnaStatus = "pending" | "approved" | "rejected";

type ContentItem = {
  id:                 string;
  title:              string | null;
  category_code:      string | null;
  product_type:       string | null;
  media_path:         string | null;
  cadna_status:       CadnaStatus;
  created_at:         string;
  approved_at?:       string | null;
  rejected_at?:       string | null;
  cadna_reviewed_by?: string | null;
  owner_uid?:         string | null;
};

type CreatorProfile = {
  id:         string;
  full_name:  string | null;
  avatar_url: string | null;
  role:       string | null;
};

// ✅ Verrouillé si cadna_reviewed_by commence par "SUPREME:"
export function isSupremeLocked(item: { cadna_reviewed_by?: string | null }): boolean {
  return (item.cadna_reviewed_by ?? "").startsWith(SUPREME_LOCK_PREFIX);
}

const FILTER_TABS: { key: CadnaStatus | "all" | "locked"; label: string; icon: string; color: string }[] = [
  { key: "all",      label: "Tout",        icon: "layers-outline",            color: GOLD   },
  { key: "pending",  label: "En attente",  icon: "time-outline",              color: ORANGE },
  { key: "approved", label: "Approuvés",   icon: "checkmark-circle-outline",  color: GREEN  },
  { key: "rejected", label: "Rejetés",     icon: "close-circle-outline",      color: RED    },
  { key: "locked",   label: "Verrouillés", icon: "lock-closed-outline",       color: PURPLE },
];

// ─── Helpers ───────────────────────────────────────────────
const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

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

const statusColor  = (s: CadnaStatus) => s === "approved" ? GREEN : s === "rejected" ? RED : ORANGE;
const statusLabel  = (s: CadnaStatus) => s === "approved" ? "VALIDÉ" : s === "rejected" ? "REJETÉ" : "ATTENTE";
const statusIcon   = (s: CadnaStatus): any =>
  s === "approved" ? "checkmark-circle" : s === "rejected" ? "close-circle" : "time";

// ─── Toast iOS ─────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" | "warning" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color =
    toast.type === "success" ? GREEN :
    toast.type === "error"   ? RED   :
    toast.type === "warning" ? ORANGE : BLUE;
  const icon: any =
    toast.type === "success" ? "checkmark-circle" :
    toast.type === "error"   ? "close-circle"     :
    toast.type === "warning" ? "warning"           : "information-circle";
  return (
    <Animated.View style={[st.iosToast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }]}>
      <View style={[st.iosToastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.iosToastTitle}>{toast.title}</Text>
        <Text style={st.iosToastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Lecteur vidéo inline ──────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// ✅ MODAL MODIFIER LE TITRE — Supreme only
// ─────────────────────────────────────────────────────────
function EditTitleModal({ visible, currentTitle, onSave, onCancel, saving }: {
  visible:      boolean;
  currentTitle: string;
  onSave:       (newTitle: string) => void;
  onCancel:     () => void;
  saving:       boolean;
}) {
  const [value, setValue] = useState(currentTitle);
  const scale = useRef(new Animated.Value(0.88)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setValue(currentTitle);
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(op,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.88); op.setValue(0); }
  }, [visible, currentTitle]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <Pressable style={et.backdrop} onPress={onCancel}>
        <Animated.View
          style={[et.card, { transform: [{ scale }], opacity: op }]}
          onStartShouldSetResponder={() => true}
        >
          {/* En-tête */}
          <View style={et.headerRow}>
            <View style={et.headerIcon}>
              <Ionicons name="pencil" size={18} color={GOLD} />
            </View>
            <View>
              <Text style={et.headerTitle}>Modifier le titre</Text>
              <Text style={et.headerSub}>Action Supreme · Irrevocable</Text>
            </View>
          </View>

          {/* Champ */}
          <TextInput
            value={value}
            onChangeText={setValue}
            style={et.input}
            placeholder="Nouveau titre…"
            placeholderTextColor={MUTED}
            maxLength={120}
            multiline
            autoFocus
          />
          <Text style={et.counter}>{value.length}/120</Text>

          {/* Boutons */}
          <View style={et.btnRow}>
            <TouchableOpacity style={et.cancelBtn} onPress={onCancel} disabled={saving} activeOpacity={0.8}>
              <Text style={et.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[et.saveBtn, (!value.trim() || saving) && { opacity: 0.5 }]}
              onPress={() => onSave(value.trim())}
              disabled={!value.trim() || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#000" />
                : <><Ionicons name="checkmark-circle" size={16} color="#000" /><Text style={et.saveTxt}>Enregistrer</Text></>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const et = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card:       { width: "100%", backgroundColor: CARD, borderRadius: 24, padding: 22, gap: 14, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 18 },
  headerRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  headerTitle:{ color: TEXT, fontWeight: "900", fontSize: 16 },
  headerSub:  { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },
  input:      { backgroundColor: BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: TEXT, fontSize: 15, fontWeight: "700", borderWidth: 1, borderColor: SOFT, minHeight: 72, textAlignVertical: "top" },
  counter:    { color: MUTED, fontSize: 11, textAlign: "right" },
  btnRow:     { flexDirection: "row", gap: 10 },
  cancelBtn:  { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 14, backgroundColor: BG, borderWidth: 1, borderColor: SOFT },
  cancelTxt:  { color: MUTED, fontWeight: "800", fontSize: 14 },
  saveBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 14, backgroundColor: GOLD },
  saveTxt:    { color: "#000", fontWeight: "900", fontSize: 14 },
});

// ─────────────────────────────────────────────────────────
// MODAL DÉTAIL SUPREME
// ─────────────────────────────────────────────────────────
function SupremeDetailModal({ item, creator, onClose, onAction, onDelete, onEditTitle }: {
  item:         ContentItem;
  creator:      CreatorProfile | null;
  onClose:      () => void;
  onAction:     (id: string, action: "approve" | "reject" | "restore") => Promise<void>;
  onDelete:     (id: string, title: string | null) => void;
  onEditTitle:  (id: string, currentTitle: string | null) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy,      setBusy]      = useState(false);
  const videoUrl  = resolveVideoUrl(item.media_path);
  const locked    = isSupremeLocked(item);
  const statusC   = statusColor(item.cadna_status);

  const handleAction = async (action: "approve" | "reject" | "restore") => {
    if (busy) return;
    setBusy(true);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setIsPlaying(false);
    await onAction(item.id, action);
    setBusy(false);
  };

  // Actions selon statut
  const actions = useMemo(() => {
    if (item.cadna_status === "pending")  return [
      { key: "approve" as const, label: "Approuver",      icon: "checkmark-circle-outline", color: GREEN },
      { key: "reject"  as const, label: "Rejeter",        icon: "close-circle-outline",     color: RED   },
    ];
    if (item.cadna_status === "approved") return [
      { key: "reject"  as const, label: "Révoquer",       icon: "close-circle-outline",     color: RED   },
    ];
    return [
      { key: "restore" as const, label: "Restaurer",      icon: "refresh-circle-outline",   color: GREEN },
      { key: "reject"  as const, label: "Confirmer rejet",icon: "ban-outline",              color: RED   },
    ];
  }, [item.cadna_status]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheetOuter}>
        <ScrollView style={md.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={md.handle} />

          {/* ── Bannière Supreme ── */}
          <View style={md.supremeBanner}>
            <Ionicons name="shield-checkmark" size={14} color="#000" />
            <Text style={md.supremeBannerTxt}>CAD SUPRÊME · Override autorisé</Text>
          </View>

          {/* ✅ Badge verrouillage si déjà décidé par Supreme */}
          {locked && (
            <View style={md.lockBanner}>
              <Ionicons name="lock-closed" size={13} color={PURPLE} />
              <Text style={md.lockBannerTxt}>Verrouillé · Décision Supreme irrevocable</Text>
            </View>
          )}

          {/* ── Créateur ── */}
          {creator && (
            <View style={md.creatorRow}>
              {creator.avatar_url ? (
                <Image source={{ uri: creator.avatar_url }} style={md.creatorAvatar} />
              ) : (
                <View style={[md.creatorAvatar, md.creatorAvatarFallback]}>
                  <Text style={md.creatorInitials}>{getInitials(creator.full_name)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={md.creatorName} numberOfLines={1}>{creator.full_name ?? "Créateur RHAZN"}</Text>
                {creator.role && <Text style={md.creatorSub}>{creator.role.toUpperCase()}</Text>}
              </View>
              <View style={[md.statusChip, { backgroundColor: `${statusC}15`, borderColor: `${statusC}35` }]}>
                <Ionicons name={statusIcon(item.cadna_status)} size={12} color={statusC} />
                <Text style={[md.statusChipTxt, { color: statusC }]}>{statusLabel(item.cadna_status)}</Text>
              </View>
            </View>
          )}

          {/* ── Titre ── */}
          <Text style={md.title} numberOfLines={3}>{item.title || "Sans titre"}</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {item.category_code && (
              <View style={md.catBadge}><Text style={md.catBadgeTxt}>{item.category_code}</Text></View>
            )}
            {item.product_type && (
              <View style={md.typeBadge}><Text style={md.typeBadgeTxt}>{item.product_type}</Text></View>
            )}
          </View>

          {/* ── Lecteur vidéo ── */}
          {videoUrl ? (
            <>
              <View style={md.sectionLabel}>
                <Ionicons name="play-circle-outline" size={13} color={MUTED} />
                <Text style={md.sectionLabelTxt}>APERÇU VIDÉO</Text>
              </View>
              <InlineVideoPlayer videoUrl={videoUrl} isPlaying={isPlaying} onToggle={() => setIsPlaying(p => !p)} />
              <TouchableOpacity
                style={[md.playCtrl, isPlaying && { backgroundColor: `${MUTED}15`, borderColor: `${MUTED}30` }]}
                onPress={() => setIsPlaying(p => !p)} activeOpacity={0.8}
              >
                <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={18} color={isPlaying ? MUTED : GREEN} />
                <Text style={[md.playCtrlTxt, { color: isPlaying ? MUTED : GREEN }]}>
                  {isPlaying ? "Pause" : "Lire la vidéo"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={md.noMedia}>
              <Ionicons name="videocam-off-outline" size={26} color={MUTED} />
              <Text style={{ color: MUTED, fontWeight: "600", marginTop: 6 }}>Aucun média</Text>
            </View>
          )}

          {/* ── Historique ── */}
          <View style={md.infoCard}>
            <Text style={md.infoCardTitle}>📋 Historique</Text>
            {[
              { k: "Soumis le",   v: fmtDate(item.created_at)  },
              { k: "Approuvé le", v: fmtDate(item.approved_at) },
              { k: "Rejeté le",   v: fmtDate(item.rejected_at) },
              {
                k: "Révisé par",
                v: item.cadna_reviewed_by
                  ? (locked
                      ? "⚡ CAD SUPRÊME"
                      : item.cadna_reviewed_by.slice(0, 16) + "…")
                  : "—",
              },
            ].map(row => (
              <View key={row.k} style={md.infoRow}>
                <Text style={md.infoKey}>{row.k}</Text>
                <Text style={[md.infoVal, row.k === "Révisé par" && locked && { color: PURPLE, fontWeight: "900" }]}>
                  {row.v}
                </Text>
              </View>
            ))}
          </View>

          {/* ══════════════════════════════════════
              ✅ ZONE ACTIONS SUPREME
              ══════════════════════════════════════ */}
          <View style={md.supremeZone}>
            <View style={md.supremeZoneHeader}>
              <Ionicons name="flash" size={15} color={GOLD} />
              <Text style={md.supremeZoneTitle}>Pouvoirs Supreme</Text>
              <View style={md.supremeZoneBadge}>
                <Text style={md.supremeZoneBadgeTxt}>IRREVOCABLE</Text>
              </View>
            </View>

            {/* ── Bloc 1 : Statut ── */}
            <Text style={md.supremeSubLabel}>
              <Ionicons name="swap-horizontal-outline" size={11} color={MUTED} /> Changer le statut
            </Text>
            <View style={md.actionsRow}>
              {actions.map(a => (
                <TouchableOpacity
                  key={a.key}
                  style={[md.actionBtn, { backgroundColor: `${a.color}15`, borderColor: `${a.color}40` }, busy && { opacity: 0.55 }]}
                  onPress={() => handleAction(a.key)}
                  disabled={busy}
                  activeOpacity={0.8}
                >
                  {busy
                    ? <ActivityIndicator size="small" color={a.color} />
                    : <>
                        <Ionicons name={a.icon as any} size={17} color={a.color} />
                        <Text style={[md.actionBtnTxt, { color: a.color }]}>{a.label}</Text>
                      </>
                  }
                </TouchableOpacity>
              ))}
            </View>

            {/* Séparateur */}
            <View style={md.supremeDivider} />

            {/* ── Bloc 2 : Modifier + Supprimer ── */}
            <Text style={md.supremeSubLabel}>
              <Ionicons name="settings-outline" size={11} color={MUTED} /> Gestion du contenu
            </Text>
            <View style={md.managementRow}>

              {/* ✅ MODIFIER LE TITRE */}
              <TouchableOpacity
                style={md.editBtn}
                onPress={() => { setIsPlaying(false); onEditTitle(item.id, item.title); }}
                activeOpacity={0.82}
              >
                <View style={md.editBtnIcon}>
                  <Ionicons name="pencil" size={16} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={md.editBtnLabel}>Modifier le titre</Text>
                  <Text style={md.editBtnSub}>Renommer ce contenu</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={MUTED} />
              </TouchableOpacity>

              {/* ✅ SUPPRIMER DÉFINITIVEMENT */}
              <TouchableOpacity
                style={md.deleteBtn}
                onPress={() => { setIsPlaying(false); onDelete(item.id, item.title); }}
                activeOpacity={0.82}
              >
                <View style={md.deleteBtnIcon}>
                  <Ionicons name="trash" size={16} color={RED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={md.deleteBtnLabel}>Supprimer définitivement</Text>
                  <Text style={md.deleteBtnSub}>Action irrevocable · Aucune récupération</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={MUTED} />
              </TouchableOpacity>
            </View>

            {/* Note irrevocable */}
            <View style={md.irrevNote}>
              <Ionicons name="information-circle-outline" size={14} color={MUTED} />
              <Text style={md.irrevNoteTxt}>
                Toute décision Supreme est verrouillée. Seul Supreme peut la modifier ultérieurement.
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => { setIsPlaying(false); onClose(); }} style={md.closeBtn}>
            <Text style={md.closeBtnTxt}>Fermer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const md = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetOuter: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "94%" },
  sheet:      { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderColor: SOFT },
  handle:     { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 12 },

  supremeBanner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: GOLD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
    marginBottom: 10, justifyContent: "center",
    shadowColor: GOLD, shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  supremeBannerTxt: { color: "#000", fontWeight: "900", fontSize: 12, letterSpacing: 0.3 },

  lockBanner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: `${PURPLE}12`, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 10, borderWidth: 1, borderColor: `${PURPLE}30`,
  },
  lockBannerTxt: { color: PURPLE, fontWeight: "800", fontSize: 11, flex: 1 },

  creatorRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: BG, borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: SOFT,
  },
  creatorAvatar:         { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: GOLD },
  creatorAvatarFallback: { backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  creatorInitials:       { color: GOLD, fontWeight: "900", fontSize: 18 },
  creatorName:           { color: TEXT, fontWeight: "800", fontSize: 15 },
  creatorSub:            { color: MUTED, fontSize: 11, marginTop: 2 },
  statusChip:    { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  statusChipTxt: { fontSize: 10, fontWeight: "900" },

  title:       { color: TEXT, fontWeight: "900", fontSize: 18, marginBottom: 8 },
  catBadge:    { backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  catBadgeTxt: { color: GOLD, fontSize: 10, fontWeight: "800" },
  typeBadge:   { backgroundColor: "rgba(0,122,255,0.10)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(0,122,255,0.25)" },
  typeBadgeTxt:{ color: BLUE, fontSize: 10, fontWeight: "800" },

  sectionLabel:    { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  sectionLabelTxt: { color: MUTED, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  playCtrl: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: `${GREEN}12`, borderWidth: 1, borderColor: `${GREEN}30`,
    borderRadius: 12, paddingVertical: 10, marginBottom: 14,
  },
  playCtrlTxt: { fontWeight: "800", fontSize: 13 },
  noMedia: { height: 90, borderRadius: 16, backgroundColor: BG, alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 1, borderColor: SOFT },

  infoCard:      { backgroundColor: BG, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: SOFT },
  infoCardTitle: { color: TEXT, fontWeight: "800", fontSize: 14, marginBottom: 10 },
  infoRow:       { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: SOFT },
  infoKey:       { color: MUTED, fontWeight: "700", fontSize: 13 },
  infoVal:       { color: TEXT, fontWeight: "700", fontSize: 13, textAlign: "right", flex: 1 },

  // ✅ Zone des pouvoirs Supreme
  supremeZone: {
    backgroundColor: GOLD_DIM, borderRadius: 20, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: GOLD_BD,
    gap: 10,
  },
  supremeZoneHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  supremeZoneTitle:  { color: GOLD, fontWeight: "900", fontSize: 15, flex: 1 },
  supremeZoneBadge:  { backgroundColor: "rgba(212,175,55,0.25)", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  supremeZoneBadgeTxt: { color: GOLD, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },

  supremeSubLabel: { color: MUTED, fontWeight: "700", fontSize: 11, letterSpacing: 0.3 },
  supremeDivider:  { height: 1, backgroundColor: "rgba(212,175,55,0.25)", marginVertical: 4 },

  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, paddingVertical: 13, borderWidth: 1.5 },
  actionBtnTxt: { fontWeight: "900", fontSize: 13 },

  // ✅ Boutons Modifier + Supprimer
  managementRow: { gap: 10 },

  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: GOLD_BD,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  editBtnIcon:  { width: 38, height: 38, borderRadius: 11, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  editBtnLabel: { color: TEXT, fontWeight: "800", fontSize: 14 },
  editBtnSub:   { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: `${RED}30`,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  deleteBtnIcon:  { width: 38, height: 38, borderRadius: 11, backgroundColor: `${RED}10`, borderWidth: 1, borderColor: `${RED}30`, alignItems: "center", justifyContent: "center" },
  deleteBtnLabel: { color: RED, fontWeight: "900", fontSize: 14 },
  deleteBtnSub:   { color: MUTED, fontSize: 11, fontWeight: "600", marginTop: 1 },

  irrevNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.20)",
  },
  irrevNoteTxt: { flex: 1, color: MUTED, fontSize: 11, fontWeight: "600", lineHeight: 16 },

  closeBtn:    { alignItems: "center", paddingVertical: 13, borderRadius: 16, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD },
  closeBtnTxt: { color: GOLD, fontWeight: "900", fontSize: 14 },
});

// ─── Export ────────────────────────────────────────────────
export default function CadnaReviewContent() {
  return <AdminGuard><Screen /></AdminGuard>;
}

// ─── Screen principal ──────────────────────────────────────
function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,   setLoading]   = useState(true);
  const [items,     setItems]     = useState<ContentItem[]>([]);
  const [filter,    setFilter]    = useState<CadnaStatus | "all" | "locked">("all");
  const [selected,  setSelected]  = useState<ContentItem | null>(null);
  const [creator,   setCreator]   = useState<CreatorProfile | null>(null);

  const [cntPending,  setCntPending]  = useState(0);
  const [cntApproved, setCntApproved] = useState(0);
  const [cntRejected, setCntRejected] = useState(0);
  const [cntLocked,   setCntLocked]   = useState(0);

  // ✅ État modal modifier titre
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTargetId,     setEditTargetId]     = useState("");
  const [editCurrentTitle, setEditCurrentTitle] = useState("");
  const [savingTitle,      setSavingTitle]      = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success" | "error" | "info" | "warning" } | null>(null);

  const showToast = (title: string, sub: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  // ── Charger tout le contenu ────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_products")
      .select("id, title, category_code, product_type, media_path, cadna_status, created_at, approved_at, rejected_at, cadna_reviewed_by, owner_uid")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && data) {
      const all = data as ContentItem[];
      setItems(all);
      setCntPending(all.filter(d => d.cadna_status === "pending").length);
      setCntApproved(all.filter(d => d.cadna_status === "approved").length);
      setCntRejected(all.filter(d => d.cadna_status === "rejected").length);
      setCntLocked(all.filter(d => isSupremeLocked(d)).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase.channel("supreme-panel-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_products" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Ouvrir un item ─────────────────────────────────────
  const openItem = async (item: ContentItem) => {
    setSelected(item);
    if (item.owner_uid) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", item.owner_uid)
        .maybeSingle();
      setCreator(data ?? null);
    } else {
      setCreator(null);
    }
  };

  // ── Action Supreme (approve / reject / restore) ────────
  // ✅ Écrit "SUPREME:<uid>" pour verrouiller le contenu
  const handleAction = async (id: string, action: "approve" | "reject" | "restore") => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id ?? "UNKNOWN";
    const supremeTag = `${SUPREME_LOCK_PREFIX}${uid}`;

    let status: CadnaStatus = action === "approve" || action === "restore" ? "approved" : "rejected";

    const patch: any = {
      cadna_status:      status,
      cadna_reviewed_by: supremeTag,
      is_public:         status === "approved",
    };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    if (status === "rejected") patch.rejected_at = new Date().toISOString();

    const { error } = await supabase.from("store_products").update(patch).eq("id", id);
    if (error) { showToast("Erreur", error.message, "error"); return; }

    const labels: Record<string, string> = {
      approve: "✅ Approuvé · Verrouillé par Supreme",
      restore: "♻️ Restauré · Verrouillé par Supreme",
      reject:  "❌ Rejeté · Verrouillé par Supreme",
    };
    showToast(labels[action], "Décision irrevocable enregistrée.", action === "reject" ? "error" : "success");
    setSelected(null);
    loadAll();
  };

  // ✅ MODIFIER LE TITRE — ouvre le modal
  const handleEditTitle = (id: string, currentTitle: string | null) => {
    setSelected(null);   // ferme le modal détail
    setEditTargetId(id);
    setEditCurrentTitle(currentTitle ?? "");
    setEditModalVisible(true);
  };

  // ✅ SAUVEGARDER LE TITRE
  const handleSaveTitle = async (newTitle: string) => {
    if (!newTitle.trim() || !editTargetId) return;
    setSavingTitle(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id ?? "UNKNOWN";
    const supremeTag = `${SUPREME_LOCK_PREFIX}${uid}`;

    const { error } = await supabase
      .from("store_products")
      .update({
        title:              newTitle.trim(),
        cadna_reviewed_by:  supremeTag,   // ✅ verrouillage maintenu
      })
      .eq("id", editTargetId);

    setSavingTitle(false);

    if (error) { showToast("Erreur", error.message, "error"); return; }

    showToast("✏️ Titre modifié", `"${newTitle.trim()}"`, "success");
    setEditModalVisible(false);
    loadAll();
  };

  // ✅ SUPPRIMER — confirmation Alert native avant action
  const handleDelete = (id: string, title: string | null) => {
    setSelected(null);   // ferme le modal détail
    setTimeout(() => {
      Alert.alert(
        "⚠️ Suppression définitive",
        `Ce contenu sera supprimé de façon permanente et irrevocable.\n\n"${title || "Sans titre"}"\n\nCette action est réservée à CAD SUPRÊME. Confirmez-vous ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer définitivement",
            style: "destructive",
            onPress: async () => {
              const { error } = await supabase
                .from("store_products")
                .delete()
                .eq("id", id);

              if (error) {
                showToast("Erreur suppression", error.message, "error");
                return;
              }
              try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
              showToast("🗑️ Contenu supprimé", "Suppression irrevocable effectuée.", "warning");
              loadAll();
            },
          },
        ],
        { cancelable: true }
      );
    }, 300); // délai pour laisser le modal se fermer
  };

  // ── Filtre local ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (filter === "locked")   return items.filter(i => isSupremeLocked(i));
    if (filter === "all")      return items;
    return items.filter(i => i.cadna_status === filter);
  }, [items, filter]);

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement Supreme…</Text>
      </View>
    );
  }

  return (
    <View style={st.screen}>

      <IOSToast toast={toast} anim={toastAnim} />

      {/* ── Header ──────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="chevron-back" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.hTitle}>CAD SUPRÊME</Text>
          <Text style={st.hSub}>Override absolu · {items.length} contenus</Text>
        </View>
        <View style={st.supremeBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#000" />
          <Text style={st.supremeBadgeTxt}>SUPREME</Text>
        </View>
      </View>

      {/* ── KPI ─────────────────────────────────────────── */}
      <View style={st.kpiRow}>
        {[
          { label: "Attente",      value: cntPending,  color: ORANGE,  key: "pending"  as const },
          { label: "Approuvés",    value: cntApproved, color: GREEN,   key: "approved" as const },
          { label: "Rejetés",      value: cntRejected, color: RED,     key: "rejected" as const },
          { label: "Verrouillés",  value: cntLocked,   color: PURPLE,  key: "locked"   as const },
        ].map(k => (
          <TouchableOpacity
            key={k.key}
            style={[st.kpiCard, filter === k.key && { borderColor: k.color, borderWidth: 2 }]}
            onPress={() => setFilter(prev => prev === k.key ? "all" : k.key)}
            activeOpacity={0.75}
          >
            <Text style={[st.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={st.kpiLabel}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tabs ────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabsRow}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[st.tabChip, filter === t.key && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setFilter(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon as any} size={13} color={filter === t.key ? "#fff" : MUTED} />
            <Text style={[st.tabChipTxt, filter === t.key && { color: "#fff" }]}>{t.label}</Text>
            <View style={[st.tabCount, filter === t.key && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={[st.tabCountTxt, filter === t.key && { color: "#fff" }]}>
                {t.key === "all"      ? items.length   :
                 t.key === "pending"  ? cntPending      :
                 t.key === "approved" ? cntApproved     :
                 t.key === "rejected" ? cntRejected     :
                                        cntLocked}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Liste ───────────────────────────────────────── */}
      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60, paddingTop: 6 }}
        renderItem={({ item }) => {
          const sc     = statusColor(item.cadna_status);
          const locked = isSupremeLocked(item);
          return (
            <TouchableOpacity
              style={[st.card, item.cadna_status === "rejected" && st.cardRejected, locked && st.cardLocked]}
              onPress={() => openItem(item)}
              activeOpacity={0.75}
            >
              <View style={st.cardTop}>
                {/* Vignette */}
                <View style={st.thumbWrap}>
                  {item.media_path ? (
                    <>
                      <Image source={{ uri: item.media_path }} style={st.thumb} />
                      <View style={st.thumbOverlay}>
                        <View style={st.thumbPlayBtn}>
                          <Ionicons name="play" size={12} color="#FFF" />
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={[st.thumb, st.thumbEmpty]}>
                      <Ionicons name="videocam-off-outline" size={18} color={SOFT} />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Text style={st.cardTitle} numberOfLines={1}>{item.title || "Sans titre"}</Text>
                    {locked && <Ionicons name="lock-closed" size={12} color={PURPLE} />}
                  </View>
                  <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
                    {item.category_code && (
                      <View style={st.catBadge}><Text style={st.catBadgeTxt}>{item.category_code}</Text></View>
                    )}
                    {locked && (
                      <View style={st.lockBadge}>
                        <Ionicons name="lock-closed" size={9} color={PURPLE} />
                        <Text style={st.lockBadgeTxt}>SUPREME</Text>
                      </View>
                    )}
                    {!!item.media_path && (
                      <View style={st.videoBadge}>
                        <Ionicons name="play-circle" size={9} color={BLUE} />
                        <Text style={st.videoBadgeTxt}>VIDÉO</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.cardDate}>{fmtDate(item.created_at)}</Text>
                </View>

                {/* Statut + icônes action rapide */}
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View style={[st.statusPill, { backgroundColor: `${sc}15`, borderColor: `${sc}35` }]}>
                    <Ionicons name={statusIcon(item.cadna_status)} size={11} color={sc} />
                    <Text style={[st.statusPillTxt, { color: sc }]}>{statusLabel(item.cadna_status)}</Text>
                  </View>
                  {/* ✅ Icônes Modifier + Supprimer visibles sur la carte */}
                  <View style={st.cardQuickActions}>
                    <TouchableOpacity
                      style={st.cardQuickEdit}
                      onPress={(e) => { e.stopPropagation?.(); handleEditTitle(item.id, item.title); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={13} color={GOLD} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={st.cardQuickDelete}
                      onPress={(e) => { e.stopPropagation?.(); handleDelete(item.id, item.title); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash" size={13} color={RED} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Hint */}
              <View style={st.cardHint}>
                <Ionicons name="flash" size={10} color={GOLD} />
                <Text style={st.cardHintTxt}>
                  {item.cadna_status === "pending"  && "Tapez pour approuver, rejeter, modifier ou supprimer"}
                  {item.cadna_status === "approved" && "Tapez pour révoquer, modifier ou supprimer"}
                  {item.cadna_status === "rejected" && "Tapez pour restaurer, confirmer, modifier ou supprimer"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
            <Ionicons name="layers-outline" size={42} color={SOFT} />
            <Text style={{ color: MUTED, fontWeight: "600" }}>Aucun contenu</Text>
          </View>
        }
      />

      {/* ── Modals ──────────────────────────────────────── */}
      {selected && (
        <SupremeDetailModal
          item={selected}
          creator={creator}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onDelete={handleDelete}
          onEditTitle={handleEditTitle}
        />
      )}

      {/* ✅ Modal modification titre */}
      <EditTitleModal
        visible={editModalVisible}
        currentTitle={editCurrentTitle}
        onSave={handleSaveTitle}
        onCancel={() => setEditModalVisible(false)}
        saving={savingTitle}
      />

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:         { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:          { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:            { color: MUTED, fontSize: 12, marginTop: 2 },
  supremeBadge:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  supremeBadgeTxt: { color: "#000", fontSize: 11, fontWeight: "900" },

  kpiRow:   { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  kpiCard:  { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: SOFT, alignItems: "center", gap: 2 },
  kpiValue: { fontSize: 20, fontWeight: "900" },
  kpiLabel: { color: MUTED, fontSize: 9, fontWeight: "700", textAlign: "center" },

  tabsRow:     { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tabChip:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: SOFT },
  tabChipTxt:  { color: TEXT, fontWeight: "800", fontSize: 11 },
  tabCount:    { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center" },
  tabCountTxt: { color: MUTED, fontWeight: "900", fontSize: 10 },

  card:         { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: SOFT, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardRejected: { borderColor: `${RED}30`, borderWidth: 1.5 },
  cardLocked:   { borderColor: `${PURPLE}40`, borderWidth: 1.5 },
  cardTop:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingBottom: 8 },
  thumbWrap:    { width: 66, height: 66, borderRadius: 12, overflow: "hidden", flexShrink: 0, position: "relative" },
  thumb:        { width: 66, height: 66 },
  thumbEmpty:   { backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)", alignItems: "center", justifyContent: "center" },
  thumbPlayBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },
  cardTitle:    { color: TEXT, fontWeight: "800", fontSize: 14, flex: 1 },
  cardDate:     { color: MUTED, fontSize: 11, marginTop: 3 },
  catBadge:     { backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: GOLD_BD },
  catBadgeTxt:  { color: GOLD, fontSize: 9, fontWeight: "800" },
  lockBadge:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${PURPLE}10`, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: `${PURPLE}30` },
  lockBadgeTxt: { color: PURPLE, fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  videoBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,122,255,0.10)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(0,122,255,0.20)" },
  videoBadgeTxt:{ color: BLUE, fontSize: 9, fontWeight: "900" },
  statusPill:   { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5, borderWidth: 1 },
  statusPillTxt:{ fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },

  // ✅ Actions rapides sur la carte (icônes pencil + trash)
  cardQuickActions: { flexDirection: "row", gap: 6 },
  cardQuickEdit:    { width: 28, height: 28, borderRadius: 8, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  cardQuickDelete:  { width: 28, height: 28, borderRadius: 8, backgroundColor: `${RED}10`, borderWidth: 1, borderColor: `${RED}30`, alignItems: "center", justifyContent: "center" },

  cardHint:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingBottom: 11 },
  cardHintTxt:  { color: MUTED, fontSize: 11, fontWeight: "600" },

  iosToast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  iosToastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});