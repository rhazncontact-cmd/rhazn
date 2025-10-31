import { useRouter } from "expo-router";
import { Camera } from "lucide-react-native"; // icône pour le scan ID
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleRegister = () => {
    if (!email || !password || !confirm) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    Alert.alert("RHAZN", "Inscription réussie !");
    router.replace("/flux"); // redirection après inscription réussie
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inscription</Text>
      <Text style={styles.subtitle}>Votre identité est votre mérite.</Text>

      {/* Bouton Scan pièce d’identité */}
      <TouchableOpacity style={styles.scanButton}>
        <Camera color="#FFD700" size={20} />
        <Text style={styles.scanText}>Scanner ma pièce d’identité</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>
        ⚠️ Aucune donnée n’est partagée. Cette étape garantit l’authenticité
        morale et légale de votre profil.
      </Text>

      {/* Champs d’inscription */}
      <TextInput
        placeholder="E-mail"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Confirmer le mot de passe"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={styles.input}
      />

      <TouchableOpacity style={styles.createButton} onPress={handleRegister}>
        <Text style={styles.createText}>Créer mon compte</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/auth/login")}>
        <Text style={styles.linkText}>Déjà membre ? Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#bbb",
    fontSize: 15,
    marginBottom: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#FFD700",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scanText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  notice: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#111",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: "#FFD700",
    width: "100%",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
  },
  createText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
  },
  linkText: {
    color: "#FFD700",
    marginTop: 18,
    fontSize: 13,
  },
});
