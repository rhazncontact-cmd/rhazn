// ======================================================
// RHAZN — AGENT SELL TAN (FINAL • TAN ONLY • PRODUCTION+)
// ✅ Wallet agent realtime (réel seulement)
// ✅ HTG visible par carte (évite malentendu)
// ✅ Expiration 100s + tri urgent auto
// ✅ Glow validation + confetti + son caisse + double vibration succès
// ✅ Toast Apple-like RHAZN
// ✅ Bouton REFUSER supprimé (expiration auto)
// ======================================================

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";

/* 🔥 BUSINESS CONSTANTS */
const TAN_TO_HTG_RATE = 0.5; // 1 TAN = 0.5 HTG
const TAN_PRICE_AMOUNT = 500;
const TAN_PRICE_HTG = 250;
const REQUEST_EXPIRY_SECONDS = 100;

/* ================= TYPES ================= */

type RequestRow = {
  id: string;
  user_uid: string;
  ed_id: string;
  amount_tan: number;
  status: string;
  created_at: string;
};

/* ================= WRAPPER ================= */

export default function AgentSellTan() {
  return (
    <AgentGuard>
      <AgentSellTanContent />
    </AgentGuard>
  );
}

/* ====================================================== */

function AgentSellTanContent() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  /* ✅ SOLDE RÉEL UNIQUEMENT */
  const [agentBalance, setAgentBalance] = useState<number>(0);

  const [tick, setTick] = useState(0);

  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<RequestRow | null>(null);

  const pinRef = useRef<TextInput>(null);

  /* ✅ glow + confetti triggers */
  const [glowId, setGlowId] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  /* ✅ Son caisse (optionnel) */

  /* ===================== TOAST APPLE-LIKE ===================== */
  const toast = useRzToast();

  /* ======================================================
     TICK expiration
  ====================================================== */
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ======================================================
     WALLET AGENT REALTIME (SOLDE OFFICIEL DB)
  ====================================================== */
  useEffect(() => {
    let channel: any;

    const loadWallet = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id;
      if (!uid) return;

      const { data } = await supabase
        .from("wallets")
        .select("tan_balance")
        .eq("user_id", uid)
        .single();

      setAgentBalance(data?.tan_balance ?? 0);

      channel = supabase
        .channel("agent-wallet-live")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            setAgentBalance(payload.new.tan_balance ?? 0);
          }
        )
        .subscribe();
    };

    loadWallet();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ======================================================
     LOAD REQUESTS
  ====================================================== */
  const loadRequests = async () => {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const agentUid = session?.user?.id;
      if (!agentUid) return;

      const { data: ed } = await supabase
        .from("eds")
        .select("id")
        .eq("auth_uid", agentUid)
        .eq("is_active", true)
        .single();

      if (!ed) return;

      const { data } = await supabase
        .from("user_withdraw_requests")
        .select("id,user_uid,ed_id,amount_tan,status,created_at")
        .eq("ed_id", ed.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: true });

      setRequests(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* ======================================================
     REALTIME (requests)
  ====================================================== */
  useEffect(() => {
    const channel = supabase
      .channel("withdraw-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_withdraw_requests" },
        loadRequests
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ======================================================
     EXPIRATION + TRI URGENT AUTO
  ====================================================== */
  const remainingSeconds = (iso: string) => {
    const age = (Date.now() - new Date(iso).getTime()) / 1000;
    return Math.max(0, Math.ceil(REQUEST_EXPIRY_SECONDS - age));
  };

  const visibleRequests = useMemo(() => {
    const now = Date.now();

    const alive = requests.filter((r) => {
      const age = (now - new Date(r.created_at).getTime()) / 1000;
      return age <= REQUEST_EXPIRY_SECONDS;
    });

    // ✅ TRI URGENT AUTO : plus ça expire vite, plus c'est en haut
    alive.sort(
      (a, b) => remainingSeconds(a.created_at) - remainingSeconds(b.created_at)
    );

    return alive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, tick]);

  /* ======================================================
     ACTIONS
  ====================================================== */
  const openPin = (req: RequestRow) => {
    setSelected(req);
    setPin("");
    setPinModal(true);
    setTimeout(() => pinRef.current?.focus(), 220);
  };

  const doubleSuccessHaptics = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 140));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
  };

  const approve = async () => {
    if (!selected) return;

    if (!pin || pin.length < 3) {
      toast.show("error", "PIN requis", "Entrez le PIN de l'agent pour valider.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.rpc("approve_agent_sell_tan", {
        p_request_id: selected.id,
        p_agent_pin: pin,
      });

      if (error) {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  showRzSystemAlert(error.message);
  console.log("RPC ERROR 👉", error);
  return;
}

      // ===============================
// SUCCESS FX + UPDATE LOCAL
// ===============================
setGlowId(selected.id);
setConfettiKey((k) => k + 1);
await doubleSuccessHaptics();

toast.show("success", "Validé", "✅ Transaction confirmée.");

// 🔥 1. retirer requête instant UI
setRequests((prev) =>
  prev.filter((r) => r.id !== selected.id)
);

// 🔥 2. mettre à jour solde agent instant
setAgentBalance((prev) => prev - selected.amount_tan);

// 🔥 3. fermer modal
setPinModal(false);
setSelected(null);
setPin("");

// 🔥 4. backup reload silencieux sécurité
setTimeout(() => {
  loadRequests();
}, 1200);

// 🔥 5. stop glow
setTimeout(() => setGlowId(null), 1200);
    } finally {
      setBusy(false);
    }
  };

  /* ======================================================
     UI
  ====================================================== */

  const renderItem = ({ item }: { item: RequestRow }) => (
    <RequestCard
      item={item}
      seconds={remainingSeconds(item.created_at)}
      isGlow={glowId === item.id}
      onPressValidate={() => openPin(item)}
    />
  );

  /* ================= APPLE-LIKE RHAZN ALERT ================= */

const [sysAlert, setSysAlert] = useState<null | {
  title: string;
  msg: string;
  action?: string;
  route?: string;
}>(null);

const showRzSystemAlert = (rawMsg?: string) => {
  if (!rawMsg) {
    setSysAlert({
      title: "Erreur système",
      msg: "Une erreur inconnue est survenue.",
    });
    return;
  }

  /* ================= MONETISATION ================= */
  if (rawMsg.includes("non monétisé")) {
    setSysAlert({
      title: "Compte non monétisé",
      msg:
        "Votre profil doit être complété pour activer les ventes TAN, retraits et commissions.",
      action: "Compléter mon profil",
      route: "/user-profile-edit",
    });
    return;
  }

  /* ================= SOLDE ================= */
  if (rawMsg.includes("insufficient")) {
    setSysAlert({
      title: "Solde insuffisant",
      msg: "Votre solde TAN est insuffisant pour cette opération.",
    });
    return;
  }

  /* ================= DEJA TRAITÉ ================= */
  if (rawMsg.includes("already processed")) {
    setSysAlert({
      title: "Déjà traité",
      msg: "Cette demande a déjà été traitée.",
    });
    return;
  }

  /* ================= PIN ================= */
  if (rawMsg.includes("PIN")) {
    setSysAlert({
      title: "PIN incorrect",
      msg: "Le PIN agent saisi est incorrect.",
    });
    return;
  }

  /* ================= DEFAULT ================= */
  setSysAlert({
    title: "Erreur RHAZN",
    msg: rawMsg,
  });
};

  return (
    <View style={styles.container}>
      {/* TOAST */}
      {toast.node}

      {/* CONFETTI */}
      <ConfettiBurst key={confettiKey} />

      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={26}
          color="#FFF"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Vente TAN</Text>
        <Feather name="refresh-cw" size={18} color="#FFF" onPress={loadRequests} />
      </View>

      {/* SOLDE + PRIX */}
      <View style={styles.walletBox}>
        <Text style={styles.walletLabel}>Solde Agent</Text>
        <Text style={styles.walletValue}>{agentBalance} TAN</Text>
        <Text style={styles.price}>
          {TAN_PRICE_AMOUNT.toLocaleString("fr-FR")} TAN ={" "}
          {TAN_PRICE_HTG.toLocaleString("fr-FR")} HTG
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={GOLD} />
      ) : (
        <FlatList
          data={visibleRequests}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 26 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* MODAL PIN */}
      <Modal
        transparent
        visible={pinModal}
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setPinModal(false);
            setSelected(null);
            setPin("");
          }}
        />

        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirmer la validation</Text>

            <Text style={styles.modalSub}>
              Entrez le PIN agent pour confirmer.
            </Text>

            <TextInput
              ref={pinRef}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, ""))}
              secureTextEntry
              keyboardType="numeric"
              style={styles.pinInput}
              placeholder="PIN"
              placeholderTextColor="rgba(255,255,255,0.35)"
              returnKeyType="done"
              onSubmitEditing={approve}
            />

            <View style={{ flexDirection: "row", marginTop: 14 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setPinModal(false);
                  setSelected(null);
                  setPin("");
                }}
              >
                <Text style={styles.cancelText}>ANNULER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, busy && { opacity: 0.65 }]}
                onPress={approve}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.confirmText}>CONFIRMER</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= RHAZN SYSTEM ALERT ================= */}
<Modal transparent visible={!!sysAlert} animationType="fade">
  <View style={styles.alertBackdrop}>
    <View style={styles.alertBox}>
      
      <Text style={styles.alertTitle}>{sysAlert?.title}</Text>
      <Text style={styles.alertMsg}>{sysAlert?.msg}</Text>

      <View style={{ flexDirection: "row", marginTop: 18 }}>

        {sysAlert?.route && (
          <TouchableOpacity
            style={styles.alertPrimary}
            onPress={() => {
              setSysAlert(null);
              router.push(sysAlert.route as any);
            }}
          >
            <Text style={styles.alertPrimaryText}>
              {sysAlert?.action || "Corriger"}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.alertClose}
          onPress={() => setSysAlert(null)}
        >
          <Text style={styles.alertCloseText}>Fermer</Text>
        </TouchableOpacity>

      </View>

    </View>
  </View>
</Modal>

    </View>
  );
}

/* ======================================================
   REQUEST CARD (glow uniquement)
====================================================== */

function RequestCard({
  item,
  seconds,
  isGlow,
  onPressValidate,
}: {
  item: RequestRow;
  seconds: number;
  isGlow: boolean;
  onPressValidate: () => void;
}) {
  const htg = item.amount_tan * TAN_TO_HTG_RATE;

  let badgeColor = "#34C759";
  if (seconds <= 20) badgeColor = "#FF9F0A";
  if (seconds <= 10) badgeColor = "#FF453A";

  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isGlow) return;

    glow.setValue(0);
    Animated.sequence([
      Animated.timing(glow, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 560,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isGlow, glow]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.08)", "rgba(212,175,55,0.95)"],
  });

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.32],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor,
          shadowColor: GOLD,
          shadowOpacity: shadowOpacity as any,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
      ]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.amount}>{item.amount_tan} TAN</Text>

        <View style={[styles.timerBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.timerText}>{seconds}s</Text>
        </View>
      </View>

      <Text style={styles.htg}>
        ≈ {htg.toLocaleString("fr-FR")} HTG à verser à l'Agent RHAZN
      </Text>

      <Text style={styles.meta}>
        {new Date(item.created_at).toLocaleString()}
      </Text>

      <TouchableOpacity style={styles.approveBtn} onPress={onPressValidate}>
        <Text style={styles.approveText}>VALIDER</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ======================================================
   CONFETTI (no external lib)
====================================================== */

function ConfettiBurst() {
  const { width, height } = Dimensions.get("window");
  const [active, setActive] = useState(true);

  const pieces = useMemo(() => {
    const n = 22;
    return Array.from({ length: n }).map((_, i) => {
      const x = width / 2 + (Math.random() * 160 - 80);
      const size = 6 + Math.random() * 6;
      const rotate = Math.random() * 360;
      const drift = Math.random() * 140 - 70;
      const delay = Math.random() * 120;
      return { i, x, size, rotate, drift, delay };
    });
  }, [width]);

  useEffect(() => {
    const t = setTimeout(() => setActive(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {pieces.map((p) => (
        <ConfettiPiece
          key={p.i}
          x={p.x}
          size={p.size}
          rotate={p.rotate}
          drift={p.drift}
          delay={p.delay}
          height={height}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({
  x,
  size,
  rotate,
  drift,
  delay,
  height,
}: {
  x: number;
  size: number;
  rotate: number;
  drift: number;
  delay: number;
  height: number;
}) {
  const y = useRef(new Animated.Value(-20)).current;
  const o = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: height * 0.55 + Math.random() * 120,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(o, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start();
  }, [delay, height, o, y]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: x,
        width: size,
        height: size * 1.6,
        borderRadius: 3,
        backgroundColor: GOLD,
        transform: [
          { translateY: y },
          { translateX: drift },
          { rotate: `${rotate}deg` },
        ],
        opacity: o,
      }}
    />
  );
}

/* ======================================================
   TOAST (Apple-like)
====================================================== */

function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"error" | "success" | "info">("info");

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (k: "error" | "success" | "info", t: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);

    setKind(k);
    setTitle(t);
    setMsg(m);
    setVisible(true);

    opacity.setValue(0);
    ty.setValue(10);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 10, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 2600);
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "#FFF", fontWeight: "900" },

  walletBox: { margin: 16 },
  walletLabel: { color: "#AAA", fontWeight: "800" },
  walletValue: { color: GOLD, fontSize: 22, fontWeight: "900" },
  price: { color: "#AAA", fontSize: 11, marginTop: 6, fontWeight: "800" },

  card: {
    backgroundColor: "#111",
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  amount: { color: GOLD, fontWeight: "900", fontSize: 16 },
  meta: { color: "#888", fontSize: 11, marginTop: 6, fontWeight: "700" },

  htg: { color: "#34C759", fontWeight: "900", marginTop: 6 },

  actions: { flexDirection: "row", marginTop: 8 },

  approveBtn: { backgroundColor: GOLD, padding: 10, borderRadius: 10, marginTop: 10 },
  approveText: { textAlign: "center", fontWeight: "900", color: "#000" },

  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timerText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
  },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  modalWrap: { flex: 1, justifyContent: "flex-end" },

  modal: {
    backgroundColor: "#111",
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  modalTitle: { color: "#FFF", fontWeight: "900", fontSize: 14, textAlign: "center" },
  modalSub: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 11, marginTop: 6, textAlign: "center" },

  pinInput: {
    marginTop: 12,
    backgroundColor: "#222",
    color: "#FFF",
    padding: 12,
    borderRadius: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cancelText: { textAlign: "center", color: "#FFF", fontWeight: "900" },

  confirmBtn: { flex: 1, backgroundColor: GOLD, padding: 12, borderRadius: 12 },
  confirmText: { textAlign: "center", fontWeight: "900", color: "#000" },

  rzToast: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.85)",
  },

  alertBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.65)",
  justifyContent: "center",
  alignItems: "center",
},

alertBox: {
  width: 300,
  backgroundColor: "#111",
  padding: 22,
  borderRadius: 26,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.1)",
},

alertTitle: {
  color: "#FFF",
  fontWeight: "900",
  fontSize: 17,
  textAlign: "center",
},

alertMsg: {
  color: "rgba(255,255,255,0.75)",
  marginTop: 10,
  textAlign: "center",
  lineHeight: 20,
},

alertPrimary: {
  flex: 1,
  backgroundColor: GOLD,
  padding: 12,
  borderRadius: 14,
  marginRight: 8,
},

alertPrimaryText: {
  textAlign: "center",
  fontWeight: "900",
  color: "#000",
},

alertClose: {
  flex: 1,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  padding: 12,
  borderRadius: 14,
},

alertCloseText: {
  textAlign: "center",
  color: "#FFF",
  fontWeight: "900",
},
  rzToastTitle: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  rzToastMsg: { color: "rgba(255,255,255,0.75)", marginTop: 4, lineHeight: 18, fontSize: 13 },
});