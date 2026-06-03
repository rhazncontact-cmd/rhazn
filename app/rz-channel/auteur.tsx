/* ================================================================
📱 RHAZN — PAGE AUTEUR
   app/rz-channel/auteur.tsx
✅ Nouvelle logique ACSET : par palier de 20 TAN (géré SQL)
✅ QOB : uniquement premier achat (géré SQL)
✅ Accès 30 jours (user_content_access DB)
✅ Présence vendeur temps réel
✅ GalleryViewer swipe ←→
================================================================ */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MusicDownloadModal from "../../components/MusicDownloadModal";
import VideoRhazn from "../../components/VideoRhazn";
import { useSoftDelete } from "../../hooks/useSoftDelete";
import { avatarStore } from "../../lib/avatarStore";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ✅ SUPPRIMÉ : PAYWALL_DURATION = 50_000 (ancienne logique secondes)
// ✅ SUPPRIMÉ : ACSET_PER_PAID = 0.2 (ancienne logique ACSET par paiement)
// Nouvelle logique : accès 30 jours (DB), ACSET par palier 20 TAN (DB)
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://mxxlchaygarszkygmylo.supabase.co";
const SUPREME_EMAIL     = "meyounbauniklovegodstory@gmail.com";
const AUTEUR_PRICE_TAN  = 2;
const PAYWALL_DELAY     = 15_000;

const C = {
  bg:         "#F2F2F7",
  card:       "#FFFFFF",
  cardInner:  "#F0F0F5",
  text:       "#0A0A0A",
  sub:        "#6E6E73",
  muted:      "#AEAEB2",
  border:     "#E5E5EA",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.30)",
  goldDark:   "#B8962E",
  goldDim:    "rgba(212,175,55,0.10)",
  green:      "#34C759",
  dialogBlue: "rgba(10,132,255,0.15)",
  dialogBlueBd:"rgba(10,132,255,0.35)",
  danger:     "#FF3B30",
  dark:       "#000000",
  darkCard:   "#0E0E0E",
  darkSurf2:  "#161616",
  white:      "#FFFFFF",
  hairline:   "rgba(255,255,255,0.07)",
  darkBorder: "rgba(255,255,255,0.10)",
  purple:     "#BF5AF2",
  orange:     "#FF9F0A",
  teal:       "#5AC8FA",
  whatsapp:   "#25D366",
};

const { width: SW } = Dimensions.get("window");
const COVER_H    = 220;
const THUMB_SIZE = 110;
const MAX_IMAGES = 25;
const AVATAR_SIZE = 88;
const HEADER_H   = 230;

const TABS = ["Suspentz", "Produits", "KoseSans", "Audio", "Vidéo"] as const;
type Tab = (typeof TABS)[number];

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type AuthorProfile = {
  id: string; full_name: string | null; author_name: string | null;
  avatar: string | null; whatsapp: string | null;
};
type Publication = {
  id: string; title: string | null; category: string | null; dateLabel: string;
  coverUrl: string | null; extras: string[]; price: number; quantity: number; qob: number;
};
type SuspentzItem = {
  id: string; title: string | null; media_path: string | null;
  created_at: string; qob_count: number; price_tan: number;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getInitials(name?: string | null): string {
  if (!name) return "R";
  const p = name.trim().split(" ").filter(Boolean);
  if (p.length === 1) return (p[0][0] || "R").toUpperCase();
  return ((p[0][0] || "") + (p[1][0] || "")).toUpperCase();
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
}
function formatNumber(n: number): string {
  return n === 0 ? "0" : n.toLocaleString("fr-FR");
}
function resolveVideoUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/suspentz/${path}`;
}
function parseImageUrls(raw: any): string[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(arr)) return arr.filter((u: any) => typeof u === "string" && u.length > 0);
  } catch {}
  return [];
}

// ─────────────────────────────────────────────────────────────
// SUCCESS TOAST
// ✅ "30 jours" au lieu de "X secondes"
// ─────────────────────────────────────────────────────────────
function SuccessToast({ visible }: { visible: boolean }) {
  const ty = useRef(new Animated.Value(-100)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(ty, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(ty, { toValue: -100, duration: 280, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View style={[st.wrap, { transform: [{ translateY: ty }], opacity: op }]} pointerEvents="none">
      <View style={st.pill}>
        <View style={st.iconWrap}><Ionicons name="checkmark-circle" size={22} color="#30D158" /></View>
        <View style={st.textWrap}>
          <Text style={st.title}>Paiement effectué</Text>
          {/* ✅ "30 jours" — nouvelle logique DB */}
          <Text style={st.sub}>Accès déverrouillé · 30 jours</Text>
        </View>
      </View>
    </Animated.View>
  );
}
const st = StyleSheet.create({
  wrap:     { position: "absolute", top: 0, left: 0, right: 0, zIndex: 4000, alignItems: "center", paddingTop: 58 },
  pill:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1C1C1E", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)", maxWidth: 320 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(48,209,88,0.15)", alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  title:    { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  sub:      { color: "rgba(255,255,255,0.55)", fontWeight: "600", fontSize: 12, marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────
// GALLERY VIEWER
// ─────────────────────────────────────────────────────────────
function GalleryViewer({ visible, images, initialIndex, title, authorName, onClose }: {
  visible: boolean; images: string[]; initialIndex: number;
  title: string | null; authorName: string | null; onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const scale = useRef(new Animated.Value(0.92)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIdx(initialIndex);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(op,    { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.92); op.setValue(0); }
  }, [visible, initialIndex]);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(images.length - 1, i + 1));
  const currentUrl = images[idx] ?? null;

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={gv.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[gv.sheet, { transform: [{ scale }], opacity: op }]}>
          <View style={gv.topBar}>
            <View style={gv.counter}><Text style={gv.counterTxt}>{idx + 1} / {images.length}</Text></View>
            <Pressable style={gv.closeBtn} onPress={onClose}><Ionicons name="close" size={18} color={C.sub} /></Pressable>
          </View>
          <View style={gv.imgWrap}>
            {currentUrl
              ? <Image source={{ uri: currentUrl }} style={gv.image} contentFit="contain" />
              : <View style={[gv.image, { backgroundColor: C.cardInner, alignItems: "center", justifyContent: "center" }]}><Ionicons name="image-outline" size={40} color={C.muted} /></View>
            }
            {idx > 0 && <TouchableOpacity style={[gv.arrow, gv.arrowLeft]} onPress={prev} activeOpacity={0.8}><Ionicons name="chevron-back" size={22} color="#FFF" /></TouchableOpacity>}
            {idx < images.length - 1 && <TouchableOpacity style={[gv.arrow, gv.arrowRight]} onPress={next} activeOpacity={0.8}><Ionicons name="chevron-forward" size={22} color="#FFF" /></TouchableOpacity>}
          </View>
          {images.length > 1 && (
            <View style={gv.dots}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setIdx(i)}>
                  <View style={[gv.dot, i === idx && gv.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {title && <Text style={gv.title} numberOfLines={2}>{title}</Text>}
          {authorName && <Text style={gv.author}>Par {authorName}</Text>}
        </Animated.View>
      </View>
    </Modal>
  );
}
const gv = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.70)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40, alignItems: "center", gap: 10 },
  topBar:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  counter:    { backgroundColor: C.cardInner, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  counterTxt: { color: C.sub, fontWeight: "800", fontSize: 12 },
  closeBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  imgWrap:    { width: SW - 40, height: SW - 40, position: "relative", borderRadius: 18, overflow: "hidden", backgroundColor: C.cardInner },
  image:      { width: "100%", height: "100%" },
  arrow:      { position: "absolute", top: "50%", marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", zIndex: 10 },
  arrowLeft:  { left: 10 },
  arrowRight: { right: 10 },
  dots:       { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotActive:  { width: 18, height: 6, borderRadius: 3, backgroundColor: C.gold },
  title:      { color: C.text, fontWeight: "900", fontSize: 16, textAlign: "center" },
  author:     { color: C.muted, fontWeight: "700", fontSize: 13 },
  waBtn:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#25D366", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, width: "100%", justifyContent: "center", marginTop: 4 },
  waBtnTxt:   { color: "#FFF", fontWeight: "900", fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────
// PAYWALL MODAL
// ✅ "30 jours" au lieu de "PAYWALL_DURATION secondes"
// ─────────────────────────────────────────────────────────────
function PayModal({ visible, walletTan, onPay, onCancel, isPaying, payError }: {
  visible: boolean; walletTan: number; onPay: () => void; onCancel: () => void; isPaying: boolean; payError: string | null;
}) {
  if (!visible) return null;
  return (
    <View style={pw.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={pw.sheet}>
        <View style={pw.handle} />
        <View style={pw.iconRing}><Ionicons name="lock-open-outline" size={30} color={C.gold} /></View>
        <Text style={pw.titleLarge}>Accéder à ce profil</Text>
        <Text style={pw.subtitle}>Déverrouillez l'accès complet à ce créateur RHAZN</Text>
        <View style={pw.priceRow}>
          <Text style={pw.priceLabel}>{AUTEUR_PRICE_TAN} TAN</Text>
          <View style={pw.balancePill}><Text style={pw.balanceText}>Solde : {formatNumber(walletTan)} TAN</Text></View>
        </View>
        <View style={pw.validityBadge}>
          <Ionicons name="time-outline" size={12} color={C.gold} />
          {/* ✅ "30 jours" — nouvelle logique DB */}
          <Text style={pw.validityText}>Accès valable 30 jours</Text>
        </View>
        {payError && (
          <View style={pw.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
            <Text style={pw.errorTxt}>{payError}</Text>
          </View>
        )}
        <Pressable style={[pw.payBtn, isPaying && { opacity: 0.7 }]} onPress={onPay} disabled={isPaying}>
          {isPaying ? <ActivityIndicator color="#000" size="small" />
            : <><Ionicons name="flash" size={16} color="#000" /><Text style={pw.payBtnText}>Payer {AUTEUR_PRICE_TAN} TAN</Text></>}
        </Pressable>
        <Pressable style={pw.cancelBtn} onPress={onCancel} disabled={isPaying}>
          <Text style={pw.cancelText}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}
const pw = StyleSheet.create({
  overlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.70)", justifyContent: "flex-end", zIndex: 3000 },
  sheet:        { backgroundColor: "#0E0E0E", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 52, alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.12)" },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 8 },
  iconRing:     { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: C.gold, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  titleLarge:   { color: "#FFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  subtitle:     { color: "rgba(255,255,255,0.52)", fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 18 },
  priceRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.10)", marginTop: 4 },
  priceLabel:   { color: C.gold, fontSize: 18, fontWeight: "900" },
  balancePill:  { backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.gold },
  balanceText:  { color: C.gold, fontSize: 11, fontWeight: "800" },
  validityBadge:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.10)" },
  validityText: { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700" },
  payBtn:       { width: "100%", backgroundColor: C.gold, borderRadius: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  payBtnText:   { color: "#000", fontSize: 16, fontWeight: "900" },
  cancelBtn:    { width: "100%", paddingVertical: 13, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  cancelText:   { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "700" },
  errorRow:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.12)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: "100%", borderWidth: 1, borderColor: "rgba(255,59,48,0.30)" },
  errorTxt:     { flex: 1, color: "#FF453A", fontSize: 12, fontWeight: "700", lineHeight: 17 },
});

// ─────────────────────────────────────────────────────────────
// NO-TAN OVERLAY
// ─────────────────────────────────────────────────────────────
function NoTanOverlay({ mode, onRecharge, onLater }: { mode: "ENTRY"|"INSIDE"; onRecharge: () => void; onLater: () => void }) {
  return (
    <View style={nt.overlay}>
      <View style={nt.card}>
        <View style={nt.iconRing}><Ionicons name="diamond" size={28} color={C.gold} /></View>
        <Text style={nt.title}>{mode === "ENTRY" ? "Accès Premium" : "Solde insuffisant"}</Text>
        <Text style={nt.msg}>{mode === "ENTRY" ? "Rechargez votre solde TAN pour accéder aux créateurs RHAZN Premium." : "Votre solde TAN est épuisé. Rechargez pour continuer."}</Text>
        <Pressable style={nt.primary} onPress={onRecharge}><Text style={nt.primaryTxt}>{mode === "ENTRY" ? "Recharger maintenant" : "Trouver un Agent"}</Text></Pressable>
        <Pressable style={nt.secondary} onPress={onLater}><Text style={nt.secondaryTxt}>Plus tard</Text></Pressable>
      </View>
    </View>
  );
}
const nt = StyleSheet.create({
  overlay:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  card:        { backgroundColor: "#0D0D0D", borderRadius: 28, paddingHorizontal: 28, paddingVertical: 32, width: "82%", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.10)", shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 22, gap: 12 },
  iconRing:    { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: C.gold, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  title:       { color: "#FFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  msg:         { color: "rgba(255,255,255,0.60)", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 21 },
  primary:     { width: "100%", backgroundColor: C.gold, paddingVertical: 15, borderRadius: 18, alignItems: "center", marginTop: 8 },
  primaryTxt:  { color: "#000", fontSize: 15, fontWeight: "900" },
  secondary:   { width: "100%", backgroundColor: "rgba(255,255,255,0.06)", paddingVertical: 13, borderRadius: 18, alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  secondaryTxt:{ color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
// MONTH SEPARATOR
// ─────────────────────────────────────────────────────────────
function MonthSeparator({ label }: { label: string }) {
  return (
    <View style={ms.row}>
      <View style={ms.line} />
      <Text style={ms.label}>{label.charAt(0).toUpperCase() + label.slice(1)}</Text>
      <View style={ms.line} />
    </View>
  );
}
const ms = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 8, marginBottom: 16 },
  line:  { flex: 1, height: 1, backgroundColor: C.border },
  label: { color: C.sub, fontWeight: "800", fontSize: 12, marginHorizontal: 10, letterSpacing: 0.3 },
});

// ─────────────────────────────────────────────────────────────
// AVATAR MODAL
// ─────────────────────────────────────────────────────────────
function AvatarModal({ visible, url, name, authorName, onClose }: {
  visible: boolean; url: string | null; name: string | null; authorName?: string | null; onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 18, stiffness: 180, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scale.setValue(0.8); op.setValue(0); }
  }, [visible]);
  const SIZE = SW * 0.8;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={am.backdrop} onPress={onClose}>
        <Animated.View style={[am.container, { transform: [{ scale }], opacity: op }]}>
          {url
            ? <Image source={{ uri: url }} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 4, borderColor: C.gold }} contentFit="cover" />
            : <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: C.goldLight, borderWidth: 4, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.gold, fontWeight: "900", fontSize: SIZE * 0.38 }}>{getInitials(name)}</Text>
              </View>
          }
          <Text style={am.name}>{name ?? "Créateur RHAZN"}</Text>
          {authorName && authorName !== name && (
            <View style={am.businessBadge}>
              <Ionicons name="business-outline" size={12} color={C.gold} />
              <Text style={am.businessName}>{authorName}</Text>
            </View>
          )}
          <Pressable style={am.closeBtn} onPress={onClose}><Ionicons name="close" size={16} color={C.sub} /></Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
const am = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center" },
  container:    { alignItems: "center", gap: 16 },
  name:         { color: "#FFF", fontWeight: "900", fontSize: 18, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 6 },
  closeBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginTop: 4 },
  businessBadge:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(212,175,55,0.35)" },
  businessName: { color: C.gold, fontWeight: "800", fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────
// DELETE BUTTON
// ─────────────────────────────────────────────────────────────
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }} onPress={() => { setConfirm(false); onConfirm(); }}>
        <Ionicons name="checkmark" size={14} color="#FFF" /><Text style={{ color: "#FFF", fontWeight: "900", fontSize: 12 }}>Oui</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: C.cardInner, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.border }} onPress={() => setConfirm(false)}>
        <Text style={{ color: C.sub, fontWeight: "800", fontSize: 12 }}>Non</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <TouchableOpacity style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,59,48,0.10)", borderWidth: 1, borderColor: "rgba(255,59,48,0.25)", alignItems: "center", justifyContent: "center" }} onPress={() => setConfirm(true)}>
      <Ionicons name="trash-outline" size={15} color={C.danger} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// PUBLICATION CARD
// ─────────────────────────────────────────────────────────────
function PublicationCard({ pub, authorName, vendorUid, canDelete, isPaid, onGalleryOpen, onDelete, onContact, showPrice, showQty, isOwner }: {
  pub: Publication; authorName: string | null; vendorUid: string;
  canDelete: boolean; isPaid: boolean;
  onGalleryOpen: (images: string[], index: number, title: string | null) => void;
  onDelete: (id: string) => void; onContact: () => void;
  avatarUrl?: string | null; showPrice?: boolean; showQty?: boolean; isOwner?: boolean;
}) {
  const allImages = [...(pub.coverUrl ? [pub.coverUrl] : []), ...pub.extras];
  const totalImages = allImages.length;

  return (
    <View style={pc.card}>
      <View style={pc.header}>
        <View style={{ flex: 1 }}>
          <Text style={pc.title} numberOfLines={2}>{pub.title ?? "Produit RHAZN"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            {pub.category ? <View style={pc.catBadge}><Text style={pc.catTxt}>{pub.category}</Text></View> : null}
            <Text style={pc.date}>{pub.dateLabel}</Text>
          </View>
          {pub.price > 0 && showPrice !== false && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
              <Ionicons name="pricetag-outline" size={11} color={C.gold} />
              <Text style={{ color: C.gold, fontWeight: "900", fontSize: 13 }}>{formatNumber(pub.price)} HTG</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[pc.statusBadge, isPaid ? pc.statusPaid : pc.statusPremium]}>
            {isPaid ? <Ionicons name="checkmark-circle" size={11} color="#30D158" /> : <Ionicons name="lock-closed" size={11} color={C.gold} />}
            <Text style={[pc.statusTxt, isPaid ? pc.statusPaidTxt : pc.statusPremiumTxt]}>{isPaid ? "PAYÉ" : "PREMIUM"}</Text>
          </View>
          {pub.qob > 0 && <View style={pc.qobBadge}><Ionicons name="trophy" size={10} color={C.gold} /><Text style={pc.qobTxt}>{formatNumber(pub.qob)} QOB</Text></View>}
          <View style={pc.countBadge}><Ionicons name="images-outline" size={12} color={C.gold} /><Text style={pc.countTxt}>{totalImages}</Text></View>
          {canDelete && <DeleteButton onConfirm={() => onDelete(pub.id)} />}
        </View>
      </View>

      {pub.coverUrl ? (
        <View>
          <Pressable onPress={() => isPaid && onGalleryOpen(allImages, 0, pub.title)}>
            <Image source={{ uri: pub.coverUrl }} style={pc.cover} contentFit="cover" blurRadius={isPaid ? 0 : 18} />
          </Pressable>
          {!isPaid && (
            <View style={pc.lockOverlay}>
              <View style={pc.lockBadge}>
                <Ionicons name="lock-closed" size={22} color={C.gold} />
                <Text style={pc.lockTxt}>Premium</Text>
              </View>
            </View>
          )}
          {isPaid && <View style={pc.coverBadge}><Ionicons name="star" size={9} color={C.gold} /><Text style={pc.coverBadgeTxt}>COUVERTURE</Text></View>}
          {isPaid && allImages.length > 1 && (
            <View style={pc.swipeBadge}><Ionicons name="images-outline" size={10} color="#FFF" /><Text style={pc.swipeBadgeTxt}>Appuyez pour voir les {allImages.length} images</Text></View>
          )}
        </View>
      ) : (
        <View style={[pc.cover, pc.coverEmpty]}><Ionicons name="image-outline" size={36} color={C.muted} /></View>
      )}

      {pub.extras.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <View style={pc.extrasHeader}>
            <Text style={pc.extrasLabel}>{pub.extras.length} autre{pub.extras.length > 1 ? "s" : ""} image{pub.extras.length > 1 ? "s" : ""}</Text>
            <Text style={pc.swipeHint}>← balayez →</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10, paddingVertical: 6 }} decelerationRate="fast" snapToInterval={THUMB_SIZE + 10}>
            {pub.extras.map((url, idx) => (
              <Pressable key={`${pub.id}-e${idx}`} onPress={() => isPaid && onGalleryOpen(allImages, idx + 1, pub.title)} style={{ position: "relative" }}>
                <Image source={{ uri: url }} style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12 }} contentFit="cover" blurRadius={isPaid ? 0 : 18} />
                {isPaid && <View style={pc.thumbNum}><Text style={pc.thumbNumTxt}>{idx + 2}</Text></View>}
                {!isPaid && (
                  <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="lock-closed" size={14} color={C.gold} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={pc.noExtras}><Ionicons name="images-outline" size={13} color={C.muted} /><Text style={pc.noExtrasTxt}>Aucune image supplémentaire</Text></View>
      )}

      {!isOwner && isPaid && (
        <TouchableOpacity style={pc.contactBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onContact(); }} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={15} color="#0A84FF" />
          <Text style={pc.contactTxt}>Contacter le vendeur</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const pc = StyleSheet.create({
  card:          { marginHorizontal: 16, marginBottom: 20, backgroundColor: C.card, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  header:        { flexDirection: "row", alignItems: "flex-start", padding: 14, paddingBottom: 10, gap: 10 },
  title:         { color: C.text, fontWeight: "900", fontSize: 15, lineHeight: 20 },
  catBadge:      { backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.goldBorder },
  catTxt:        { color: C.gold, fontWeight: "800", fontSize: 10 },
  date:          { color: C.muted, fontWeight: "600", fontSize: 11 },
  countBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.goldLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  countTxt:      { color: C.gold, fontWeight: "900", fontSize: 12 },
  cover:         { width: "100%", height: COVER_H },
  coverEmpty:    { backgroundColor: C.cardInner, alignItems: "center", justifyContent: "center" },
  coverBadge:    { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  coverBadgeTxt: { color: C.gold, fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },
  lockOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  lockBadge:     { alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5, borderColor: "rgba(212,175,55,0.50)" },
  lockTxt:       { color: C.gold, fontWeight: "900", fontSize: 14, marginTop: 4 },
  swipeBadge:    { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.60)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  swipeBadgeTxt: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  extrasHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, marginBottom: 2 },
  extrasLabel:   { color: C.sub, fontWeight: "700", fontSize: 11 },
  swipeHint:     { color: C.muted, fontWeight: "600", fontSize: 10 },
  thumbNum:      { position: "absolute", bottom: 5, right: 5, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  thumbNumTxt:   { color: "#FFF", fontWeight: "900", fontSize: 9 },
  noExtras:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  noExtrasTxt:   { color: C.muted, fontWeight: "600", fontSize: 11 },
  contactBtn:    { flexDirection: "row", alignItems: "center", gap: 8, margin: 14, marginTop: 10, backgroundColor: "rgba(10,132,255,0.10)", borderWidth: 1, borderColor: "rgba(10,132,255,0.30)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },
  contactTxt:    { color: "#0A84FF", fontWeight: "800", fontSize: 13 },
  statusBadge:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1 },
  statusPaid:      { backgroundColor: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.35)" },
  statusPremium:   { backgroundColor: C.goldLight, borderColor: C.goldBorder },
  statusTxt:       { fontWeight: "900", fontSize: 10, letterSpacing: 0.3 },
  statusPaidTxt:   { color: "#30D158" },
  statusPremiumTxt:{ color: C.gold },
  qobBadge:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  qobTxt:          { color: C.gold, fontWeight: "800", fontSize: 10 },
});

// ─────────────────────────────────────────────────────────────
// SUSPENTZ CARD
// ─────────────────────────────────────────────────────────────
function SuspentzCard({ item, canDelete, isPaid, isActive, onPlay, onDelete, onPaywallRequired }: {
  item: SuspentzItem; canDelete: boolean; isPaid: boolean; isActive: boolean;
  onPlay: (id: string) => void; onDelete: (id: string) => void; onPaywallRequired: () => void;
}) {
  const videoUrl = resolveVideoUrl(item.media_path);
  const player = useVideoPlayer(videoUrl ?? "file://invalid", (p) => { p.loop = false; });
  useEffect(() => { if (!isActive) { try { player.pause?.(); } catch {} } }, [isActive]);
  useEffect(() => { return () => { try { player.pause?.(); } catch {} }; }, []);

  const handlePress = () => {
    if (!isPaid) { onPaywallRequired(); return; }
    if (!videoUrl) return;
    if (isActive) { try { player.pause?.(); } catch {} onPlay(""); }
    else { onPlay(item.id); try { player.play?.(); } catch {} }
  };

  return (
    <View style={sz.card}>
      <Pressable style={sz.thumbWrap} onPress={handlePress}>
        {videoUrl ? (
          <>
            {isActive
              ? <VideoView player={player} style={sz.thumb} contentFit="cover" nativeControls={false} />
              : <Image source={{ uri: videoUrl }} style={sz.thumb} contentFit="cover" />
            }
            <View style={[sz.playOverlay, isActive && { opacity: 0 }]}>
              <View style={[sz.playBtn, !isPaid && sz.playBtnLocked]}>
                <Ionicons name={!isPaid ? "lock-closed" : isActive ? "pause" : "play"} size={22} color={!isPaid ? C.gold : "#FFF"} />
              </View>
            </View>
          </>
        ) : (
          <View style={[sz.thumb, sz.noThumb]}><Ionicons name="play-circle-outline" size={32} color={C.muted} /></View>
        )}
      </Pressable>
      <View style={sz.info}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <View style={[sz.statusBadge, isPaid ? sz.statusPaid : sz.statusPremium]}>
            {isPaid ? <Ionicons name="checkmark-circle" size={11} color="#30D158" /> : <Ionicons name="lock-closed" size={11} color={C.gold} />}
            <Text style={[sz.statusTxt, isPaid ? sz.statusPaidTxt : sz.statusPremiumTxt]}>{isPaid ? "PAYÉ" : "PREMIUM"}</Text>
          </View>
          {item.qob_count > 0 && <View style={sz.qobBadge}><Ionicons name="eye-outline" size={10} color={C.gold} /><Text style={sz.qobTxt}>{formatNumber(item.qob_count)}</Text></View>}
        </View>
        <Text style={sz.title} numberOfLines={1}>{item.title ?? "Suspentz"}</Text>
        <Text style={sz.date}>{fmtDate(item.created_at)}</Text>
        {item.price_tan > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            <Ionicons name="flash" size={11} color={C.gold} />
            <Text style={{ color: C.gold, fontWeight: "900", fontSize: 12 }}>{formatNumber(item.price_tan)} TAN</Text>
          </View>
        )}
        {canDelete && <View style={{ marginTop: 8 }}><DeleteButton onConfirm={() => onDelete(item.id)} /></View>}
      </View>
    </View>
  );
}
const sz = StyleSheet.create({
  card:         { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", backgroundColor: C.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  thumbWrap:    { width: 130, height: 100, position: "relative" },
  thumb:        { width: 130, height: 100 },
  noThumb:      { backgroundColor: C.cardInner, alignItems: "center", justifyContent: "center" },
  playOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  playBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)" },
  playBtnLocked:{ backgroundColor: "rgba(212,175,55,0.18)", borderColor: C.gold },
  info:         { flex: 1, padding: 12, justifyContent: "center" },
  title:        { color: C.text, fontWeight: "800", fontSize: 14, marginBottom: 3 },
  date:         { color: C.muted, fontWeight: "600", fontSize: 11 },
  statusBadge:  { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1 },
  statusPaid:   { backgroundColor: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.35)" },
  statusPremium:{ backgroundColor: C.goldLight, borderColor: C.goldBorder },
  statusTxt:    { fontWeight: "900", fontSize: 10, letterSpacing: 0.3 },
  statusPaidTxt:{ color: "#30D158" },
  statusPremiumTxt:{ color: C.gold },
  qobBadge:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: C.goldBorder },
  qobTxt:       { color: C.gold, fontWeight: "800", fontSize: 10 },
});

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 50, gap: 12 }}>
      <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={28} color={C.gold} />
      </View>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>{title}</Text>
      <Text style={{ color: C.muted, fontWeight: "600", fontSize: 13, textAlign: "center", paddingHorizontal: 40, lineHeight: 19 }}>{sub}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// INFO SECTIONS
// ─────────────────────────────────────────────────────────────
const INFO_SECTIONS = [
  { id: "kosesans", label: "KoseSans", tabKey: "KoseSans" as const, tagline: "La parole libre de RHAZN", accent: C.gold, accentDim: C.goldDim, accentBorder: C.goldBorder, icon: "chatbubble-ellipses-outline" as const, badge: "BIENTÔT", badgeBg: C.gold, badgeText: "#000", description: "KoseSans est l'espace d'expression textuelle de RHAZN.", features: [ { icon: "document-text-outline" as const, title: "Articles & Réflexions", text: "Exprimez-vous en texte long." }, { icon: "people-outline" as const, title: "Audience engagée", text: "Rejoignez une communauté active." }, { icon: "trophy-outline" as const, title: "Revenus QOB", text: "Chaque lecture génère des QOB." }, { icon: "shield-checkmark-outline" as const, title: "Validation CADNA", text: "Publication vérifiée avant diffusion." } ] },
  { id: "audio", label: "Audio", tabKey: "Audio" as const, tagline: "Votre voix, votre univers", accent: C.purple, accentDim: "rgba(191,90,242,0.10)", accentBorder: "rgba(191,90,242,0.28)", icon: "mic-outline" as const, badge: "BIENTÔT", badgeBg: C.purple, badgeText: "#FFF", description: "Podcasts, conférences, méditations — RHAZN Audio.", features: [ { icon: "musical-notes-outline" as const, title: "Musique & Podcasts", text: "Publiez vos productions audio." }, { icon: "headset-outline" as const, title: "Écoute immersive", text: "Lecteur optimisé premium." }, { icon: "bar-chart-outline" as const, title: "Stats d'écoute", text: "Suivez votre engagement." }, { icon: "sparkles-outline" as const, title: "Monétisation ACSET", text: "Chaque écoute vous rapporte." } ] },
  { id: "video", label: "Vidéo", tabKey: "Vidéo" as const, tagline: "Le cinéma de vos idées", accent: C.teal, accentDim: "rgba(90,200,250,0.10)", accentBorder: "rgba(90,200,250,0.28)", icon: "videocam-outline" as const, badge: "BIENTÔT", badgeBg: C.teal, badgeText: "#000", description: "Documentaires, tutoriels, vlogs — RHAZN Vidéo.", features: [ { icon: "film-outline" as const, title: "Formats longs", text: "Jusqu'à 60 minutes." }, { icon: "cloud-upload-outline" as const, title: "Upload HD sécurisé", text: "Infrastructure optimisée." }, { icon: "eye-outline" as const, title: "Système de vues", text: "Vues = revenus QOB." }, { icon: "lock-closed-outline" as const, title: "Contenu Premium", text: "Accès payant TAN." } ] },
] as const;

function InfoFeatureRow({ icon, title, text, accent, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; accent: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: `${accent}18`, borderColor: `${accent}30` }}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13, marginBottom: 2 }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.50)", fontWeight: "600", fontSize: 12, lineHeight: 17 }}>{text}</Text>
      </View>
    </Pressable>
  );
}

function InfoSectionCard({ section, onMusicPress, onVideoPress }: { section: (typeof INFO_SECTIONS)[number]; onMusicPress?: () => void; onVideoPress?: () => void }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const chevron = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const toggle = () => { Animated.spring(anim, { toValue: open ? 0 : 1, useNativeDriver: false, friction: 8 }).start(); setOpen(!open); };
  return (
    <View style={{ backgroundColor: C.darkCard, borderRadius: 18, borderWidth: 1, borderColor: open ? section.accentBorder : "rgba(255,255,255,0.10)", marginBottom: 12, overflow: "hidden" }}>
      <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }} onPress={toggle}>
        <View style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: section.accentDim, borderColor: section.accentBorder }}>
          <Ionicons name={section.icon} size={20} color={section.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Text style={{ color: section.accent, fontWeight: "900", fontSize: 15 }}>{section.label}</Text>
            <View style={{ backgroundColor: section.badgeBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: section.badgeText, fontWeight: "900", fontSize: 8 }}>{section.badge}</Text>
            </View>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.48)", fontWeight: "700", fontSize: 12 }}>{section.tagline}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevron }] }}>
          <Ionicons name="chevron-down" size={17} color="rgba(255,255,255,0.35)" />
        </Animated.View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ height: 1, backgroundColor: section.accentBorder, marginBottom: 14, opacity: 0.4 }} />
          <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 20, marginBottom: 16, fontWeight: "600" }}>{section.description}</Text>
         {section.features.map((f) => (
  <InfoFeatureRow
    key={f.title}
    icon={f.icon}
    title={f.title}
    text={f.text}
    accent={section.accent}
    onPress={
      f.title === "Musique & Podcasts" ? onMusicPress :
      f.title === "Formats longs" ? onVideoPress :
      undefined
    }
  />
))}
        </View>
      )}
    </View>
  );
}

function InfoTabContent({ activeSection, onMusicPress, onVideoPress }: { activeSection: "KoseSans"|"Audio"|"Vidéo"; onMusicPress: () => void; onVideoPress: () => void }) {
  const section = INFO_SECTIONS.find((s) => s.tabKey === activeSection)!;
  return (
    <View style={{ backgroundColor: C.dark, margin: 16, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
      <View style={{ padding: 22, paddingBottom: 16 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: section.accentDim, borderWidth: 1, borderColor: section.accentBorder, marginBottom: 14 }}>
          <Ionicons name={section.icon} size={24} color={section.accent} />
        </View>
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 22, marginBottom: 6 }}>{section.label}</Text>
        <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20, fontWeight: "600" }}>{section.description}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 16 }} />
      <View style={{ padding: 18 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15, marginBottom: 14 }}>Fonctionnalités</Text>
        {section.features.map((f) => (
  <InfoFeatureRow
    key={f.title}
    icon={f.icon}
    title={f.title}
    text={f.text}
    accent={section.accent}
    onPress={
  f.title === "Musique & Podcasts" ? onMusicPress :
  f.title === "Formats longs" ? onVideoPress :
  undefined
}
  />
))}
      </View>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 16 }} />
      <View style={{ padding: 16 }}>
        <Text style={{ color: "rgba(255,255,255,0.42)", fontWeight: "700", fontSize: 11, marginBottom: 12 }}>AUTRES FORMATS À VENIR</Text>
       {INFO_SECTIONS.filter((s) => s.tabKey !== activeSection).map((s) => (
  <InfoSectionCard key={s.id} section={s} onMusicPress={onMusicPress} onVideoPress={onVideoPress} />
))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function AuthorPage() {
  const router = useRouter();
  const { uid, tab: initialTab } = useLocalSearchParams<{ uid: string; tab?: string }>();

  const [activeTab,        setActiveTab]        = useState<Tab>(TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "Produits");
  const [author,           setAuthor]           = useState<AuthorProfile | null>(null);
  const [publications,     setPublications]     = useState<Publication[]>([]);
  const [suspentzList,     setSuspentzList]     = useState<SuspentzItem[]>([]);
  const [currentPlayingId, setCurrentPlayingId] = useState<string>("");
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [errMsg,           setErrMsg]           = useState<string | null>(null);
  const [isOwner,          setIsOwner]          = useState(false);
  const [showPrice,        setShowPrice]        = useState(true);
  const [showQty,          setShowQty]          = useState(true);
  const [isSupreme,        setIsSupreme]        = useState(false);

  const [walletTan,        setWalletTan]        = useState(0);
  const [walletReady,      setWalletReady]      = useState(false);
  const [productAccess,    setProductAccess]    = useState(false);
  const [showPayModal,     setShowPayModal]     = useState(false);
  const [showNoTan,        setShowNoTan]        = useState(false);
  const [noTanMode,        setNoTanMode]        = useState<"ENTRY"|"INSIDE">("ENTRY");
  const [isPaying,         setIsPaying]         = useState(false);
  const [payError,         setPayError]         = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const walletTanRef     = useRef(0);
  const productAccessRef = useRef(false);
  const accessRef        = useRef<any>(null);

  const [paidSuspentzSet, setPaidSuspentzSet] = useState<Set<string>>(new Set());
  const [avatarModal,     setAvatarModal]     = useState(false);
  const [showEditName,    setShowEditName]    = useState(false);
  const [editNameValue,   setEditNameValue]   = useState("");
  const [savingName,      setSavingName]      = useState(false);
  const [nameError,       setNameError]       = useState<string | null>(null);

  // ✅ Présence temps réel du vendeur
  const [isVendorOnline, setIsVendorOnline] = useState(false);

  // ✅ GalleryViewer state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages,  setGalleryImages]  = useState<string[]>([]);
  const [galleryIndex,   setGalleryIndex]   = useState(0);
  const [galleryTitle,   setGalleryTitle]   = useState<string | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
const [showVideoModal, setShowVideoModal] = useState(false);

  const openGallery = (images: string[], index: number, title: string | null) => {
    setGalleryImages(images); setGalleryIndex(index); setGalleryTitle(title); setGalleryVisible(true);
  };

  // ✅ Realtime présence vendeur
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`vendor-presence-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence", filter: `user_uid=eq.${uid}` },
        (payload: any) => {
          const lastSeen = new Date(payload.new?.last_seen ?? 0).getTime();
          setIsVendorOnline(payload.new?.is_online && (Date.now() - lastSeen) < 120_000);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  const { softDelete, supremeDelete } = useSoftDelete();

const deleteProduct = async (id: string) => {
  const pub = publications.find(p => p.id === id);
  const ok = isSupreme
    ? await supremeDelete(id, "PRODUCT", pub?.title ?? undefined)
    : await softDelete(id, "PRODUCT", pub?.title ?? undefined, {
        onSuccess: () => setPublications(p => p.filter(x => x.id !== id)),
      });
  if (ok && isSupreme) setPublications(p => p.filter(x => x.id !== id));
};

const deleteSuspentz = async (id: string) => {
  const sp = suspentzList.find(s => s.id === id);
  const ok = isSupreme
    ? await supremeDelete(id, "SUSPENTZ", sp?.title ?? undefined)
    : await softDelete(id, "SUSPENTZ", sp?.title ?? undefined, {
        onSuccess: () => setSuspentzList(p => p.filter(x => x.id !== id)),
      });
  if (ok && isSupreme) setSuspentzList(p => p.filter(x => x.id !== id));
};

  const load = useCallback(async (mode: "first"|"refresh" = "first") => {
    if (!uid) return;
    if (mode === "first") setLoading(true); else setRefreshing(true);
    setErrMsg(null);
    const { data: prof } = await supabase.from("profiles").select("id, full_name, author_name, avatar_url, whatsapp_phone").eq("id", uid).maybeSingle();
    const { data: { session } } = await supabase.auth.getSession();
    setIsOwner(session?.user?.id === uid);
    setIsSupreme(session?.user?.email === SUPREME_EMAIL);
    setAuthor({ id: uid as string, full_name: prof?.full_name ?? null, author_name: (prof?.author_name?.trim() || null) ?? prof?.full_name ?? null, avatar: avatarStore.bust(prof?.avatar_url ?? null, uid as string), whatsapp: prof?.whatsapp_phone ?? null });

    // ✅ Présence vendeur
    const { data: presence } = await supabase.from("user_presence").select("is_online, last_seen").eq("user_uid", uid).maybeSingle();
    if (presence) {
      const lastSeen = new Date(presence.last_seen).getTime();
      setIsVendorOnline(presence.is_online && (Date.now() - lastSeen) < 120_000);
    } else { setIsVendorOnline(false); }

    const { data: prods, error: prodsErr } = await supabase.from("products").select("id, title, cover_url, image_urls, created_at, category_label, price_htg, quantity, qob_count").eq("user_id", uid).eq("cadna_status", "approved").not("cover_url", "is", null).order("created_at", { ascending: false }).limit(100);
    if (prodsErr) setErrMsg("Impossible de charger les publications.");
    else setPublications((prods ?? []).map((p: any) => { const cover = p.cover_url ?? null; const extras = parseImageUrls(p.image_urls).filter((u: string) => u !== cover).slice(0, MAX_IMAGES - 1); return { id: p.id, title: p.title ?? null, category: p.category_label ?? null, dateLabel: p.created_at ? fmtDate(p.created_at) : "—", coverUrl: cover, extras, price: Number(p.price_htg ?? 0), quantity: Number(p.quantity ?? 0), qob: Number(p.qob_count ?? 0) }; }));
    const { data: spList } = await supabase.from("store_products").select("id, title, media_path, created_at, qob_count, price_tan").eq("owner_uid", uid).eq("cadna_status", "approved").order("created_at", { ascending: false }).limit(100);
    setSuspentzList((spList ?? []) as SuspentzItem[]);
    if (mode === "first") setLoading(false); else setRefreshing(false);
  }, [uid]);

  useEffect(() => { load("first"); }, [load]);

  // ✅ Recharger si avatar change globalement
  useEffect(() => {
    return avatarStore.subscribe(() => load("refresh"));
  }, [load]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !alive) return;
      const userId = session.user.id;
      if (session.user.email === SUPREME_EMAIL || userId === uid) {
        walletTanRef.current = Number.MAX_SAFE_INTEGER; productAccessRef.current = true;
        setWalletTan(Number.MAX_SAFE_INTEGER); setProductAccess(true); setWalletReady(true);
        setPaidSuspentzSet(new Set(["*ALL*"])); return;
      }
      const { data: w } = await supabase.from("wallets").select("tan_balance").eq("user_id", userId).maybeSingle();
      const newBal = Number(w?.tan_balance ?? 0);
      walletTanRef.current = newBal;
      if (alive) setWalletTan(newBal);

      // ✅ Vérification accès — source de vérité = DB expires_at
      const { data: accessNew } = await supabase
        .from("user_content_access").select("expires_at")
        .eq("user_id", userId).eq("content_id", uid as string).maybeSingle();

      accessRef.current = accessNew;
      const hasAccess = !!(accessNew?.expires_at && new Date(accessNew.expires_at) > new Date());
      productAccessRef.current = hasAccess;
      if (alive) setProductAccess(hasAccess);

      const { data: paid } = await supabase.from("user_paid_contents").select("content_id").eq("user_id", userId);
      const pSet = new Set<string>((paid ?? []).map((r: any) => String(r.content_id)));
      if (alive) setPaidSuspentzSet(pSet);
      if (alive) setWalletReady(true);
    })();
    return () => { alive = false; };
  }, []);

  // ✅ Vérification périodique de l'expiration d'accès
  useEffect(() => {
    const interval = setInterval(() => {
      const access = accessRef.current;
      if (!access?.expires_at) return;
      const stillValid = new Date(access.expires_at) > new Date();
      if (!stillValid) { productAccessRef.current = false; setProductAccess(false); }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!walletReady || productAccessRef.current) return;
    if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current);
    paywallTimerRef.current = setTimeout(() => {
      if (productAccessRef.current) return;
      if (walletTanRef.current < AUTEUR_PRICE_TAN) { setNoTanMode("ENTRY"); setShowNoTan(true); }
      else setShowPayModal(true);
    }, PAYWALL_DELAY);
    return () => { if (paywallTimerRef.current) clearTimeout(paywallTimerRef.current); };
  }, [walletReady]);

  const handleSaveAuthorName = async () => {
    if (!editNameValue.trim() || savingName) return;
    setSavingName(true); setNameError(null);
    try {
      const { data: prof } = await supabase.from("profiles").select("author_name, author_name_updated_at").eq("id", uid as string).maybeSingle();
      if (prof?.author_name_updated_at) {
        const daysSince = (Date.now() - new Date(prof.author_name_updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 250) { setNameError(`Modification possible dans ${Math.ceil(250 - daysSince)} jour(s).`); setSavingName(false); return; }
      }
      const { error } = await supabase.from("profiles").update({ author_name: editNameValue.trim(), author_name_updated_at: new Date().toISOString() } as any).eq("id", uid as string);
      if (error) { setNameError("Erreur lors de la sauvegarde."); setSavingName(false); return; }
      setAuthor(prev => ({ ...prev, author_name: editNameValue.trim() }));
      setShowEditName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch { setNameError("Erreur inattendue."); }
    setSavingName(false);
  };

  const handlePay = async () => {
    if (isPaying || productAccessRef.current) return;
    setIsPaying(true); setPayError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setPayError("Session expirée."); setIsPaying(false); return; }
      const { data: payData, error } = await supabase.rpc("process_payment_universal", {
        p_user_id:    session.user.id,
        p_target_id:  uid,
        p_amount_tan: AUTEUR_PRICE_TAN,
        p_type:       "AUTEUR",
        p_session_id: `${session.user.id}-${Date.now()}`,
      });
      console.log("💳 PAY RESULT:", payData, "ERROR:", error);
      if (error || !payData?.success) { setPayError(error?.message || payData?.error || "Paiement échoué"); setIsPaying(false); return; }
      // ✅ Nouveau système : ACSET par palier géré côté SQL
      console.log("✅ ACSET rewards earned:", payData.acset_rewards_earned);
      productAccessRef.current = true; setProductAccess(true); setShowPayModal(false);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setShowSuccessToast(true); setTimeout(() => setShowSuccessToast(false), 3000);
    } catch { setPayError("Erreur inattendue."); }
    setIsPaying(false);
  };

  const handleCancelPay = () => { setShowPayModal(false); router.back(); };

  const handleSuspentzPay = async (contentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    if (walletTanRef.current < 4) { setNoTanMode("INSIDE"); setShowNoTan(true); return; }
    const { error } = await supabase.rpc("consume_suspentz_seconds", { p_content_id: contentId, p_price: 4 });
    if (error) { console.warn("❌ consume_suspentz_seconds:", error.message); return; }
    setPaidSuspentzSet(prev => { const n = new Set(prev); n.add(contentId); return n; });
    walletTanRef.current -= 4; setWalletTan(walletTanRef.current);
  };

  const [headerH, setHeaderH] = useState(HEADER_H);
  const canDelete = isOwner || isSupreme;

  const PriceQtyToggles = () => (isOwner || isSupreme) ? (
    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
      <TouchableOpacity style={[sc.togglePill, showPrice && sc.togglePillActive]} onPress={() => setShowPrice(p => !p)} activeOpacity={0.8}>
        <Ionicons name={showPrice ? "eye" : "eye-off"} size={12} color={showPrice ? "#000" : C.muted} />
        <Text style={[sc.togglePillTxt, showPrice && sc.togglePillTxtActive]}>Prix</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[sc.togglePill, showQty && sc.togglePillActive]} onPress={() => setShowQty(p => !p)} activeOpacity={0.8}>
        <Ionicons name={showQty ? "eye" : "eye-off"} size={12} color={showQty ? "#000" : C.muted} />
        <Text style={[sc.togglePillTxt, showQty && sc.togglePillTxtActive]}>Quantité</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (loading) return <View style={sc.screen}><View style={sc.centered}><ActivityIndicator size="large" color={C.gold} /><Text style={sc.loadingTxt}>Chargement…</Text></View></View>;

  if (!author || errMsg) return (
    <View style={sc.screen}>
      <View style={sc.simpleNav}><Pressable onPress={() => router.back()} style={sc.backBtn}><Ionicons name="chevron-back" size={20} color={C.text} /><Text style={[sc.backTxt, { color: C.text }]}>Retour</Text></Pressable></View>
      <View style={sc.centered}>
        <View style={sc.errorIcon}><Ionicons name="person-outline" size={32} color={C.gold} /></View>
        <Text style={sc.errorTitle}>Profil introuvable</Text>
        <Text style={sc.errorSub}>{errMsg ?? "Ce créateur n'existe pas."}</Text>
        <TouchableOpacity style={sc.retryBtn} onPress={() => load("first")} activeOpacity={0.85}><Text style={sc.retryTxt}>Réessayer</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={sc.screen}>
      <SuccessToast visible={showSuccessToast} />
      <PayModal visible={showPayModal} walletTan={walletTan} onPay={handlePay} onCancel={handleCancelPay} isPaying={isPaying} payError={payError} />
      {showNoTan && <NoTanOverlay mode={noTanMode} onRecharge={() => { setShowNoTan(false); router.push("/user-agent-access" as any); }} onLater={() => { setShowNoTan(false); router.back(); }} />}
      <AvatarModal visible={avatarModal} url={author.avatar} name={author.full_name} authorName={author.author_name} onClose={() => setAvatarModal(false)} />
      <GalleryViewer visible={galleryVisible} images={galleryImages} initialIndex={galleryIndex} title={galleryTitle} authorName={author.author_name ?? author.full_name} onClose={() => setGalleryVisible(false)} />
        <MusicDownloadModal
  visible={showMusicModal}
  onClose={() => setShowMusicModal(false)}
/>
<VideoRhazn
  visible={showVideoModal}
  onClose={() => setShowVideoModal(false)}
/>

      {/* Modal modifier nom */}
      <Modal visible={showEditName} transparent animationType="slide" onRequestClose={() => { setShowEditName(false); setNameError(null); }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => { setShowEditName(false); setNameError(null); }} />
        <View style={{ backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 20 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.gold + "40", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="business" size={20} color={C.gold} />
            </View>
            <View>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Modifier le nom</Text>
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>Verrouillé 250 jours après modification</Text>
            </View>
          </View>
          <TextInput value={editNameValue} onChangeText={setEditNameValue} placeholder="Nom de l'entreprise..." placeholderTextColor={C.muted} style={{ backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, fontWeight: "700", borderWidth: 1, borderColor: C.border, marginBottom: 10 }} autoFocus maxLength={50} />
          {nameError && <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FF3B3015", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#FF3B3030" }}><Ionicons name="alert-circle-outline" size={14} color="#FF3B30" /><Text style={{ color: "#FF3B30", fontSize: 12, fontWeight: "700", flex: 1 }}>{nameError}</Text></View>}
          <TouchableOpacity style={{ backgroundColor: C.gold, borderRadius: 16, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: savingName || !editNameValue.trim() ? 0.5 : 1 }} onPress={handleSaveAuthorName} disabled={savingName || !editNameValue.trim()} activeOpacity={0.85}>
            {savingName ? <ActivityIndicator color="#000" size="small" /> : <><Ionicons name="checkmark-circle" size={18} color="#000" /><Text style={{ color: "#000", fontWeight: "900", fontSize: 15 }}>Enregistrer</Text></>}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={sc.floatingHeader} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
        <View style={sc.goldBand}>
          <Pressable onPress={() => router.back()} style={sc.backBtn}><Ionicons name="chevron-back" size={20} color="#FFFFFF" /><Text style={sc.backTxt}>Retour</Text></Pressable>
          <TouchableOpacity style={sc.avatarWrap} onPress={() => setAvatarModal(true)} activeOpacity={0.85}>
            {author.avatar ? <Image source={{ uri: author.avatar }} style={sc.avatar} contentFit="cover" /> : <View style={[sc.avatar, sc.avatarFallback]}><Text style={sc.avatarInitials}>{getInitials(author.full_name)}</Text></View>}
            <View style={sc.avatarZoomBadge}><Ionicons name="expand-outline" size={9} color="#FFF" /></View>
          </TouchableOpacity>
          {isOwner
            ? <TouchableOpacity style={sc.replyBtn} onPress={() => router.push("/rz-admin/vendor-inbox" as any)} activeOpacity={0.85}>
                <Ionicons name="chatbubbles" size={15} color={C.gold} />
                <Text style={sc.replyBtnTxt}>Répondre</Text>
              </TouchableOpacity>
            : <TouchableOpacity
                style={[sc.contactBtn, !productAccess && sc.contactBtnLocked]}
                onPress={() => {
                  if (!productAccess) {
                    if (walletTanRef.current < AUTEUR_PRICE_TAN) { setNoTanMode("ENTRY"); setShowNoTan(true); }
                    else setShowPayModal(true);
                    return;
                  }
                  router.push({ pathname: "/rz-channel/vendor-chat", params: { vendorId: author.id, vendorName: author.author_name ?? author.full_name ?? "Vendeur" } } as any);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name={productAccess ? "chatbubble-ellipses-outline" : "lock-closed"} size={15} color={productAccess ? "#0A84FF" : C.gold} />
                <Text style={[sc.contactBtnTxt, !productAccess && { color: C.gold }]}>
                  {productAccess ? "Contacter" : "Déverrouiller"}
                </Text>
              </TouchableOpacity>
          }
        </View>
        <View style={sc.nameRow}>
          <Text style={sc.authorName} numberOfLines={2}>{author.author_name ?? author.full_name ?? "Créateur RHAZN"}</Text>
          {isSupreme && <View style={sc.supremeBadge}><Text style={sc.supremeBadgeTxt}>⚡ SUPREME</Text></View>}
        </View>
        {/* ✅ Présence en ligne / hors ligne */}
        <View style={sc.presenceRow}>
          <View style={[sc.presenceDot, isVendorOnline ? sc.presenceDotOn : sc.presenceDotOff]} />
          <Text style={[sc.presenceTxt, isVendorOnline ? sc.presenceTxtOn : sc.presenceTxtOff]}>
            {isVendorOnline ? "En ligne" : "Hors ligne"}
          </Text>
        </View>
        {isSupreme && (
          <TouchableOpacity style={sc.editNameBtn} onPress={() => { setEditNameValue(author.author_name ?? ""); setShowEditName(true); }} activeOpacity={0.80}>
            <Ionicons name="pencil-outline" size={12} color={C.gold} />
            <Text style={sc.editNameTxt}>Modifier le nom</Text>
          </TouchableOpacity>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sc.tabsRow}>
          {TABS.map((tab) => (
            <Pressable key={tab} style={[sc.tab, activeTab === tab && sc.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[sc.tabTxt, activeTab === tab && sc.tabTxtActive]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* BODY */}
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={C.gold} />} contentContainerStyle={{ paddingTop: headerH + 10, paddingBottom: 110 }}>

        {activeTab === "Produits" && (
          <>
            <PriceQtyToggles />
            <View style={sc.tabCountRow}>
              <Text style={sc.tabCountNum}>{formatNumber(publications.length)}</Text>
              <Text style={sc.tabCountLbl}>Produits</Text>
            </View>
            {publications.length === 0
              ? <EmptyState icon="cube-outline" title="Aucun produit" sub="Ce créateur n'a pas encore publié de produit." />
              : (() => {
                  const elements: React.ReactNode[] = [];
                  let lastKey = "";
                  publications.forEach((pub) => {
                    const parts = pub.dateLabel.split(" ");
                    const monthKey = parts.length >= 3 ? `${parts[1]} ${parts[2]}`.toLowerCase() : pub.dateLabel;
                    if (monthKey !== lastKey) { lastKey = monthKey; elements.push(<MonthSeparator key={`sep-${monthKey}`} label={monthKey} />); }
                    elements.push(
                      <PublicationCard
                        key={pub.id} pub={pub}
                        authorName={author.author_name ?? author.full_name}
                        vendorUid={author.id} avatarUrl={author.avatar}
                        showPrice={showPrice} showQty={showQty}
                        isOwner={isOwner || isSupreme} canDelete={canDelete}
                        isPaid={productAccessRef.current}
                        onGalleryOpen={openGallery} onDelete={deleteProduct}
                        onContact={() => router.push({ pathname: "/rz-channel/vendor-chat", params: { vendorId: author.id, vendorName: author.author_name ?? author.full_name ?? "Vendeur" } } as any)}
                      />
                    );
                  });
                  return elements;
                })()
            }
          </>
        )}

        {activeTab === "Suspentz" && (
          <>
            <View style={sc.tabCountRow}>
              <Text style={sc.tabCountNum}>{formatNumber(suspentzList.length)}</Text>
              <Text style={sc.tabCountLbl}>Suspentz</Text>
            </View>
            {suspentzList.length === 0
              ? <EmptyState icon="play-circle-outline" title="Aucun Suspentz" sub="Ce créateur n'a pas encore publié de Suspentz." />
              : suspentzList.map((item) => (
                  <SuspentzCard key={item.id} item={item} canDelete={canDelete}
                    isPaid={productAccessRef.current || paidSuspentzSet.has("*ALL*") || paidSuspentzSet.has(item.id)}
                    isActive={currentPlayingId === item.id}
                    onPlay={setCurrentPlayingId} onDelete={deleteSuspentz}
                    onPaywallRequired={() => handleSuspentzPay(item.id)}
                  />
                ))
            }
          </>
        )}

        {(activeTab === "KoseSans" || activeTab === "Audio" || activeTab === "Vidéo") && (
          <>
            <View style={sc.tabCountRow}><Text style={sc.tabCountNum}>0</Text><Text style={sc.tabCountLbl}>{activeTab}</Text></View>
            <InfoTabContent
  activeSection={activeTab as "KoseSans"|"Audio"|"Vidéo"}
  onMusicPress={() => setShowMusicModal(true)}
  onVideoPress={() => setShowVideoModal(true)}
/>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ==================== STYLES ==================== */
const sc = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bg },
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingTxt: { color: C.muted, fontWeight: "700", fontSize: 14 },
  simpleNav:  { flexDirection: "row", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10 },
  errorIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  errorTitle: { color: C.text, fontWeight: "900", fontSize: 18 },
  errorSub:   { color: C.muted, fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 32 },
  retryBtn:   { backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  retryTxt:   { color: "#000", fontWeight: "900", fontSize: 14 },
  backBtn:    { flexDirection: "row", alignItems: "center", gap: 4, width: 70 },
  backTxt:    { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  floatingHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: "#000000", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  goldBand:   { backgroundColor: "#000000", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 54, paddingBottom: 14, minHeight: 136 },
  avatarWrap: { position: "relative", shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  avatar:     { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 2.5, borderColor: C.gold },
  avatarFallback: { backgroundColor: C.goldLight, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: C.gold, fontWeight: "900", fontSize: AVATAR_SIZE * 0.36 },
  avatarZoomBadge:{ position: "absolute", bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000" },
  nameRow:    { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 2, gap: 6 },
  authorName: { color: "#FFFFFF", fontWeight: "900", fontSize: 18, letterSpacing: -0.3, textAlign: "center" },
  togglePill:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  togglePillActive:   { backgroundColor: C.gold, borderColor: C.gold },
  togglePillTxt:      { color: C.muted, fontWeight: "800", fontSize: 11 },
  togglePillTxtActive:{ color: "#000", fontWeight: "900", fontSize: 11 },
  supremeBadge:   { backgroundColor: "rgba(212,175,55,0.18)", borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  supremeBadgeTxt:{ color: C.gold, fontWeight: "900", fontSize: 9 },
  presenceRow:   { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 4, marginBottom: 2 },
  presenceDot:   { width: 7, height: 7, borderRadius: 4 },
  presenceDotOn: { backgroundColor: "#30D158" },
  presenceDotOff:{ backgroundColor: "#FF3B30" },
  presenceTxt:   { fontSize: 11, fontWeight: "700" },
  presenceTxtOn: { color: "#30D158" },
  presenceTxtOff:{ color: "#FF3B30" },
  editNameBtn:   { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,175,55,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", marginTop: 6 },
  editNameTxt:   { color: C.gold, fontSize: 11, fontWeight: "800" },
  replyBtn:          { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, width: 90, justifyContent: "center" },
  replyBtnTxt:       { color: C.gold, fontWeight: "800", fontSize: 12 },
  contactBtn:        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(10,132,255,0.12)", borderWidth: 1, borderColor: "rgba(10,132,255,0.35)", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, width: 100, justifyContent: "center" },
  contactBtnLocked:  { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.35)" },
  contactBtnTxt:     { color: "#0A84FF", fontWeight: "800", fontSize: 12 },
  tabsRow:    { paddingHorizontal: 12, gap: 7, alignItems: "center", paddingBottom: 10, paddingTop: 4 },
  tab:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#111111", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)" },
  tabActive:  { backgroundColor: C.gold, borderColor: C.gold },
  tabTxt:     { color: "rgba(255,255,255,0.45)", fontWeight: "800", fontSize: 12 },
  tabTxtActive:{ color: "#000", fontWeight: "900", fontSize: 12 },
  tabCountRow:{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 18 },
  tabCountNum:{ color: C.text, fontWeight: "900", fontSize: 42, letterSpacing: -1.5, lineHeight: 46 },
  tabCountLbl:{ color: C.sub, fontWeight: "700", fontSize: 13, marginTop: 2 },
});