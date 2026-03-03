// ======================================================
// RHAZN — SIGNATURE SCREEN (APPLE-LIKE • PREMIUM • FIXED)
// UI responsive • no overlap • success overlay luxe
// Redirect: legal/signature -> /rz-roles
// ======================================================

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
const TARGET_TEXT = "yrotS evoL etidnY 1yeM dn1 b1bo1B eL";

/* ======================================================
COLORS — PREMIUM
====================================================== */
const COLORS = {
  bg: "#000",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6B7280",
  border: "rgba(0,0,0,0.08)",
  gold: "#D4AF37",
  success: "#10B981",
  error: "#EF4444",
  soft: "rgba(255,255,255,0.08)",
  dark: "rgba(0,0,0,0.72)",
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
  const router = useRouter();
  const lockRef = useRef(false);

  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const normalizedTarget = useMemo(() => normalize(TARGET_TEXT), []);
  const progress = Math.min(1, value.length / TARGET_TEXT.length);

  /* ===================== ANIMATIONS ===================== */
  const float = useRef(new Animated.Value(0)).current;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [float]);

  /* ======================================================
  SESSION CHECK
  ====================================================== */
  useEffect(() => {
    let alive = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const uid = session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from("profiles")
        .select("contract_accepted_at, signature_accepted_at")
        .eq("id", uid)
        .maybeSingle();

      // ✅ si contrat pas accepté → contrat
      if (!data?.contract_accepted_at) {
        router.replace("/legal/contract");
        return;
      }

      // ✅ si déjà signé → rz-roles (flow demandé)
      if (data?.signature_accepted_at) {
        router.replace("/rz-roles");
        return;
      }

      setChecking(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  /* ======================================================
  SUCCESS OVERLAY (APPLE-LIKE)
  ====================================================== */
  const showSuccessOverlay = () => {
    overlayOpacity.setValue(0);
    overlayScale.setValue(0.96);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(overlayScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* ======================================================
  COMMIT SIGNATURE (RPC + FALLBACK)
  ====================================================== */
  const commitSignature = async (uid: string) => {
    // ✅ RPC préféré
    const { error } = await supabase.rpc("rz_accept_signature", {
      p_user_id: uid,
    });

    if (!error) return true;

    // 🔁 fallback si RPC absent / erreur schéma
    const fallback = await supabase
      .from("profiles")
      .update({ signature_accepted_at: new Date().toISOString() })
      .eq("id", uid);

    return !fallback.error;
  };

  /* ======================================================
  HANDLE INPUT
  ====================================================== */
  const handleChange = async (text: string) => {
    if (checking || lockRef.current) return;

    // anti paste brutal (tu gardes ta règle)
    if (text.length - value.length > 1) return;

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

    // ✅ redirection demandée
    setTimeout(() => {
      router.replace("/rz-roles");
    }, 5000);
  };

  /* ======================================================
  LOADING
  ====================================================== */
  if (checking) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "800" }}>
          Vérification…
        </Text>
      </SafeAreaView>
    );
  }

  /* ======================================================
  UI
  ====================================================== */
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER PREMIUM */}
          <View style={styles.header}>
            <Text style={styles.brand}>RHAZN</Text>
            <Text style={styles.headerTitle}>Signature numérique</Text>
            <Text style={styles.headerSub}>
              Confirmez votre identité. Recopiez le code exactement tel qu’affiché.
            </Text>
          </View>

          {/* MAIN CARD */}
          <Animated.View style={[styles.card, { transform: [{ translateY: float }] }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Code à recopier</Text>

              <View style={styles.targetPill}>
                <Text selectable style={styles.targetText}>
                  {TARGET_TEXT}
                </Text>
              </View>

              {/* progress premium */}
              <View style={styles.progressRow}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressTxt}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Votre saisie</Text>

              <TextInput
                value={value}
                onChangeText={handleChange}
                placeholder="Saisir ici…"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              {hint ? <Text style={styles.hint}>{hint}</Text> : null}

              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Règle</Text>
                <Text style={styles.noteText}>
                  Aucun collage. Une seule frappe à la fois. La signature doit correspondre parfaitement.
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* SUCCESS OVERLAY — Apple-like / RHAZN */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.successCard,
              {
                transform: [{ scale: overlayScale }],
              },
            ]}
          >
            <Text style={styles.swiTitle}>SWIV NOU…!</Text>
            <Text style={styles.swiSub}>Accès confirmé • Signature validée</Text>
            <View style={styles.swiLine} />
            <Text style={styles.swiFoot}>Redirection en cours…</Text>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ======================================================
STYLES — APPLE-LIKE / RHAZN PREMIUM
====================================================== */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },

  loadingWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  header: { alignItems: "center", marginBottom: 14 },
  brand: {
    color: COLORS.gold,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 6,
  },
  headerTitle: { color: "#FFF", fontWeight: "900", fontSize: 22 },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 340,
    fontSize: 12,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },

  section: { marginBottom: 14 },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 13,
    marginBottom: 10,
  },

  targetPill: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F7F7F9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  targetText: {
    color: "#111",
    fontWeight: "900",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#ECECEC",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },
  progressTxt: { color: "#6B7280", fontWeight: "900", fontSize: 12 },

  input: {
    backgroundColor: "#F7F7F9",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    color: "#111",
    fontWeight: "800",
  },

  hint: {
    marginTop: 10,
    color: COLORS.error,
    fontWeight: "800",
    fontSize: 12,
  },

  noteBox: {
    marginTop: 12,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    padding: 12,
    borderRadius: 16,
  },
  noteTitle: { color: "#111", fontWeight: "900", marginBottom: 6, fontSize: 12 },
  noteText: { color: "#333", lineHeight: 18, fontSize: 12, fontWeight: "600" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.dark,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },

  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",

    shadowColor: COLORS.gold,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 22,
  },

  swiTitle: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  swiSub: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },
  swiLine: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 12,
  },
  swiFoot: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "800",
  },
});
