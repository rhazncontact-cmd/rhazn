import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
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
import * as LocalAuthentication from "expo-local-authentication";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

// ✅ PUSH
import { registerForPushTokens } from "../utils/registerForPush";

// ===============================
// 🎨 COULEURS RHAZN — APPLE TYPE
// ===============================
const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#AFAFAF",
  darkGray: "#121212",
  green: "#00C853",
  crimson: "#D32F2F",
  gold: "#D4AF37",
};

type AlertState =
  | {
      type: "error" | "success";
      title: string;
      message: string;
    }
  | null;

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const [alert, setAlert] = useState<AlertState>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  const showAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error"
  ) => {
    setAlert({ type, title, message });
    setLoading(false);
  };

  // ============================================================================
  // ✅ SAUVEGARDE PUSH TOKEN
  // ============================================================================
  const savePushTokenToSupabase = async (
    userId: string,
    role: "user" | "agent"
  ) => {
    try {
      const token = await registerForPushTokens();
      if (!token) return;

      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        role,
        expo_token: token,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log("❌ PUSH TOKEN SAVE ERROR:", error);
      } else {
        console.log("✅ PUSH TOKEN SAUVEGARDÉ");
      }
    } catch (e) {
      console.log("❌ PUSH TOKEN EXCEPTION:", e);
    }
  };

  // ============================================================================
  // ✅ LOGIN FINAL — 100 % CONFORME
  // ============================================================================
  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setAlert(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return showAlert(
        "Champs manquants",
        "Veuillez entrer votre adresse e-mail et votre mot de passe."
      );
    }

    try {
      const { data: authData, error: loginErr } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginErr) {
        if (loginErr.message.toLowerCase().includes("invalid")) {
          return showAlert(
            "Identifiants incorrects",
            "Adresse e-mail ou mot de passe incorrect."
          );
        }

        if (loginErr.message.toLowerCase().includes("confirm")) {
          return showAlert(
            "Compte non activé",
            "Veuillez confirmer votre e-mail."
          );
        }

        return showAlert("Connexion impossible", "Erreur serveur.");
      }

      const userId = authData.user?.id;
      if (!userId) {
        return showAlert("Erreur critique", "Session invalide.");
      }

      const { data: userData, error: readErr } = await supabase
        .from("users")
        .select("uid, contract_accepted")
        .eq("uid", userId)
        .maybeSingle();

      if (readErr) console.log("READ USER ERROR:", readErr);

      // ✅ UTILISATEUR NOUVEAU
      if (!userData) {
        const { error: insertErr } = await supabase.from("users").insert({
          uid: userId,
          email: cleanEmail,
          tan: 0,
          role: "user",
          contract_accepted: false,
        });

        if (insertErr) {
          console.log("INSERT USER ERROR:", insertErr);
          return showAlert(
            "Erreur création compte",
            "Impossible d'initialiser votre compte."
          );
        }

        showAlert("Connexion réussie", "Bienvenue dans RHAZN.", "success");
        await savePushTokenToSupabase(userId, "user");

        setTimeout(() => {
          router.replace("/legal/contract");
        }, 700);

        return;
      }

      // ✅ UTILISATEUR EXISTANT
      showAlert("Connexion réussie", "Bienvenue dans RHAZN.", "success");
      await savePushTokenToSupabase(userId, "user");

      setTimeout(() => {
        router.replace(
          userData.contract_accepted ? "/flux-intro" : "/legal/contract"
        );
      }, 700);
    } catch (e) {
      console.log("LOGIN ERROR:", e);
      showAlert("Erreur critique", "Une erreur inattendue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 🔒 BIOMÉTRIE — SESSION UNIQUEMENT
  // ============================================================================
  const handleBiometricsLogin = async () => {
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported)
        return showAlert(
          "Indisponible",
          "Votre appareil ne supporte pas la biométrie."
        );

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Connexion sécurisée RHAZN",
      });

      if (!result.success)
        return showAlert("Échec", "Authentification annulée.");

      const { data } = await supabase.auth.getSession();
      if (!data.session)
        return showAlert(
          "Première connexion requise",
          "Veuillez vous connecter une première fois."
        );

      router.replace("/flux-intro");
    } catch {
      showAlert("Erreur", "Impossible d’utiliser la biométrie.");
    }
  };

  // ============================================================================
  // UI
  // ============================================================================
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 40}
      style={{ flex: 1, backgroundColor: COLORS.black }}
    >
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.inner}>
          <Lock color={COLORS.white} size={34} style={{ marginBottom: 18 }} />

          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            Accédez à l’univers sécurisé RHAZN
          </Text>

          <TextInput
            placeholder="Adresse e-mail"
            placeholderTextColor={COLORS.gray}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {loading ? (
            <LoaderRhazn />
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.loginText}>Se connecter</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleBiometricsLogin}>
            <Text style={[styles.linkText, { marginTop: 18 }]}>
              Face ID / Empreinte digitale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/auth/register")}>
            <Text style={[styles.linkText, { marginTop: 26 }]}>
              Pas encore membre ? Créez un compte
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {alert && (
        <View
          style={[
            styles.alertContainer,
            {
              borderColor:
                alert.type === "error" ? COLORS.crimson : COLORS.green,
            },
          ]}
        >
          <View
            style={[
              styles.alertBar,
              {
                backgroundColor:
                  alert.type === "error"
                    ? COLORS.crimson
                    : COLORS.green,
              },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>

          <TouchableOpacity onPress={() => setAlert(null)}>
            <Text
              style={[
                styles.alertClose,
                {
                  color:
                    alert.type === "error"
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
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 28,
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    marginTop: 110,
  },
  logoWrapper: {
    position: "absolute",
    top: 42,
    right: 26,
    zIndex: 20,
  },
  logo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  title: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 36,
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.darkGray,
    color: COLORS.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  loginButton: {
    backgroundColor: COLORS.gold,
    width: "100%",
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  linkText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.75,
    textAlign: "center",
  },
  alertContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 38,
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  alertBar: {
    width: 4,
    height: "100%",
    borderRadius: 999,
    marginRight: 10,
  },
  alertTitle: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  alertMessage: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 4,
  },
  alertClose: {
    fontWeight: "700",
    fontSize: 16,
    paddingHorizontal: 10,
  },
});
