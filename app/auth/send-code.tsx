import * as Device from "expo-device";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Text,
  TouchableOpacity,
  View
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

  // ✅ DEVICE ID
  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  // ✅ ANIMATION
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
                params: { email },
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
