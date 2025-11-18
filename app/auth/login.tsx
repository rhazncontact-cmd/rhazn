import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import React, { useState } from "react";
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

import { supabase } from "../../lib/supabase";

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

  // ============================================================================
  // 🔐 LOGIN AVEC SUPABASE AUTH
  // ============================================================================
  const handleLogin = async () => {
    if (!email || !password) {
      setAlert({
        type: "error",
        title: "Champs manquants",
        message: "Veuillez remplir tous les champs.",
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        setAlert({
          type: "error",
          title: "Erreur de connexion",
          message:
            error.message === "Invalid login credentials"
              ? "Identifiants incorrects."
              : "Impossible de vous connecter.",
        });
        return;
      }

      // 🎉 SUCCESS : l’utilisateur est bien connecté
      setAlert({
        type: "success",
        title: "Connexion réussie",
        message: "Bienvenue dans l’espace RHAZN.",
      });

      setTimeout(() => {
        setAlert(null);
        router.replace("/flux-intro");
      }, 900);
    } catch (e) {
      console.log("SUPABASE_LOGIN_ERROR:", e);
      setAlert({
        type: "error",
        title: "Erreur inattendue",
        message: "Impossible de vous connecter. Réessayez.",
      });
    }
  };

  // ============================================================================
  // UI
  // ============================================================================
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 40}
      style={{ flex: 1, backgroundColor: "#000" }}
    >
      {/* Logo en haut à droite */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <Lock color="#FFD700" size={40} style={{ marginBottom: 16 }} />

          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accès réservé aux membres RHAZN</Text>

          <TextInput
            placeholder="Adresse e-mail"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor="#777"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/auth/register")}>
            <Text style={styles.linkText}>
              Pas encore membre ? Créez un compte
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 🔥 ALERTE PREMIUM RHAZN */}
      {alert && (
        <View
          style={[
            styles.alertContainer,
            alert.type === "error" ? styles.alertError : styles.alertSuccess,
          ]}
        >
          <View style={styles.alertBar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setAlert(null)}>
            <Text style={styles.alertClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 24,
  },
  inner: {
    alignItems: "center",
  },

  // Logo top-right
  logoWrapper: {
    position: "absolute",
    top: 35,
    right: 24,
    zIndex: 10,
  },
  logo: {
    width: 46,
    height: 46,
    resizeMode: "contain",
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#bbb",
    fontSize: 14,
    marginBottom: 28,
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  loginButton: {
    backgroundColor: "#FFD700",
    width: "100%",
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
  },
  loginText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#FFD700",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  // Alert premium RHAZN
  alertContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 26,
    backgroundColor: "#0b0b0b",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  alertBar: {
    width: 4,
    height: "100%",
    borderRadius: 999,
    marginRight: 10,
    backgroundColor: "#FFD700",
  },
  alertError: {
    borderColor: "#f97373",
  },
  alertSuccess: {
    borderColor: "#4ade80",
  },
  alertTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  alertMessage: {
    color: "#ddd",
    fontSize: 12,
  },
  alertClose: {
    color: "#888",
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "700",
  },
});
