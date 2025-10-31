import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    // ⚙️ Simulation d’authentification — à remplacer plus tard par ton API RHAZN
    if (email === "test@rhazn.com" && password === "1234") {
      Alert.alert("RHAZN", "Connexion réussie !");
      router.replace("/flux-intro"); // ✅ redirection vers la page d’intro Flux du Mérite
    } else {
      Alert.alert("Erreur", "Identifiants incorrects.");
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔒 Icône de sécurité */}
      <Lock color="#FFD700" size={40} style={{ marginBottom: 16 }} />

      {/* 🩶 Titres */}
      <Text style={styles.title}>Connexion</Text>
      <Text style={styles.subtitle}>Accès réservé aux membres RHAZN</Text>

      {/* ✉️ Champs de saisie */}
      <TextInput
        placeholder="Adresse e-mail"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {/* 🔘 Bouton principal */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Se connecter</Text>
      </TouchableOpacity>

      {/* 🔗 Lien d’inscription */}
      <TouchableOpacity onPress={() => router.push("/auth/register")}>
        <Text style={styles.linkText}>Pas encore membre ? Créez un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

// 🎨 Styles harmonisés à l’identité RHAZN
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // fond noir profond
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#FFFFFF", // blanc pur
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 1,
  },
  subtitle: {
    color: "#B0B0B0", // gris clair
    fontSize: 15,
    marginBottom: 28,
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#111111",
    color: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222", // léger contour interne
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
    color: "#000000",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#FFD700",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "500",
  },
});
