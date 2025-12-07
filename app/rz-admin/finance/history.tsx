import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D4AF37";

type Tx = {
  id: string;
  created_at: string | null;
  agent_uid: string | null;
  user_uid: string | null;
  status: string | null;
  acset: number | null;
  tan: number | null;
};

export default function FinanceHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 🔄 CHARGER HISTORIQUE COMPLET
  // ============================================================
  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("agents_transactions")
        .select("id, created_at, agent_uid, user_uid, status, acset, tan")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTxs((data as Tx[]) || []);
    } catch (e) {
      console.log("FINANCE_HISTORY_LOAD_ERROR:", e);
      setError("Erreur lors du chargement de l'historique.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ============================================================
  // 🎨 RENDU UI
  // ============================================================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={26}
          color={GOLD}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Historique des transactions</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* LISTE */}
      {!loading && !error && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {txs.length === 0 && (
            <Text style={styles.empty}>Aucune transaction enregistrée.</Text>
          )}

          {txs.map((tx) => (
            <View key={tx.id} style={styles.card}>
              {/* ID */}
              <Text style={styles.cardTitle}>
                Tx #{tx.id.slice(0, 8)}…
              </Text>

              {/* INFOS */}
              <Text style={styles.rowText}>
                Agent : <Text style={styles.bold}>{tx.agent_uid ?? "—"}</Text>
              </Text>
              <Text style={styles.rowText}>
                Utilisateur : <Text style={styles.bold}>{tx.user_uid ?? "—"}</Text>
              </Text>
              <Text style={styles.rowText}>
                ACSET : <Text style={styles.bold}>{tx.acset ?? 0}</Text>
              </Text>
              <Text style={styles.rowText}>
                TAN : <Text style={styles.bold}>{tx.tan ?? 0}</Text>
              </Text>

              {/* STATUS COLORÉ */}
              <Text style={styles.rowText}>
                Statut : 
                <Text
                  style={[
                    styles.status,
                    tx.status === "APPROVED" && styles.statusApproved,
                    tx.status === "REJECTED" && styles.statusRejected,
                    (tx.status === "PENDING" || !tx.status) && styles.statusPending,
                  ]}
                >
                  {" "}{tx.status || "PENDING"}
                </Text>
              </Text>

              {/* DATE */}
              {tx.created_at && (
                <Text style={styles.date}>
                  {new Date(tx.created_at).toLocaleString()}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ============================================================
// 🎨 STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { color: GOLD, fontSize: 18, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: GOLD, marginTop: 8 },
  errorText: { color: "#ef4444", textAlign: "center", marginTop: 10 },
  empty: { color: "#777", marginTop: 20, textAlign: "center" },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginTop: 12,
  },

  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 4 },

  rowText: { color: "#ccc", fontSize: 12, marginTop: 2 },
  bold: { color: "#fff", fontWeight: "700" },

  status: { fontWeight: "700" },
  statusApproved: { color: "#4ade80" },
  statusRejected: { color: "#ef4444" },
  statusPending: { color: "#facc15" },

  date: { color: "#6b7280", fontSize: 11, marginTop: 8 },
});
