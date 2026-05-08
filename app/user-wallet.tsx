// app/user-wallet.tsx
// ✅ FINAL PRO — TAN-only wallet (Apple-like / RHAZN)
// ✅ Nouvelle logique : 1 TAN = 10 HTG = 0.05 USD
// ✅ Commission retrait : 20% (15% RHAZN + 5% Agent)
// ✅ PinVerifyModal remplace RzPinLock

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import PinVerifyModal from "../components/PinVerifyModal";
import { supabase } from "../lib/supabase";

/* ===================== PALETTE ===================== */
const BG   = "#FFFFFF";
const CARD = "#F6F7F9";
const SOFT = "#E5E5EA";
const TEXT = "#111111";
const MUTED= "#6E6E73";
const GOLD = "#D4AF37";
const GREEN= "#34C759";
const BLUE = "#007AFF";

/* ===================== TAUX OFFICIELS RHAZN ===================== */
const TAN_TO_HTG      = 10;    // ✅ 1 TAN = 10 HTG
const TAN_TO_USD      = 0.05;  // ✅ 1 TAN = 0.05 USD
const WITHDRAW_FEE    = 0.20;  // ✅ Commission retrait = 20% (15% RHAZN + 5% Agent)
const AGENT_FEE       = 0.05;  // 5% Agent
const RHAZN_FEE       = 0.15;  // 15% RHAZN

/* ===================== FORMAT NOMBRES ===================== */
// ✅ Format : 111 111 111 (espaces tous les 3 chiffres)
const fmtSpace = (n: number, decimals = 0): string => {
  if (!isFinite(n)) return "0";
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
};

/* ===================== TYPES ===================== */
type Wallet = {
  tan_balance:   number;
  acset_balance: number;
};

export default function WalletUtilisateurRHAZN() {
  const router = useRouter();

  const [wallet,  setWallet]  = useState<Wallet>({ tan_balance: 0, acset_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [gateOpen,setGateOpen]= useState(false);

  const [pinVisible, setPinVisible] = useState(true);
  const [pinReady,   setPinReady]   = useState(false);

  /* ─────────────────────────────────────────────────────────
     ✅ Format RHAZN : 111 111 111 (espaces tous les 3 chiffres)
     Ex : 1234567 → "1 234 567"  |  12345 → "12 345"  |  500 → "500"
  ───────────────────────────────────────────────────────── */
  const fmtRHAZN = (n: number): string => {
    const s = String(Math.round(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const fmtUSD = (n: number): string => {
    const fixed = n.toFixed(2);
    const [intPart, dec] = fixed.split(".");
    return `$${fmtRHAZN(Number(intPart))}.${dec}`;
  };

  /* ── Format TAN ── */
  const tanLabel = useMemo(() => fmtRHAZN(wallet.tan_balance), [wallet.tan_balance]);

  /* ── Conversions ── */
  const htgBrut  = useMemo(() => wallet.tan_balance * TAN_TO_HTG, [wallet.tan_balance]);
  const htgNet   = useMemo(() => htgBrut * (1 - WITHDRAW_FEE), [htgBrut]);
  const usdBrut  = useMemo(() => wallet.tan_balance * TAN_TO_USD, [wallet.tan_balance]);
  const usdNet   = useMemo(() => usdBrut * (1 - WITHDRAW_FEE), [usdBrut]);

  const htgLabel    = useMemo(() => fmtRHAZN(htgBrut),  [htgBrut]);
  const htgNetLabel = useMemo(() => fmtRHAZN(htgNet),   [htgNet]);
  const usdLabel    = useMemo(() => fmtUSD(usdBrut),    [usdBrut]);
  const usdNetLabel = useMemo(() => fmtUSD(usdNet),     [usdNet]);

  /* ── Immersive ── */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  /* ── Swipe ── */
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();
      if (g.dy < -80 && Platform.OS === "android") BackHandler.exitApp();
    },
  });

  /* ── Load wallet ── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { if (mounted) setLoading(false); return; }

        let { data } = await supabase
          .from("wallets").select("tan_balance, acset_balance")
          .eq("user_id", uid).maybeSingle();

        if (!data) {
          await supabase.rpc("ensure_wallet");
          const { data: retry } = await supabase
            .from("wallets").select("tan_balance, acset_balance")
            .eq("user_id", uid).single();
          data = retry;
        }

        if (mounted && data) {
          setWallet({
            tan_balance:   Number(data.tan_balance   || 0),
            acset_balance: Number(data.acset_balance || 0),
          });
        }
      } catch (e) {
        console.error("Wallet load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  /* ── Realtime ── */
  useEffect(() => {
    let channel: any;
    const subscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      channel = supabase
        .channel("wallet-user-realtime")
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
          (payload) => {
            setWallet({
              tan_balance:   Number(payload.new.tan_balance   || 0),
              acset_balance: Number(payload.new.acset_balance || 0),
            });
          }
        ).subscribe();
    };
    subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator color={GOLD} />
        <Text style={{ color: MUTED, marginTop: 10, fontWeight: "800" }}>
          Chargement du wallet…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      <PinVerifyModal
        visible={pinVisible}
        onSuccess={() => { setPinVisible(false); setPinReady(true); }}
        onCancel={() => router.back()}
        showManageLink={false}
      />

      {pinReady && (
        <Animated.View style={[styles.container]} {...panResponder.panHandlers}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

          {/* HEADER */}
          <View style={styles.headerZen}>
            <View>
              <Text style={styles.titleZen}>Wallet</Text>
              <View style={styles.acsetBadge}>
                <Text style={styles.acsetBadgeText}>
                  {wallet.acset_balance} ACSET disponibles pour publier
                </Text>
              </View>
              <Text style={styles.acsetRuleText}>
                Chaque contenu payé valide → +0.2 ACSET (automatique)
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/banq/suspentz")}>
              <Image
                source={require("../assets/images/rhazn-logo.png")}
                style={{ width: 36, height: 36 }}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingTop: 200, paddingBottom: 170 }}>

            {/* ✅ CARTE TAN principale — HTG + USD EN DESSOUS du solde */}
            <View style={styles.tanFloatWrap}>
              <View style={styles.tanFloatCard}>

                {/* Solde TAN */}
                <Text style={styles.tanLabel}>Solde TAN</Text>
                <Text style={styles.tanValue}>{tanLabel}</Text>
                <Text style={styles.tanSub}>TAN</Text>

                {/* ✅ Séparateur */}
                <View style={styles.tanDivider} />

                {/* ✅ HTG + USD côte à côte DANS la carte, sous "Retrait" */}
                <Text style={styles.tanConvTitle}>Équivalence au retrait</Text>
                <View style={styles.convRow}>
                  {/* HTG */}
                  <View style={[styles.convCard, { borderColor: "rgba(52,199,89,0.35)" }]}>
                    <View style={styles.convIconRow}>
                      <Ionicons name="cash-outline" size={13} color={GREEN} />
                      <Text style={[styles.convLabel, { color: GREEN }]}>HTG</Text>
                    </View>
                    <Text style={[styles.convValue, { color: GREEN }]}>{htgNetLabel}</Text>
                    <Text style={styles.convSub}>Net après −20%</Text>
                    <Text style={styles.convBrut}>{htgLabel} HTG brut</Text>
                  </View>

                  {/* USD */}
                  <View style={[styles.convCard, { borderColor: "rgba(0,122,255,0.35)" }]}>
                    <View style={styles.convIconRow}>
                      <Ionicons name="globe-outline" size={13} color={BLUE} />
                      <Text style={[styles.convLabel, { color: BLUE }]}>USD</Text>
                    </View>
                    <Text style={[styles.convValue, { color: BLUE }]}>{usdNetLabel}</Text>
                    <Text style={styles.convSub}>Net après −20%</Text>
                    <Text style={styles.convBrut}>{usdLabel} brut</Text>
                  </View>
                </View>

                {/* Taux officiels */}
                <View style={styles.tanRatesRow}>
                  <Text style={styles.tanRateTxt}>1 TAN = {TAN_TO_HTG} HTG</Text>
                  <Text style={styles.tanRateDot}>·</Text>
                  <Text style={styles.tanRateTxt}>1 TAN = $0.05</Text>
                </View>

              </View>
            </View>

            {/* ✅ Détail commission retrait */}
            <View style={styles.feeCard}>
              <View style={styles.feeRow}>
                <Ionicons name="information-circle-outline" size={14} color={GOLD} />
                <Text style={styles.feeTitle}>Commission retrait : 20%</Text>
              </View>
              <View style={styles.feeSplit}>
                <View style={styles.feePill}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={GOLD} />
                  <Text style={styles.feePillTxt}>RHAZN 15%</Text>
                </View>
                <View style={[styles.feePill, { backgroundColor: "rgba(52,199,89,0.10)", borderColor: "rgba(52,199,89,0.25)" }]}>
                  <Ionicons name="person-outline" size={11} color={GREEN} />
                  <Text style={[styles.feePillTxt, { color: GREEN }]}>Agent 5%</Text>
                </View>
                <View style={[styles.feePill, { backgroundColor: "rgba(0,122,255,0.08)", borderColor: "rgba(0,122,255,0.20)" }]}>
                  <Ionicons name="checkmark-circle-outline" size={11} color={BLUE} />
                  <Text style={[styles.feePillTxt, { color: BLUE }]}>Achat TAN : 0%</Text>
                </View>
              </View>
            </View>

            {/* GRID actions */}
            <View style={styles.grid}>
              <MenuCard
                icon={<Feather name="send" size={24} color={GOLD} />}
                label="Envoyer TAN"
                onPress={() => router.push("/user-send-tan")}
              />
              <MenuCard
                icon={<MaterialIcons name="payments" size={24} color={GOLD} />}
                label="Achat / Retrait"
                onPress={() => router.push("/user-agent-access")}
              />
              <MenuCard
                icon={<Ionicons name="time-outline" size={24} color={MUTED} />}
                label="Historique"
                onPress={() => router.push("/user-history")}
              />
            </View>

          </ScrollView>

          {/* MODAL solde insuffisant */}
          <Modal visible={gateOpen} transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%", alignItems: "center" }}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Solde TAN insuffisant</Text>
                    <Text style={styles.modalText}>Rechargez via un Agent RHAZN.</Text>
                    <TouchableOpacity style={styles.modalPrimaryBtn} activeOpacity={0.9}
                      onPress={() => { setGateOpen(false); setTimeout(() => router.replace("/user-agent-access"), 120); }}>
                      <Text style={styles.modalPrimaryText}>Trouver un Agent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalGhostBtn} activeOpacity={0.9} onPress={() => setGateOpen(false)}>
                      <Text style={styles.modalGhostText}>Fermer</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

        </Animated.View>
      )}
    </View>
  );
}

/* ===================== UI COMPONENT ===================== */
function MenuCard({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuCard} activeOpacity={0.86}>
      {icon}
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  headerZen: { position: "absolute", top: 12, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleZen:      { color: TEXT, fontSize: 22, fontWeight: "700" },
  acsetBadge:    { alignSelf: "flex-start", backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", marginTop: 6 },
  acsetBadgeText:{ color: GOLD, fontSize: 11, fontWeight: "900" },
  acsetRuleText: { marginTop: 6, color: MUTED, fontSize: 11, fontWeight: "800" },

  // ✅ Carte TAN principale
  tanFloatWrap: { marginHorizontal: 20, marginBottom: 14 },
  tanFloatCard: { backgroundColor: "#FFFFFF", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  tanLabel:      { color: MUTED, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  tanValue:      { color: TEXT, fontSize: 36, fontWeight: "900", marginTop: 4 },
  tanSub:        { color: GOLD, fontSize: 13, fontWeight: "900", marginTop: 2, letterSpacing: 1 },
  tanDivider:    { height: 1, backgroundColor: SOFT, marginVertical: 14 },
  tanConvTitle:  { color: MUTED, fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
  tanRatesRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: SOFT },
  tanRateTxt:    { color: MUTED, fontSize: 10, fontWeight: "700" },
  tanRateDot:    { color: MUTED, fontSize: 10 },

  // ✅ Grille HTG + USD à l'intérieur de la carte TAN
  convRow:      { flexDirection: "row", gap: 10 },
  convCard:     { flex: 1, backgroundColor: CARD, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1.5 },
  convIconRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 },
  convLabel:    { fontSize: 10, fontWeight: "800" },
  convValue:    { fontSize: 18, fontWeight: "900" },
  convSub:      { color: MUTED, fontSize: 9, fontWeight: "700", marginTop: 2 },
  convBrut:     { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 4 },
  convNetRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  convNetLabel: { color: MUTED, fontSize: 9, fontWeight: "700" },
  convNetValue: { fontSize: 11, fontWeight: "900" },

  // ✅ Carte commission
  feeCard:    { marginHorizontal: 20, marginBottom: 14, backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(212,175,55,0.20)" },
  feeRow:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  feeTitle:   { color: GOLD, fontSize: 12, fontWeight: "900" },
  feeSplit:   { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  feePill:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(212,175,55,0.28)" },
  feePillTxt: { color: GOLD, fontSize: 10, fontWeight: "800" },

  grid:     { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 4 },
  menuCard: { width: "48%", backgroundColor: CARD, paddingVertical: 18, marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: SOFT, alignItems: "center" },
  menuText: { color: TEXT, fontSize: 13, marginTop: 6, fontWeight: "700" },

  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 18 },
  modalCard:        { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 22, borderWidth: 1, borderColor: SOFT, padding: 18 },
  modalTitle:       { color: GOLD, fontSize: 18, fontWeight: "900", textAlign: "center", marginBottom: 10 },
  modalText:        { color: TEXT, fontSize: 13, fontWeight: "800", textAlign: "center" },
  modalPrimaryBtn:  { marginTop: 14, backgroundColor: "rgba(212,175,55,0.95)", borderRadius: 16, paddingVertical: 12, alignItems: "center" },
  modalPrimaryText: { color: "#000", fontWeight: "900", fontSize: 13 },
  modalGhostBtn:    { marginTop: 10, borderRadius: 16, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: SOFT, backgroundColor: "rgba(0,0,0,0.03)" },
  modalGhostText:   { color: MUTED, fontWeight: "900", fontSize: 13 },
});