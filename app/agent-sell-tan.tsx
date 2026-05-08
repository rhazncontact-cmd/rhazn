// app/agent-sell-tan.tsx
// ✅ RHAZN — Agent Sell TAN · Apple-like Premium
// ✅ Nouvelle logique : 1 TAN = 10 HTG — pas de commission à l'achat
// ✅ Commission UNIQUEMENT sur les retraits (15% RHAZN + 5% Agent)
// ✅ L'utilisateur reçoit exactement le nombre de TAN demandé

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
  View,
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

// ✅ Nouvelle logique tarifaire officielle RHAZN
const TAN_TO_HTG             = 10;    // 1 TAN = 10 HTG
const TAN_TO_USD             = 0.05;  // 1 TAN = 0.05 USD
const REQUEST_EXPIRY_SECONDS = 100;

// ─── Types ──────────────────────────────────────────────────
type RequestRow = {
  id: string;
  user_uid: string;
  ed_id: string;
  amount_tan: number;
  status: string;
  created_at: string;
};

type SysAlert = { title: string; msg: string; action?: string; route?: string } | null;

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
function RequestCard({ item, seconds, isGlow, onValidate }: {
  item: RequestRow;
  seconds: number;
  isGlow: boolean;
  onValidate: () => void;
}) {
  // ✅ Montants calculés avec le vrai taux
  const htgAmount = item.amount_tan * TAN_TO_HTG;
  const usdAmount = (item.amount_tan * TAN_TO_USD).toFixed(2);

  const glow        = useRef(new Animated.Value(0)).current;
  const urgentColor = seconds <= 10 ? RED : seconds <= 20 ? ORANGE : GREEN;
  const pct         = Math.min(100, (seconds / REQUEST_EXPIRY_SECONDS) * 100);

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

      {/* Header — montant TAN */}
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

      {/* ✅ Grille prix : HTG + USD côte à côte */}
      <View style={styles.priceGrid}>
        <View style={styles.priceBoxGreen}>
          <View style={styles.priceIconRow}>
            <Ionicons name="cash-outline" size={13} color={GREEN} />
            <Text style={styles.priceLabel}>Client verse</Text>
          </View>
          <Text style={[styles.priceValue, { color: GREEN }]}>
            {htgAmount.toLocaleString("fr-FR")} HTG
          </Text>
          <Text style={styles.priceRate}>1 TAN = {TAN_TO_HTG} HTG</Text>
        </View>
        <View style={styles.priceBoxBlue}>
          <View style={styles.priceIconRow}>
            <Ionicons name="globe-outline" size={13} color={BLUE} />
            <Text style={styles.priceLabel}>Équivalent</Text>
          </View>
          <Text style={[styles.priceValue, { color: BLUE }]}>${usdAmount}</Text>
          <Text style={styles.priceRate}>1 TAN = $0.05</Text>
        </View>
      </View>

      {/* ✅ Badge : pas de commission à l'achat */}
      <View style={styles.noCommBadge}>
        <Ionicons name="checkmark-circle-outline" size={12} color={GREEN} />
        <Text style={styles.noCommTxt}>
          Aucune commission — client reçoit {item.amount_tan.toLocaleString("fr-FR")} TAN exactement
        </Text>
      </View>

      {/* Date */}
      <Text style={styles.cardDate}>
        {new Date(item.created_at).toLocaleString("fr-FR")}
      </Text>

      {/* Bouton VALIDER */}
      <TouchableOpacity style={styles.validateBtn} onPress={onValidate} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={16} color="#000" />
        <Text style={styles.validateTxt}>VALIDER LA VENTE</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Wrapper ────────────────────────────────────────────────
export default function AgentSellTan() {
  return (
    <AgentGuard>
      <Screen />
    </AgentGuard>
  );
}

// ─── Screen ─────────────────────────────────────────────────
function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,      setLoading]      = useState(true);
  const [requests,     setRequests]     = useState<RequestRow[]>([]);
  const [agentBalance, setAgentBalance] = useState(0);
  const [tick,         setTick]         = useState(0);

  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      e => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [pinModal,  setPinModal]  = useState(false);
  const [pin,       setPin]       = useState("");
  const [busy,      setBusy]      = useState(false);
  const [selected,  setSelected]  = useState<RequestRow | null>(null);
  const pinRef = useRef<TextInput>(null);

  const [glowId,      setGlowId]      = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [sysAlert,    setSysAlert]    = useState<SysAlert>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success"|"error"|"info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success"|"error"|"info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  const showSysAlert = (rawMsg?: string) => {
    if (!rawMsg) { setSysAlert({ title: "Erreur système", msg: "Une erreur inconnue est survenue." }); return; }
    if (rawMsg.includes("non monétisé")) { setSysAlert({ title: "Compte non monétisé", msg: "Votre profil doit être complété pour activer les ventes TAN.", action: "Compléter", route: "/user-profile-edit" }); return; }
    if (rawMsg.includes("insufficient"))   { setSysAlert({ title: "Solde insuffisant", msg: "Votre solde TAN est insuffisant pour cette opération." }); return; }
    if (rawMsg.includes("already processed")) { setSysAlert({ title: "Déjà traité", msg: "Cette demande a déjà été traitée." }); return; }
    if (rawMsg.includes("PIN"))            { setSysAlert({ title: "PIN incorrect", msg: "Le PIN agent saisi est incorrect." }); return; }
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
      ch = supabase.channel("agent-wallet-sell-live")
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
    const ch = supabase.channel("sell-tan-live")
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

  const openPin = (req: RequestRow) => {
    setSelected(req);
    setPin("");
    setPinModal(true);
    setTimeout(() => pinRef.current?.focus(), 220);
  };

  const playCash = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/cash.mp3"),
        { shouldPlay: true, volume: 1.0 }
      );
      sound.setOnPlaybackStatusUpdate(status => {
        if ((status as any).didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
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
      const { error } = await supabase.rpc("approve_agent_sell_tan", {
        p_request_id: selected.id,
        p_agent_pin: pin,
      });
      if (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        showSysAlert(error.message);
        return;
      }
      setGlowId(selected.id);
      setConfettiKey(k => k + 1);
      await playCash();
      await doubleHaptic();
      // ✅ Toast avec montants réels
      showToast(
        "Vente validée ✅",
        `${selected.amount_tan.toLocaleString("fr-FR")} TAN crédités · ${(selected.amount_tan * TAN_TO_HTG).toLocaleString("fr-FR")} HTG reçus`,
        "success"
      );
      setRequests(prev => prev.filter(r => r.id !== selected.id));
      setAgentBalance(prev => prev - selected.amount_tan);
      setPinModal(false);
      setSelected(null);
      setPin("");
      setTimeout(() => { loadRequests(); setGlowId(null); }, 1200);
    } finally {
      setBusy(false);
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
          <Text style={styles.hTitle}>Vente TAN</Text>
          <Text style={styles.hSub}>Demandes d'achat clients</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* ── Solde Agent + taux officiels ─────── */}
      <View style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLbl}>Solde Agent</Text>
          <Text style={styles.balanceVal}>{fmt(agentBalance)}</Text>
          <Text style={styles.balanceSub}>TAN disponibles</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          {/* ✅ Taux officiels HTG + USD */}
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <Ionicons name="flash" size={11} color={GOLD} />
              <Text style={styles.rateTxt}>1 TAN = </Text>
              <Text style={[styles.rateTxt, { color: GREEN, fontWeight: "900" }]}>{TAN_TO_HTG} HTG</Text>
            </View>
            <View style={styles.rateRow}>
              <Ionicons name="globe-outline" size={11} color={BLUE} />
              <Text style={styles.rateTxt}>1 TAN = </Text>
              <Text style={[styles.rateTxt, { color: BLUE, fontWeight: "900" }]}>${TAN_TO_USD}</Text>
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

      {/* ✅ Bannière info : pas de commission à l'achat */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={15} color={BLUE} />
        <Text style={styles.infoBannerTxt}>
          <Text style={{ fontWeight: "900" }}>Achat TAN :</Text> aucune commission — le client reçoit exactement le montant demandé.{" "}
          <Text style={{ fontWeight: "900" }}>Retrait :</Text> commission 20% uniquement (15% RHAZN + 5% Agent).
        </Text>
      </View>

      {/* ── Liste demandes ───────────────────── */}
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
          <Text style={styles.emptySub}>Aucune demande d'achat en attente.</Text>
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
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal PIN ─────────────────────────── */}
      <Modal
        transparent
        visible={pinModal}
        animationType="slide"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => { setPinModal(false); setSelected(null); setPin(""); }}
      >
        <Pressable style={styles.pinBackdrop} onPress={() => { setPinModal(false); setSelected(null); setPin(""); }} />

        <View style={[styles.pinOuter, { bottom: kbHeight }]}>
          <View style={styles.pinSheet}>
            <View style={styles.pinHandle} />

            {/* ✅ Résumé transaction dans modal */}
            {selected && (
              <View style={{ gap: 8 }}>
                <View style={styles.pinAmountRow}>
                  <View style={styles.pinAmountBox}>
                    <Text style={styles.pinAmountLbl}>TAN crédités</Text>
                    <Text style={styles.pinAmountVal}>{fmt(selected.amount_tan)} TAN</Text>
                  </View>
                  <View style={styles.pinHtgBox}>
                    <Text style={styles.pinAmountLbl}>HTG à recevoir</Text>
                    <Text style={[styles.pinAmountVal, { color: GREEN }]}>
                      {fmt(selected.amount_tan * TAN_TO_HTG)} HTG
                    </Text>
                  </View>
                </View>
                {/* ✅ USD + badge no commission */}
                <View style={styles.pinUsdRow}>
                  <Ionicons name="globe-outline" size={13} color={BLUE} />
                  <Text style={styles.pinUsdTxt}>
                    Équivalent USD : <Text style={{ color: BLUE, fontWeight: "900" }}>${(selected.amount_tan * TAN_TO_USD).toFixed(2)}</Text>
                  </Text>
                  <View style={styles.noCommPill}>
                    <Ionicons name="checkmark-circle-outline" size={11} color={GREEN} />
                    <Text style={styles.noCommPillTxt}>Sans commission</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Label PIN */}
            <View style={styles.pinLabelRow}>
              <View style={styles.pinLockIcon}>
                <Ionicons name="lock-closed" size={16} color={GOLD} />
              </View>
              <View>
                <Text style={styles.pinTitle}>PIN Agent requis</Text>
                <Text style={styles.pinSub}>Confirmez cette vente avec votre PIN</Text>
              </View>
            </View>

            {/* Input PIN */}
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
                {Array.from({ length: pin.length }).map((_, i) => (
                  <View key={i} style={styles.pinDotFilled} />
                ))}
                {Array.from({ length: Math.max(0, 4 - pin.length) }).map((_, i) => (
                  <View key={i} style={styles.pinDotEmpty} />
                ))}
              </View>
            </View>

            <View style={styles.pinBtns}>
              <TouchableOpacity style={styles.pinCancel} onPress={() => { setPinModal(false); setSelected(null); setPin(""); }}>
                <Text style={styles.pinCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinConfirm, (busy || !pin) && { opacity: 0.45 }]}
                onPress={approve} disabled={busy || !pin} activeOpacity={0.85}
              >
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

  // ✅ Carte taux
  rateCard:    { backgroundColor: BG, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: SOFT, gap: 6 },
  rateRow:     { flexDirection: "row", alignItems: "center", gap: 4 },
  rateTxt:     { color: TEXT, fontSize: 11, fontWeight: "700" },

  pendingPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${ORANGE}15`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: `${ORANGE}30` },
  pendingDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  pendingTxt:  { color: ORANGE, fontSize: 11, fontWeight: "800" },

  // ✅ Bannière info
  infoBanner:    { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: `${BLUE}08`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${BLUE}20` },
  infoBannerTxt: { flex: 1, color: TEXT, fontSize: 11, fontWeight: "600", lineHeight: 17 },

  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon:  { width: 92, height: 92, borderRadius: 26, backgroundColor: `${GREEN}12`, borderWidth: 1.5, borderColor: `${GREEN}30`, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontWeight: "900", fontSize: 20 },
  emptySub:   { color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 21 },

  card:        { backgroundColor: CARD, borderRadius: 20, marginBottom: 12, borderWidth: 1.5, borderColor: SOFT, overflow: "hidden" },
  timerTrack:  { height: 4, backgroundColor: SOFT },
  timerFill:   { height: 4, borderRadius: 0 },
  cardHead:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: 16, paddingBottom: 10 },
  cardLeft:    { flexDirection: "row", alignItems: "baseline", gap: 5 },
  cardAmount:  { color: TEXT, fontWeight: "900", fontSize: 24 },
  cardUnit:    { color: MUTED, fontWeight: "800", fontSize: 13 },
  timerBadge:  { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  timerTxt:    { fontWeight: "900", fontSize: 12 },

  // ✅ Grille prix HTG + USD
  priceGrid:     { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  priceBoxGreen: { flex: 1, backgroundColor: `${GREEN}08`, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${GREEN}25` },
  priceBoxBlue:  { flex: 1, backgroundColor: `${BLUE}06`,  borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${BLUE}25` },
  priceIconRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  priceLabel:    { color: MUTED, fontSize: 10, fontWeight: "700" },
  priceValue:    { fontWeight: "900", fontSize: 15 },
  priceRate:     { color: MUTED, fontSize: 9, fontWeight: "600", marginTop: 3 },

  // ✅ Badge no commission
  noCommBadge:   { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 8, backgroundColor: `${GREEN}08`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: `${GREEN}20` },
  noCommTxt:     { flex: 1, color: GREEN, fontSize: 11, fontWeight: "700" },

  cardDate:    { color: MUTED, fontSize: 11, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 12 },
  validateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, margin: 14, marginTop: 0, borderRadius: 14, paddingVertical: 14, shadowColor: GOLD, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  validateTxt: { color: "#000", fontWeight: "900", fontSize: 14 },

  pinBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  pinOuter:    { position: "absolute", left: 0, right: 0, bottom: 0 },
  pinSheet:    { backgroundColor: CARD, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, borderTopWidth: 1, borderColor: SOFT, gap: 12 },
  pinHandle:   { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 4 },

  pinAmountRow: { flexDirection: "row", gap: 10 },
  pinAmountBox: { flex: 1, backgroundColor: BG, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: SOFT },
  pinHtgBox:    { flex: 1, backgroundColor: `${GREEN}10`, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: `${GREEN}25` },
  pinAmountLbl: { color: MUTED, fontSize: 10, fontWeight: "700" },
  pinAmountVal: { color: TEXT, fontWeight: "900", fontSize: 16, marginTop: 3 },

  // ✅ Ligne USD + badge dans modal
  pinUsdRow:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${BLUE}06`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: `${BLUE}18` },
  pinUsdTxt:     { flex: 1, color: MUTED, fontSize: 12, fontWeight: "600" },
  noCommPill:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${GREEN}12`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: `${GREEN}25` },
  noCommPillTxt: { color: GREEN, fontSize: 9, fontWeight: "900" },

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