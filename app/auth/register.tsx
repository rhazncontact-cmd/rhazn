import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Device from "expo-device";
import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";
import { isHumanTime } from "../utils/antibot";
import { generateCode } from "../utils/generateCode";

// 🎨 PALETTE RHAZN — APPLE TYPE
const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  darkGray: "#101010",
  green: "#00C853",
  crimson: "#B00020",
  gold: "#D4AF37",
};

type AlertState = {
  message: string;
  isError: boolean;
} | null;

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState>(null);
  const [deviceId, setDeviceId] = useState("");
  const [startTime, setStartTime] = useState(Date.now());

  // ✅ Honeypot anti-bot
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  const showAlert = (message: string, isError = true) => {
    setAlert({ message, isError });
    setLoading(false);
  };

  const showNetError = () => {
    showAlert(
      "Vérifiez votre connexion internet pour continuer.",
      true
    );
  };

  // ✅ Vérification stricte du doublon email
  const emailAlreadyExists = async (mail: string) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("email")
        .eq("email", mail)
        .maybeSingle();

      return !!data;
    } catch {
      return false;
    }
  };

  // ============================================================================
  // ✅ INSCRIPTION RHAZN — VERSION FINALE RLS SAFE
  // ============================================================================
  const handleRegister = async () => {
    if (loading) return;
    setLoading(true);
    setAlert(null);

    const mail = email.trim().toLowerCase();

    // ✅ Anti-bot
    if (honeypot !== "") {
      return showAlert("Requête bloquée pour raison de sécurité.");
    }

    if (!isHumanTime(startTime)) {
      return showAlert("Action trop rapide. Veuillez réessayer calmement.");
    }

    if (!mail || !password || !confirm) {
      return showAlert("Veuillez remplir tous les champs.");
    }

    if (!mail.includes("@")) {
      return showAlert("Adresse e-mail invalide.");
    }

    if (password.length < 8) {
      return showAlert("Le mot de passe doit contenir au moins 8 caractères.");
    }

    if (password !== confirm) {
      return showAlert("Les mots de passe ne correspondent pas.");
    }

    try {
      // ✅ 1. Vérification stricte du doublon
      const exists = await emailAlreadyExists(mail);
      if (exists) {
        return showAlert(
          "Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter."
        );
      }

      // ✅ 2. Création du compte AUTH (PAS encore dans public.users)
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: mail,
          password,
        });

      if (signUpError || !signUpData.user) {
        return showAlert(
          "Impossible de créer votre compte pour le moment."
        );
      }

      const uid = signUpData.user.id;

      // ✅ 3. Enregistrement profil (table users) — RLS SAFE
      const { error: insertProfileError } =
        await supabase.from("users").insert({
          uid,
          email: mail,
          tan: 0,
          role: "user",
          contract_accept: false,
          created_at: new Date().toISOString(),
        });

      if (insertProfileError) {
        return showAlert(
          "Erreur d'initialisation du profil utilisateur."
        );
      }

      // ✅ 4. Génération + stockage du code de vérification
      const code = generateCode();

      const { error: codeError } = await supabase
        .from("email_verification_codes")
        .insert({
          email: mail,
          code,
          device_id: deviceId,
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          created_at: new Date(),
        });

      if (codeError) {
        return showAlert(
          "Impossible de générer le code de vérification."
        );
      }

      // ✅ 5. Envoi du code par Function
      const { error: sendError } =
        await supabase.functions.invoke("send-code", {
          body: { email: mail, device_id: deviceId },
        });

      if (sendError) {
        if (sendError.message.includes("Network request failed")) {
          return showNetError();
        }

        return showAlert(
          "Impossible d’envoyer le code pour le moment."
        );
      }

      // ✅ 6. Succès
      showAlert(
        "Code envoyé avec succès. Vérifiez votre e-mail.",
        false
      );

      setTimeout(() => {
        setAlert(null);
        router.push({
          pathname: "/auth/send-code",
          params: { email: mail },
        });
      }, 900);
    } catch (e: any) {
      if (String(e?.message || "").includes("Network request failed")) {
        showNetError();
      } else {
        showAlert("Erreur lors de l’inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ✅ UI APPLE TYPE PREMIUM
  // ============================================================================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.full}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Inscription sécurisée RHAZN
        </Text>

        {/* Honeypot invisible */}
        <TextInput
          value={honeypot}
          onChangeText={setHoneypot}
          style={{ height: 1, opacity: 0 }}
        />

        <TextInput
          placeholder="Adresse e-mail"
          placeholderTextColor={COLORS.gray}
          style={styles.input}
          value={email}
          autoCapitalize="none"
          onChangeText={(text) => {
            setStartTime(Date.now());
            setEmail(text);
          }}
        />

        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor={COLORS.gray}
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={COLORS.gray}
          secureTextEntry
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.createText}>Créer le compte</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loaderWrapper}>
            <LoaderRhazn color={COLORS.green} />
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Déjà membre ? Connexion</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ✅ Notification premium */}
      {alert && (
        <View
          style={[
            styles.alert,
            {
              borderColor: alert.isError
                ? COLORS.crimson
                : COLORS.green,
              bottom: 56,
            },
          ]}
        >
          <Text style={styles.alertMsg}>{alert.message}</Text>
          <TouchableOpacity onPress={() => setAlert(null)}>
            <Text
              style={[
                styles.alertClose,
                {
                  color: alert.isError
                    ? COLORS.crimson
                    : COLORS.green,
                },
              ]}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// ✅ STYLES — APPLE TYPE PREMIUM
// ============================================================================
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  logoContainer: {
    position: "absolute",
    top: 40,
    right: 24,
    zIndex: 20,
  },

  logo: {
    width: 52,
    height: 52,
    resizeMode: "contain",
    opacity: 0.95,
  },

  container: {
    paddingTop: 140,
    paddingHorizontal: 26,
    alignItems: "center",
  },

  title: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 6,
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 30,
  },

  input: {
    width: "100%",
    backgroundColor: COLORS.darkGray,
    color: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderColor: "#1f1f1f",
    borderWidth: 1,
  },

  createButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: COLORS.gold,
    elevation: 8,
  },

  createText: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.black,
  },

  loaderWrapper: {
    marginTop: 18,
    alignItems: "center",
  },

  backText: {
    color: COLORS.white,
    marginTop: 30,
    opacity: 0.7,
  },

  alert: {
    position: "absolute",
    left: 20,
    right: 20,
    backgroundColor: "#0f0f0f",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  alertMsg: {
    color: COLORS.white,
    flex: 1,
    marginRight: 10,
    fontSize: 13,
  },

  alertClose: {
    fontWeight: "800",
    fontSize: 16,
  },
});
