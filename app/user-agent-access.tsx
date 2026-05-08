// app/user-agent-access.tsx
// ✅ RHAZN — Accès Agent • Apple-like Premium Redesign
// ✅ Toute la logique préservée (RPC get_agent_by_code)
// ✅ Toast enrichi avec icônes et couleurs
// ✅ Animations d'entrée staggered + micro-interactions
// ✅ Design : fond noir, vault aesthetic, or RHAZN

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
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
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#0D0D0D",
  card2:      "#111111",
  glass:      "rgba(255,255,255,0.055)",
  border:     "rgba(255,255,255,0.10)",
  hairline:   "rgba(255,255,255,0.07)",
  white:      "#FFFFFF",
  muted:      "rgba(255,255,255,0.42)",
  mutedMed:   "rgba(255,255,255,0.65)",
  gold:       "#D4AF37",
  goldDim:    "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.28)",
  goldGlow:   "rgba(212,175,55,0.06)",
  green:      "#30D158",
  greenDim:   "rgba(48,209,88,0.12)",
  greenBorder:"rgba(48,209,88,0.28)",
  blue:       "#4FC3F7",
  blueDim:    "rgba(79,195,247,0.12)",
  blueBorder: "rgba(79,195,247,0.28)",
  red:        "#FF453A",
  redDim:     "rgba(255,69,58,0.12)",
  redBorder:  "rgba(255,69,58,0.28)",
  orange:     "#FF9F0A",
};

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
type ToastKind = "success" | "error" | "warning" | "info";
function useToast() {
  const [toast, setToast] = useState<{ kind: ToastKind; title: string; body: string } | null>(null);
  const op  = useRef(new Animated.Value(0)).current;
  const ty  = useRef(new Animated.Value(-28)).current;
  const tmr = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (kind: ToastKind, title: string, body: string) => {
    if (tmr.current) clearTimeout(tmr.current);
    setToast({ kind, title, body });
    op.setValue(0); ty.setValue(-28);
    Animated.parallel([
      Animated.spring(op, { toValue: 1, damping: 16, stiffness: 200, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0,  damping: 16, stiffness: 200, useNativeDriver: true }),
    ]).start();
    const dur = body.length < 80 ? 4500 : body.length < 160 ? 7000 : 10000;
    tmr.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -28, duration: 280, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, dur);
  };

  const colorFor = (k: ToastKind) =>
    k === "success" ? C.green : k === "error" ? C.red : k === "warning" ? C.orange : C.gold;
  const iconFor = (k: ToastKind) =>
    k === "success" ? "checkmark-circle" : k === "error" ? "alert-circle" : k === "warning" ? "warning" : "information-circle";

  const node = toast ? (
    <Animated.View pointerEvents="none"
      style={[s.toast, { opacity: op, transform: [{ translateY: ty }], borderColor: colorFor(toast.kind) + "60" }]}
    >
      <View style={[s.toastBar, { backgroundColor: colorFor(toast.kind) }]} />
      <Ionicons name={iconFor(toast.kind) as any} size={20} color={colorFor(toast.kind)} />
      <View style={{ flex: 1 }}>
        <Text style={s.toastTitle}>{toast.title}</Text>
        <Text style={s.toastBody}>{toast.body}</Text>
      </View>
    </Animated.View>
  ) : null;

  return { show, node };
}

// ─────────────────────────────────────────────────────────────
// NORMALIZE CODE
// ─────────────────────────────────────────────────────────────
const normalizeCode = (input: string) =>
  input.toUpperCase().replace(/[^A-Z0-9]/g, "");

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function UserAgentAccess() {
  const router = useRouter();
  const toast  = useToast();
  const insets = useSafeAreaInsets();

  const [code,            setCode]            = useState("");
  const [loadingBuy,      setLoadingBuy]      = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  // Animations d'entrée
  const heroOp    = useRef(new Animated.Value(0)).current;
  const heroY     = useRef(new Animated.Value(30)).current;
  const cardOp    = useRef(new Animated.Value(0)).current;
  const cardY     = useRef(new Animated.Value(24)).current;
  const btnsOp    = useRef(new Animated.Value(0)).current;
  const btnsY     = useRef(new Animated.Value(20)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered reveal
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(heroOp, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(heroY,  { toValue: 0, duration: 440, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOp, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(cardY,  { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnsOp, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(btnsY,  { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    // Auto-repair profil
    supabase.rpc("ensure_my_profile").then(() => {}).catch(() => {});
  }, []);

  // Micro-interaction sur l'input
  const onInputFocus = () => {
    Animated.spring(inputScale, { toValue: 1.02, damping: 14, stiffness: 200, useNativeDriver: true }).start();
  };
  const onInputBlur = () => {
    Animated.spring(inputScale, { toValue: 1, damping: 14, stiffness: 200, useNativeDriver: true }).start();
  };

  const canSubmit = normalizeCode(code).length > 0;

  const resolveAndGo = async (mode: "buy" | "withdraw") => {
    const raw = normalizeCode(code);
    if (!raw) {
      toast.show("warning", "Code requis", "Saisissez le code fourni par votre agent (ex: ED123456).");
      return;
    }
    try {
      mode === "buy" ? setLoadingBuy(true) : setLoadingWithdraw(true);
      const { data, error } = await supabase.rpc("get_agent_by_code", { p_code: raw });
      if (error) throw error;
      const agentId = (data as any)?.agent_id ?? null;
      if (!agentId) {
        toast.show("error", "Accès refusé", "Code agent invalide ou inactif. Vérifiez le code auprès de l'agent.");
        return;
      }
      const pathname = mode === "buy" ? "/user-buy-acset-request" : "/user-withdraw-request";
      router.push({ pathname, params: { ed_id: String(agentId), ed_code: raw } });
    } catch (e: any) {
      console.log("Agent resolve error:", e?.message ?? e);
      toast.show("error", "Accès refusé", "Code agent invalide ou inactif. Vérifiez le code auprès de l'agent.");
    } finally {
      setLoadingBuy(false);
      setLoadingWithdraw(false);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* Grille de fond */}
      <View style={s.grid} pointerEvents="none">
        {[...Array(8)].map((_, i) => <View key={`h${i}`} style={[s.gridH, { top: `${i * 13}%` as any }]} />)}
        {[...Array(6)].map((_, i) => <View key={`v${i}`} style={[s.gridV, { left: `${i * 20}%` as any }]} />)}
      </View>

      {/* Toast */}
      {toast.node}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: 60 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── HERO ── */}
          <Animated.View style={[s.hero, { opacity: heroOp, transform: [{ translateY: heroY }] }]}>
            {/* Logo vault */}
            <View style={s.vaultWrap}>
              <View style={s.vaultRing1}>
                <View style={s.vaultRing2}>
                  <Ionicons name="shield-checkmark" size={40} color={C.gold} />
                </View>
              </View>
              {/* Glow */}
              <View style={s.vaultGlow} pointerEvents="none" />
            </View>
            <Text style={s.heroTitle}>Accès Agent RHAZN</Text>
            <Text style={s.heroSub}>
              Entrez le code fourni par votre agent certifié
            </Text>
          </Animated.View>

          {/* ── CARD SAISIE ── */}
          <Animated.View style={[s.card, { opacity: cardOp, transform: [{ translateY: cardY }] }]}>

            <View style={s.cardHeader}>
              <View style={s.cardIconWrap}>
                <Ionicons name="key" size={18} color={C.gold} />
              </View>
              <View>
                <Text style={s.cardTitle}>Code Agent</Text>
                <Text style={s.cardSub}>Fourni par votre agent agréé RHAZN</Text>
              </View>
            </View>

            {/* Input */}
            <Animated.View style={[s.inputWrap, { transform: [{ scale: inputScale }] }]}>
              <Ionicons name="barcode-outline" size={20} color={C.gold} style={{ marginRight: 8 }} />
              <TextInput
                value={code}
                onChangeText={t => setCode(t.toUpperCase())}
                onFocus={onInputFocus}
                onBlur={onInputBlur}
                placeholder="ED123456"
                placeholderTextColor="rgba(255,255,255,0.18)"
                style={s.input}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loadingBuy && !loadingWithdraw}
                returnKeyType="done"
                selectionColor={C.gold}
              />
              {code.length > 0 && (
                <TouchableOpacity onPress={() => setCode("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.30)" />
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Indicateur de longueur */}
            <View style={s.codeHint}>
              <Ionicons name="information-circle-outline" size={12} color={C.muted} />
              <Text style={s.codeHintTxt}>Format : lettres et chiffres uniquement (ex: ED123456)</Text>
            </View>

          </Animated.View>

          {/* ── BOUTONS ── */}
          <Animated.View style={[s.btnsWrap, { opacity: btnsOp, transform: [{ translateY: btnsY }] }]}>

            {/* Acheter TAN */}
            <Pressable
              style={({ pressed }) => [
                s.btnBuy,
                (!canSubmit || loadingWithdraw) && s.btnDisabled,
                pressed && canSubmit && { opacity: 0.88 },
              ]}
              disabled={!canSubmit || loadingWithdraw || loadingBuy}
              onPress={() => resolveAndGo("buy")}
            >
              {loadingBuy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <View style={s.btnIconWrap}>
                    <Ionicons name="diamond" size={18} color="#000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.btnTitle}>Acheter du TAN</Text>
                    <Text style={s.btnSub}>Créditez votre wallet en présentiel</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.55)" />
                </>
              )}
            </Pressable>

            {/* Retrait TAN */}
            <Pressable
              style={({ pressed }) => [
                s.btnWithdraw,
                (!canSubmit || loadingBuy) && s.btnDisabled,
                pressed && canSubmit && { opacity: 0.88 },
              ]}
              disabled={!canSubmit || loadingBuy || loadingWithdraw}
              onPress={() => resolveAndGo("withdraw")}
            >
              {loadingWithdraw ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <View style={[s.btnIconWrap, { backgroundColor: "rgba(0,0,0,0.15)" }]}>
                    <Ionicons name="cash" size={18} color="#000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.btnTitle}>Retrait TAN</Text>
                    <Text style={s.btnSub}>Recevez du cash chez l'agent</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.55)" />
                </>
              )}
            </Pressable>

          </Animated.View>

          {/* ── INFO SÉCURITÉ ── */}
          <Animated.View style={[s.securityCard, { opacity: btnsOp }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={C.gold} />
            <Text style={s.securityTxt}>
              Chaque transaction est validée en présentiel par un Agent agréé RHAZN. Aucun débit wallet sans votre accord.
            </Text>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Grille de fond
  grid:   { ...StyleSheet.absoluteFillObject, opacity: 0.035 },
  gridH:  { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#FFF" },
  gridV:  { position: "absolute", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "#FFF" },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  // Hero
  hero:       { alignItems: "center", marginBottom: 32, gap: 14 },
  vaultWrap:  { position: "relative", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  vaultRing1: { width: 108, height: 108, borderRadius: 36, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center", shadowColor: C.gold, shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  vaultRing2: { width: 74, height: 74, borderRadius: 24, backgroundColor: "rgba(212,175,55,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.20)" },
  vaultGlow:  { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(212,175,55,0.08)", shadowColor: C.gold, shadowOpacity: 0.20, shadowRadius: 50 },
  heroTitle:  { color: C.white, fontSize: 24, fontWeight: "900", letterSpacing: 0.2, textAlign: "center" },
  heroSub:    { color: C.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },

  // Card
  card:        { backgroundColor: C.glass, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  cardIconWrap:{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  cardTitle:   { color: C.white, fontSize: 14, fontWeight: "900" },
  cardSub:     { color: C.muted, fontSize: 11, fontWeight: "600", marginTop: 1 },

  // Input
  inputWrap:   { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, marginBottom: 10 },
  input:       { flex: 1, color: C.white, fontSize: 22, fontWeight: "900", paddingVertical: 16, letterSpacing: 3 },
  codeHint:    { flexDirection: "row", alignItems: "center", gap: 5 },
  codeHintTxt: { color: C.muted, fontSize: 11, fontWeight: "600", flex: 1 },

  // Boutons
  btnsWrap:    { gap: 12, marginBottom: 16 },

  btnBuy: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.gold, borderRadius: 20, padding: 18,
    shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },

  btnWithdraw: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.blue, borderRadius: 20, padding: 18,
    shadowColor: C.blue, shadowOpacity: 0.25, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },

  btnDisabled: { opacity: 0.42 },

  btnIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  btnTitle:    { color: "#000", fontSize: 15, fontWeight: "900" },
  btnSub:      { color: "rgba(0,0,0,0.60)", fontSize: 11, fontWeight: "600", marginTop: 2 },

  // Sécurité
  securityCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.goldDim, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.goldBorder },
  securityTxt:  { flex: 1, color: C.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },

  // Toast
  toast:      { position: "absolute", top: 56, left: 16, right: 16, zIndex: 9999, backgroundColor: C.card, borderRadius: 18, flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24, elevation: 24 },
  toastBar:   { width: 3, alignSelf: "stretch", borderRadius: 2 },
  toastTitle: { color: C.white, fontWeight: "900", fontSize: 13, marginBottom: 2 },
  toastBody:  { color: C.muted, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});