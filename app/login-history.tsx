import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

type LoginLog = {
  id: string;
  ip: string;
  device: string;
  created_at: string;
};

export default function LoginHistory() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LoginLog[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return;

      const { data } = await supabase
        .from("login_logs")
        .select("*")
        .eq("user_uid", uid)
        .order("created_at", { ascending: false });

      if (data) setLogs(data as LoginLog[]);
      setLoading(false);
    };

    load();
  }, []);

  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  return (
    <SecureScreen scope="Historique">
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Historique des Connexions</Text>

        {logs.length === 0 && (
          <Text style={styles.empty}>Aucune connexion enregistrée.</Text>
        )}

        {logs.map((l) => (
          <View key={l.id} style={styles.card}>
            <Text style={styles.device}>{l.device}</Text>
            <Text style={styles.ip}>IP : {l.ip}</Text>
            <Text style={styles.date}>
              {new Date(l.created_at).toLocaleString("fr-FR")}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SecureScreen>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: GOLD,
    marginBottom: 20,
  },

  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderColor: "#333",
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },

  device: { color: "#fff", fontWeight: "700" },
  ip: { color: "#D4AF37", fontSize: 12 },
  date: { color: "#888", fontSize: 11, marginTop: 4 },
});
