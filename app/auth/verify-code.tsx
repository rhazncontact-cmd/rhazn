import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

const COLORS = {
  black: "#000000",
  darkGray: "#111111",
  gray: "#9A9A9A",
  white: "#FFFFFF",
  crimson: "#8B0000",
  green: "#00ff88",
};

const RESEND_COOLDOWN = 60;

export default function VerifyCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const successScale = useRef(new Animated.Value(0)).current;

  // ✅ Cooldown du renvoi
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const showAlert = (msg: string, error = false) => {
    setIsError(error);
    setAlert(msg);
    setTimeout(() => setAlert(null), 3500);
  };

  const triggerSuccess = () => {
    Animated.timing(successScale, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // ✅ Auto-collage & auto-focus intelligent
  const handleDigit = (value: string, index: number) => {
    if (value.length > 1) {
      const chars = value.replace(/\D/g, "").split("").slice(0, 6);
      const filled = [...code];
      chars.forEach((c, i) => (filled[i] = c));
      setCode(filled);

      if (chars.length === 6) {
        verifyCode(chars.join(""));
      }
      return;
    }

    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (!value && index > 0) inputs.current[index - 1]?.focus();

    const joined = newCode.join("");
    if (joined.length === 6 && !joined.includes("")) {
      verifyCode(joined);
    }
  };

  // ✅ VERIFY FINAL — STABLE, SANS SESSION FORCÉE
  const verifyCode = async (forcedCode?: string) => {
    if (loading) return;
    setLoading(true);

    const finalCode = forcedCode || code.join("");

    if (finalCode.length !== 6 || !email) {
      showAlert("Code incomplet ou email absent.", true);
      setLoading(false);
      return;
    }

    try {
      // ✅ 1. Vérification OTP
      const { data: otpData } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", finalCode)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!otpData) {
        Vibration.vibrate(120);
        showAlert("Code incorrect ou expiré.", true);
        setLoading(false);
        return;
      }

      // ✅ 2. Succès visuel
      triggerSuccess();
      showAlert("Compte activé avec succès.");

      // ✅ 3. Redirection vers LOGIN (session propre)
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

  // ✅ RESEND FINAL SAFE
  const resendCode = async () => {
    if (cooldown > 0 || !email) return;
    setCooldown(RESEND_COOLDOWN);

    try {
      const { error } = await supabase.functions.invoke("send-code", {
        body: { email },
      });

      if (error) throw error;

      showAlert("Nouveau code envoyé.");
    } catch {
      showAlert("Impossible de renvoyer le code.", true);
    }
  };

  const isCodeComplete = code.every((d) => d !== "");

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.full}>
      <Image
        source={require("../../assets/images/rhazn-logo.png")}
        style={styles.logo}
      />

      <View style={styles.container}>
        <Text style={styles.title}>Vérification Sécurisée</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref!)}
              value={digit}
              onChangeText={(v) => handleDigit(v, index)}
              keyboardType="numeric"
              maxLength={index === 0 ? 6 : 1}
              style={[
                styles.input,
                { borderColor: isError ? COLORS.crimson : COLORS.green },
              ]}
            />
          ))}
        </View>

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

        {loading ? (
          <LoaderRhazn />
        ) : (
          <>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                { opacity: isCodeComplete ? 1 : 0.4 },
              ]}
              disabled={!isCodeComplete}
              onPress={() => verifyCode(code.join(""))}
            >
              <Text style={styles.verifyText}>Valider</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resendCode}>
              <Text style={styles.resendText}>
                {cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : "Renvoyer le code"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Animated.View
          style={[
            styles.successOverlay,
            {
              transform: [{ scale: successScale }],
              opacity: successScale,
            },
          ]}
        >
          <Text style={styles.successText}>✅</Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ✅ STYLES
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.black },
  logo: {
    position: "absolute",
    top: 50,
    right: 24,
    width: 46,
    height: 46,
    opacity: 0.9,
  },
  container: { marginTop: 160, paddingHorizontal: 26 },
  title: { color: COLORS.white, fontSize: 32, textAlign: "center" },
  email: { color: COLORS.white, textAlign: "center", marginBottom: 30 },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    width: 48,
    height: 60,
    backgroundColor: COLORS.darkGray,
    color: COLORS.white,
    fontSize: 22,
    textAlign: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  verifyButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 24,
  },
  verifyText: {
    color: COLORS.black,
    textAlign: "center",
    fontWeight: "800",
  },
  resendText: {
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 16,
  },
  alert: { textAlign: "center", marginVertical: 10 },
  successOverlay: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
  },
  successText: { fontSize: 90 },
});
