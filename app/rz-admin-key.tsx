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

export default function RZAdminKey() {
  const router = useRouter();

  // ✅ Animated values
  const glow = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Security Logic
  const SECRET_KEY = "RZ-1309-M&A";
  const [key, setKey] = useState("");
  const [attempts, setAttempts] = useState(3);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#A37E00", "#FFD700"]
  });

  // ✅ Shake animation
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true })
    ]).start();
  };

  // ✅ Handle access
  const handleAccess = () => {
    if (!key) {
      triggerShake();
      return;
    }

    if (key === SECRET_KEY) {
      setLoading(true);
      setTimeout(() => router.push("/rz-admin-wallet"), 1200);
    } else {
      triggerShake();
      setKey("");
      setAttempts(prev => prev - 1);

      if (attempts - 1 <= 0) {
        setError(true);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ✅ Moving gold aura blur */}
      <Animated.View style={[styles.glow, { backgroundColor: glowColor }]} />
      <Animated.View style={[styles.glow2, { backgroundColor: glowColor }]} />

      {/* ✅ Header Logo */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={styles.logo} />
        </TouchableOpacity>
      </View>

      {/* ✅ Main Content */}
      <Animated.View style={[styles.box, { transform: [{ translateX: shakeAnim }] }]}>
        
        {/* Lock */}
        <Animated.View style={[styles.lockCircle, { borderColor: glowColor }]}>
          <Text style={styles.lockIcon}>🔐</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Accès Admin RHAZN</Text>
        <Text style={styles.subtitle}>Entrez la Clé Sacrée</Text>

        {/* Input */}
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder="••••••••••"
          placeholderTextColor="#555"
          secureTextEntry
          style={styles.input}
          maxLength={15}
          onSubmitEditing={handleAccess}
        />

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.5 }]}
          onPress={handleAccess}
          disabled={loading}
        >
          <Text style={styles.btnText}>Entrer</Text>
        </TouchableOpacity>

        {/* Attempts */}
        {!error ? (
          <Text style={[styles.attempts, attempts === 1 && { color: "#ef4444" }]}>
            Tentatives restantes: {attempts}
          </Text>
        ) : (
          <Text style={styles.blocked}>🚫 ACCÈS BLOQUÉ — SÉCURITÉ ACTIVE</Text>
        )}

        {/* Warning */}
        <Text style={styles.warning}>
          ⚠️ Accès strictement réservé. Chaque tentative est enregistrée.
        </Text>
      </Animated.View>

      {/* Footer */}
      <Text style={styles.footer}>RHAZN Security System v2.0</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  header: {
    position: "absolute", top: 50, right: 20, zIndex: 99
  },
  logo: { width: 55, height: 55, resizeMode: "contain" },

  glow: {
    position: "absolute", width: 240, height: 240, borderRadius: 200,
    top: -60, right: -40, opacity: 0.32, filter: "blur(90px)"
  },
  glow2: {
    position: "absolute", width: 260, height: 260, borderRadius: 200,
    bottom: -80, left: -50, opacity: 0.25, filter: "blur(100px)"
  },

  box: {
    alignSelf: "center",
    width: "82%",
    paddingVertical: 40,
    paddingHorizontal: 25,
    borderRadius: 22,
    backgroundColor: "rgba(15,15,15,0.88)",
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
    marginBottom: 28,
  },
  lockIcon: { fontSize: 45 },

  title: { color: "#FFD700", fontSize: 22, textAlign: "center", fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#bbb", fontSize: 13, textAlign: "center", marginBottom: 28 },

  input: {
    width: "100%",
    backgroundColor: "#111",
    borderColor: "#333",
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    textAlign: "center",
    fontSize: 20,
    color: "#FFD700",
    letterSpacing: 8,
    marginBottom: 20
  },

  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 14
  },
  btnText: { textAlign: "center", fontSize: 17, fontWeight: "800", color: "#000" },

  attempts: { textAlign: "center", color: "#666", marginTop: 6 },
  blocked: { textAlign: "center", color: "#ef4444", fontWeight: "bold", marginTop: 10 },

  warning: { color: "#777", fontSize: 12, textAlign: "center", marginTop: 18 },
  footer: { textAlign: "center", color: "#555", fontSize: 11, marginTop: 35 }
});
