// app/agent-dashboard.tsx
// ✅ RHAZN — Agent Dashboard · Apple-like Premium
// ✅ PIN RHAZN 4 chiffres au démarrage
// ✅ Design cohérent WalletControlCenter

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Clipboard,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import agentPinStore from "../lib/agentPinStore";
import { supabase } from "../lib/supabase";

// ─── Palette Apple-like ────────────────────────────────────
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

// ─── Config PIN ────────────────────────────────────────────
const PIN_LENGTH    = 4;
const MAX_PIN_TRIES = 5;

// ─── Types ─────────────────────────────────────────────────
type AgentED = { id: string; agent_code: string | null };

// ─── Toast iOS ─────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color = toast.type === "success" ? GREEN : toast.type === "error" ? RED : BLUE;
  const icon: any = toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "close-circle" : "information-circle";
  return (
    <Animated.View style={[styles.iosToast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }]}>
      <View style={[styles.iosToastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.iosToastTitle}>{toast.title}</Text>
        <Text style={styles.iosToastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Écran PIN ─────────────────────────────────────────────
function PinScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin,       setPin]      = useState("");
  const [tries,     setTries]    = useState(0);
  const [error,     setError]    = useState(false);
  const [errorMsg,  setErrorMsg] = useState("PIN incorrect");
  const [locked,    setLocked]   = useState(false);
  const [checking,  setChecking] = useState(false);

  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const triggerShake = () => {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (d: string) => {
    if (locked || checking) return;
    const next = pin + d;
    setPin(next);
    setError(false);

    if (next.length === PIN_LENGTH) {
      setChecking(true);
      try {
        // ✅ Vérification PIN depuis la table eds (source de vérité)
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;

        if (!uid) {
          setErrorMsg("Session expirée.");
          triggerShake();
          setError(true);
          setTimeout(() => { setPin(""); setError(false); }, 700);
          return;
        }

        const { data: ed } = await supabase
          .from("eds")
          .select("agent_pin, is_active")
          .eq("auth_uid", uid)
          .eq("is_active", true)
          .maybeSingle();

        if (!ed) {
          setErrorMsg("Compte agent introuvable.");
          triggerShake();
          setError(true);
          setTimeout(() => { setPin(""); setError(false); }, 700);
          return;
        }

        // ✅ Accepte le PIN stocké OU "0000" si agent_pin est NULL (fallback dev)
        const storedPin = ed.agent_pin ?? "0000";
        if (String(storedPin) === String(next) || (!ed.agent_pin && next === "0000")) {
          // ✅ PIN correct
          onSuccess();
        } else {
          // ❌ PIN incorrect
          triggerShake();
          setError(true);
          const newTries = tries + 1;
          setTries(newTries);
          if (newTries >= MAX_PIN_TRIES) {
            setLocked(true);
            setErrorMsg("Trop de tentatives. Contactez RHAZN.");
          } else {
            setErrorMsg(`PIN incorrect · ${MAX_PIN_TRIES - newTries} essai${MAX_PIN_TRIES - newTries > 1 ? "s" : ""} restant`);
          }
          setTimeout(() => { setPin(""); setError(false); }, 700);
        }
      } catch {
        setErrorMsg("Erreur réseau. Réessayez.");
        triggerShake();
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 700);
      } finally {
        setChecking(false);
      }
    }
  };

  const handleDelete = () => {
    if (locked) return;
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const DIGITS = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <View style={pinStyles.screen}>
      {/* Halo doré */}
      <View style={pinStyles.halo} pointerEvents="none" />

      <Animated.View style={[pinStyles.card, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
      }]}>

        {/* Icône */}
        <View style={pinStyles.iconWrap}>
          <Ionicons name="shield-checkmark" size={36} color={GOLD} />
        </View>

        <Text style={pinStyles.title}>Dashboard Agent</Text>
        <Text style={pinStyles.sub}>Entrez votre code PIN RHAZN</Text>

        {/* Points PIN */}
        <View style={pinStyles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                pinStyles.dot,
                i < pin.length && pinStyles.dotFilled,
                error && pinStyles.dotError,
              ]}
            />
          ))}
        </View>

        {/* Message erreur */}
        {checking && (
          <ActivityIndicator color={GOLD} size="small" style={{ marginVertical: 6 }} />
        )}
        {error && (
          <Text style={pinStyles.errorTxt}>{errorMsg}</Text>
        )}

        {/* Clavier */}
        {DIGITS.map((row, ri) => (
          <View key={ri} style={pinStyles.keyRow}>
            {row.map((d, di) => (
              <TouchableOpacity
                key={di}
                style={[pinStyles.key, d === "" && { opacity: 0 }]}
                onPress={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(d) : null}
                activeOpacity={0.7}
                disabled={locked || d === ""}
              >
                {d === "⌫"
                  ? <Ionicons name="backspace-outline" size={22} color={TEXT} />
                  : <Text style={pinStyles.keyTxt}>{d}</Text>
                }
              </TouchableOpacity>
            ))}
          </View>
        ))}

      </Animated.View>
    </View>
  );
}

// ─── Dashboard principal ───────────────────────────────────
export default function AgentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pinOk,       setPinOk]       = useState(agentPinStore.isVerified());
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const [agentCode,         setAgentCode]         = useState<string | null>(null);
  const [tanBalance,        setTanBalance]         = useState(0);
  const [todayOps,          setTodayOps]           = useState(0);
  const [todayTan,          setTodayTan]           = useState(0);
  const [pendingCount,      setPendingCount]       = useState(0);
  const [sellPendingCount,  setSellPendingCount]   = useState(0);

  const [agentName,         setAgentName]          = useState<string | null>(null);

  // Animations staggered
  const headerFade  = useRef(new Animated.Value(0)).current;
  const cardAnims   = useRef([0,1,2,3].map(() => new Animated.Value(0))).current;
  const slideAnims  = useRef([0,1,2,3].map(() => new Animated.Value(20))).current;

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success"|"error"|"info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success"|"error"|"info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

  // ── Guard agent ──────────────────────────────────────────
  const ensureAgent = async (uid: string) => {
    const { data: ed } = await supabase
      .from("eds").select("id")
      .eq("auth_uid", uid).eq("is_active", true).maybeSingle();
    if (!ed) { router.replace("/"); return false; }
    return true;
  };

  // ── Load ─────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) { router.replace("/auth/login"); return; }

      const ok = await ensureAgent(uid);
      if (!ok) return;

      try { await supabase.rpc("ensure_wallet"); } catch { /* ignore */ }

      // Wallet
      const { data: w, error: wErr } = await supabase
        .from("wallets").select("tan_balance").eq("user_id", uid).single();
      if (wErr) console.log("❌ wallet:", wErr.message);

      // Agent
      const { data: ed, error: edErr } = await supabase
        .from("eds").select("id,agent_code")
        .eq("auth_uid", uid).eq("is_active", true).maybeSingle();
      if (edErr) console.log("❌ eds:", edErr.message);

      // Profil
      const { data: prof, error: pErr } = await supabase
        .from("profiles").select("full_name").eq("id", uid).single();
      if (pErr) console.log("❌ profiles:", pErr.message);

      // Transactions aujourd'hui
      const today = new Date();
      today.setHours(0,0,0,0);
      const { data: txs, error: tErr } = await supabase
        .from("agents_transactions").select("tan_amount")
        .eq("agent_uid", uid).gte("created_at", today.toISOString());
      if (tErr) console.log("❌ agents_transactions:", tErr.message);

      // Demandes en attente — table peut ne pas exister
           // ── Retraits en attente (bouton Demandes) ──
      let pendingC = 0;
      try {
        const { count } = await supabase
          .from("agent_requests")
          .select("id", { count: "exact", head: true })
          .eq("agent_uid", uid)
          .eq("status", "PENDING");
        pendingC = count ?? 0;
      } catch (e) {
        console.log("❌ agent_requests (ignoré):", e);
      }

      // ── Achats TAN en attente (bouton Vendre TAN) ──
      let sellPendingC = 0;
      try {
        const { count } = await supabase
          .from("agent_sell_requests")
          .select("id", { count: "exact", head: true })
          .eq("agent_uid", uid)
          .eq("status", "PENDING");
        sellPendingC = count ?? 0;
      } catch (e) {
        console.log("❌ agent_sell_requests (ignoré):", e);
      }


           setTanBalance(Number(w?.tan_balance ?? 0));
      setAgentCode((ed as any)?.agent_code ?? null);
      setAgentName(prof?.full_name ?? null);
      setTodayOps(txs?.length ?? 0);
      setTodayTan((txs ?? []).reduce((s: number, t: any) => s + Number(t.tan_amount || 0), 0));
      setPendingCount(pendingC);
      setSellPendingCount(sellPendingC);

      // Animations entrée
      Animated.timing(headerFade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
      cardAnims.forEach((a, i) =>
        Animated.parallel([
          Animated.timing(a,            { toValue: 1, duration: 360, delay: 80 + i * 70, useNativeDriver: true }),
          Animated.timing(slideAnims[i],{ toValue: 0, duration: 360, delay: 80 + i * 70, useNativeDriver: true }),
        ]).start()
      );

    } catch (e: any) {
      console.log("❌ AGENT DASH CRASH:", e?.message ?? e);
      setError(`Erreur: ${e?.message ?? "inconnue"}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (pinOk) load(); }, [pinOk]);

  // ── Reset PIN si app backgroundée ────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "background" || state === "inactive") {
        agentPinStore.reset();
      }
    });
    return () => sub.remove();
  }, []);

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (!pinOk) return;
        const ch = supabase.channel("agent-dash-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_requests" }, () => {
        load(true);
        showToast("Nouveau retrait", "Un client demande un retrait.", "info");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_sell_requests" }, () => {
        load(true);
        showToast("Nouvel achat TAN", "Un client veut acheter du TAN.", "info");
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [pinOk]);

  // ── PIN non validé → écran PIN ────────────────────────────
  if (!pinOk) {
    return <PinScreen onSuccess={() => {
      agentPinStore.verify();
      setPinOk(true);
    }} />;
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {/* ── Toast iOS ──────────────────────────── */}
      <IOSToast toast={toast} anim={toastAnim} />

      {/* ── Header ─────────────────────────────── */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 10, opacity: headerFade }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.hGreet}>Bonjour 👋</Text>
            <Text style={styles.hTitle}>{agentName ?? "Agent RHAZN"}</Text>
            <Text style={styles.hSub}>Dashboard officiel · Agent certifié</Text>
          </View>
        </View>
        <View style={styles.agentBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#000" />
          <Text style={styles.agentBadgeTxt}>AGENT</Text>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={GOLD}
          />
        }
      >

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={RED} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {/* ── Wallet TAN ─────────────────────── */}
        <Animated.View style={{ opacity: cardAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <View style={styles.walletCard}>
            <View style={styles.walletTop}>
              <View>
                <Text style={styles.walletLbl}>Solde TAN</Text>
                <Text style={styles.walletVal}>{fmt(tanBalance)}</Text>
              </View>
              <View style={styles.tanTag}>
                <Text style={styles.tanTagTxt}>TAN</Text>
              </View>
            </View>
            {/* Barre de séparation */}
            <View style={styles.walletSep} />
            <View style={styles.walletStatsRow}>
              <View style={styles.walletStat}>
                <Text style={styles.walletStatVal}>{todayOps}</Text>
                <Text style={styles.walletStatLbl}>Opérations</Text>
              </View>
              <View style={styles.walletStatSep} />
              <View style={styles.walletStat}>
                <Text style={styles.walletStatVal}>{fmt(todayTan)}</Text>
                <Text style={styles.walletStatLbl}>TAN traités</Text>
              </View>
              <View style={styles.walletStatSep} />
              <View style={styles.walletStat}>
                <Text style={[styles.walletStatVal, pendingCount > 0 && { color: ORANGE }]}>{pendingCount}</Text>
                <Text style={styles.walletStatLbl}>En attente</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Identité Agent ─────────────────── */}
        <Animated.View style={{ opacity: cardAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="finger-print" size={18} color={GOLD} />
              </View>
              <Text style={styles.cardTitle}>Identité Agent</Text>
            </View>

            {agentCode ? (
              <View style={{ alignItems: "center", gap: 16 }}>
                {/* Code Agent */}
                <View style={styles.codeBox}>
                  <Text style={styles.codeLbl}>Code Agent</Text>
                  <Text style={styles.codeVal}>{agentCode}</Text>
                </View>

                {/* Boutons Copier + WhatsApp */}
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Clipboard.setString(agentCode);
                      showToast("Copié ✓", "Code agent copié dans le presse-papier.", "success");
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color={GOLD} />
                    <Text style={styles.copyBtnTxt}>Copier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.waBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Share.share({
                        message: `🛡️ Mon code Agent RHAZN : *${agentCode}*

Présentez ce code à l'utisateur RHAZN pour acheter ou retirer du TAN.

— RHAZN · Sanctuaire du Mérite`,
                        title: "Code Agent RHAZN",
                      });
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                    <Text style={styles.waBtnTxt}>Partager</Text>
                  </TouchableOpacity>
                </View>

                {/* QR Code */}
                <View style={styles.qrWrap}>
                  <QRCode value={agentCode} size={150} />
                </View>
                <Text style={styles.qrHint}>
                  Présentez ce QR à vos clients
                </Text>
              </View>
            ) : (
              <View style={styles.emptyCode}>
                <Ionicons name="key-outline" size={32} color={SOFT} />
                <Text style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>Code agent non disponible</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Actions rapides ────────────────── */}
        <Animated.View style={{ opacity: cardAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="flash" size={18} color={GOLD} />
              </View>
              <Text style={styles.cardTitle}>Actions rapides</Text>
            </View>

            <View style={styles.actionsGrid}>
              {/* Vendre TAN — or */}
                            <TouchableOpacity
                style={styles.actionGold}
                onPress={() => router.push("/agent-sell-tan")}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconGold}>
                  <MaterialIcons name="point-of-sale" size={22} color="#000" />
                </View>
                {sellPendingCount > 0 && (
                  <View style={[styles.actionBadge, { backgroundColor: RED }]}>
                    <Text style={styles.actionBadgeTxt}>
                      {sellPendingCount > 9 ? "9+" : sellPendingCount}
                    </Text>
                  </View>
                )}
                <Text style={styles.actionGoldTxt}>Demandes de TAN</Text>
                <Text style={styles.actionGoldSub}>Achats TAN Utlisateurs</Text>
              </TouchableOpacity>


              {/* Demandes — avec badge */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/agent-request")}
                activeOpacity={0.85}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="notifications-outline" size={22} color={GOLD} />
                </View>
                {pendingCount > 0 && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeTxt}>{pendingCount > 9 ? "9+" : pendingCount}</Text>
                  </View>
                )}
                <Text style={styles.actionCardTxt}>Demandes de CASH</Text>
                <Text style={styles.actionCardSub}>Utlisateurs en attente</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionsGrid, { marginTop: 10 }]}>
              {/* Renflouer */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/agent-funding-request")}
                activeOpacity={0.85}
              >
                <View style={styles.actionIcon}>
                  <Feather name="upload" size={20} color={GOLD} />
                </View>
                <Text style={styles.actionCardTxt}>Renflouer</Text>
                <Text style={styles.actionCardSub}>Demande de TAN</Text>
              </TouchableOpacity>

              {/* Historique */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/agent-history")}
                activeOpacity={0.85}
              >
                <View style={styles.actionIcon}>
                  <Feather name="clock" size={20} color={GOLD} />
                </View>
                <Text style={styles.actionCardTxt}>Historique</Text>
                <Text style={styles.actionCardSub}>Mes transactions</Text>
              </TouchableOpacity>
            </View>

            {/* Changer PIN */}
            <TouchableOpacity
              style={styles.changePinBtn}
              onPress={() => router.push("/agent-change-pin")}
              activeOpacity={0.85}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="key-outline" size={20} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTxt}>Changer PIN Agent</Text>
                <Text style={styles.actionCardSub}>Modifier votre code d'accès</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Footer sécurité ────────────────── */}
        <Animated.View style={{ opacity: cardAnims[3] }}>
          <View style={styles.securityRow}>
            <Ionicons name="lock-closed-outline" size={12} color={MUTED} />
            <Text style={styles.securityTxt}>Accès sécurisé PIN · RHAZN Agent System</Text>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// ─── Styles Dashboard ──────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logo:        { width: 38, height: 38, borderRadius: 10 },
  hGreet:      { color: MUTED, fontSize: 12, fontWeight: "600" },
  hTitle:      { color: TEXT, fontSize: 20, fontWeight: "900", marginTop: 2 },
  hSub:        { color: MUTED, fontSize: 11, marginTop: 2 },
  agentBadge:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: GOLD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  agentBadgeTxt: { color: "#000", fontWeight: "900", fontSize: 11 },

  // Wallet card
  walletCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: CARD, borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: GOLD_BD,
    shadowColor: GOLD, shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  walletTop:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  walletLbl:    { color: MUTED, fontSize: 12, fontWeight: "700" },
  walletVal:    { color: GOLD, fontSize: 34, fontWeight: "900", marginTop: 4 },
  tanTag:       { backgroundColor: GOLD_DIM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: GOLD_BD },
  tanTagTxt:    { color: GOLD, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  walletSep:    { height: 1, backgroundColor: SOFT, marginBottom: 14 },
  walletStatsRow: { flexDirection: "row" },
  walletStat:   { flex: 1, alignItems: "center", gap: 4 },
  walletStatVal:{ color: TEXT, fontWeight: "900", fontSize: 18 },
  walletStatLbl:{ color: MUTED, fontSize: 10, fontWeight: "700" },
  walletStatSep:{ width: 1, backgroundColor: SOFT, marginHorizontal: 4 },

  // Card générique
  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: SOFT,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  cardIconWrap:{ width: 36, height: 36, borderRadius: 11, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  cardTitle:   { color: TEXT, fontWeight: "800", fontSize: 15 },

  // Code agent
  codeBox:  { backgroundColor: BG, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: SOFT, alignItems: "center", width: "100%" },
  codeLbl:  { color: MUTED, fontSize: 11, fontWeight: "700" },
  codeVal:  { color: GOLD, fontSize: 22, fontWeight: "900", letterSpacing: 2, marginTop: 4 },
  codeActions: { flexDirection: "row", gap: 10, width: "100%" },
  copyBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: GOLD_DIM, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: GOLD_BD },
  copyBtnTxt: { color: GOLD, fontWeight: "800", fontSize: 13 },
  waBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "rgba(37,211,102,0.10)", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(37,211,102,0.25)" },
  waBtnTxt: { color: "#25D366", fontWeight: "800", fontSize: 13 },
  qrWrap:   { backgroundColor: CARD, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: SOFT, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  qrHint:   { color: MUTED, fontSize: 11, fontWeight: "600" },
  emptyCode:{ alignItems: "center", paddingVertical: 20 },

  // Actions
  actionsGrid:  { flexDirection: "row", gap: 10 },
  changePinBtn: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: BG, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: SOFT, marginTop: 14 },
  actionGold: {
    flex: 1, backgroundColor: GOLD, borderRadius: 18, padding: 16,
    shadowColor: GOLD, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  actionIconGold: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  actionGoldTxt:  { color: "#000", fontWeight: "900", fontSize: 13 },
  actionGoldSub:  { color: "rgba(0,0,0,0.55)", fontSize: 11, marginTop: 2 },

  actionCard: {
    flex: 1, backgroundColor: BG, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: SOFT, position: "relative",
  },
  actionIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  actionCardTxt: { color: TEXT, fontWeight: "800", fontSize: 13 },
  actionCardSub: { color: MUTED, fontSize: 11, marginTop: 2 },
  actionBadge:   { position: "absolute", top: 10, right: 10, backgroundColor: RED, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, minWidth: 22, alignItems: "center" },
  actionBadgeTxt:{ color: CARD, fontSize: 10, fontWeight: "900" },

  // Erreur
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${RED}12`, borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: `${RED}25` },
  errorTxt:    { color: RED, fontSize: 13, fontWeight: "600", flex: 1 },

  // Sécurité footer
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 16, paddingTop: 4 },
  securityTxt: { color: MUTED, fontSize: 11, fontWeight: "600" },

  // Toast iOS
  iosToast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  iosToastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});

// ─── Styles PIN ────────────────────────────────────────────
const pinStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  halo:   { position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: GOLD_DIM },

  card: {
    width: "88%", backgroundColor: "#0D0D0D",
    borderRadius: 28, padding: 28, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    shadowColor: GOLD, shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: 12 },
  },

  iconWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: GOLD_DIM, borderWidth: 1.5, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center", marginBottom: 18 },

  title:   { color: "#FFF", fontSize: 20, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  sub:     { color: "rgba(255,255,255,0.50)", fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 24 },

  dotsRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  dot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.20)" },
  dotFilled:{ backgroundColor: GOLD, borderColor: GOLD },
  dotError: { backgroundColor: RED, borderColor: RED },

  errorTxt: { color: RED, fontSize: 12, fontWeight: "700", marginBottom: 8, textAlign: "center" },

  keyRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  key:    { width: 70, height: 70, borderRadius: 20, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center" },
  keyTxt: { color: "#FFF", fontSize: 24, fontWeight: "700" },
});