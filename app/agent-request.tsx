// app/agent-request.tsx
// ✅ RHAZN — Agent Requests · Apple-like Premium
// ✅ Nouvelle logique : 1 TAN = 10 HTG · Commission 20% sur retrait (15% RHAZN + 5% Agent)
// ✅ Expiration 100s + tri urgent + glow + confetti
// ✅ Toast iOS + Alert système + PIN modal

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AgentGuard from "../components/AgentGuard";
import { supabase } from "../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
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
const ORANGE   = "#FF9500";
const BLUE     = "#007AFF";

const REQUEST_EXPIRY_SECONDS = 100;
// ✅ Nouvelle logique tarifaire officielle RHAZN
const TAN_TO_HTG = 10;    // 1 TAN = 10 HTG
const TAN_TO_USD = 0.05;  // 1 TAN = 0.05 USD
// ✅ Commission retrait : 20% total (15% RHAZN + 5% Agent)
const COMMISSION_RATE   = 0.20;
const RHAZN_RATE        = 0.15;
const AGENT_RATE        = 0.05;

// ─── Types ──────────────────────────────────────────────────
type WithdrawRow = {
  id: string;
  user_uid: string;
  ed_id: string;
  amount_tan: number;
  status: string;
  created_at: string;
};

type SysAlert = {
  title: string;
  msg: string;
  action?: string;
  route?: string;
} | null;

// ─── Toast iOS ──────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success"|"error"|"info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color = toast.type === "success" ? GREEN : toast.type === "error" ? RED : BLUE;
  const icon: any = toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "close-circle" : "information-circle";
  return (
    <Animated.View style={[ts.toast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [-20,0] }) }],
    }]}>
      <View style={[ts.toastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.toastTitle}>{toast.title}</Text>
        <Text style={ts.toastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Confetti ───────────────────────────────────────────────
function ConfettiPiece({ x, size, rotate, drift, delay, height, color }: {
  x: number; size: number; rotate: number; drift: number;
  delay: number; height: number; color: string;
}) {
  const y = useRef(new Animated.Value(-20)).current;
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: height * 0.5 + Math.random() * 100, duration: 680, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0, duration: 780, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute", top: 0, left: x,
      width: size, height: size * 1.6, borderRadius: 3,
      backgroundColor: color,
      transform: [{ translateY: y }, { translateX: drift }, { rotate: `${rotate}deg` }],
      opacity: o,
    }} />
  );
}

function ConfettiBurst() {
  const { width, height } = Dimensions.get("window");
  const [active, setActive] = useState(true);
  const pieces = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    i,
    x: width / 2 + (Math.random() * 200 - 100),
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
    drift: Math.random() * 150 - 75,
    delay: Math.random() * 120,
    color: [GOLD, GREEN, BLUE, ORANGE, RED][Math.floor(Math.random() * 5)],
  })), [width]);
  useEffect(() => {
    const t = setTimeout(() => setActive(false), 1000);
    return () => clearTimeout(t);
  }, []);
  if (!active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {pieces.map(p => (
        <ConfettiPiece key={p.i} x={p.x} size={p.size} rotate={p.rotate}
          drift={p.drift} delay={p.delay} height={height} color={p.color} />
      ))}
    </View>
  );
}

// ─── Carte demande ──────────────────────────────────────────
function RequestCard({ item, seconds, isGlow, onValidate, onReject }: {
  item: WithdrawRow;
  seconds: number;
  isGlow: boolean;
  onValidate: () => void;
  onReject: () => void;
}) {
  // ✅ Calcul commission retrait
  const agentFee    = Math.round(item.amount_tan * AGENT_RATE);   // 5%
  const rhaznFee    = Math.round(item.amount_tan * RHAZN_RATE);   // 15%
  const totalFee    = agentFee + rhaznFee;                        // 20%
  const netTan      = item.amount_tan - totalFee;                 // TAN nets reçus
  const htgDecaisse = item.amount_tan * TAN_TO_HTG;               // HTG que l'agent décaisse
  const agentEarns  = agentFee * TAN_TO_HTG;                      // HTG que l'agent gagne
  const usdNet      = (netTan * TAN_TO_USD).toFixed(2);

  const glow = useRef(new Animated.Value(0)).current;
  const urgentColor = seconds <= 10 ? RED : seconds <= 20 ? ORANGE : GREEN;
  const pct = Math.min(100, (seconds / REQUEST_EXPIRY_SECONDS) * 100);

  useEffect(() => {
    if (!isGlow) return;
    glow.setValue(0);
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 260, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 560, useNativeDriver: false }),
    ]).start();
  }, [isGlow]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [SOFT, "rgba(52,199,89,0.90)"],
  });

  return (
    <Animated.View style={[styles.card, { borderColor }]}>

      {/* Barre expiration */}
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${pct}%` as any, backgroundColor: urgentColor }]} />
      </View>

      {/* Header — montant TAN demandé */}
      <View style={styles.cardHead}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardAmount}>{item.amount_tan.toLocaleString("fr-FR")}</Text>
          <Text style={styles.cardUnit}>TAN</Text>
        </View>
        <View style={[styles.timerBadge, { backgroundColor: `${urgentColor}18`, borderColor: `${urgentColor}35` }]}>
          <Ionicons name="time-outline" size={12} color={urgentColor} />
          <Text style={[styles.timerTxt, { color: urgentColor }]}>{seconds}s</Text>
        </View>
      </View>

      {/* ✅ Grille : HTG décaissé + TAN net client */}
      <View style={styles.priceGrid}>
        <View style={styles.priceBoxOrange}>
          <View style={styles.priceIconRow}>
            <Ionicons name="cash-outline" size={13} color={ORANGE} />
            <Text style={styles.priceLabel}>Agent décaisse</Text>
          </View>
          <Text style={[styles.priceValue, { color: ORANGE }]}>
            {htgDecaisse.toLocaleString("fr-FR")} HTG
          </Text>
          <Text style={styles.priceRate}>1 TAN = {TAN_TO_HTG} HTG</Text>
        </View>
        <View style={styles.priceBoxGreen}>
          <View style={styles.priceIconRow}>
            <Ionicons name="flash-outline" size={13} color={GREEN} />
            <Text style={styles.priceLabel}>Client reçoit</Text>
          </View>
          <Text style={[styles.priceValue, { color: GREEN }]}>
            {netTan.toLocaleString("fr-FR")} TAN
          </Text>
          <Text style={styles.priceRate}>Après 20% comm.</Text>
        </View>
      </View>

      {/* ✅ Détail commission */}
      <View style={styles.commRow}>
        <View style={styles.commBadge}>
          <Ionicons name="shield-checkmark-outline" size={11} color={GOLD} />
          <Text style={styles.commTxt}>RHAZN 15% = {rhaznFee} TAN</Text>
        </View>
        <View style={[styles.commBadge, { backgroundColor: `${GREEN}10`, borderColor: `${GREEN}25` }]}>
          <Ionicons name="person-outline" size={11} color={GREEN} />
          <Text style={[styles.commTxt, { color: GREEN }]}>Agent 5% = {agentFee} TAN</Text>
        </View>
      </View>

      {/* Commission HTG agent */}
      <View style={styles.agentEarnRow}>
        <Ionicons name="trending-up-outline" size={13} color={GREEN} />
        <Text style={styles.agentEarnTxt}>
          Vous gagnez :{" "}
          <Text style={{ fontWeight: "900", color: GREEN }}>{agentEarns.toLocaleString("fr-FR")} HTG</Text>
          {" "}· client reçoit{" "}
          <Text style={{ fontWeight: "900" }}>${usdNet}</Text>
        </Text>
      </View>

      {/* Date */}
      <Text style={styles.cardDate}>
        {new Date(item.created_at).toLocaleString("fr-FR")}
      </Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.validateBtn} onPress={onValidate} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={16} color="#000" />
          <Text style={styles.validateTxt}>VALIDER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.85}>
          <Ionicons name="close-circle-outline" size={16} color={RED} />
          <Text style={styles.rejectTxt}>REFUSER</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Wrapper ────────────────────────────────────────────────
export default function AgentRequest() {
  return (
    <AgentGuard>
      <Screen />
    </AgentGuard>
  );
}

// ─── Screen principal ───────────────────────────────────────
function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,      setLoading]      = useState(true);
  const [requests,     setRequests]     = useState<WithdrawRow[]>([]);
  const [agentBalance, setAgentBalance] = useState(0);
  const [tick,         setTick]         = useState(0);

  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [pinModal, setPinModal] = useState(false);
  const [pin,      setPin]      = useState("");
  const [busy,     setBusy]     = useState(false);
  const [selected, setSelected] = useState<WithdrawRow | null>(null);
  const pinRef = useRef<TextInput>(null);

  const [glowId,      setGlowId]      = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success"|"error"|"info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success"|"error"|"info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  const [sysAlert, setSysAlert] = useState<SysAlert>(null);

  const showSysAlert = (rawMsg?: string) => {
    if (!rawMsg) { setSysAlert({ title: "Erreur système", msg: "Une erreur inconnue est survenue." }); return; }
    if (rawMsg.includes("non monétisé"))    { setSysAlert({ title: "Compte non monétisé",  msg: "Le profil doit être complété pour activer les transactions.", action: "Compléter", route: "/user-profile-edit" }); return; }
    if (rawMsg.includes("insufficient"))    { setSysAlert({ title: "Solde insuffisant",     msg: "Le solde TAN de l'utilisateur est insuffisant." }); return; }
    if (rawMsg.includes("already processed")){ setSysAlert({ title: "Déjà traité",           msg: "Cette demande a déjà été traitée." }); return; }
    if (rawMsg.includes("PIN"))             { setSysAlert({ title: "PIN incorrect",          msg: "Le PIN agent saisi est incorrect." }); return; }
    setSysAlert({ title: "Erreur RHAZN", msg: rawMsg });
  };

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let ch: any;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data: w } = await supabase.from("wallets").select("tan_balance").eq("user_id", uid).single();
      setAgentBalance(Number(w?.tan_balance ?? 0));
      ch = supabase.channel("agent-wallet-live")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
          p => setAgentBalance(Number(p.new.tan_balance ?? 0)))
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data: ed } = await supabase.from("eds").select("id").eq("auth_uid", uid).eq("is_active", true).single();
      if (!ed) return;
      const { data } = await supabase
        .from("user_withdraw_requests")
        .select("id,user_uid,ed_id,amount_tan,status,created_at")
        .eq("ed_id", ed.id).eq("status", "PENDING")
        .order("created_at", { ascending: true });
      setRequests(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  useEffect(() => {
    const ch = supabase.channel("withdraw-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_withdraw_requests" }, loadRequests)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const remaining = (iso: string) => {
    const age = (Date.now() - new Date(iso).getTime()) / 1000;
    return Math.max(0, Math.ceil(REQUEST_EXPIRY_SECONDS - age));
  };

  const visible = useMemo(() => {
    const now = Date.now();
    return requests
      .filter(r => (now - new Date(r.created_at).getTime()) / 1000 <= REQUEST_EXPIRY_SECONDS)
      .sort((a, b) => remaining(a.created_at) - remaining(b.created_at));
  }, [requests, tick]);

  const openPin = (req: WithdrawRow) => {
    setSelected(req); setPin(""); setPinModal(true);
    setTimeout(() => pinRef.current?.focus(), 220);
  };

  const playCash = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/cash.mp3"), { shouldPlay: true, volume: 1.0 });
      sound.setOnPlaybackStatusUpdate(status => { if ((status as any).didJustFinish) sound.unloadAsync(); });
    } catch {}
  };

  const doubleHaptic = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise(r => setTimeout(r, 140));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const approve = async () => {
    if (!selected) return;
    if (!pin || pin.length < 3) { showToast("PIN requis", "Entrez votre PIN pour valider.", "error"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("approve_agent_withdraw_tan", {
        p_request_id: selected.id,
      });
      if (error) { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); showSysAlert(error.message); return; }

      // ✅ Notification in-app uniquement — pas d'email (quota Resend)
      // La notification est envoyée automatiquement par approve_agent_withdraw_tan (RPC)

      const agentFee = Math.round(selected.amount_tan * AGENT_RATE);
      setGlowId(selected.id);
      setConfettiKey(k => k + 1);
      await playCash();
      await doubleHaptic();
      showToast(
        "Retrait validé ✅",
        `${selected.amount_tan.toLocaleString("fr-FR")} TAN · Vous gagnez ${agentFee} TAN (5%)`,
        "success"
      );
      setRequests(prev => prev.filter(r => r.id !== selected.id));
      setAgentBalance(prev => prev + agentFee); // ✅ Agent reçoit 5%
      setPinModal(false); setSelected(null); setPin("");
      setTimeout(() => { loadRequests(); setGlowId(null); }, 1200);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (req: WithdrawRow) => {
    try {
      await supabase.rpc("agent_reject_withdraw_request", { p_request_id: req.id });
      showToast("Refusé", "Demande de retrait refusée.", "info");
      loadRequests();
    } catch {
      showToast("Erreur", "Impossible de refuser cette demande.", "error");
    }
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

  return (
    <View style={styles.screen}>
      <ConfettiBurst key={confettiKey} />
      <IOSToast toast={toast} anim={toastAnim} />

      {/* ── Header ────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>Demandes Retrait</Text>
          <Text style={styles.hSub}>En attente de validation</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* ── Solde Agent + taux ───────────────── */}
      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLbl}>Solde Agent</Text>
          <Text style={styles.balanceVal}>{fmt(agentBalance)}</Text>
          <Text style={styles.balanceSub}>TAN disponibles</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <Ionicons name="flash" size={11} color={GOLD} />
              <Text style={styles.rateTxt}>1 TAN = </Text>
              <Text style={[styles.rateTxt, { color: GREEN, fontWeight: "900" }]}>{TAN_TO_HTG} HTG</Text>
            </View>
            <View style={styles.rateRow}>
              <Ionicons name="trending-up-outline" size={11} color={ORANGE} />
              <Text style={styles.rateTxt}>Commission = </Text>
              <Text style={[styles.rateTxt, { color: ORANGE, fontWeight: "900" }]}>20%</Text>
            </View>
          </View>
          {visible.length > 0 && (
            <View style={styles.pendingPill}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingTxt}>{visible.length} en attente</Text>
            </View>
          )}
        </View>
      </View>

      {/* ✅ Bannière commission retrait */}
      <View style={styles.commBanner}>
        <Ionicons name="information-circle-outline" size={15} color={ORANGE} />
        <Text style={styles.commBannerTxt}>
          <Text style={{ fontWeight: "900" }}>Commission retrait 20% :</Text>{" "}
          15% pour RHAZN · 5% pour vous (agent).
          Le client reçoit le montant net après déduction.
        </Text>
      </View>

      {/* ── Liste ─────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement…</Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done-circle" size={48} color={GREEN} />
          </View>
          <Text style={styles.emptyTitle}>Tout est traité ✓</Text>
          <Text style={styles.emptySub}>Aucune demande en attente pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              seconds={remaining(item.created_at)}
              isGlow={glowId === item.id}
              onValidate={() => openPin(item)}
              onReject={() => reject(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal PIN ─────────────────────────── */}
      <Modal transparent visible={pinModal} animationType="slide" statusBarTranslucent presentationStyle="overFullScreen"
        onRequestClose={() => { setPinModal(false); setSelected(null); setPin(""); }}>
        <Pressable style={styles.pinBackdrop} onPress={() => { setPinModal(false); setSelected(null); setPin(""); }} />

        <View style={[styles.pinOuter, { bottom: kbHeight }]}>
          <View style={styles.pinSheet}>
            <View style={styles.pinHandle} />

            {/* ✅ Résumé complet commission dans modal */}
            {selected && (() => {
              const agentFee = Math.round(selected.amount_tan * AGENT_RATE);
              const rhaznFee = Math.round(selected.amount_tan * RHAZN_RATE);
              const netTan   = selected.amount_tan - agentFee - rhaznFee;
              return (
                <View style={{ gap: 8 }}>
                  {/* TAN demandé */}
                  <View style={styles.pinAmountRow}>
                    <View style={styles.pinAmountBox}>
                      <Text style={styles.pinAmountLbl}>TAN demandé</Text>
                      <Text style={styles.pinAmountVal}>{selected.amount_tan.toLocaleString("fr-FR")} TAN</Text>
                    </View>
                    <View style={styles.pinHtgBox}>
                      <Text style={styles.pinAmountLbl}>HTG décaissé</Text>
                      <Text style={[styles.pinAmountVal, { color: ORANGE }]}>
                        {(selected.amount_tan * TAN_TO_HTG).toLocaleString("fr-FR")} HTG
                      </Text>
                    </View>
                  </View>

                  {/* Commission breakdown */}
                  <View style={styles.pinCommGrid}>
                    <View style={styles.pinCommBox}>
                      <Ionicons name="shield-checkmark-outline" size={12} color={GOLD} />
                      <View>
                        <Text style={styles.pinCommLbl}>RHAZN (15%)</Text>
                        <Text style={[styles.pinCommVal, { color: GOLD }]}>{rhaznFee} TAN</Text>
                      </View>
                    </View>
                    <View style={[styles.pinCommBox, { backgroundColor: `${GREEN}10`, borderColor: `${GREEN}25` }]}>
                      <Ionicons name="person-outline" size={12} color={GREEN} />
                      <View>
                        <Text style={styles.pinCommLbl}>Vous (5%)</Text>
                        <Text style={[styles.pinCommVal, { color: GREEN }]}>{agentFee} TAN</Text>
                      </View>
                    </View>
                    <View style={[styles.pinCommBox, { backgroundColor: `${BLUE}08`, borderColor: `${BLUE}20` }]}>
                      <Ionicons name="flash-outline" size={12} color={BLUE} />
                      <View>
                        <Text style={styles.pinCommLbl}>Client reçoit</Text>
                        <Text style={[styles.pinCommVal, { color: BLUE }]}>{netTan} TAN</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}

            <View style={styles.pinLabelRow}>
              <View style={styles.pinLockIcon}>
                <Ionicons name="lock-closed" size={16} color={GOLD} />
              </View>
              <View>
                <Text style={styles.pinTitle}>PIN Agent requis</Text>
                <Text style={styles.pinSub}>Confirmez ce retrait avec votre PIN</Text>
              </View>
            </View>

            <View style={styles.pinInputWrap}>
              <TextInput
                ref={pinRef}
                value={pin}
                onChangeText={t => setPin(t.replace(/\D/g, ""))}
                secureTextEntry={false}
                keyboardType="numeric"
                style={styles.pinInput}
                placeholder="Entrez votre PIN"
                placeholderTextColor={MUTED}
                returnKeyType="done"
                onSubmitEditing={approve}
                autoFocus
                maxLength={6}
              />
              <View style={styles.pinDots}>
                {Array.from({ length: pin.length }).map((_, i) => <View key={i} style={styles.pinDotFilled} />)}
                {Array.from({ length: Math.max(0, 4 - pin.length) }).map((_, i) => <View key={i} style={styles.pinDotEmpty} />)}
              </View>
            </View>

            <View style={styles.pinBtns}>
              <TouchableOpacity style={styles.pinCancel} onPress={() => { setPinModal(false); setSelected(null); setPin(""); }}>
                <Text style={styles.pinCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pinConfirm, (busy || !pin) && { opacity: 0.45 }]}
                onPress={approve} disabled={busy || !pin} activeOpacity={0.85}>
                {busy
                  ? <ActivityIndicator color="#000" size="small" />
                  : <><Ionicons name="checkmark-circle" size={18} color="#000" /><Text style={styles.pinConfirmTxt}>Confirmer</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Alert système ─────────────────────── */}
      <Modal transparent visible={!!sysAlert} animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="alert-circle" size={32} color={RED} />
            </View>
            <Text style={styles.alertTitle}>{sysAlert?.title}</Text>
            <Text style={styles.alertMsg}>{sysAlert?.msg}</Text>
            <View style={styles.alertBtns}>
              {sysAlert?.route && (
                <TouchableOpacity style={styles.alertPrimary} onPress={() => { setSysAlert(null); router.push(sysAlert.route as any); }}>
                  <Text style={styles.alertPrimaryTxt}>{sysAlert.action ?? "Corriger"}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.alertClose} onPress={() => setSysAlert(null)}>
                <Text style={styles.alertCloseTxt}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  hTitle:     { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:       { color: MUTED, fontSize: 12, marginTop: 2 },

  balanceCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: GOLD_BD, shadowColor: GOLD, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  balanceLbl:  { color: MUTED, fontSize: 11, fontWeight: "700" },
  balanceVal:  { color: GOLD, fontSize: 26, fontWeight: "900", marginTop: 2 },
  balanceSub:  { color: MUTED, fontSize: 10, fontWeight: "600", marginTop: 1 },

  rateCard:    { backgroundColor: BG, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: SOFT, gap: 6 },
  rateRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  rateTxt:     { color: TEXT, fontSize: 11, fontWeight: "700" },

  pendingPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${ORANGE}15`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: `${ORANGE}30` },
  pendingDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  pendingTxt:  { color: ORANGE, fontSize: 11, fontWeight: "800" },

  // ✅ Bannière commission
  commBanner:    { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: `${ORANGE}08`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${ORANGE}20` },
  commBannerTxt: { flex: 1, color: TEXT, fontSize: 11, fontWeight: "600", lineHeight: 17 },

  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon:  { width: 92, height: 92, borderRadius: 26, backgroundColor: `${GREEN}12`, borderWidth: 1.5, borderColor: `${GREEN}30`, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontWeight: "900", fontSize: 20 },
  emptySub:   { color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 21 },

  card:       { backgroundColor: CARD, borderRadius: 20, marginBottom: 12, borderWidth: 1.5, borderColor: SOFT, overflow: "hidden" },
  timerTrack: { height: 4, backgroundColor: SOFT },
  timerFill:  { height: 4, borderRadius: 0 },
  cardHead:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 16, paddingBottom: 10 },
  cardLeft:   { flexDirection: "row", alignItems: "baseline", gap: 5 },
  cardAmount: { color: TEXT, fontWeight: "900", fontSize: 24 },
  cardUnit:   { color: MUTED, fontWeight: "800", fontSize: 13 },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  timerTxt:   { fontWeight: "900", fontSize: 12 },

  // ✅ Grille prix
  priceGrid:      { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  priceBoxOrange: { flex: 1, backgroundColor: `${ORANGE}08`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${ORANGE}25` },
  priceBoxGreen:  { flex: 1, backgroundColor: `${GREEN}08`,  borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${GREEN}25` },
  priceIconRow:   { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  priceLabel:     { color: MUTED, fontSize: 10, fontWeight: "700" },
  priceValue:     { fontWeight: "900", fontSize: 15 },
  priceRate:      { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },

  // ✅ Commission badges dans carte
  commRow:   { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  commBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD_DIM, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: GOLD_BD },
  commTxt:   { color: GOLD, fontSize: 10, fontWeight: "800" },

  agentEarnRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  agentEarnTxt: { flex: 1, color: MUTED, fontSize: 11, fontWeight: "600" },

  cardDate:    { color: MUTED, fontSize: 11, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 12 },
  cardActions: { flexDirection: "row", gap: 10, padding: 14, paddingTop: 0 },
  validateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, shadowColor: GOLD, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  validateTxt: { color: "#000", fontWeight: "900", fontSize: 13 },
  rejectBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: `${RED}10`, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: `${RED}25` },
  rejectTxt:   { color: RED, fontWeight: "900", fontSize: 13 },

  // PIN
  pinBackdrop:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  pinOuter:     { position: "absolute", left: 0, right: 0, bottom: 0 },
  pinSheet:     { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, borderTopWidth: 1, borderColor: SOFT, gap: 12 },
  pinHandle:    { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 4 },

  pinAmountRow: { flexDirection: "row", gap: 10 },
  pinAmountBox: { flex: 1, backgroundColor: BG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: SOFT },
  pinHtgBox:    { flex: 1, backgroundColor: `${ORANGE}10`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${ORANGE}25` },
  pinAmountLbl: { color: MUTED, fontSize: 10, fontWeight: "700" },
  pinAmountVal: { color: TEXT, fontWeight: "900", fontSize: 16, marginTop: 3 },

  // ✅ Grid commission dans modal
  pinCommGrid: { flexDirection: "row", gap: 8 },
  pinCommBox:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD_DIM, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: GOLD_BD },
  pinCommLbl:  { color: MUTED, fontSize: 9, fontWeight: "700" },
  pinCommVal:  { fontWeight: "900", fontSize: 13, marginTop: 2 },

  pinLabelRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  pinLockIcon:  { width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  pinTitle:     { color: TEXT, fontWeight: "800", fontSize: 16 },
  pinSub:       { color: MUTED, fontSize: 12 },
  pinInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: BG, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: SOFT },
  pinInput:     { flex: 1, color: TEXT, fontSize: 20, fontWeight: "900", letterSpacing: 6 },
  pinDots:      { flexDirection: "row", gap: 8, alignItems: "center" },
  pinDotFilled: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  pinDotEmpty:  { width: 10, height: 10, borderRadius: 5, backgroundColor: SOFT, borderWidth: 1.5, borderColor: MUTED + "40" },
  pinBtns:       { flexDirection: "row", gap: 10 },
  pinCancel:     { flex: 1, backgroundColor: BG, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: SOFT },
  pinCancelTxt:  { color: MUTED, fontWeight: "700", fontSize: 14 },
  pinConfirm:    { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, shadowColor: GOLD, shadowOpacity: 0.30, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  pinConfirmTxt: { color: "#000", fontWeight: "900", fontSize: 15 },

  alertOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  alertCard:       { width: "85%", backgroundColor: CARD, borderRadius: 26, padding: 24, alignItems: "center", borderWidth: 1, borderColor: SOFT, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 20 },
  alertIconWrap:   { width: 64, height: 64, borderRadius: 20, backgroundColor: `${RED}12`, borderWidth: 1, borderColor: `${RED}25`, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  alertTitle:      { color: TEXT, fontWeight: "900", fontSize: 17, textAlign: "center" },
  alertMsg:        { color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 8 },
  alertBtns:       { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  alertPrimary:    { flex: 1, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  alertPrimaryTxt: { color: "#000", fontWeight: "900", fontSize: 13 },
  alertClose:      { flex: 1, backgroundColor: BG, borderRadius: 14, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: SOFT },
  alertCloseTxt:   { color: TEXT, fontWeight: "700", fontSize: 13 },
});

const ts = StyleSheet.create({
  toast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  toastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  toastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});