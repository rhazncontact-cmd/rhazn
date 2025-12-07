import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
  crimson: "#B00020",
  green: "#00C853",
};

export default function VerifyCodeScreen() {
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();

  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const successScale = useRef(new Animated.Value(0)).current;

  const showAlert = (msg: string, error = false) => {
    setIsError(error);
    setAlert(msg);
    setTimeout(() => setAlert(null), 3000);
  };

  // ✅ Gestion intelligente saisie / suppression
  const handleDigit = (value: string, index: number) => {
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
  };

  // ✅ Collage automatique
  const handlePaste = (text: string) => {
    if (!/^\d{6}$/.test(text)) return;
    setCode(text.split(""));
    inputs.current[5]?.focus();
  };

  const verifyCode = async () => {
    if (loading) return;

    const finalCode = code.join("");

    if (finalCode.length !== 6) {
      return showAlert(
        "Veuillez entrer les 6 chiffres reçus par e-mail.",
        true
      );
    }

    if (!email) {
      return showAlert(
        "Adresse e-mail introuvable. Veuillez recommencer l’inscription.",
        true
      );
    }

    setLoading(true);

    try {
      // ✅ TABLE CORRECTE
      const { data, error } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", email)
        .eq("code", finalCode)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error || !data) {
        Vibration.vibrate(120);
        return showAlert(
          "Code incorrect ou expiré. Veuillez réessayer.",
          true
        );
      }

      if (new Date(data.expires_at) < new Date()) {
        return showAlert(
          "Ce code a expiré. Veuillez en demander un nouveau.",
          true
        );
      }

      // ✅ AUTH SUPABASE
      const { error: authError } =
        await supabase.auth.signUp({
          email,
          password,
        });

      if (
        authError &&
        !authError.message.includes("already")
      ) {
        return showAlert(
          "Erreur lors de la création du compte.",
          true
        );
      }

      if (authError?.message.includes("already")) {
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      const { data: userSession } =
        await supabase.auth.getUser();

      const uid = userSession?.user?.id;

      if (!uid) {
        return showAlert(
          "Session invalide. Redémarrez l’application.",
          true
        );
      }

      // ✅ PROFIL USER
      const { data: existingUser } = await supabase
        .from("users")
        .select("contract_accepted")
        .eq("uid", uid)
        .maybeSingle();

      let contractAccepted =
        existingUser?.contract_accepted ?? false;

      if (!existingUser) {
        const { data: inserted, error: insertError } =
          await supabase
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
          return showAlert(
            "Erreur lors de l’initialisation du compte.",
            true
          );
        }

        contractAccepted =
          inserted?.contract_accepted ?? false;
      }

      // ✅ ANIMATION SUCCÈS
      Animated.timing(successScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      showAlert(
        "Vérification réussie. Bienvenue dans RHAZN.",
        false
      );

      setTimeout(() => {
        if (contractAccepted) {
          router.replace("/flux-intro");
        } else {
          router.replace("/legal/contract");
        }
      }, 1100);
    } catch {
      showAlert(
        "Vérifiez votre connexion internet et réessayez.",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.full}>
      <Image
        source={require("../../assets/images/rhazn-logo.png")}
        style={styles.logo}
      />

      <View style={styles.container}>
        <Text style={styles.title}>Vérification sécurisée</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref!)}
              value={digit}
              onChangeText={(v) => {
                handleDigit(v, index);
                if (index === 0 && v.length === 6) {
                  handlePaste(v);
                }
              }}
              keyboardType="numeric"
              maxLength={6}
              style={[
                styles.input,
                {
                  borderColor: isError
                    ? COLORS.crimson
                    : COLORS.green,
                },
              ]}
            />
          ))}
        </View>

        {alert && (
          <Text
            style={[
              styles.alert,
              {
                color: isError
                  ? COLORS.crimson
                  : COLORS.green,
              },
            ]}
          >
            {alert}
          </Text>
        )}

        {loading ? (
          <LoaderRhazn />
        ) : (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={verifyCode}
          >
            <Text style={styles.verifyText}>Valider</Text>
          </TouchableOpacity>
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
  title: {
    color: COLORS.white,
    fontSize: 30,
    textAlign: "center",
    marginBottom: 12,
  },
  email: {
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 28,
  },
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
    borderRadius: 999,
    marginTop: 28,
  },
  verifyText: {
    color: COLORS.black,
    textAlign: "center",
    fontWeight: "800",
  },
  alert: {
    textAlign: "center",
    marginVertical: 12,
    fontSize: 13,
  },
  successOverlay: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
  },
  successText: { fontSize: 90 },
});
