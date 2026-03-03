import * as LocalAuthentication from "expo-local-authentication";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GOLD = "#D4AF37";
const SECRET_KEY = "RZ-1309-M&A"; // clé locale uniquement

type Step = "key" | "biometric" | "done";

export default function RZAdminKey() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("key");
  const [keyInput, setKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [blocked, setBlocked] = useState(false);

  /* ================== ANIMATIONS ================== */
  const glow = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#B98A00", "#FFD700"],
  });

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  /* ================== ANDROID NAVBAR ================== */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  /* ================== STEP 1 — CLÉ ================== */
  const handleKey = () => {
    if (blocked || loading) return;

    if (!keyInput.trim() || keyInput.trim() !== SECRET_KEY) {
      triggerShake();
      const next = attempts - 1;
      setAttempts(next);
      setKeyInput("");
      if (next <= 0) setBlocked(true);
      return;
    }

    setStep("biometric");
  };

  /* ================== STEP 2 — BIOMÉTRIE ================== */
  const handleBiometric = async () => {
    if (blocked || loading) return;
    setLoading(true);

    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported) throw new Error("No biometric hardware");

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Validation biométrique RHAZN",
      });

      if (!result.success) throw new Error("Biometric failed");

      // ✅ ACCÈS DIRECT — AUCUNE LOGIQUE DE RÔLE
      setStep("done");

      setTimeout(() => {
        router.replace("/admin-dashboard/");
      }, 600);
    } catch {
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  /* ================== RENDER ================== */
  const renderContent = () => {
    if (blocked) {
      return (
        <>
          <Text style={styles.title}>Accès bloqué</Text>
          <Text style={styles.subtitle}>
            Trop de tentatives incorrectes.
          </Text>
        </>
      );
    }

    if (step === "key") {
      return (
        <>
          <Text style={styles.title}>Accès Admin RHAZN</Text>
          <Text style={styles.subtitle}>Entrer la clé administrateur</Text>

          <TextInput
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="••••••••••"
            placeholderTextColor="#777"
            secureTextEntry
            style={styles.input}
            onSubmitEditing={handleKey}
          />

          <TouchableOpacity style={styles.button} onPress={handleKey}>
            <Text style={styles.btnText}>Valider la clé</Text>
          </TouchableOpacity>

          <Text style={styles.attempts}>
            Tentatives restantes : {attempts}
          </Text>
        </>
      );
    }

    if (step === "biometric") {
      return (
        <>
          <Text style={styles.title}>Validation biométrique</Text>
          <Text style={styles.subtitle}>
            Confirme ton identité.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.4 }]}
            onPress={handleBiometric}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Vérification..." : "Scanner maintenant"}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <Text style={styles.title}>Accès accordé</Text>
        <Text style={styles.subtitle}>
          Redirection vers l’espace Admin…
        </Text>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Animated.View style={[styles.glow, { opacity: glowColor }]} />
      <Animated.View style={[styles.glow2, { opacity: glowColor }]} />

      <View style={styles.header}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      <Animated.View style={[styles.box, { transform: [{ translateX: shakeAnim }] }]}>
        <Animated.View style={[styles.lockCircle, { borderColor: glowColor }]}>
          <Text style={styles.lockIcon}>🔐</Text>
        </Animated.View>

        {renderContent()}
      </Animated.View>

      <Text style={styles.footer}>RHAZN</Text>
    </KeyboardAvoidingView>
  );
}

/* ================== STYLES ================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  header: { position: "absolute", top: 50, right: 20 },
  logo: { width: 55, height: 55, resizeMode: "contain" },

  glow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 200,
    top: -40,
    right: -20,
    backgroundColor: "#FFD70033",
  },
  glow2: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 200,
    bottom: -60,
    left: -40,
    backgroundColor: "#FFD70022",
  },

  box: {
    alignSelf: "center",
    width: "82%",
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: "rgba(15,15,15,0.9)",
    borderWidth: 1,
    borderColor: "#2d2d2d",
  },

  lockCircle: {
    alignSelf: "center",
    width: 95,
    height: 95,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  lockIcon: { fontSize: 45 },

  title: {
    color: GOLD,
    fontSize: 22,
    textAlign: "center",
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "#ddd",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
  },

  input: {
    backgroundColor: "#111",
    borderColor: "#333",
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    textAlign: "center",
    fontSize: 18,
    color: GOLD,
    letterSpacing: 6,
    marginBottom: 18,
  },

  button: {
    backgroundColor: GOLD,
    paddingVertical: 13,
    borderRadius: 14,
  },

  btnText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },

  attempts: { textAlign: "center", color: "#777", marginTop: 6, fontSize: 12 },
  footer: { textAlign: "center", color: "#555", fontSize: 11, marginTop: 30 },
});
