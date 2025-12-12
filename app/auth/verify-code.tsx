import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Vibration,
  View,
} from "react-native";

import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

// 🎨 PALETTE APPLE x RHAZN
const COLORS = {
  black: "#000000",
  darkGray: "#111111",
  cardDark: "#141414",
  cardLight: "#FFFFFF",
  gray: "#9A9A9A",
  white: "#FFFFFF",
  crimson: "#B00020",
  gold: "#D4AF37",
  iosSuccess: "#00FF90",
};

const RESEND_COOLDOWN = 60;

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  // Animations
  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageTranslate = useRef(new Animated.Value(20)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  // ⚡ Apparition Apple-like (fade + slide-up)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslate, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ⏱️ Cooldown renvoi code
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const showAlert = (msg: string, error = false) => {
    setIsError(error);
    setAlert(msg);
    setTimeout(() => setAlert(null), 3000);
  };

  const triggerSuccess = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(successAnim, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  // ✏️ Gestion des digits (tape + collage intelligent)
  const handleDigit = (value: string, index: number) => {
    // Collage d’un code complet
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...code];
      digits.forEach((d, i) => (next[i] = d));
      setCode(next);

      if (digits.length === 6) {
        verifyCode(digits.join(""));
      }
      return;
    }

    if (!/^\d?$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    } else if (!value && index > 0) {
      inputs.current[index - 1]?.focus();
    }

    const joined = next.join("");
    if (joined.length === 6 && !joined.includes("")) {
      verifyCode(joined);
    }
  };

  // ✅ Vérification OTP (table email_verification_codes)
  const verifyCode = async (forcedCode?: string) => {
    if (loading) return;
    setLoading(true);

    const finalCode = forcedCode || code.join("");

    if (finalCode.length !== 6 || !email) {
      showAlert("Code incomplet ou e-mail manquant.", true);
      setLoading(false);
      return;
    }

    try {
      const { data: otpData } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", finalCode)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!otpData) {
        Vibration.vibrate(120);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showAlert("Code incorrect ou expiré.", true);
        setLoading(false);
        return;
      }

      triggerSuccess();
      showAlert("Compte activé avec succès.");

      setTimeout(() => {
        router.replace("/auth/login");
      }, 1200);
    } catch (e) {
      console.log("VERIFY_FATAL_ERROR:", e);
      showAlert("Erreur serveur. Réessayez plus tard.", true);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Renvoi du code via Edge Function `send-code`
  const resendCode = async () => {
    if (cooldown > 0 || !email) return;

    setCooldown(RESEND_COOLDOWN);

    try {
      const { error } = await supabase.functions.invoke("send-code", {
        body: { email },
      });

      if (error) throw error;

      showAlert("Nouveau code envoyé.");
    } catch (e) {
      console.log("RESEND_ERROR:", e);
      showAlert("Impossible de renvoyer le code.", true);
    }
  };

  const isCodeComplete = code.every((d) => d !== "");

  // THEME
  const bgColor = isDark ? COLORS.black : "#F3F4F6";
  const cardColor = isDark ? COLORS.cardDark : COLORS.cardLight;
  const textMain = isDark ? COLORS.white : "#111111";
  const textSecondary = isDark ? COLORS.gray : "#4B5563";

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.full, { backgroundColor: bgColor }]}>
      <Animated.View
        style={{
          flex: 1,
          opacity: pageOpacity,
          transform: [{ translateY: pageTranslate }],
        }}
      >
        {/* LOGO */}
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />

        {/* CARTE CENTRALE */}
        <View style={styles.wrapper}>
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <Text style={[styles.title, { color: textMain }]}>
              Vérification RHAZN
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Entrez le code à 6 chiffres envoyé à :
            </Text>
            <Text style={[styles.email, { color: textMain }]}>{email}</Text>

            {/* CHAMPS DE CODE */}
            <View style={styles.codeRow}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputs.current[index] = ref!)}
                  value={digit}
                  onChangeText={(v) => handleDigit(v, index)}
                  keyboardType="numeric"
                  maxLength={index === 0 ? 6 : 1}
                  style={[
                    styles.codeInput,
                    {
                      borderColor: isError ? COLORS.crimson : COLORS.gold,
                      backgroundColor: isDark ? COLORS.darkGray : "#F9FAFB",
                      color: textMain,
                    },
                  ]}
                />
              ))}
            </View>

            {/* MESSAGE */}
            {alert && (
              <Text
                style={[
                  styles.alert,
                  { color: isError ? COLORS.crimson : COLORS.iosSuccess },
                ]}
              >
                {alert}
              </Text>
            )}

            {/* BOUTONS */}
            {loading ? (
              <View style={{ marginTop: 24 }}>
                <LoaderRhazn color={COLORS.gold} />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.validateButton,
                    {
                      backgroundColor: textMain,
                      opacity: isCodeComplete ? 1 : 0.35,
                    },
                  ]}
                  disabled={!isCodeComplete}
                  onPress={() => verifyCode(code.join(""))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.validateText,
                      { color: isDark ? COLORS.black : COLORS.white },
                    ]}
                  >
                    Valider
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={resendCode} activeOpacity={0.7}>
                  <Text style={[styles.resendText, { color: textSecondary }]}>
                    {cooldown > 0
                      ? `Renvoyer le code dans ${cooldown}s`
                      : "Renvoyer le code"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* CHECKMARK APPLE x RHAZN */}
            <Animated.View
              style={[
                styles.successOverlay,
                {
                  opacity: successAnim,
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.checkCircle}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// 🧬 STYLES — APPLE x RHAZN
const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
  logo: {
    position: "absolute",
    top: 52,
    right: 26,
    width: 50,
    height: 50,
    resizeMode: "contain",
    opacity: 0.96,
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.28)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 26,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  codeInput: {
    width: 50,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
  },
  alert: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  validateButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 18,
  },
  validateText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  resendText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  successOverlay: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
  },
  checkCircle: {
    width: 86,
    height: 86,
    borderRadius: 86,
    backgroundColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 46,
    fontWeight: "900",
    color: COLORS.black,
  },
});
