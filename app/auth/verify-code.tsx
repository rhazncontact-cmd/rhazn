import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  PanResponder,
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
  const { email, password } = useLocalSearchParams();
  const router = useRouter();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const glow = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dy: panY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const i = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(i);
  }, [cooldown]);

  const showAlert = (
    title: string,
    message: string,
    solution?: string,
    error = false
  ) => {
    setIsError(error);
    setAlert(
      `${title}\n${message}${solution ? "\n✅ Solution : " + solution : ""}`
    );
    setTimeout(() => setAlert(null), 5000);
  };

  const triggerSuccess = () => {
    Animated.timing(successScale, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const failAttempt = (title: string, message: string, solution?: string) => {
    setIsError(true);
    setAttempts((a) => a + 1);
    showAlert(title, message, solution, true);
    Vibration.vibrate(120);
    setLoading(false);

    if (attempts + 1 >= 3) {
      setLocked(true);
      showAlert(
        "🔒 Compte temporairement verrouillé",
        "Trop de tentatives incorrectes.",
        "Attendez 3 minutes ou demandez un nouveau code.",
        true
      );
    }
  };

  const handleDigit = (value: string, index: number) => {
    if (value.length > 1) {
      const chars = value.replace(/\D/g, "").split("").slice(0, 6);
      const filled = [...code];

      chars.forEach((c, i) => (filled[i] = c));
      setCode(filled);

      if (chars.length === 6) verifyCode(chars.join(""));
      return;
    }

    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (!value && index > 0) {
      inputs.current[index - 1]?.focus();
    }

    const joined = newCode.join("");
    if (joined.length === 6 && !joined.includes("")) verifyCode(joined);
  };

  const verifyCode = async (forcedCode?: string) => {
    if (loading) return;

    const finalCode = forcedCode || code.join("");

    if (finalCode.length !== 6) {
      showAlert(
        "⚠️ Code incomplet",
        "Toutes les cases ne sont pas remplies.",
        "Veuillez entrer les 6 chiffres reçus par email.",
        true
      );
      return;
    }

    if (!email) {
      showAlert(
        "❌ Email manquant",
        "Nous ne retrouvons pas votre adresse email.",
        "Retournez à l’inscription.",
        true
      );
      return;
    }

    if (locked) {
      showAlert(
        "🔒 Trop de tentatives",
        "Votre compte est temporairement verrouillé.",
        "Attendez 3 minutes ou demandez un nouveau code.",
        true
      );
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabase
        .from("email_otps")
        .select("*")
        .eq("email", email)
        .eq("code", finalCode)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (!data) {
        return failAttempt(
          "❌ Code incorrect",
          "Le code saisi est invalide.",
          "Vérifiez l’email reçu ou cliquez sur ‘Renvoyer le code’."
        );
      }

      if (new Date(data.expires_at) < new Date()) {
        return failAttempt(
          "⏰ Code expiré",
          "Ce code n’est plus valide.",
          "Cliquez sur ‘Renvoyer le code’ pour en recevoir un nouveau."
        );
      }

      const { data: authData, error: authErr } =
        await supabase.auth.signUp({
          email: email as string,
          password: password as string,
        });

      if (authErr && authErr.message.includes("User already registered")) {
        showAlert(
          "✅ Compte déjà existant",
          "Ce compte existe déjà.",
          "Connexion automatique en cours."
        );
        await supabase.auth.signInWithPassword({
          email: email as string,
          password: password as string,
        });
      } else if (authErr) {
        showAlert(
          "❌ Création impossible",
          "Une erreur est survenue.",
          "Vérifiez votre connexion Internet.",
          true
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const uid = user?.id ?? authData?.user?.id;

      if (!uid) {
        showAlert(
          "❌ Session invalide",
          "Impossible de récupérer votre session.",
          "Redémarrez l’application.",
          true
        );
        return;
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("uid, contract_accepted")
        .eq("uid", uid)
        .maybeSingle();

      let contractAccepted = existingUser?.contract_accepted ?? false;

      if (!existingUser) {
        const { data: inserted, error: insertError } = await supabase
          .from("users")
          .insert({
            uid,
            email,
            tan: 0,
            role: "user",
            contract_accepted: false,
          })
          .select("contract_accepted")
          .single();

        if (insertError) {
          showAlert(
            "❌ Erreur interne",
            "Impossible d’initialiser votre profil.",
            "Réessayez plus tard.",
            true
          );
          return;
        }

        contractAccepted = inserted?.contract_accepted ?? false;
      }

      triggerSuccess();
      showAlert(
        "✅ Vérification réussie",
        "Votre compte est actif.",
        contractAccepted
          ? "Redirection vers l’accueil RHAZN."
          : "Veuillez d’abord accepter le Contrat RHAZN.",
        false
      );

      setTimeout(() => {
        if (contractAccepted) {
          router.replace("/flux-intro");
        } else {
          router.replace("/legal/contract");
        }
      }, 1200);
    } catch (e) {
      showAlert(
        "🌐 Erreur réseau",
        "Impossible de contacter le serveur.",
        "Vérifiez votre connexion.",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ ✅ ✅ SEULE MODIFICATION DEMANDÉE — BOUTON “RENVOYER LE CODE”
  const resendCode = async () => {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN);

    if (!email) {
      showAlert(
        "❌ Email invalide",
        "Aucune adresse email n’a été détectée.",
        "Retournez à l’inscription pour saisir un email valide.",
        true
      );
      return;
    }

    try {
      const res = await fetch(
        "https://mxxlchaygarszkygmylo.functions.supabase.co/send-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer " + process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!res.ok) {
        showAlert(
          "⚠️ Problème serveur",
          "Le serveur ne répond pas correctement.",
          "Veuillez patienter quelques instants puis réessayer.",
          true
        );
        return;
      }

      const result = await res.json();

      if (result?.error === "invalid_email") {
        showAlert(
          "❌ Email invalide",
          "L’adresse email fournie est incorrecte.",
          "Retournez à l’inscription et vérifiez l’email.",
          true
        );
        return;
      }

      if (result?.error) {
        showAlert(
          "❌ Envoi impossible",
          "Une erreur interne est survenue.",
          "Vérifiez votre connexion ou réessayez dans quelques instants.",
          true
        );
        return;
      }

      showAlert(
        "📨 Code envoyé avec succès",
        "Un nouveau code vient d’être envoyé sur votre email.",
        "Veuillez vérifier votre boîte de réception (et les spams).",
        false
      );
    } catch (e) {
      showAlert(
        "🌐 Problème Internet",
        "Impossible de contacter le serveur.",
        "Vérifiez votre connexion Wi-Fi ou mobile.",
        true
      );
    }
  };

  const isCodeComplete = code.every((d) => d !== "");

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.full}>
      <Image
        source={require("../../assets/images/rhazn-logo.png")}
        style={styles.logo}
      />

      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.container, { transform: [{ translateY: panY }] }]}
      >
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
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.black },
  logo: {
    position: "absolute",
    top: 50,
    right: 24,
    width: 46,
    height: 46,
    opacity: 0.9,
    zIndex: 10,
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
