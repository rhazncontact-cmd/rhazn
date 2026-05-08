// app/agent-change-pin.tsx
// ✅ RHAZN — Changer PIN Agent · Apple-like Premium
// ✅ Vérifie l'ancien PIN depuis eds.agent_pin
// ✅ Enregistre le nouveau PIN dans eds.agent_pin

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AgentGuard from "../components/AgentGuard";
import { supabase } from "../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.28)";
const BG       = "#000000";
const CARD     = "#0D0D0D";
const CARD2    = "#141414";
const SOFT     = "rgba(255,255,255,0.08)";
const TEXT     = "#FFFFFF";
const MUTED    = "rgba(255,255,255,0.50)";
const SUB      = "rgba(255,255,255,0.28)";
const GREEN    = "#34C759";
const RED      = "#FF3B30";

const PIN_LENGTH = 4;

// ─── Étapes ─────────────────────────────────────────────────
type Step = "current" | "new" | "confirm" | "success";

// ─── Wrapper ────────────────────────────────────────────────
export default function AgentChangePin() {
  return (
    <AgentGuard>
      <Screen />
    </AgentGuard>
  );
}

// ─── Screen ─────────────────────────────────────────────────
function Screen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [step,      setStep]      = useState<Step>("current");
  const [pin,       setPin]       = useState("");
  const [newPin,    setNewPin]    = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [checking,  setChecking]  = useState(false);

  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Transition entre étapes ──────────────────────────────
  const transitionTo = (next: Step) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 10, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      setPin("");
      setError(null);
      slideAnim.setValue(-10);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    });
  };

  const triggerShake = () => {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const triggerSuccess = () => {
    setStep("success");
    Animated.parallel([
      Animated.spring(successAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim,   { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => router.back(), 2200);
  };

  // ── Gestion digits ───────────────────────────────────────
  const handleDigit = async (d: string) => {
    if (checking) return;
    const next = pin + d;
    setPin(next);
    setError(null);

    if (next.length < PIN_LENGTH) return;

    // ── Étape 1 : vérifier l'ancien PIN ──────────────────
    if (step === "current") {
      setChecking(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { setError("Session expirée."); triggerShake(); setTimeout(() => { setPin(""); setError(null); }, 700); return; }

        const { data: ed } = await supabase
          .from("eds")
          .select("agent_pin")
          .eq("auth_uid", uid)
          .eq("is_active", true)
          .maybeSingle();

        if (!ed) { setError("Compte agent introuvable."); triggerShake(); setTimeout(() => { setPin(""); setError(null); }, 700); return; }

        if (String(ed.agent_pin) === String(next)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          transitionTo("new");
        } else {
          setError("PIN actuel incorrect.");
          triggerShake();
          setTimeout(() => { setPin(""); setError(null); }, 700);
        }
      } catch {
        setError("Erreur réseau.");
        triggerShake();
        setTimeout(() => { setPin(""); setError(null); }, 700);
      } finally {
        setChecking(false);
      }
      return;
    }

    // ── Étape 2 : saisir le nouveau PIN ──────────────────
    if (step === "new") {
      if (next.length === PIN_LENGTH) {
        setNewPin(next);
        transitionTo("confirm");
      }
      return;
    }

    // ── Étape 3 : confirmer le nouveau PIN ────────────────
    if (step === "confirm") {
      if (next !== newPin) {
        setError("Les PIN ne correspondent pas.");
        triggerShake();
        setTimeout(() => { setPin(""); setError(null); }, 700);
        return;
      }

      setChecking(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { setError("Session expirée."); triggerShake(); return; }

        const { error: err } = await supabase
          .from("eds")
          .update({ agent_pin: next })
          .eq("auth_uid", uid)
          .eq("is_active", true);

        if (err) { setError("Erreur de sauvegarde."); triggerShake(); setTimeout(() => { setPin(""); setError(null); }, 700); return; }

        triggerSuccess();
      } catch {
        setError("Erreur réseau.");
        triggerShake();
        setTimeout(() => { setPin(""); setError(null); }, 700);
      } finally {
        setChecking(false);
      }
    }
  };

  const handleDelete = () => {
    if (checking) return;
    setPin(p => p.slice(0, -1));
    setError(null);
  };

  // ── Config par étape ─────────────────────────────────────
  const stepConfig = {
    current: {
      title:  "PIN actuel",
      sub:    "Entrez votre PIN agent actuel",
      icon:   "lock-closed-outline" as const,
      color:  GOLD,
    },
    new: {
      title:  "Nouveau PIN",
      sub:    "Choisissez un nouveau PIN à 4 chiffres",
      icon:   "key-outline" as const,
      color:  GREEN,
    },
    confirm: {
      title:  "Confirmer",
      sub:    "Saisissez à nouveau le nouveau PIN",
      icon:   "checkmark-circle-outline" as const,
      color:  GREEN,
    },
    success: {
      title:  "PIN modifié ✓",
      sub:    "Votre nouveau PIN est actif",
      icon:   "shield-checkmark" as const,
      color:  GREEN,
    },
  };

  const cfg = stepConfig[step];

  const DIGITS = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <View style={styles.screen}>

      {/* ── Header ────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.hTitle}>Changer PIN Agent</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Indicateur étapes ─────────────────── */}
      <View style={styles.stepsRow}>
        {(["current","new","confirm"] as Step[]).map((s, i) => (
          <View key={s} style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[
              styles.stepDot,
              (step === s || (step === "success" && i < 3)) && styles.stepDotActive,
              step === "success" && styles.stepDotDone,
            ]}>
              {step === "success"
                ? <Ionicons name="checkmark" size={12} color="#000" />
                : <Text style={[styles.stepNum, step === s && { color: "#000" }]}>{i+1}</Text>
              }
            </View>
            {i < 2 && <View style={[styles.stepLine, i < ["current","new","confirm"].indexOf(step) && styles.stepLineDone]} />}
          </View>
        ))}
      </View>

      {/* ── Halo doré ─────────────────────────── */}
      <View style={styles.halo} pointerEvents="none" />

      {/* ── Carte centrale ────────────────────── */}
      <Animated.View style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] },
      ]}>

        {/* Overlay succès */}
        {step === "success" && (
          <Animated.View style={[StyleSheet.absoluteFill, styles.successOverlay, { opacity: successAnim }]}>
            <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="checkmark" size={42} color={BG} />
            </Animated.View>
            <Text style={styles.successTxt}>PIN modifié avec succès</Text>
            <Text style={styles.successSub}>Redirection en cours…</Text>
          </Animated.View>
        )}

        {/* Icône */}
        <View style={[styles.iconWrap, { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}12` }]}>
          <Ionicons name={cfg.icon} size={34} color={cfg.color} />
        </View>

        <Text style={styles.cardTitle}>{cfg.title}</Text>
        <Text style={styles.cardSub}>{cfg.sub}</Text>

        {/* Points PIN */}
        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[
              styles.dot,
              i < pin.length && [styles.dotFilled, { backgroundColor: cfg.color, borderColor: cfg.color }],
              error && i < pin.length && styles.dotError,
            ]} />
          ))}
        </View>

        {/* Spinner */}
        {checking && <ActivityIndicator color={GOLD} size="small" style={{ marginTop: 6 }} />}

        {/* Erreur */}
        {error && !checking && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={RED} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {/* Clavier */}
        {step !== "success" && (
          <View style={styles.keypad}>
            {DIGITS.map((row, ri) => (
              <View key={ri} style={styles.keyRow}>
                {row.map((d, di) => (
                  <TouchableOpacity
                    key={di}
                    style={[styles.key, d === "" && { opacity: 0 }]}
                    onPress={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(d) : null}
                    activeOpacity={0.7}
                    disabled={checking || d === ""}
                  >
                    {d === "⌫"
                      ? <Ionicons name="backspace-outline" size={22} color={TEXT} />
                      : <Text style={styles.keyTxt}>{d}</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Sécurité footer */}
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed-outline" size={11} color={SUB} />
          <Text style={styles.securityTxt}>PIN chiffré · RHAZN Agent Security</Text>
        </View>

      </Animated.View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, alignItems: "center" },

  // Header
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD2, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:  { color: TEXT, fontSize: 17, fontWeight: "800" },

  // Étapes
  stepsRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  stepDot:  { width: 28, height: 28, borderRadius: 14, backgroundColor: CARD2, borderWidth: 1.5, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: GOLD, borderColor: GOLD },
  stepDotDone:   { backgroundColor: GREEN, borderColor: GREEN },
  stepNum:  { color: MUTED, fontSize: 12, fontWeight: "900" },
  stepLine: { width: 36, height: 2, backgroundColor: SOFT, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: GREEN },

  // Halo
  halo: { position: "absolute", top: 60, right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: GOLD_DIM, zIndex: 0 },

  // Carte
  card: {
    width: "90%", backgroundColor: CARD,
    borderRadius: 28, padding: 26, alignItems: "center",
    borderWidth: 1, borderColor: SOFT,
    shadowColor: GOLD, shadowOpacity: 0.07, shadowRadius: 28, shadowOffset: { width: 0, height: 10 },
    overflow: "hidden", zIndex: 1,
  },

  // Succès overlay
  successOverlay: { backgroundColor: CARD, borderRadius: 28, zIndex: 20, alignItems: "center", justifyContent: "center", gap: 14 },
  successCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: GREEN, alignItems: "center", justifyContent: "center", shadowColor: GREEN, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  successTxt:     { color: TEXT, fontWeight: "900", fontSize: 18 },
  successSub:     { color: MUTED, fontSize: 13 },

  // Icône
  iconWrap: { width: 70, height: 70, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 16 },

  cardTitle: { color: TEXT, fontSize: 20, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  cardSub:   { color: MUTED, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 22, lineHeight: 19 },

  // Points
  dotsRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  dot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)" },
  dotFilled: {},
  dotError:  { backgroundColor: RED, borderColor: RED },

  // Erreur
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,59,48,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,59,48,0.22)", marginTop: 8 },
  errorTxt: { color: RED, fontSize: 12, fontWeight: "700" },

  // Clavier
  keypad:  { marginTop: 16, gap: 12, width: "100%" },
  keyRow:  { flexDirection: "row", justifyContent: "center", gap: 14 },
  key:     { width: 68, height: 68, borderRadius: 20, backgroundColor: CARD2, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  keyTxt:  { color: TEXT, fontSize: 24, fontWeight: "700" },

  // Sécurité
  securityRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 16 },
  securityTxt: { color: SUB, fontSize: 11, fontWeight: "600" },
});