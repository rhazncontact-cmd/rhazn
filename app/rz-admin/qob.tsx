// app/rz-admin/qob.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import AdminGuard from "../components/AdminGuard";

const GOLD = "#D4AF37";

export default function RZAdminQOB() {
  const router = useRouter();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // =============================================================
  // 🔄 Load Leaderboard
  // =============================================================
  const loadData = async () => {
    try {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false });

      if (error) throw error;

      setList(data || []);
    } catch (e) {
      console.log("QOB_LOAD_ERROR:", e);
      setErr("Impossible de charger le classement QOB.");
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // 🔁 Realtime (Top 10 + Score Updates)
  // =============================================================
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("qob-admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard" },
        () => loadData()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // =============================================================
  // UI
  // =============================================================
  return (
    <AdminGuard>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Classement — QOB</Text>

          <View style={{ width: 26 }} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        )}

        {!loading && err && (
          <View style={styles.center}>
            <Text style={styles.error}>{err}</Text>
          </View>
        )}

        {!loading && !err && (
          <ScrollView contentContainerStyle={styles.scroll}>
            {list.length === 0 && (
              <Text style={styles.empty}>Aucun utilisateur classé.</Text>
            )}

            {list.map((u: any, index: number) => (
              <View key={u.uid} style={styles.item}>
                {/* Rank */}
                <Text style={styles.rank}>{index + 1}</Text>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.username}</Text>

                  <Text style={styles.meta}>QOB : {u.qob}</Text>
                  <Text style={styles.meta}>Score Mérite : {u.score}</Text>
                </View>

                {/* TAN */}
                <Text style={styles.tan}>{u.tan} TAN</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  error: {
    color: "#f87171",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 50 },

  empty: { color: "#777", textAlign: "center", marginTop: 20 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  rank: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    width: 30,
    textAlign: "center",
  },

  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  meta: { color: "#999", fontSize: 11, marginTop: 2 },

  tan: { color: "#4ade80", fontSize: 14, fontWeight: "700" },
});
