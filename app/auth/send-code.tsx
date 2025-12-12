import * as Device from "expo-device";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

// 🎨 PALETTE PREMIUM RHAZN
const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  darkGray: "#141414",
  green: "#00C853",
  crimson: "#B00020",
  goldSoft: "#E7C873",
  goldLight: "#F3E5AB",
};

export default function SendCodeScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [alert, setAlert] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const [deviceId, setDeviceId] = useState("");
  const pulse = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(20)).current;

  // ✅ DEVICE ID
  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  // ✅ ANIMATION CERCLE
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // ✅ ANIMATION CARTE (apple-like)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ✅ TIMER
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const showAlert = (message: string, isError = false) => {
    setAlert({ message, isError });
    setTimeout(() => setAlert(null), 3500);
  };

  const showNetError = () => {
    showAlert("Vérifiez votre connexion internet pour continuer.", true);
  };

  // ✅ RENVOI CODE — VERSION 100 % RLS SAFE
  const resendCode = async () => {
    if (loading || !email) return;
    setLoading(true);
    setResendTimer(60);

    try {
      // 🔐 1. Invalider anciens codes
      await supabase
        .from("email_verification_codes")
        .delete()
        .eq("email", email);

      // 🔐 2. Envoi via Function
      const { error: sendError } =
        await supabase.functions.invoke("send-code", {
          body: { email, device_id: deviceId },
        });

      if (sendError) {
        if (sendError.message.includes("Network request failed")) {
          return showNetError();
        }

        return showAlert(
          "Impossible d’envoyer le code pour le moment.",
          true
        );
      }

      // ✅ SUCCÈS
      showAlert(
        "Code envoyé avec succès. Veuillez vérifier votre compte e-mail.",
        false
      );
    } catch (e: any) {
      if (String(e?.message || "").includes("Network request failed")) {
        showNetError();
      } else {
        showAlert("Erreur inattendue lors du renvoi du code.", true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.full}>
      {/* ✅ LOGO */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      {/* ✅ CARTE PREMIUM APPLE x RHAZN */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslate }],
          },
        ]}
      >
        <View style={styles.card}>
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [{ scale: pulse }],
              },
            ]}
          />

          <Text style={styles.title}>Code envoyé</Text>

          <Text style={styles.subtitle}>
            Un code sécurisé a été envoyé à :
          </Text>
          <Text style={styles.email}>{email}</Text>

          <Text style={styles.desc}>
            Utilisez ce code pour vérifier votre adresse e-mail et activer
            définitivement votre compte RHAZN.
          </Text>

          {loading ? (
            <View style={{ marginTop: 10 }}>
              <LoaderRhazn color={COLORS.goldSoft} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() =>
                router.push({
                  pathname: "/auth/verify-code",
                  params: { email },
                })
              }
              activeOpacity={0.9}
            >
              <Text style={styles.verifyText}>Entrer le code</Text>
            </TouchableOpacity>
          )}

          {alert && (
            <View
              style={[
                styles.alertCard,
                {
                  borderColor: alert.isError
                    ? COLORS.crimson
                    : COLORS.green,
                },
              ]}
            >
              <Text
                style={[
                  styles.alertText,
                  {
                    color: alert.isError
                      ? COLORS.crimson
                      : COLORS.green,
                  },
                ]}
              >
                {alert.message}
              </Text>
            </View>
          )}

          {resendTimer > 0 ? (
            <Text style={styles.timer}>
              Renvoyer un nouveau code dans {resendTimer}s
            </Text>
          ) : (
            <TouchableOpacity onPress={resendCode} activeOpacity={0.8}>
              <Text style={styles.resend}>Renvoyer le code</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// 🎨 STYLES PREMIUM
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    position: "absolute",
    top: 48,
    right: 26,
    zIndex: 10,
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    opacity: 0.96,
  },
  container: {
    width: "100%",
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: "rgba(231, 200, 115, 0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
    alignItems: "center",
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: COLORS.crimson,
    backgroundColor: COLORS.goldSoft,
    marginBottom: 18,
  },
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  desc: {
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
  },
  verifyButton: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
  },
  verifyText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
  },
  alertCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#0C0C0C",
  },
  alertText: {
    fontSize: 13,
    textAlign: "center",
  },
  timer: {
    marginTop: 18,
    color: COLORS.gray,
    fontSize: 13,
    textAlign: "center",
  },
  resend: {
    marginTop: 18,
    color: COLORS.goldLight,
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
