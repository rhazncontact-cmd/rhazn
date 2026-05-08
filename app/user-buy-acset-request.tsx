// app/user-buy-tan-request.tsx
// ✅ RHAZN — Acheter du TAN • Apple-like Premium
// ✅ Même architecture que user-withdraw-request.tsx
// ✅ Toast entrant + Modal succès + Card HTG preview
// ✅ ZERO débit wallet ici

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const C = {
  bg:         "#000000",
  card:       "#0D0D0D",
  glass:      "rgba(255,255,255,0.055)",
  border:     "rgba(255,255,255,0.10)",
  hairline:   "rgba(255,255,255,0.07)",
  white:      "#FFFFFF",
  muted:      "rgba(255,255,255,0.45)",
  mutedMed:   "rgba(255,255,255,0.65)",
  gold:       "#D4AF37",
  goldDim:    "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.30)",
  green:      "#30D158",
  greenDim:   "rgba(48,209,88,0.12)",
  greenBorder:"rgba(48,209,88,0.30)",
  red:        "#FF453A",
  redDim:     "rgba(255,69,58,0.12)",
  redBorder:  "rgba(255,69,58,0.30)",
  orange:     "#FF9F0A",
};

const GOLD    = C.gold;
const BUY_MIN = 25;
const BUY_MAX = 1_000;
const TAN_HTG = 10;
const UNIT_TAN = 1;
const UNIT_HTG = 10;

const fmt      = (n: number) => Number(n || 0).toLocaleString("fr-FR");
const toDigits = (s: string) => (s || "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
const fmtInput = (d: string) => d ? Number(d).toLocaleString("fr-FR") : "";

// ── TOAST ──
type ToastKind = "success" | "error" | "warning" | "info";
function useToast() {
  const [toast, setToast] = useState<{ kind: ToastKind; title: string; body: string } | null>(null);
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(-24)).current;
  const tmr = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (kind: ToastKind, title: string, body: string) => {
    if (tmr.current) clearTimeout(tmr.current);
    setToast({ kind, title, body });
    op.setValue(0); ty.setValue(-24);
    Animated.parallel([
      Animated.spring(op, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0,  damping: 18, stiffness: 220, useNativeDriver: true }),
    ]).start();
    const dur = body.length < 80 ? 4000 : body.length < 160 ? 6000 : 9000;
    tmr.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -24, duration: 250, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, dur);
  };

  const colorFor = (k: ToastKind) =>
    k === "success" ? C.green : k === "error" ? C.red : k === "warning" ? C.orange : C.gold;
  const iconFor = (k: ToastKind) =>
    k === "success" ? "checkmark-circle" : k === "error" ? "alert-circle" : k === "warning" ? "warning" : "information-circle";

  const node = toast ? (
    <Animated.View pointerEvents="none"
      style={[s.toast, { opacity: op, transform: [{ translateY: ty }], borderColor: colorFor(toast.kind) + "55" }]}
    >
      <View style={[s.toastBar, { backgroundColor: colorFor(toast.kind) }]} />
      <Ionicons name={iconFor(toast.kind) as any} size={18} color={colorFor(toast.kind)} />
      <View style={{ flex: 1 }}>
        <Text style={s.toastTitle}>{toast.title}</Text>
        {toast.body ? <Text style={s.toastBody}>{toast.body}</Text> : null}
      </View>
    </Animated.View>
  ) : null;

  return { show, node };
}

// ── SUCCESS MODAL ──
function SuccessModal({ visible, tan, htg, onClose }: { visible: boolean; tan: number; htg: number; onClose: () => void }) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85); op.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 180, useNativeDriver: true }),
      Animated.timing(op,    { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={sm.overlay}>
        <Animated.View style={[sm.card, { opacity: op, transform: [{ scale }] }]}>
          <View style={sm.iconWrap}><Ionicons name="checkmark-circle" size={52} color={C.green} /></View>
          <Text style={sm.title}>Demande envoyée</Text>
          <Text style={sm.sub}>Paiement en présentiel chez l'agent requis</Text>
          <View style={sm.divider} />
          <View style={sm.amountRow}>
            <View style={sm.amountBlock}>
              <Text style={sm.amountLabel}>TAN à recevoir</Text>
              <Text style={sm.amountValue}>{fmt(tan)}</Text>
              <Text style={sm.amountCurrency}>TAN</Text>
            </View>
            <View style={sm.amountSep} />
            <View style={sm.amountBlock}>
              <Text style={sm.amountLabel}>À payer en cash</Text>
              <Text style={[sm.amountValue, { color: C.gold }]}>{fmt(htg)}</Text>
              <Text style={[sm.amountCurrency, { color: C.gold }]}>HTG</Text>
            </View>
          </View>
          <TouchableOpacity style={sm.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={sm.btnTxt}>Compris</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  card:        { width: "85%", maxWidth: 360, backgroundColor: C.card, borderRadius: 28, padding: 28, alignItems: "center", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 40, shadowOffset: { width: 0, height: 20 }, elevation: 30 },
  iconWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenDim, borderWidth: 1.5, borderColor: C.greenBorder, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title:       { color: C.white, fontSize: 20, fontWeight: "900", textAlign: "center" },
  sub:         { color: C.muted, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 6, lineHeight: 19 },
  divider:     { width: "100%", height: 1, backgroundColor: C.hairline, marginVertical: 20 },
  amountRow:   { flexDirection: "row", width: "100%" },
  amountBlock: { flex: 1, alignItems: "center", gap: 3 },
  amountSep:   { width: 1, backgroundColor: C.hairline, marginHorizontal: 12 },
  amountLabel: { color: C.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  amountValue: { color: C.white, fontSize: 22, fontWeight: "900" },
  amountCurrency: { color: C.muted, fontSize: 11, fontWeight: "700" },
  btn:         { marginTop: 24, width: "100%", backgroundColor: C.gold, borderRadius: 18, paddingVertical: 16, alignItems: "center", shadowColor: C.gold, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  btnTxt:      { color: "#000", fontWeight: "900", fontSize: 16 },
});

// ── ROW ──
function WalletRow({ label, value, gold, strong }: { label: string; value: string; gold?: boolean; strong?: boolean }) {
  return (
    <View style={[wr.row, strong && wr.rowStrong]}>
      <Text style={[wr.label, strong && wr.labelStrong]}>{label}</Text>
      <Text style={[wr.value, gold && { color: C.gold }, strong && wr.valueStrong]}>{value}</Text>
    </View>
  );
}
const wr = StyleSheet.create({
  row:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  rowStrong:   { backgroundColor: C.goldDim, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: 6 },
  label:       { color: C.mutedMed, fontSize: 12, fontWeight: "700" },
  labelStrong: { color: C.white,    fontSize: 13, fontWeight: "900" },
  value:       { color: C.white,    fontSize: 12, fontWeight: "900" },
  valueStrong: { color: C.gold,     fontSize: 13, fontWeight: "900" },
});

// ── SCREEN ──
export default function UserBuyTanRequest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast  = useToast();
  const insets = useSafeAreaInsets();

  const ed_id   = typeof params.ed_id   === "string" ? params.ed_id   : null;
  const ed_code = typeof params.ed_code === "string" ? params.ed_code : null;

  useEffect(() => { if (!ed_id) router.replace("/user-agent-access" as any); }, [ed_id]);

  const [amountDigits,   setAmountDigits]   = useState("");
  const [amountUi,       setAmountUi]       = useState("");
  const [sending,        setSending]        = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const onAmountChange = (text: string) => {
    const d = toDigits(text);
    setAmountDigits(d);
    setAmountUi(fmtInput(d));
  };

  const tanAmount = useMemo(() => { const n = Number(amountDigits); return Number.isFinite(n) ? n : 0; }, [amountDigits]);
  const totalHTG  = useMemo(() => Math.floor(tanAmount * TAN_HTG), [tanAmount]);
  const belowMin  = tanAmount > 0 && tanAmount < BUY_MIN;
  const aboveMax  = tanAmount > BUY_MAX;
  const invalid   = tanAmount <= 0 || belowMin || aboveMax;
  const showPrev  = tanAmount > 0 && !belowMin && !aboveMax;

  useEffect(() => {
    if (!amountDigits) return;
    if (belowMin) { toast.show("error", "Montant trop faible", `Minimum autorisé : ${fmt(BUY_MIN)} TAN`); return; }
    if (aboveMax) { toast.show("error", "Limite dépassée",    `Maximum journalier : ${fmt(BUY_MAX)} TAN`); }
  }, [amountDigits]);

  const submit = async () => {
    if (!ed_id) { toast.show("error", "Agent introuvable", "Retournez à la liste et sélectionnez un agent."); return; }
    if (invalid) { toast.show("error", "Montant invalide", `Min ${fmt(BUY_MIN)} TAN • Max ${fmt(BUY_MAX)} TAN`); return; }
    setSending(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) { toast.show("error", "Session expirée", "Reconnectez-vous."); return; }
      const { data: ed, error: edErr } = await supabase.from("eds").select("id,is_active").eq("id", ed_id).single();
      if (edErr || !ed || ed.is_active === false) { toast.show("error", "Agent inactif", "Choisissez un autre agent."); return; }
      const { error } = await supabase.from("user_withdraw_requests").insert({
        user_uid: authData.user.id, ed_id, amount_tan: tanAmount, status: "PENDING", note: null,
      });
      if (error) { toast.show("error", "Erreur système", error.message); return; }
      setSuccessVisible(true);
    } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {toast.node}

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Acheter du TAN</Text>
          <Text style={s.headerSub}>Présentiel • Validation Agent</Text>
        </View>
        <View style={s.rateBadge}>
          <Text style={s.rateValue}>{fmt(UNIT_TAN)} TAN = {fmt(UNIT_HTG)} HTG</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 + insets.bottom }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >

          {/* Card Agent */}
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <View style={s.cardIconWrap}><Ionicons name="person-circle" size={20} color={C.gold} /></View>
              <Text style={s.cardTitle}>Agent RHAZN</Text>
            </View>
            <View style={s.agentRow}>
              <View>
                <Text style={s.agentLabel}>Code agent</Text>
                <Text style={s.agentCode}>{ed_code ?? "—"}</Text>
              </View>
              <View style={s.certBadge}>
                <View style={s.certDot} />
                <Text style={s.certTxt}>CERTIFIÉ</Text>
              </View>
            </View>
            <Text style={s.agentNote}>
              L'achat est validé en présentiel. L'agent crédite votre wallet après réception du paiement HTG.
            </Text>
          </View>

          {/* Card saisie */}
          <View style={[s.card, { marginTop: 12 }]}>
            <View style={s.cardTitleRow}>
              <View style={s.cardIconWrap}><Ionicons name="diamond" size={20} color={C.gold} /></View>
              <Text style={s.cardTitle}>Montant TAN souhaité</Text>
            </View>
            <View style={s.inputWrap}>
              <TextInput
                value={amountUi} onChangeText={onAmountChange}
                placeholder="0" placeholderTextColor="rgba(255,255,255,0.20)"
                keyboardType="numeric" style={s.input} selectionColor={GOLD} autoCorrect={false}
              />
              <Text style={s.inputUnit}>TAN</Text>
            </View>
            <View style={s.limitRow}>
              <View style={s.limitPill}><Text style={s.limitTxt}>Min {fmt(BUY_MIN)}</Text></View>
              <View style={s.limitPill}><Text style={s.limitTxt}>Max {fmt(BUY_MAX)} / jour</Text></View>
            </View>
            {belowMin && (
              <View style={[s.alertBanner, { borderColor: C.redBorder, backgroundColor: C.redDim }]}>
                <Ionicons name="warning" size={14} color={C.red} />
                <Text style={[s.alertTxt, { color: C.red }]}>Montant inférieur au minimum autorisé</Text>
              </View>
            )}
            {aboveMax && (
              <View style={[s.alertBanner, { borderColor: C.redBorder, backgroundColor: C.redDim }]}>
                <Ionicons name="warning" size={14} color={C.red} />
                <Text style={[s.alertTxt, { color: C.red }]}>Limite journalière dépassée</Text>
              </View>
            )}
          </View>

          {/* Card HTG */}
          {showPrev && (
            <View style={s.htgCard}>
              <View style={s.htgTop}>
                <Text style={s.htgLabel}>Total à payer en cash</Text>
                <View style={s.htgPill}><Text style={s.htgPillTxt}>HTG</Text></View>
              </View>
              <Text style={s.htgValue}>{fmt(totalHTG)}</Text>
              <Text style={s.htgRate}>1 TAN = 10 HTG • {fmt(UNIT_TAN)} TAN = {fmt(UNIT_HTG)} HTG</Text>
            </View>
          )}

          {/* Récap */}
          {showPrev && (
            <View style={[s.card, { marginTop: 12 }]}>
              <View style={s.cardTitleRow}>
                <View style={s.cardIconWrap}><Ionicons name="wallet" size={20} color={C.gold} /></View>
                <Text style={s.cardTitle}>Récapitulatif</Text>
              </View>
              <View style={s.sep} />
              <WalletRow label="TAN à recevoir"      value={`${fmt(tanAmount)} TAN`} gold />
              <WalletRow label="Total à payer (HTG)"  value={`${fmt(totalHTG)} HTG`}  gold strong />
              <View style={[s.alertBanner, { borderColor: "rgba(255,159,10,0.30)", backgroundColor: "rgba(255,159,10,0.08)", marginTop: 12 }]}>
                <Ionicons name="information-circle" size={14} color={C.orange} />
                <Text style={[s.alertTxt, { color: C.orange }]}>
                  Le wallet est crédité uniquement après validation du paiement par l'agent.
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, (invalid || sending) && { opacity: 0.45 }]}
            onPress={submit} disabled={invalid || sending} activeOpacity={0.88}
          >
            {sending
              ? <ActivityIndicator color="#000" />
              : <><Ionicons name="send" size={16} color="#000" /><Text style={s.submitTxt}>Envoyer la demande</Text></>
            }
          </TouchableOpacity>

          <Text style={s.footNote}>
            Le paiement se fait hors plateforme chez l'agent.{"\n"}
            La demande sera validée par l'Agent RHAZN agréé.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal visible={successVisible} tan={tanAmount} htg={totalHTG}
        onClose={() => { setSuccessVisible(false); router.back(); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.bg },
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.hairline },
  backBtn:       { width: 40, height: 40, borderRadius: 13, backgroundColor: C.glass, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle:   { color: C.white, fontSize: 18, fontWeight: "900" },
  headerSub:     { color: C.muted, fontSize: 11, marginTop: 1 },
  rateBadge:     { backgroundColor: C.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.goldBorder },
  rateValue:     { color: C.gold, fontSize: 10, fontWeight: "800" },
  card:          { backgroundColor: C.glass, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitleRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  cardIconWrap:  { width: 34, height: 34, borderRadius: 10, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  cardTitle:     { color: C.white, fontSize: 14, fontWeight: "900" },
  agentRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  agentLabel:    { color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  agentCode:     { color: C.gold, fontSize: 18, fontWeight: "900", letterSpacing: 1, marginTop: 3 },
  certBadge:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.greenDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.greenBorder },
  certDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  certTxt:       { color: C.green, fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  agentNote:     { color: C.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  inputWrap:     { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, marginBottom: 12 },
  input:         { flex: 1, color: C.white, fontSize: 28, fontWeight: "900", paddingVertical: 16, letterSpacing: 0.3 },
  inputUnit:     { color: C.gold, fontSize: 16, fontWeight: "900" },
  limitRow:      { flexDirection: "row", gap: 8, marginBottom: 10 },
  limitPill:     { backgroundColor: C.glass, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  limitTxt:      { color: C.muted, fontSize: 11, fontWeight: "700" },
  htgCard:       { marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  htgTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  htgLabel:      { color: "#333", fontSize: 12, fontWeight: "800" },
  htgPill:       { backgroundColor: "#F3F3F3", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  htgPillTxt:    { color: C.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  htgValue:      { color: C.gold, fontSize: 34, fontWeight: "900", letterSpacing: 0.2 },
  htgRate:       { color: "#999", fontSize: 11, fontWeight: "700", marginTop: 6 },
  sep:           { height: 1, backgroundColor: C.hairline, marginVertical: 8 },
  alertBanner:   { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
  alertTxt:      { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  submitBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, backgroundColor: C.gold, borderRadius: 18, paddingVertical: 17, shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  submitTxt:     { color: "#000", fontWeight: "900", fontSize: 16 },
  footNote:      { color: C.muted, fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 17, marginTop: 14 },
  toast:         { position: "absolute", top: 60, left: 16, right: 16, zIndex: 9999, backgroundColor: C.card, borderRadius: 16, flexDirection: "row", alignItems: "center", padding: 14, gap: 10, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
  toastBar:      { width: 3, height: "100%" as any, borderRadius: 2, alignSelf: "stretch" },
  toastTitle:    { color: C.white, fontWeight: "900", fontSize: 13 },
  toastBody:     { color: C.muted, fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 16 },
});