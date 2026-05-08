import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.30)";
const BG       = "#000000";
const CARD     = "#0D0D0D";
const CARD2    = "#141414";
const SOFT     = "rgba(255,255,255,0.08)";
const TEXT     = "#FFFFFF";
const MUTED    = "rgba(255,255,255,0.50)";
const SUB      = "rgba(255,255,255,0.28)";
const RED      = "#FF3B30";
const GREEN    = "#34C759";

// ─── Config ──────────────────────────────────────────────────
const MAX_ATTEMPTS = 3;
const LOCK_TIME_MS = 30_000;

// ─── Composant ───────────────────────────────────────────────
export default function AgentKey() {
  const router = useRouter();

  const [attempts,    setAttempts]    = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [countdown,   setCountdown]   = useState(0);
  const [userEmail,   setUserEmail]   = useState<string | null>(null);
  const [isAgent,     setIsAgent]     = useState<boolean | null>(null);

  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.8)).current;

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // ── Android nav bar CACHÉE + vérification eds ────────────
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});

    // Vérifier si l'utilisateur est agent actif dans eds
    (async () => {
      setChecking(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        const email = auth?.user?.email ?? null;
        setUserEmail(email);

        if (!uid) { setIsAgent(false); setChecking(false); return; }

        // ✅ Même vérification que RhaznFooter et Nomination
        const { data: eds } = await supabase
          .from("eds")
          .select("auth_uid")
          .eq("auth_uid", uid)
          .eq("is_active", true)
          .maybeSingle();

        setIsAgent(!!eds);
      } catch {
        setIsAgent(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // ── Entrée animée ─────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Countdown verrouillage ────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setAttempts(0);
        setError(null);
        clearInterval(interval);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // ── Shake ─────────────────────────────────────────────────
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start();
  };

  // ── Succès animé ──────────────────────────────────────────
  const triggerSuccess = () => {
    setSuccess(true);
    Animated.parallel([
      Animated.spring(successAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim,   { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
    ]).start();
    setTimeout(() => router.replace("/agent-dashboard"), 1400);
  };

  // ── Validation via eds ────────────────────────────────────
  const submit = async () => {
    if (loading || isLocked) return;
    setLoading(true);
    setError(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) {
        setError("Session expirée. Reconnectez-vous.");
        setLoading(false);
        return;
      }

      // ✅ Re-vérifier eds en temps réel
      const { data: eds } = await supabase
        .from("eds")
        .select("auth_uid")
        .eq("auth_uid", uid)
        .eq("is_active", true)
        .maybeSingle();

      if (eds) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        triggerSuccess();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        triggerShake();

        const next = attempts + 1;
        setAttempts(next);

        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCK_TIME_MS);
          setError(`Trop de tentatives. Réessayez dans ${LOCK_TIME_MS / 1000}s.`);
        } else {
          setError(`Accès refusé · Compte non autorisé dans eds`);
        }
        setLoading(false);
      }
    } catch (e: any) {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" />

      {/* ── Bouton retour ── */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.75}
      >
        <Ionicons name="chevron-back" size={18} color={TEXT} />
      </TouchableOpacity>

      <Animated.View style={[
        styles.card,
        {
          opacity:   fadeAnim,
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}>

        {/* ── Overlay succès ──────────────────── */}
        {success && (
          <Animated.View style={[
            StyleSheet.absoluteFill,
            styles.successOverlay,
            { opacity: successAnim },
          ]}>
            <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="checkmark" size={42} color={BG} />
            </Animated.View>
            <Text style={styles.successTxt}>Accès accordé</Text>
          </Animated.View>
        )}

        {/* ── Icône principale ────────────────── */}
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={36} color={GOLD} />
        </View>

        {/* ── Titre ───────────────────────────── */}
        <Text style={styles.title}>Accès Agent · ED</Text>
        <Text style={styles.subtitle}>Vérification de votre accès Agent RHAZN</Text>

        {/* ── Chargement initial ──────────────── */}
        {checking && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator color={GOLD} size="small" />
            <Text style={{ color: MUTED, marginTop: 10, fontSize: 13 }}>Vérification en cours…</Text>
          </View>
        )}

        {/* ── Email du compte connecté ───────── */}
        {!checking && (
          <View style={[styles.inputWrap, isAgent === false && styles.inputWrapError]}>
            <Ionicons name="mail-outline" size={18} color={isAgent === false ? RED : MUTED} />
            <Text style={{ flex: 1, color: userEmail ? TEXT : MUTED, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
              {userEmail ?? "—"}
            </Text>
            {isAgent === true && (
              <View style={{ backgroundColor: `${GREEN}22`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: GREEN, fontSize: 10, fontWeight: "800" }}>AGENT ACTIF ✓</Text>
              </View>
            )}
            {isAgent === false && (
              <View style={{ backgroundColor: `${RED}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: RED, fontSize: 10, fontWeight: "800" }}>NON AUTORISÉ</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Tentatives ──────────────────────── */}
        {attempts > 0 && !isLocked && (
          <View style={styles.attemptsRow}>
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <View key={i} style={[styles.attemptDot, i < attempts && styles.attemptDotUsed]} />
            ))}
          </View>
        )}

        {/* ── Message erreur ───────────────────── */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={RED} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {/* ── Bouton valider ───────────────────── */}
        {!checking && (
          <TouchableOpacity
            style={[styles.submitBtn, (loading || isLocked || isAgent === false) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={loading || isLocked || isAgent === false || success}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : isLocked ? (
              <>
                <Ionicons name="lock-closed" size={16} color="rgba(0,0,0,0.40)" />
                <Text style={[styles.submitTxt, { color: "rgba(0,0,0,0.40)" }]}>Verrouillé · {countdown}s</Text>
              </>
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={18} color="#000" />
                <Text style={styles.submitTxt}>
                  {isAgent === true ? "Accéder au tableau Agent" : "Accès non autorisé"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ── Footer sécurité ──────────────────── */}
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed-outline" size={11} color={SUB} />
          <Text style={styles.securityTxt}>Accès chiffré · RHAZN Security</Text>
        </View>

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" },

  // Bouton retour flottant
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    left: 20,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: CARD2,
    borderWidth: 1, borderColor: SOFT,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },

  // Carte principale
  card: {
    width: "88%",
    backgroundColor: CARD,
    borderRadius: 28, padding: 26,
    alignItems: "center",
    borderWidth: 1, borderColor: SOFT,
    shadowColor: GOLD, shadowOpacity: 0.08,
    shadowRadius: 30, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    gap: 0,
    overflow: "hidden",
  },

  // Overlay succès
  successOverlay: {
    backgroundColor: CARD, borderRadius: 28, zIndex: 20,
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GREEN, alignItems: "center", justifyContent: "center",
    shadowColor: GREEN, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  successTxt: { color: TEXT, fontWeight: "900", fontSize: 18 },

  // Icône
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: GOLD_DIM, borderWidth: 1.5, borderColor: GOLD_BD,
    alignItems: "center", justifyContent: "center",
    marginBottom: 18,
    shadowColor: GOLD, shadowOpacity: 0.20,
    shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },

  // Textes
  title:    { color: TEXT, fontSize: 20, fontWeight: "900", letterSpacing: 0.2, marginBottom: 6, textAlign: "center" },
  subtitle: { color: MUTED, fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 20, lineHeight: 19 },

  // Tentatives
  attemptsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  attemptDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: SOFT, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  attemptDotUsed: { backgroundColor: RED, borderColor: RED },

  // Input
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    width: "100%", backgroundColor: CARD2,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: SOFT, marginBottom: 10,
  },
  inputWrapError:  { borderColor: `${RED}60`, backgroundColor: "rgba(255,59,48,0.06)" },
  inputWrapLocked: { borderColor: "rgba(255,59,48,0.30)", backgroundColor: "rgba(255,59,48,0.04)", opacity: 0.7 },

  // Erreur
  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,59,48,0.10)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "rgba(255,59,48,0.25)",
    width: "100%", marginBottom: 10,
  },
  errorTxt: { color: RED, fontSize: 12, fontWeight: "700", flex: 1 },

  // Bouton soumettre
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", backgroundColor: GOLD, borderRadius: 16, paddingVertical: 15,
    marginTop: 4, marginBottom: 16,
    shadowColor: GOLD, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.40, shadowOpacity: 0 },
  submitTxt: { color: "#000", fontWeight: "900", fontSize: 15 },

  // Footer sécurité
  securityRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  securityTxt: { color: SUB, fontSize: 11, fontWeight: "600" },
});