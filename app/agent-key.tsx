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
    TextInput,
    TouchableOpacity
} from "react-native";

/* 🍎 Apple-like Dark Palette */
const COLORS = {
  bg: "#000000",
  card: "#0B0B0B",
  text: "#FFFFFF",
  sub: "#9A9A9A",
  gold: "#D4AF37",
  border: "#1F1F1F",
  error: "#DC2626",
};

/* 🔑 CODE AGENT (à externaliser plus tard) */
const AGENT_SECRET = "RZ-AGENT-2025";

/* ⛔ Sécurité UX */
const MAX_ATTEMPTS = 3;
const LOCK_TIME_MS = 30_000;

export default function AgentKey() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;

  /* Android system UI */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  /* 🔒 Vérifier verrouillage */
  const isLocked =
    lockedUntil !== null && Date.now() < lockedUntil;

  /* ❌ Animation shake */
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* 🔑 VALIDATION */
  const submit = () => {
    if (loading || isLocked) return;

    setLoading(true);
    setError(null);

    setTimeout(() => {
      if (code.trim() === AGENT_SECRET) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        router.replace("/agent-dashboard");
        return;
      }

      // ❌ Code incorrect
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
      triggerShake();

      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError("Code agent incorrect");

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_TIME_MS);
        setError("Trop de tentatives. Réessayez plus tard.");
      }

      setLoading(false);
    }, 700);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateX: shake }] },
        ]}
      >
        <Ionicons
          name="shield-checkmark"
          size={44}
          color={COLORS.gold}
          style={{ marginBottom: 14 }}
        />

        <Text style={styles.title}>Accès Agent / ED</Text>
        <Text style={styles.subtitle}>
          Entrez votre code sécurisé
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Code Agent"
          placeholderTextColor={COLORS.sub}
          secureTextEntry
          editable={!isLocked}
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.button,
            (loading || isLocked) && { opacity: 0.5 },
          ]}
          onPress={submit}
          disabled={loading || isLocked}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Valider</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 18 }}
        >
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "88%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },

  subtitle: {
    color: COLORS.sub,
    fontSize: 13,
    marginBottom: 18,
  },

  input: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#111",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },

  button: {
    marginTop: 10,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },

  error: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 6,
  },

  back: {
    color: COLORS.sub,
    fontSize: 13,
  },
});
