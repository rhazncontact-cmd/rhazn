import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function AdminKey() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);

    if (key !== "RZ-ADMIN-OK") {
      setError("Code incorrect");
      return;
    }

    setLoading(true);

    try {
      // 🔥 SESSION SAFE (corrige refresh token bug)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Session expirée. Reconnectez-vous.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;

      console.log("UID connecté 👉", uid);
      console.log("EMAIL 👉", session.user.email);

      // 🔐 lire role DB
      const { data: profile, error: dbErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (dbErr || !profile) {
        setError("Profil introuvable");
        setLoading(false);
        return;
      }

      const role = (profile.role || "").toUpperCase();

      console.log("ROLE DB 👉", role);

      // 🔥 REDIRECTION
      if (role === "SUPREME") {
        router.replace("/admin-dashboard-supreme");
        return;
      }

      if (role === "CAD") {
        router.replace("/admin-dashboard-cad");
        return;
      }

      if (role === "CADNA") {
        router.replace("/rz-admin-governance/cadna/cadna-dashboard");
        return;
      }

      setError("Aucun accès admin");
    } catch (e) {
      console.log("ADMIN ERROR", e);
      setError("Erreur session");
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.title}>Accès Admin</Text>

      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder="Code admin"
        placeholderTextColor="#777"
        secureTextEntry
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>
          {loading ? "..." : "Valider"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111",
    color: "#fff",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },
  error: {
    color: "#EF4444",
    marginBottom: 12,
    textAlign: "center",
  },
});
