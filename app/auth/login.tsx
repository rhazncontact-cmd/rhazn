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
import * as Network from "expo-network";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";
import { registerForPushTokens } from "../utils/registerForPush";

// 🎨 PALETTE RHAZN
const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  gray: "#AFAFAF",
  darkGray: "#121212",
  green: "#00C853",
  crimson: "#D32F2F",
  gold: "#FFD700",
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

  const [alert, setAlert] = useState<AlertState>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDeviceId(`${Device.osName}-${Device.osVersion}-${Device.modelId}`);
  }, []);

  const [deviceId, setDeviceId] = useState("");

  const showAlert = (
    title: string,
    message: string,
    type: "error" | "success" = "error"
  ) => {
    setAlert({ type, title, message });
    setLoading(false);
  };

  // ============================================================================
  // 🔔 Enregistrement du push token
  // ============================================================================
  const savePushTokenToSupabase = async (userId: string) => {
    try {
      const token = await registerForPushTokens();
      if (!token) return;

      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        role: "user",
        expo_token: token,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.log("❌ PUSH TOKEN ERROR:", e);
    }
  };

  // ============================================================================
  // 🔐 LOGIN SUPABASE — VERSION FINALE
  // ============================================================================
  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setAlert(null);

    // ❌ Vérification Internet
    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      return showAlert(
        "Connexion Internet absente",
        "Veuillez activer vos données mobiles ou votre Wi-Fi."
      );
    }

    const mail = email.trim().toLowerCase();

    // ❌ Vérification syntaxe mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      return showAlert(
        "Adresse e-mail invalide",
        "Vérifiez l’orthographe de votre adresse e-mail."
      );
    }

    if (!password) {
      return showAlert("Mot de passe manquant", "Veuillez entrer votre mot de passe.");
    }

    try {
      // ======================================================
      // 1️⃣ SIGN IN AUTH.OFFICIEL
      // ======================================================
      const { data: authData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });

      // Mot de passe incorrect
      if (loginError?.message.toLowerCase().includes("invalid")) {
        return showAlert(
          "Mot de passe incorrect",
          "Vérifiez votre mot de passe."
        );
      }

      // Email non confirmé
      if (loginError?.message.toLowerCase().includes("confirm")) {
        return showAlert(
          "Compte non activé",
          "Veuillez vérifier votre e-mail et confirmer votre compte."
        );
      }

      if (loginError) {
        return showAlert(
          "Erreur serveur",
          "Veuillez réessayer dans un instant."
        );
      }

      const user = authData.user;
      if (!user) {
        return showAlert("Session invalide", "Veuillez vous reconnecter.");
      }

      const userId = user.id;

      // ======================================================
      // 2️⃣ RÉCUPÉRER LE PROFIL (public.profiles)
      // ======================================================
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("contract_accepted")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.log("PROFILE ERROR:", profileError);
      }

      // ======================================================
      // 3️⃣ ENREGISTRER LE PUSH TOKEN
      // ======================================================
      await savePushTokenToSupabase(userId);

      // ======================================================
      // 4️⃣ SUCCESS
      // ======================================================
      showAlert(
        "Connexion réussie",
        "Bienvenue dans l’univers RHAZN.",
        "success"
      );

      setTimeout(() => {
        router.replace(
          profile?.contract_accepted ? "/rz-roles" : "/legal/contract"
        );
      }, 700);
    } catch (e) {
      console.log(e);
      showAlert(
        "Erreur critique",
        "Impossible de finaliser la connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 🔒 BIOMÉTRIE
  // ============================================================================
  const handleBiometricsLogin = async () => {
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      if (!supported)
        return showAlert(
          "Biométrie indisponible",
          "Votre appareil ne supporte pas cette fonctionnalité."
        );

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Connexion sécurisée RHAZN",
      });

      if (!result.success)
        return showAlert("Authentification annulée", "Veuillez réessayer.");

      const { data } = await supabase.auth.getSession();
      if (!data.session)
        return showAlert(
          "Connexion requise",
          "Veuillez d’abord vous connecter normalement."
        );

      router.replace("/rz-roles");
    } catch (e) {
      showAlert("Erreur biométrique", "Impossible d’accéder à la reconnaissance.");
    }
  };

  // ============================================================================
  // 🖥️ UI PREMIUM
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
          <Text style={styles.subtitle}>Accédez à l’univers sécurisé RHAZN</Text>

          <TextInput
            placeholder="Adresse e-mail"
            placeholderTextColor={COLORS.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
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
            <LoaderRhazn color={COLORS.gold} />
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
                alert.type === "error" ? COLORS.crimson : COLORS.gold,
            },
          ]}
        >
          <View
            style={[
              styles.alertBar,
              {
                backgroundColor:
                  alert.type === "error" ? COLORS.crimson : COLORS.gold,
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
                      : COLORS.gold,
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
// 💎 STYLES PREMIUM
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
