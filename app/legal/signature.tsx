// ======================================================
// RHAZN — SIGNATURE SCREEN
// Apple-like • Premium • Elegant
// ======================================================

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

/* ======================================================
TARGET
====================================================== */
const TARGET_TEXT = "yrotS evoL etidnY 1yeM dn1 b1bo1B-eL";

/* ======================================================
COLORS
====================================================== */
const C = {
  bg:      "#000000",
  card:    "#FFFFFF",
  text:    "#0A0A0A",
  sub:     "#6B7280",
  border:  "rgba(0,0,0,0.08)",
  gold:    "#D4AF37",
  goldBg:  "rgba(212,175,55,0.10)",
  goldBd:  "rgba(212,175,55,0.25)",
  success: "#10B981",
  error:   "#EF4444",
  dark:    "rgba(0,0,0,0.92)",
  surface: "#F7F7F9",
};

/* ======================================================
UTIL
====================================================== */
const normalize = (t: string) =>
  t
    .normalize("NFKC")
    .replace(/[10]/g, (c) => (c === "1" ? "l" : "o"))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* ======================================================
SCREEN
====================================================== */
export default function SignatureAppleScreen() {
  const router   = useRouter();
  const lockRef  = useRef(false);

  const [value,    setValue]    = useState("");
  const [checking, setChecking] = useState(true);
  const [userId,   setUserId]   = useState<string | null>(null);
  const [hint,     setHint]     = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const normalizedTarget = useMemo(() => normalize(TARGET_TEXT), []);
  const progress = Math.min(1, value.length / TARGET_TEXT.length);

  /* ── Animations ── */
  const float          = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale   = useRef(new Animated.Value(0.92)).current;
  const checkScale     = useRef(new Animated.Value(0)).current;
  const checkOpacity   = useRef(new Animated.Value(0)).current;
  const lineWidth      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0,  duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  /* ── Session check ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (!session) { router.replace("/auth/login"); return; }
      const uid = session.user.id;
      setUserId(uid);
      const { data } = await supabase
        .from("profiles")
        .select("contract_accepted_at, signature_accepted_at")
        .eq("id", uid)
        .maybeSingle();
      if (!data?.contract_accepted_at) { router.replace("/legal/contract"); return; }
      if (data?.signature_accepted_at) { router.replace("/banq/suspentz");  return; }
      setChecking(false);
    })();
    return () => { alive = false; };
  }, [router]);

  /* ── Success overlay — séquence Apple ── */
  const showSuccessOverlay = () => {
    // ✅ Clavier disparaît instantanément
    Keyboard.dismiss();

    setOverlayVisible(true);
    overlayOpacity.setValue(0);
    overlayScale.setValue(0.92);
    checkScale.setValue(0);
    checkOpacity.setValue(0);
    lineWidth.setValue(0);

    // 1. Fond + carte
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(overlayScale,   { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
    ]).start();

    // 2. Cercle check après 250ms
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(checkScale,   { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 250);

    // 3. Ligne séparatrice après 500ms
    setTimeout(() => {
      Animated.timing(lineWidth, {
        toValue: 1, duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 500);

    // ✅ Carte disparaît après 10s → redirect
    setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }).start(() => {
        setOverlayVisible(false);
        router.replace("/user-profile-edit");
      });
    }, 10000);
  };

  /* ── Commit signature ── */
  const commitSignature = async (uid: string) => {
  try {
    const { error } = await supabase.rpc("rz_accept_signature", { p_user_id: uid });

    if (!error) return true;

    const fallback = await supabase
      .from("profiles")
      .update({ signature_accepted_at: new Date().toISOString() })
      .eq("id", uid);

    return !fallback.error;
  } catch {
    return false;
  }
};

  /* ── Handle input ── */
  const handleChange = async (text: string) => {
    if (checking || lockRef.current) return;
   if (text.length > value.length + 1) return;
    setHint(null);
    setValue(text);
    if (text.length < TARGET_TEXT.length) return;
    if (normalize(text) !== normalizedTarget) {
      setHint("Signature incorrecte. Recopiez exactement le texte affiché.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (!userId) return;
    lockRef.current = true;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const ok = await commitSignature(userId);
    if (!ok) {
      lockRef.current = false;
      setHint("Erreur réseau. Réessayez.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    showSuccessOverlay();
  };

  /* ── Loading ── */
  if (checking) {
    return (
      <SafeAreaView style={st.loadingWrap}>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "800", fontSize: 14 }}>
          Vérification…
        </Text>
      </SafeAreaView>
    );
  }

  /* ── UI ── */
  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={st.kav}
      >
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══ HEADER ══ */}
          <View style={st.header}>
            {/* ✅ Logo RHAZN au lieu du texte */}
            <View style={st.logoWrap}>
              <Image
                source={require("../../assets/images/rz-logo-trans.png")}
                style={st.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={st.headerTitle}>Signature numérique</Text>
            <Text style={st.headerSub}>
              Confirmez votre identité.{""}Recopiez le code exactement tel qu'affiché.
            </Text>

            <View style={st.headerLine} />
          </View>

          {/* ══ CARD ══ */}
          <Animated.View style={[st.card, { transform: [{ translateY: float }] }]}>

            <View style={st.section}>
              <View style={st.sectionLabelRow}>
                <View style={st.sectionDot} />
                <Text style={st.sectionLabel}>CODE À RECOPIER</Text>
              </View>
              <View style={st.targetPill}>
                <Text selectable style={st.targetText}>{TARGET_TEXT}</Text>
              </View>
              <View style={st.progressRow}>
                <View style={st.progressBg}>
                  <View style={[st.progressFill, { width: `${progress * 100}%` as any }]} />
                </View>
                <Text style={[st.progressPct, progress === 1 && { color: C.success }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>

            <View style={st.sep} />

            <View style={st.section}>
              <View style={st.sectionLabelRow}>
                <View style={[st.sectionDot, { backgroundColor: C.gold }]} />
                <Text style={st.sectionLabel}>VOTRE SAISIE</Text>
              </View>
              <TextInput
                value={value}
                onChangeText={handleChange}
                placeholder="Saisir ici…"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  st.input,
                  hint && st.inputError,
                  progress === 1 && !hint && st.inputSuccess,
                ]}
              />
              {!!hint && (
                <View style={st.hintRow}>
                  <Text style={st.hintIcon}>⚠</Text>
                  <Text style={st.hint}>{hint}</Text>
                </View>
              )}
            </View>

            <View style={st.noteBox}>
              <Text style={st.noteTitle}>📋  Règle</Text>
              <Text style={st.noteText}>
                Aucun collage autorisé. Une seule frappe à la fois.{""}
                La signature doit correspondre parfaitement.
              </Text>
            </View>

          </Animated.View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* ══ SUCCESS OVERLAY — ✅ centré + plein écran ══ */}
        {overlayVisible && (
          <Animated.View
            style={[st.overlay, { opacity: overlayOpacity }]}
          >
            <Animated.View style={[st.successCard, { transform: [{ scale: overlayScale }] }]}>

              <Animated.View style={[
                st.checkCircle,
                { transform: [{ scale: checkScale }], opacity: checkOpacity },
              ]}>
                <Text style={st.checkMark}>✓</Text>
              </Animated.View>

              <Text style={st.successTitle}>W' te konnen'w gen yon - BEAU SOURIRE ?</Text>
              <Text style={st.successTitle2}>RHAZN, VOTRE JOIE !</Text>

              <View style={st.successLineWrap}>
                <Animated.View style={[st.successLine, { transform: [{ scaleX: lineWidth }] }]} />
              </View>

              <View style={st.badgeRow}>
                <View style={st.badge}>
                  <Text style={st.badgeTxt}>✦  Accès confirmé</Text>
                </View>
                <View style={st.badge}>
                  <Text style={st.badgeTxt}>✦  Signature validée</Text>
                </View>
              </View>

              <Text style={st.successFoot}>Redirection dans quelques secondes…</Text>

            </Animated.View>
          </Animated.View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ======================================================
STYLES
====================================================== */
const st = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  kav:         { flex: 1, backgroundColor: C.bg },
  loadingWrap: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  scroll:      { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 32 },

  // ── Header ──
  header: { alignItems: "center", marginBottom: 28 },

  // ✅ Logo RHAZN
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1.5, borderColor: "rgba(212,175,55,0.28)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 18,
  },
  logo: { width: 44, height: 36 },

  headerTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 26, letterSpacing: 0.3, textAlign: "center", marginBottom: 10 },
  headerSub:   { color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 20, fontSize: 13, fontWeight: "500" },
  headerLine:  { width: 40, height: 2, backgroundColor: C.gold, borderRadius: 2, marginTop: 18, opacity: 0.7 },

  // ── Card ──
  card: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },

  // ── Section ──
  section:         { marginBottom: 16 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C0C0C0" },
  sectionLabel:    { color: "#888", fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  sep:             { height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginVertical: 4, marginBottom: 16 },

  // ── Target ──
  targetPill: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  targetText: { color: "#111", fontWeight: "900", textAlign: "center", fontSize: 14, lineHeight: 22, letterSpacing: 0.3 },

  // ── Progress ──
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  progressBg:  { flex: 1, height: 6, backgroundColor: "#EBEBEB", borderRadius: 999, overflow: "hidden" },
  progressFill:{ height: "100%", backgroundColor: C.gold, borderRadius: 999 },
  progressPct: { color: "#9CA3AF", fontWeight: "900", fontSize: 11, minWidth: 34, textAlign: "right" },

  // ── Input ──
  input:        { backgroundColor: C.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)", color: "#111", fontWeight: "800", fontSize: 14 },
  inputError:   { borderColor: C.error,   backgroundColor: "#FFF5F5" },
  inputSuccess: { borderColor: C.success, backgroundColor: "#F0FDF4" },

  // ── Hint ──
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10 },
  hintIcon:{ color: C.error, fontWeight: "900", fontSize: 13 },
 hint: {
  color: C.error,
  fontWeight: "700",
  fontSize: 12,
  flex: 1,
  lineHeight: 17,
},

  // ── Note ──
  noteBox:   { backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.goldBd, padding: 14, borderRadius: 16, marginTop: 4 },
  noteTitle: { color: "#111", fontWeight: "900", marginBottom: 6, fontSize: 12 },
  noteText:  { color: "#444", lineHeight: 19, fontSize: 12, fontWeight: "500" },

  // ✅ OVERLAY — position absolute plein écran, centré
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.dark,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 999,
  },

  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 28,
  },

  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.gold,
    alignItems: "center", justifyContent: "center",
    marginBottom: 24,
    shadowColor: C.gold, shadowOpacity: 0.55,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  checkMark: { color: "#FFF", fontSize: 38, fontWeight: "900", lineHeight: 42 },

  successTitle:  { color: C.gold, fontSize: 30, fontWeight: "900", letterSpacing: 0.5, textAlign: "center" },
  successTitle2: { color: "#1A1A1A", fontSize: 11, fontWeight: "900", letterSpacing: 2.5, textAlign: "center", marginTop: 6, marginBottom: 22 },

  successLineWrap: { width: "80%", height: 1.5, backgroundColor: "rgba(212,175,55,0.20)", borderRadius: 2, overflow: "hidden", marginBottom: 22 },
  successLine:     { flex: 1, height: "100%", backgroundColor: C.gold, transformOrigin: "left" as any },

  badgeRow: { flexDirection: "row", gap: 10, marginBottom: 24, flexWrap: "wrap", justifyContent: "center" },
  badge:    { backgroundColor: C.goldBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: C.goldBd },
  badgeTxt: { color: "#7A6010", fontWeight: "800", fontSize: 11 },

  successFoot: { color: "#B0B0B0", fontWeight: "700", fontSize: 12, letterSpacing: 0.3 },
});