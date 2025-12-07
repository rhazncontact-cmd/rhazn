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

  // ✅ SAISIE 1 CHIFFRE PAR CASE
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

  // ✅ COLLAGE GLOBAL DU CODE
  const handlePaste = (text: string) => {
    if (!/^\d{6}$/.test(text)) return;
    const arr = text.split("");
    setCode(arr);
    inputs.current[5]?.focus();
  };

  const verifyCode = async () => {
    if (loading) return;

    const finalCode = code.join("");

    if (finalCode.length !== 6) {
      return showAlert("Veuillez entrer les 6 chiffres reçus.", true);
    }

    if (!email) {
      return showAlert("Email introuvable. Recommencez l’inscription.", true);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = finalCode.trim();

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("email_verification_codes")
        .select("*")
        .eq("email", cleanEmail)
        .eq("code", cleanCode)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error || !data) {
        Vibration.vibrate(120);
        setLoading(false);
        return showAlert("Code incorrect.", true);
      }

      if (new Date(data.expires_at) < new Date()) {
        setLoading(false);
        return showAlert("Code expiré. Demandez-en un autre.", true);
      }

      // ✅ AUTH
      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (authError && !authError.message.includes("already")) {
        setLoading(false);
        return showAlert("Erreur auth.", true);
      }

      if (authError?.message.includes("already")) {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      }

      const { data: session } = await supabase.auth.getUser();
      const uid = session?.user?.id;
      if (!uid) {
        setLoading(false);
        return showAlert("Session invalide.", true);
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("contract_accepted")
        .eq("uid", uid)
        .maybeSingle();

      let contractAccepted = existingUser?.contract_accepted ?? false;

      if (!existingUser) {
        const { data: inserted } = await supabase
          .from("users")
          .insert({
            uid,
            email: cleanEmail,
            tan: 0,
            role: "user",
            contract_accepted: false,
          })
          .select("contract_accepted")
          .single();

        contractAccepted = inserted?.contract_accepted ?? false;
      }

      Animated.timing(successScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      showAlert("Vérification réussie.", false);

      setTimeout(() => {
        router.replace(
          contractAccepted ? "/flux-intro" : "/legal/contract"
        );
      }, 900);
    } catch {
      showAlert("Vérifiez votre connexion.", true);
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
              keyboardType="numeric"
              maxLength={1}
              onChangeText={(v) => handleDigit(v, index)}
              onPaste={({ nativeEvent }: any) =>
                handlePaste(nativeEvent.text)
              }
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
          <TouchableOpacity style={styles.verifyButton} onPress={verifyCode}>
            <Text style={styles.verifyText}>Valider</Text>
          </TouchableOpacity>
        )}

        <Animated.View
          style={[
            styles.successOverlay,
            { transform: [{ scale: successScale }], opacity: successScale },
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
  },
  container: { marginTop: 160, paddingHorizontal: 26 },
  title: { color: COLORS.white, fontSize: 30, textAlign: "center" },
  email: { color: COLORS.gray, textAlign: "center", marginBottom: 28 },
  codeContainer: { flexDirection: "row", justifyContent: "space-between" },
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
  alert: { textAlign: "center", marginVertical: 12, fontSize: 13 },
  successOverlay: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
  },
  successText: { fontSize: 90 },
});
