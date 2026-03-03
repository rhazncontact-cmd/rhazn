// ======================================================
// RHAZN — USER WITHDRAW REQUEST (PREMIUM APPLE-LIKE)
// ✅ UI luxe • Toast intelligent • Calculs temps réel
// ✅ Montant demandé • Frais • Débit total • Avant/Après
// ✅ Carte HTG sticky FIXE (ne bouge pas avec clavier) + notch perfect
// ✅ ZERO perte TAN (aucun débit wallet ici)
// ======================================================

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

/* 🎨 RHAZN */
const GOLD = "#D4AF37";
const BG = "#000";

/* 🔢 FORMAT FINTECH (milliers lisibles) */
const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

/* 🧾 Frais retrait (selon ta logique) */
const WITHDRAW_FEE_TOTAL_RATE = 0.30; // 30% total (info)
const AGENT_FEE_RATE = 0.10; // 10% agent
const SUPREME_FEE_RATE = 0.20; // 20% supreme

/* 🔒 RHAZN RULES (mémoire système) */
const WITHDRAW_MIN = 5000;
const WITHDRAW_MAX = 250000;

/* ===================== APPLE-LIKE ALERT ===================== */
function useRzAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"error" | "success" | "info">("info");

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeDuration = (text: string) => {
    const len = text.length;
    if (len < 80) return 3500;
    if (len < 170) return 5200;
    return 8200;
  };

  const show = (k: "error" | "success" | "info", t: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);

    setKind(k);
    setTitle(t);
    setMsg(m);
    setVisible(true);

    opacity.setValue(0);
    ty.setValue(10);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 10,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }, computeDuration(m));
  };

  const node = visible ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.rzToast,
        {
          opacity,
          transform: [{ translateY: ty }],
          borderColor:
            kind === "error"
              ? "#FF453A"
              : kind === "success"
              ? "#34C759"
              : "rgba(255,255,255,0.10)",
        },
      ]}
    >
      <Text style={styles.rzToastTitle}>{title}</Text>
      <Text style={styles.rzToastMsg}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, node };
}

/* =========================================================
   🟢 RHAZN SUCCESS CARD — WITHDRAW (APPLE WHITE PREMIUM)
========================================================= */
function RzWithdrawSuccessCard({
  visible,
  tan,
  htg,
  onClose,
}: {
  visible: boolean;
  tan: number;
  htg: number;
  onClose: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    scale.setValue(0.92);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
  <View style={withdrawSuccess.overlay}>
    <Animated.View
      style={[
        withdrawSuccess.card,
        { opacity, transform: [{ scale }] },
      ]}
    >

      <Text style={withdrawSuccess.check}>✓</Text>

      <Text style={withdrawSuccess.title}>Retrait enregistré</Text>
      <Text style={withdrawSuccess.sub}>
        Présentez-vous chez l’agent pour recevoir le cash
      </Text>

      <View style={withdrawSuccess.sep} />

      <Text style={withdrawSuccess.amount}>
        {fmt(tan)} TAN • {fmt(htg)} HTG
      </Text>

      <TouchableOpacity
        style={withdrawSuccess.btn}
        onPress={onClose}
      >
        <Text style={withdrawSuccess.btnTxt}>OK</Text>
      </TouchableOpacity>
    </Animated.View>
  </View>
);

}

const withdrawSuccess = StyleSheet.create({
  /* 🔥 overlay flou premium */
  overlay: {
    position: "absolute",
    zIndex: 9999,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 🔥 carte Apple blanche joyeuse */
  card: {
    width: "80%",
    maxWidth: 360,

    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 30,
  },

  check: {
    fontSize: 44,
    fontWeight: "900",
    color: "#34C759",
    marginBottom: 8,
  },

  title: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
  },

  sub: {
    marginTop: 6,
    color: "#666",
    fontSize: 13,
    textAlign: "center",
  },

  sep: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
    marginVertical: 18,
  },

  amount: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
  },

  btn: {
    marginTop: 22,
    backgroundColor: GOLD,
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 18,
  },

  btnTxt: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
  },
});



export default function UserWithdrawRequest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rzAlert = useRzAlert();
  const insets = useSafeAreaInsets();
  const [stickyHeight, setStickyHeight] = useState(110); // fallback

  // ✅ IDs transmis depuis UserAgentAccess (RPC get_agent_by_code)
  const ed_id = typeof params.ed_id === "string" ? params.ed_id : null;
  const ed_code = typeof params.ed_code === "string" ? params.ed_code : null;

  // 🔢 INPUT FINTECH: digits (vraie valeur) + affichage formaté
const [amountDigits, setAmountDigits] = useState<string>("");   // ex: "25000000"
const [amountUi, setAmountUi] = useState<string>("");           // ex: "25 000 000"

const onlyDigits = (s: string) => (s || "").replace(/[^\d]/g, "");

const fmtInputDigits = (digits: string) => {
  if (!digits) return "";
  // sécurité: garder un nombre raisonnable
  const n = Number(digits);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("fr-FR"); // espaces / séparateurs milliers
};

const onAmountChange = (text: string) => {
  const d = onlyDigits(text);

  // option: éviter les zéros en tête (ex: 0005000)
  const normalized = d.replace(/^0+(?=\d)/, "");

  setAmountDigits(normalized);
  setAmountUi(fmtInputDigits(normalized));
};

  const [sending, setSending] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  const [agentStatusLabel] = useState("Certifié & Agréé RHAZN");
  const [agentStatusCode] = useState<"CERTIFIED" | "PENDING" | "UNKNOWN">(
    "CERTIFIED"
  );

  /* ======================================================
     🔥 LOAD USER + WALLET (AUCUN DÉBIT ICI)
  ====================================================== */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      setUserEmail(user.email ?? null);

      const { data: w } = await supabase
        .from("wallets")
        .select("tan_balance")
        .eq("user_id", user.id)
        .single();

      setWalletBalance(Number(w?.tan_balance ?? 0));
    })();
  }, []);

  /* ======================================================
     🔥 CALCULS TEMPS RÉEL
  ====================================================== */
  const requestedAmount = useMemo(() => {
  const n = Number(amountDigits);
  return Number.isFinite(n) ? n : 0;
}, [amountDigits]);

  const isBelowMin = requestedAmount > 0 && requestedAmount < WITHDRAW_MIN;
  const isAboveMax = requestedAmount > WITHDRAW_MAX;

  const isInvalidAmount = requestedAmount <= 0 || isBelowMin || isAboveMax;
  const disableSend = sending || isInvalidAmount;

  const feeAgent = useMemo(
    () => Math.ceil(requestedAmount * AGENT_FEE_RATE),
    [requestedAmount]
  );

  const feeSupreme = useMemo(
    () => Math.ceil(requestedAmount * SUPREME_FEE_RATE),
    [requestedAmount]
  );

  const feeTotal = useMemo(() => feeAgent + feeSupreme, [feeAgent, feeSupreme]);

  const debitTotal = useMemo(
    () => requestedAmount + feeTotal,
    [requestedAmount, feeTotal]
  );

  const futureBalance = useMemo(
    () => Math.max(walletBalance - debitTotal, 0),
    [walletBalance, debitTotal]
  );

  /* ======================================================
   💎 HTG CASH PREVIEW
====================================================== */
  const cashHTG = useMemo(() => {
    return Math.floor(requestedAmount * 0.5);
  }, [requestedAmount]);

  /* ======================================================
     ✅ SUBMIT (AUCUN DÉBIT WALLET)
  ====================================================== */
  const submitRequest = async () => {
    if (!ed_id) {
      rzAlert.show(
        "error",
        "Agent introuvable",
        "Diagnostic : aucun agent détecté.\nSolution : retournez à la liste et sélectionnez un agent."
      );
      Alert.alert("Erreur", "Agent RHAZN introuvable.");
      return;
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      rzAlert.show(
        "error",
        "Montant invalide",
        "Diagnostic : saisie incorrecte.\nSolution : entrez un nombre entier positif (ex: 500)."
      );
      return;
    }

    if (walletBalance > 0 && debitTotal > walletBalance) {
      rzAlert.show(
        "error",
        "Solde insuffisant",
        `Diagnostic : votre solde (${fmt(
          walletBalance
        )} TAN) est inférieur au débit estimé (${fmt(
          debitTotal
        )} TAN).\nSolution : réduisez le montant ou rechargez votre wallet.`
      );
      return;
    }

    setSending(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        rzAlert.show("error", "Connexion requise", "Reconnectez-vous.");
        return;
      }

      const { data: ed, error: edError } = await supabase
        .from("eds")
        .select("id,is_active")
        .eq("id", ed_id)
        .single();

      if (edError || !ed || ed.is_active === false) {
        rzAlert.show(
          "error",
          "Agent invalide",
          "Diagnostic : agent inactif.\nSolution : choisissez un autre agent."
        );
        return;
      }

      const { error } = await supabase.from("user_withdraw_requests").insert({
        user_uid: user.id,
        ed_id: ed_id,
        amount_tan: requestedAmount,
        status: "PENDING",
        note: null,
      });

      if (error) {
        rzAlert.show("error", "Erreur système", error.message);
        return;
      }

      setSuccessVisible(true);
  
    } finally {
      setSending(false);
    }
  };

  /* ================= UI ================= */

  const statusColor =
    agentStatusCode === "CERTIFIED"
      ? "#34C759"
      : agentStatusCode === "PENDING"
      ? "#FF9F0A"
      : "rgba(255,255,255,0.55)";

  const statusText =
    agentStatusCode === "CERTIFIED"
      ? "AGENT CERTIFIÉ"
      : agentStatusCode === "PENDING"
      ? "CERTIFICATION EN COURS"
      : "STATUT INCONNU";

  const stickyTop = (insets.top || 0) + 8;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {rzAlert.node}

     {/* ================= STICKY HTG CARD (FIXE ABSOLUE) ================= */}
{requestedAmount > 0 &&
 !isBelowMin &&
 !isAboveMax && (

  <View
    pointerEvents="none"
    style={[styles.htgStickyWrap, { top: stickyTop }]}
    onLayout={(e) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) setStickyHeight(h + 16); // marge confort
    }}
  >
    <View style={styles.htgStickyCard}>
      <View style={styles.htgStickyTop}>
        <Text style={styles.htgStickyTitle}>Vous recevrez</Text>

        <View style={styles.htgStickyPill}>
          <Text style={styles.htgStickyPillText}>CASH</Text>
        </View>
      </View>

      <Text style={styles.htgStickyValue}>{fmt(cashHTG)} HTG</Text>

      <View style={styles.htgStickySep} />

      <Text style={styles.htgStickySub}>
        Montant cash remis par l'agent (1 TAN = 0.5 HTG)
      </Text>
    </View>
  </View>
)}

      {/* ================= CONTENU SCROLLABLE ================= */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
  styles.scroll,
  { paddingTop: requestedAmount > 0 ? stickyHeight + stickyTop : 16 }
]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>

            <Text style={styles.title}>Retrait TAN</Text>
            <Text style={styles.sub}>
              Présentiel • Validation Agent requise
            </Text>
          </View>

          {/* Agent Card Premium */}
          <View style={styles.agentCard}>
            <View style={styles.agentTopRow}>
              <View>
                <Text style={styles.agentLabel}>Agent RHAZN</Text>
                <Text style={styles.agentCode}>{ed_code ?? "—"}</Text>
              </View>

              <View style={[styles.badge, { borderColor: statusColor }]}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={[styles.badgeText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
            </View>

            <Text style={styles.agentProof}>
              Statut :{" "}
              <Text style={styles.agentProofStrong}>{agentStatusLabel}</Text>
            </Text>

            <Text style={styles.agentProofSub}>
              Diagnostic : retrait en présentiel.{"\n"}
              Solution : l'agent valide et vous remet le cash.
            </Text>
          </View>

          {/* Wallet Preview Premium */}
          <View style={styles.walletCard}>
            <Text style={styles.sectionTitle}>Aperçu du retrait</Text>

            <View style={styles.walletRow}>
              <Text style={styles.walletLineLabel}>Solde avant</Text>
              <Text style={styles.walletLineValue}>
                {fmt(walletBalance)} TAN
              </Text>
            </View>

            <View style={styles.walletRow}>
              <Text style={styles.walletLineLabel}>Montant cash demandé</Text>
              <Text style={styles.walletLineValueGold}>
                {fmt(requestedAmount)} TAN
              </Text>
            </View>

            <View style={styles.walletRow}>
              <Text style={styles.walletLineLabel}>Frais Agent (10%)</Text>
              <Text style={styles.walletLineValue}>{fmt(feeAgent)} TAN</Text>
            </View>

            <View style={styles.walletRow}>
              <Text style={styles.walletLineLabel}>Frais Supreme (20%)</Text>
              <Text style={styles.walletLineValue}>{fmt(feeSupreme)} TAN</Text>
            </View>

            <View style={[styles.walletRow, styles.walletRowStrong]}>
              <Text style={styles.walletLineLabelStrong}>
                Débit total estimé
              </Text>
              <Text style={styles.walletLineValueStrong}>
                {fmt(debitTotal)} TAN
              </Text>
            </View>

            <View style={styles.sep} />

            <View style={styles.walletRow}>
              <Text style={styles.walletLineLabel}>Solde après (estimé)</Text>
              <Text style={styles.walletLineValue}>
                {fmt(futureBalance)} TAN
              </Text>
            </View>

            <Text style={styles.walletHint}>
              ⚠️ Aucun TAN n'est débité ici. Le débit réel est appliqué
              uniquement lors de la validation par l'agent.
            </Text>
          </View>

          {/* ================= FORM ================= */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Détails de la demande</Text>

            <Text style={styles.label}>Montant cash souhaité (TAN)</Text>

            <TextInput
  value={amountUi}
  onChangeText={onAmountChange}
  placeholder="Ex : 5 000"
  placeholderTextColor="rgba(255,255,255,0.35)"
  keyboardType="numeric"
  style={styles.input}
  autoCorrect={false}
  autoCapitalize="none"
  // UX fintech: toujours visible, gros chiffres
  selectionColor={GOLD}
/>

            <Text style={styles.limitHint}>
              Minimum : {fmt(WITHDRAW_MIN)} TAN • Maximum :{" "}
              {fmt(WITHDRAW_MAX)} TAN
            </Text>

            {isBelowMin && (
              <Text style={styles.limitError}>
                ⚠️ Montant inférieur au minimum autorisé
              </Text>
            )}

            {isAboveMax && (
              <Text style={styles.limitError}>
                ⚠️ Montant supérieur au maximum autorisé
              </Text>
            )}

            <TouchableOpacity
              onPress={submitRequest}
              disabled={disableSend}
              style={[styles.submitBtn, disableSend && { opacity: 0.45 }]}
              activeOpacity={0.9}
            >
              {sending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitText}>Envoyer la demande</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footWrap}>
              <Text style={styles.footNote}>
                Le cash est remis par l'agent en présentiel.{"\n"}
                La validation déclenche le débit final selon les frais.
              </Text>
            </View>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <RzWithdrawSuccessCard
  visible={successVisible}
  tan={requestedAmount}
  htg={cashHTG}
  onClose={() => setSuccessVisible(false)}
/>
    </SafeAreaView>
  );
}

/* ===================== STYLES (Premium Apple-like) ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  sscroll: {
  paddingHorizontal: 16,
  paddingTop: 70,
  paddingBottom: 30,
},

  header: { marginBottom: 14 },
  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  sub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  /* Agent card */
  agentCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  agentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "800",
  },
  agentCode: {
    marginTop: 6,
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  dot: { width: 8, height: 8, borderRadius: 99, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },

  agentProof: {
    marginTop: 12,
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "800",
  },
  agentProofStrong: { color: "#FFF" },
  agentProofSub: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },

  /* Wallet preview */
  walletCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sectionTitle: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 8,
  },

  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  walletRowStrong: {
    backgroundColor: "rgba(212,175,55,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },

  walletLineLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "800",
  },
  walletLineValue: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  walletLineValueGold: { color: GOLD, fontSize: 12, fontWeight: "900" },

  walletLineLabelStrong: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  walletLineValueStrong: { color: GOLD, fontSize: 12, fontWeight: "900" },

  sep: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 10,
  },
  walletHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },

  /* Form card */

  /* ================= FLOATING FORM ================= */
formFloating: {
  position: "absolute",
  left: 16,
  right: 16,
  bottom: 14,
  zIndex: 2000,

  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 20,
},

  formCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  limitHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },

  limitError: {
    marginTop: 6,
    color: "#FF453A",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },

  submitBtn: {
    marginTop: 18,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#000", fontWeight: "900" },

  footWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: 12,
  },
  footNote: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "700",
  },

  /* Toast Apple-like */
  rzToast: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    zIndex: 999,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  rzToastTitle: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  rzToastMsg: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },

  /* ================= PREMIUM STICKY HTG CARD (FOND BLANC) ================= */
  htgStickyWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
  },

  htgStickyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 0,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  htgStickyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  htgStickyTitle: {
    color: "#222",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  htgStickyPill: {
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },

  htgStickyPillText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  htgStickyValue: {
    marginTop: 8,
    color: GOLD,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  htgStickySep: {
    marginTop: 12,
    marginBottom: 2,
    height: 1,
    backgroundColor: "#E6E6E6",
  },

  htgStickySub: {
    marginTop: 10,
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
});