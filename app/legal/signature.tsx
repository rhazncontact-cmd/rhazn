import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const TARGET_TEXT = "Le Baobab";

// 🎨 PALETTE PREMIUM
const COLORS = {
  black: "#000000",
  card: "#111111",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  green: "#00C853",
  crimson: "#B00020",
  gold: "#D4AF37",
};

// Normalisation pour éviter les faux négatifs
const normalize = (t: string) => t.trim().toLowerCase();
const normalizedTarget = normalize(TARGET_TEXT);

export default function SignaturePremiumScreen() {
  const router = useRouter();

  const [value, setValue] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // Progression de frappe
  const progress = Math.min(
    100,
    (value.length / TARGET_TEXT.length) * 100
  );
  const charsRemaining = Math.max(0, TARGET_TEXT.length - value.length);

  // Animations
  const successScale = useRef(new Animated.Value(0)).current; // ✔︎
  const signatureOpacity = useRef(new Animated.Value(0)).current; // "Le Baobab" or
  const signatureScale = useRef(new Animated.Value(0.9)).current;
  const sealScale = useRef(new Animated.Value(0)).current; // sceau
  const sealOpacity = useRef(new Animated.Value(0)).current;

  // ============================
  // 🔐 VÉRIFIER SESSION ACTIVE
  // ============================
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace("/auth/login");
      } else {
        setUserId(data.user.id);
      }
    });
  }, []);

  const showAlert = (msg: string, isErr = false) => {
    setIsError(isErr);
    setAlert(msg);
    setTimeout(() => setAlert(null), 2500);
  };

  // ============================
  // ✍️ LOGIQUE DE SIGNATURE PREMIUM
  // ============================
  const handleChange = async (text: string) => {
    if (locked) return;

    // ❌ Anti-collage : plus d’un caractère à la fois
    if (text.length - value.length > 1) {
      showAlert("Le collage est désactivé. Tapez manuellement.", true);
      return;
    }

    // Haptique léger sur chaque frappe
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setValue(text);
    const normalizedInput = normalize(text);

    // 🎯 Succès : texte correct
    if (normalizedInput === normalizedTarget) {
      if (!userId) {
        showAlert("Session invalide. Reconnectez-vous.", true);
        return;
      }

      setLocked(true);

      // Haptique succès Apple-like
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ✔︎ check animé
      Animated.timing(successScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Animation "Le Baobab" en or + sceau RHAZN
      Animated.sequence([
        Animated.parallel([
          Animated.timing(signatureOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(signatureScale, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(sealOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(sealScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      try {
        const { error } = await supabase
          .from("users")
          .update({
            contract_accepted: true,
            contract_accepted_at: new Date().toISOString(),
          })
          .eq("uid", userId);

        if (error) {
          console.log("SIGNATURE_DB_ERROR:", error);
          showAlert("Erreur lors de la validation.", true);
          setLocked(false);
          return;
        }

        showAlert("Signature validée.", false);

        // Laisse respirer l’animation avant redirection
        setTimeout(() => {
          router.replace("/flux-intro");
        }, 1500);
      } catch (e) {
        console.log("SIGNATURE_FATAL:", e);
        showAlert("Erreur réseau. Réessayez.", true);
        setLocked(false);
      }

      return;
    }

    // ❌ Mauvais texte une fois la longueur atteinte
    if (text.length >= TARGET_TEXT.length && normalizedInput !== normalizedTarget) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert(`Texte incorrect.\nTexte attendu : "${TARGET_TEXT}"`, true);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.full}>
      <View style={styles.centerWrap}>
        {/* CARTE PRINCIPALE */}
        <View style={styles.card}>
          <Text style={styles.title}>Signature Finale</Text>

          <Text style={styles.subtitle}>Tapez exactement :</Text>

          <Text style={styles.target}>{TARGET_TEXT}</Text>

          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: locked ? COLORS.green : COLORS.gold,
                },
              ]}
            />
          </View>

          {/* COMPTEUR RESTANT */}
          {!locked && (
            <Text style={styles.remaining}>
              {charsRemaining > 0
                ? `Encore ${charsRemaining} caractère(s)...`
                : "Vérification…"}
            </Text>
          )}

          <TextInput
            value={value}
            onChangeText={handleChange}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!locked}
            placeholder="Tapez ici…"
            placeholderTextColor={COLORS.gray}
            style={[
              styles.input,
              { borderColor: isError ? COLORS.crimson : COLORS.green },
            ]}
          />

          {alert && (
            <Text
              style={[
                styles.alert,
                { color: isError ? COLORS.crimson : COLORS.green },
              ]}
            >
              {alert}
            </Text>
          )}
        </View>

        {/* ✔︎ CHECK APPLE-LIKE */}
        <Animated.View
          style={[
            styles.successOverlay,
            {
              transform: [{ scale: successScale }],
              opacity: successScale,
            },
          ]}
        >
          <Text style={styles.successText}>✔︎</Text>
        </Animated.View>

        {/* ✨ SIGNATURE "Le Baobab" EN OR + SCEAU RHAZN */}
        <Animated.View
          style={[
            styles.signatureAnimContainer,
            {
              opacity: signatureOpacity,
              transform: [{ scale: signatureScale }],
            },
          ]}
        >
          <Text style={styles.signatureGold}>Le Baobab</Text>
          <View style={styles.signatureUnderline} />

          <Animated.View
            style={[
              styles.seal,
              {
                opacity: sealOpacity,
                transform: [{ scale: sealScale }],
              },
            ]}
          >
            <Text style={styles.sealTextTop}>RHAZN</Text>
            <Text style={styles.sealTextBottom}>VALIDÉ</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// =======================
// STYLES PREMIUM
// =======================
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },

  centerWrap: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
  },

  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },

  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 12,
  },

  target: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 18,
  },

  // Barre de progression
  progressBackground: {
    width: "100%",
    height: 6,
    borderRadius: 4,
    backgroundColor: "#222",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  remaining: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 14,
    fontStyle: "italic",
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: COLORS.white,
    fontSize: 16,
    backgroundColor: "#0A0A0A",
  },

  alert: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
  },

  // ✔︎ check
  successOverlay: {
    position: "absolute",
    top: "42%",
    alignSelf: "center",
  },
  successText: {
    fontSize: 90,
    color: COLORS.green,
    fontWeight: "300",
  },

  // Signature "Le Baobab" + sceau
  signatureAnimContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  signatureGold: {
    color: COLORS.gold,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  signatureUnderline: {
    marginTop: 4,
    width: 140,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },

  seal: {
    marginTop: 22,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  sealTextTop: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  sealTextBottom: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1.1,
  },
});
