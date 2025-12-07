import * as Device from "expo-device";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [alert, setAlert] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const [deviceId, setDeviceId] = useState("");
  const pulse = useRef(new Animated.Value(1)).current;

  // ✅ DEVICE ID
  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  // ✅ ANIMATION PULSATION
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

  // ✅ TIMER
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const showAlert = (message: string, isError = false) => {
    setAlert({ message, isError });
    setTimeout(() => setAlert(null), 2800);
  };

  const showNetError = () => {
    showAlert(
      "Vérifiez votre connexion internet pour continuer.",
      true
    );
  };

  // ✅ RENVOI CODE FINAL & SÉCURISÉ
  const resendCode = async () => {
    if (loading) return;
    setLoading(true);
    setResendTimer(60);

    try {
      // ✅ Génération nouveau code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();

      // ✅ Optionnel : invalider anciens codes
      await supabase
        .from("email_verification_codes")
        .delete()
        .eq("email", email);

      // ✅ Enregistrement nouveau code
      const { error: insertError } = await supabase
        .from("email_verification_codes")
        .insert({
          email,
          code: newCode,
          device_id: deviceId,
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
        });

      if (insertError) {
        return showAlert(
          "Impossible de générer un nouveau code. Réessayez.",
          true
        );
      }

      // ✅ Envoi par email
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

      {/* ✅ CARTE PREMIUM */}
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [{ scale: pulse }],
              borderColor: COLORS.crimson,
              backgroundColor: COLORS.goldSoft,
            },
          ]}
        />

        <Text style={styles.title}>Code envoyé</Text>

        <Text style={styles.subtitle}>
          Un code sécurisé a été envoyé à :
        </Text>
        <Text style={styles.email}>{email}</Text>

        <Text style={styles.desc}>
          Entrez le code reçu pour activer définitivement votre compte RHAZN.
        </Text>

        {loading ? (
          <View style={{ marginTop: 10 }}>
            <LoaderRhazn />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() =>
              router.push({
                pathname: "/auth/verify-code",
                params: { email, password, deviceId },
              })
            }
            activeOpacity={0.85}
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
            Renvoyer dans {resendTimer}s
          </Text>
        ) : (
          <TouchableOpacity onPress={resendCode}>
            <Text style={styles.resend}>
              Renvoyer le code
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ✅ STYLES FINALS — APPLE TYPE PREMIUM
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
  },

  logoWrapper: {
    position: "absolute",
    top: 40,
    right: 24,
    zIndex: 20,
  },

  logo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
    opacity: 0.95,
  },

  container: {
    marginHorizontal: 20,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: COLORS.goldSoft,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },

  circle: {
    width: 180,
    height: 180,
    borderRadius: 999,
    borderWidth: 3,
    marginBottom: 40,
  },

  title: {
    color: COLORS.black,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },

  subtitle: {
    color: "#333",
    fontSize: 14,
  },

  email: {
    color: COLORS.black,
    fontWeight: "700",
    marginBottom: 20,
  },

  desc: {
    color: "#444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
  },

  verifyButton: {
    backgroundColor: COLORS.white,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    marginBottom: 8,
  },

  verifyText: {
    color: COLORS.black,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },

  timer: {
    color: COLORS.gray,
    marginTop: 15,
  },

  resend: {
    color: COLORS.black,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },

  alertCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0f0f0f",
  },

  alertText: {
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
});
