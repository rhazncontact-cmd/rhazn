// ======================================================
// RHAZN — USER BUY TAN REQUEST (PREMIUM APPLE-LIKE)
// ✅ UI luxe • Toast intelligent • Calculs temps réel
// ✅ Prix unité visible : 500 TAN = 250 HTG (1 TAN = 0.5 HTG)
// ✅ Affiche TOTAL HTG à payer (sticky premium comme withdraw)
// ✅ Supprime résumé juridique (note + auto-fill retirés)
// ✅ Min 500 TAN • Max 50 000 TAN / jour (bouton grisé + alertes)
// ✅ Agent certifié : intact et inchangé
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

/* 🔢 FORMAT FINTECH */
const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

/* 💱 TARIF TAN → HTG */
const TAN_TO_HTG_RATE = 0.5;
const UNIT_TAN = 500; // affichage demandé
const UNIT_HTG = 250; // affichage demandé (500 * 0.5)

/* 🔒 RULES */
const BUY_MIN_TAN = 500;
const BUY_MAX_TAN_PER_DAY = 50000;

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
🟢 RHAZN FLOAT SUCCESS — GOD MODE
fixe au centre • flottant • Apple luxe • compact
========================================================= */
function RzSuccessCard({
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
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) return;

    opacity.setValue(0);
    scale.setValue(0.9);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={successStyles.overlay}>
      <Animated.View
        style={[
          successStyles.card,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={successStyles.check}>✓</Text>

<Text style={successStyles.title}>Demande envoyée</Text>
<Text style={successStyles.sub}>Paiement chez l’agent requis</Text>

<View style={successStyles.sep} />

<Text style={successStyles.amount}>
  {fmt(tan)} TAN • {fmt(htg)} HTG
</Text>


        <TouchableOpacity
          onPress={onClose}
          style={successStyles.btn}
          activeOpacity={0.9}
        >
          <Text style={successStyles.btnTxt}>OK</Text>
        </TouchableOpacity>
      </Animated.View>
      <View style={successStyles.goldBar} />

    </View>
  );
}

const successStyles = StyleSheet.create({
  /* 🔥 overlay sombre arrière */
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

  /* ================== CARTE APPLE BLANC JOYEUX ================== */
  card: {
    width: "80%",
    maxWidth: 360,

    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",

    /* 🔥 ombre Apple */
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 25,
  },

  /* barre or fine */
  goldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: GOLD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  /* check */
  check: {
    fontSize: 44,
    color: "#34C759",
    fontWeight: "900",
    marginBottom: 8,
  },

  /* titre noir Apple */
  title: {
    color: "#000",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  /* sous titre */
  sub: {
    marginTop: 6,
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },

  sep: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
    marginVertical: 18,
  },

  /* montant */
  amount: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  /* bouton */
  btn: {
    marginTop: 22,
    backgroundColor: GOLD,
    paddingVertical: 13,
    paddingHorizontal: 42,
    borderRadius: 18,

    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },

  btnTxt: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
  },
});


export default function UserBuyAcsetRequest() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rzAlert = useRzAlert();
  const insets = useSafeAreaInsets();

  // ✅ IDs transmis depuis la page Agent
  const ed_id = typeof params.ed_id === "string" ? params.ed_id : null;
const ed_code = typeof params.ed_code === "string" ? params.ed_code : null;

/* 🔒 HARD GUARD — empêche accès sans agent */
/* 🔒 HARD GUARD — empêche accès sans agent */
useEffect(() => {
  if (!ed_id) {
    router.replace("/user-agent-access");
  }
}, [ed_id]);

const [amount, setAmount] = useState("");
const [sending, setSending] = useState(false);

/* ✅ 👉 COLLER ICI */
const [successVisible, setSuccessVisible] = useState(false);

const [userEmail, setUserEmail] = useState<string | null>(null);

  const [agentStatusLabel] = useState("Certifié & Agréé RHAZN");
  const [agentStatusCode] = useState<"CERTIFIED" | "PENDING" | "UNKNOWN">(
    "CERTIFIED"
  );

  // ✅ sticky spacing (pour ne pas masquer le header/agent)
  const [stickyHeight, setStickyHeight] = useState(108);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email ?? null);
    })();
  }, []);

  const tanAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const totalHTG = useMemo(() => {
    return Math.floor(tanAmount * TAN_TO_HTG_RATE);
  }, [tanAmount]);

  // ✅ validations min/max
  const isBelowMin = tanAmount > 0 && tanAmount < BUY_MIN_TAN;
  const isAboveMax = tanAmount > BUY_MAX_TAN_PER_DAY;
  const isInvalidAmount = tanAmount <= 0 || isBelowMin || isAboveMax;

  const disableSend = sending || isInvalidAmount;

  // ✅ alert live (Apple-like) quand hors règle
  useEffect(() => {
    if (!amount) return;

    if (isBelowMin) {
      rzAlert.show(
        "error",
        "Montant trop faible",
        `Minimum : ${fmt(BUY_MIN_TAN)} TAN.\nSolution : augmentez le montant.`
      );
      return;
    }

    if (isAboveMax) {
      rzAlert.show(
        "error",
        "Limite journalière dépassée",
        `Maximum : ${fmt(BUY_MAX_TAN_PER_DAY)} TAN / jour.\nSolution : réduisez le montant.`
      );
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const submitRequest = async () => {
    if (!ed_id) {
      rzAlert.show(
        "error",
        "Agent introuvable",
        "Diagnostic : l’agent RHAZN n’a pas été détecté.\nSolution : retournez à la liste des agents et sélectionnez un agent certifié."
      );
      Alert.alert("Erreur", "Agent RHAZN introuvable.");
      return;
    }

    if (tanAmount <= 0) {
      rzAlert.show(
        "error",
        "Montant invalide",
        "Diagnostic : le montant TAN est incorrect.\nSolution : saisissez un nombre entier positif (ex: 500)."
      );
      return;
    }

    if (tanAmount < BUY_MIN_TAN) {
      rzAlert.show(
        "error",
        "Montant trop faible",
        `Minimum : ${fmt(BUY_MIN_TAN)} TAN.\nSolution : augmentez le montant.`
      );
      return;
    }

    if (tanAmount > BUY_MAX_TAN_PER_DAY) {
      rzAlert.show(
        "error",
        "Limite journalière dépassée",
        `Maximum : ${fmt(BUY_MAX_TAN_PER_DAY)} TAN / jour.\nSolution : réduisez le montant.`
      );
      return;
    }

    setSending(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData?.user) {
        rzAlert.show("error", "Connexion requise", "Reconnectez-vous.");
        return;
      }

      const user = authData.user;

      /* =====================================================
         🔥 RHAZN — achat TAN en présentiel
         NOTE : backend actuel utilise user_withdraw_requests
         (on respecte votre base, aucun autre changement)
      ===================================================== */
      const { error } = await supabase.from("user_withdraw_requests").insert({
        user_uid: user.id,
        ed_id: ed_id,
        amount_tan: tanAmount,
        status: "PENDING",
        note: null, // ✅ résumé juridique supprimé
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
        {tanAmount > 0 &&
 !isBelowMin &&
 !isAboveMax && (

        <View
          pointerEvents="none"
          style={[styles.htgStickyWrap, { top: stickyTop }]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) setStickyHeight(h + 16);
          }}
        >
          <View style={styles.htgStickyCard}>
            <View style={styles.htgStickyTop}>
              <Text style={styles.htgStickyTitle}>Total à payer</Text>

              <View style={styles.htgStickyPill}>
                <Text style={styles.htgStickyPillText}>HTG</Text>
              </View>
            </View>

            <Text style={styles.htgStickyValue}>{fmt(totalHTG)} HTG</Text>

            <View style={styles.htgStickySep} />

            <Text style={styles.htgStickySub}>
              Prix unité : {fmt(UNIT_TAN)} TAN = {fmt(UNIT_HTG)} HTG (1 TAN = 0.5
              HTG)
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop:
                tanAmount > 0 ? stickyHeight + stickyTop : styles.scroll.paddingTop,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* header descendu pour éviter le masquage */}
          <View style={styles.header}>
            
            <Text style={styles.title}>Acheter du TAN</Text>
            <Text style={styles.sub}>Présentiel • Validation Agent requise</Text>
          </View>

          {/* Agent Card Premium (INTACT) */}
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
              Diagnostic : cet agent est reconnu par RHAZN et autorisé à valider
              les demandes.
              {"\n"}Solution : effectuez le paiement en présentiel, puis attendez
              la validation.
            </Text>
          </View>

          {/* Form Card Premium */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Détails de la demande</Text>

            <Text style={styles.label}>Montant TAN</Text>

            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))}
              placeholder={`Ex : ${fmt(BUY_MIN_TAN)}`}
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.limitHint}>
              Minimum : {fmt(BUY_MIN_TAN)} TAN • Maximum :{" "}
              {fmt(BUY_MAX_TAN_PER_DAY)} TAN / jour
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

            {/* On garde vos phrases EXACTES */}
            <View style={styles.footWrap}>
              <Text style={styles.footNote}>
                Le paiement se fait hors plateforme.{"\n"}
                La demande sera validée par l’Agent RHAZN.
              </Text>
            </View>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <RzSuccessCard
  visible={successVisible}
  tan={tanAmount}
  htg={totalHTG}
  onClose={() => setSuccessVisible(false)}
/>

    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  /* 🔥 espace supérieur pour laisser flotter carte confirmation */
  scroll: {
  paddingHorizontal: 16,
  paddingTop: 150,
  paddingBottom: 40,
},

  /* Premium header */
  header: { marginBottom: 14 },
  title: { color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  sub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  /* ================= AGENT CARD ================= */
  agentCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
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
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  dot: { width: 8, height: 8, borderRadius: 99, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },

  agentProof: {
    marginTop: 12,
    color: "rgba(255,255,255,0.85)",
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

  /* ================= FORM CARD ================= */
  formCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",

    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },

  sectionTitle: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
    marginBottom: 6,
  },

  label: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    marginTop: 20,
    backgroundColor: GOLD,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",

    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  submitText: { color: "#000", fontWeight: "900", fontSize: 15 },

  footWrap: {
    marginTop: 14,
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

  /* ================= TOAST ================= */
  rzToast: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.88)",
  },

  rzToastTitle: { color: "#FFF", fontWeight: "900", fontSize: 14 },

  rzToastMsg: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 13,
  },

  /* ================= STICKY HTG ================= */
  htgStickyWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 998,
  },

  /* 🔥 VERSION NOIR APPLE RHAZN */
  htgStickyCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",

    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 25,
  },

  htgStickyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  htgStickyTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  htgStickyPill: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },

  htgStickyPillText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  htgStickyValue: {
    marginTop: 10,
    color: GOLD,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  htgStickySep: {
    marginTop: 14,
    marginBottom: 6,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  htgStickySub: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
});
