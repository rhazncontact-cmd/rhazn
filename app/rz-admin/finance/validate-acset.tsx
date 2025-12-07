import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D4AF37";

type Transaction = {
  id: string;
  created_at: string | null;
  agent_uid: string | null;
  user_uid: string | null;
  status: string | null;
  acset: number | null;
  tan: number | null;
};

export default function AcsetValidateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 🔄 Charger transactions en attente
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

      setTxs((data as Transaction[]) || []);
    } catch (e) {
      console.log("LOAD_ACSET_ERROR:", e);
      setError("Erreur lors du chargement des transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ============================================================
  // 🔄 Mettre à jour statut
  // ============================================================
  const handleUpdateStatus = async (
    tx: Transaction,
    newStatus: "APPROVED" | "REJECTED"
  ) => {
    try {
      if (!tx.id) return;

      setProcessingId(tx.id);
      setError(null);

      const { error } = await supabase
        .from("agents_transactions")
        .update({ status: newStatus })
        .eq("id", tx.id);

      if (error) throw error;

      // Mise à jour locale
      setTxs((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t))
      );
    } catch (e) {
      console.log("STATUS_UPDATE_ERROR:", e);
      setError("Impossible de mettre à jour le statut.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingTx = txs.filter(
    (t) => t.status === "PENDING" || t.status === null
  );

  // ============================================================
  // 📌 UI
  // ============================================================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Valider ACSET</Text>
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
          {pendingTx.length === 0 && (
            <Text style={styles.empty}>Aucune opération en attente.</Text>
          )}

          {pendingTx.map((tx) => (
            <View key={tx.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tx #{tx.id.slice(0, 8)}</Text>
                <Text style={styles.statusPending}>
                  {tx.status || "PENDING"}
                </Text>
              </View>

              <Text style={styles.rowText}>
                Agent : <Text style={styles.bold}>{tx.agent_uid ?? "??"}</Text>
              </Text>

              <Text style={styles.rowText}>
                Utilisateur :{" "}
                <Text style={styles.bold}>{tx.user_uid ?? "??"}</Text>
              </Text>

              <Text style={styles.rowText}>
                ACSET : <Text style={styles.bold}>{tx.acset ?? 0}</Text>
              </Text>

              <Text style={styles.rowText}>
                TAN : <Text style={styles.bold}>{tx.tan ?? 0}</Text>
              </Text>

              {tx.created_at && (
                <Text style={styles.date}>
                  {new Date(tx.created_at).toLocaleString()}
                </Text>
              )}

              {/* ACTIONS */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  disabled={processingId === tx.id}
                  onPress={() => handleUpdateStatus(tx, "REJECTED")}
                >
                  {processingId === tx.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="close" size={16} color="#fff" />
                      <Text style={styles.btnText}>Rejeter</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  disabled={processingId === tx.id}
                  onPress={() => handleUpdateStatus(tx, "APPROVED")}
                >
                  {processingId === tx.id ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={16} color="#000" />
                      <Text style={[styles.btnText, { color: "#000" }]}>
                        Approuver
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 18, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: GOLD, marginTop: 8 },
  errorText: { color: "#f87171", textAlign: "center" },
  empty: { color: "#9ca3af", marginTop: 10, textAlign: "center" },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginTop: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },

  statusPending: { color: "#facc15", fontSize: 11, fontWeight: "700" },

  rowText: { color: "#ddd", fontSize: 12, marginTop: 2 },
  bold: { color: "#fff", fontWeight: "700" },

  date: { color: "#6b7280", fontSize: 11, marginTop: 6 },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  btnReject: { backgroundColor: "#451a1a" },
  btnApprove: { backgroundColor: GOLD },

  btnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
