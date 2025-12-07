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

import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type Step = "key" | "otp" | "biometric" | "done";

export default function RZAdminKey() {
  const router = useRouter();

  const SECRET_KEY = "RZ-1309-M&A"; // à déplacer en variable d'env plus tard

  const [step, setStep] = useState<Step>("key");
  const [keyInput, setKeyInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyAttempts, setKeyAttempts] = useState(3);
  const [otpAttempts, setOtpAttempts] = useState(3);
  const [blocked, setBlocked] = useState(false);

  // Animations
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

  // NavBar Android
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  // 🔥 LOG helper
  const logEvent = async (
    event_type: string,
    success: boolean,
    reason?: string
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData?.session?.user?.id;
    if (!uid) return;

    await supabase.from("admin_access_logs").insert({
      user_uid: uid,
      event_type,
      success,
      reason,
    });
  };

  // ========================================================
  // 1️⃣ Étape CLE ADMIN
  // ========================================================
  const handleKey = async () => {
    if (loading || blocked) return;
    if (!keyInput.trim()) {
      triggerShake();
      return;
    }

    if (keyInput.trim() !== SECRET_KEY) {
      triggerShake();
      const next = keyAttempts - 1;
      setKeyAttempts(next);
      await logEvent("key_wrong", false, "Bad secret key");

      if (next <= 0) {
        setBlocked(true);
        await logEvent("blocked", false, "Too many key attempts");
      }
      setKeyInput("");
      return;
    }

    setLoading(true);
    await logEvent("key_ok", true, "Secret key accepted");

    // Envoi OTP via edge function
    try {
      await supabase.functions.invoke("send-admin-otp", {
        body: {},
      });

      setStep("otp");
    } catch (e: any) {
      await logEvent("otp_send_error", false, e?.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 2️⃣ Étape OTP
  // ========================================================
  const handleOtp = async () => {
    if (loading || blocked) return;
    if (!otpInput.trim()) {
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      // Vérif côté server (edge function ou table)
      const { data, error } = await supabase.functions.invoke("verify-admin-otp", {
        body: { otp: otpInput.trim() },
      });

      if (error || !data?.valid) {
        const next = otpAttempts - 1;
        setOtpAttempts(next);
        await logEvent("otp_wrong", false, error?.message || "OTP invalid");

        triggerShake();
        setOtpInput("");

        if (next <= 0) {
          setBlocked(true);
          await logEvent("blocked", false, "Too many OTP attempts");
        }

        return;
      }

      await logEvent("otp_ok", true, "OTP verified");
      setStep("biometric");
    } catch (e: any) {
      await logEvent("otp_error", false, e?.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 3️⃣ Étape BIOMETRIE
  // ========================================================
  const handleBiometric = async () => {
    if (loading || blocked) return;

    setLoading(true);

    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported) {
        await logEvent("biometric_not_supported", false, "No biometric hardware");
        triggerShake();
        setLoading(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Validation biométrique RHAZN",
      });

      if (!result.success) {
        await logEvent("biometric_failed", false, "User cancelled or failed");
        triggerShake();
        setLoading(false);
        return;
      }

      // ✅ Tout est OK → rôle admin
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      await supabase
        .from("users")
        .update({
          role: "admin",
          admin_since: new Date().toISOString(),
          last_admin_access: new Date().toISOString(),
        })
        .eq("uid", uid);

      await logEvent("biometric_ok", true, "Biometric success");
      await logEvent("admin_granted", true, "Full admin flow passed");

      setStep("done");

      setTimeout(() => {
        router.replace("/rz-admin/wallet");
      }, 900);
    } catch (e: any) {
      await logEvent("biometric_error", false, e?.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // RENDER
  // ========================================================
  const renderContent = () => {
    if (blocked) {
      return (
        <>
          <Text style={styles.title}>Sécurité activée</Text>
          <Text style={styles.subtitle}>
            Trop de tentatives ont été détectées. L’accès admin est
            temporairement bloqué pour ce compte.
          </Text>
          <Text style={styles.warning}>
            Contacte l’Administration RHAZN pour un déblocage manuel.
          </Text>
        </>
      );
    }

    if (step === "key") {
      return (
        <>
          <Text style={styles.title}>Accès Admin RHAZN</Text>
          <Text style={styles.subtitle}>Entrer la Clé Sacrée</Text>

          <TextInput
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="••••••••••"
            placeholderTextColor="#777"
            secureTextEntry
            style={styles.input}
            maxLength={20}
            onSubmitEditing={handleKey}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.4 }]}
            onPress={handleKey}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Vérification..." : "Valider la clé"}
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.attempts,
              keyAttempts === 1 && { color: "#ff5555" },
            ]}
          >
            Tentatives clé restantes : {keyAttempts}
          </Text>
        </>
      );
    }

    if (step === "otp") {
      return (
        <>
          <Text style={styles.title}>Code OTP Admin</Text>
          <Text style={styles.subtitle}>
            Un code à 6 chiffres a été envoyé sur ton email RHAZN.
          </Text>

          <TextInput
            value={otpInput}
            onChangeText={setOtpInput}
            placeholder="000000"
            placeholderTextColor="#777"
            keyboardType="numeric"
            maxLength={6}
            style={styles.input}
            onSubmitEditing={handleOtp}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.4 }]}
            onPress={handleOtp}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Vérification..." : "Valider le code"}
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.attempts,
              otpAttempts === 1 && { color: "#ff5555" },
            ]}
          >
            Tentatives OTP restantes : {otpAttempts}
          </Text>
        </>
      );
    }

    if (step === "biometric") {
      return (
        <>
          <Text style={styles.title}>Validation biométrique</Text>
          <Text style={styles.subtitle}>
            Dernière étape : confirme ton identité sur cet appareil.
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

          <Text style={styles.warning}>
            Cette étape garantit que même avec la clé et l’OTP, seul
            l’appareil légitime peut ouvrir le Sanctuaire Admin.
          </Text>
        </>
      );
    }

    // done
    return (
      <>
        <Text style={styles.title}>Accès accordé</Text>
        <Text style={styles.subtitle}>
          Tu as franchi toutes les portes du Sanctuaire Admin.
        </Text>
        <Text style={styles.warning}>
          Redirection vers le Temple d’Administration RHAZN...
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
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.box, { transform: [{ translateX: shakeAnim }] }]}>
        <Animated.View style={[styles.lockCircle, { borderColor: glowColor }]}>
          <Text style={styles.lockIcon}>🔐</Text>
        </Animated.View>

        {renderContent()}
      </Animated.View>

      <Text style={styles.footer}>RHAZN Security System v3.0</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  header: { position: "absolute", top: 50, right: 20, zIndex: 50 },
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
    width: "100%",
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
    marginBottom: 8,
  },
  btnText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#000",
  },
  attempts: { textAlign: "center", color: "#777", marginTop: 6, fontSize: 12 },
  warning: {
    color: "#777",
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
  footer: {
    textAlign: "center",
    color: "#555",
    fontSize: 11,
    marginTop: 30,
  },
});
