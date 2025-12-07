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
  tan: number | null;
  acset: number | null;
  type: string | null;
};

export default function FinanceMovements() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 🔄 LOAD
  // ============================================================
  const load = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("agents_transactions")
        .select(
          "id, created_at, agent_uid, tan, acset, type"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTxs((data as Tx[]) || []);
    } catch (e) {
      console.log("FINANCE_MOVEMENTS_LOAD_ERROR:", e);
      setError("Erreur lors du chargement des mouvements.");
      setTxs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ============================================================
  // 🎨 TYPE BADGE (style transaction)
  // ============================================================
  const renderType = (type?: string | null) => {
    if (!type) return <Text style={[styles.typeBadge, styles.typePending]}>?</Text>;

    switch (type.toUpperCase()) {
      case "BUY":
      case "ACSET_BUY":
        return <Text style={[styles.typeBadge, styles.typeBuy]}>ACHAT ACSET</Text>;
      case "CONVERT":
        return <Text style={[styles.typeBadge, styles.typeConvert]}>CONVERSION</Text>;
      case "REWARD":
        return <Text style={[styles.typeBadge, styles.typeReward]}>RECOMPENSE</Text>;
      case "SEND":
        return <Text style={[styles.typeBadge, styles.typeSend]}>ENVOI</Text>;
      default:
        return <Text style={[styles.typeBadge, styles.typePending]}>{type}</Text>;
    }
  };

  // ============================================================
  // 🎨 UI
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
        <Text style={styles.title}>Mouvements ACSET / TAN</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* LIST */}
      {!loading && !error && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {txs.length === 0 && (
            <Text style={styles.empty}>Aucun mouvement enregistré.</Text>
          )}

          {txs.map((tx) => (
            <View key={tx.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                Tx #{tx.id.slice(0, 8)}…
              </Text>

              <Text style={styles.row}>
                Agent : <Text style={styles.bold}>{tx.agent_uid ?? "—"}</Text>
              </Text>

              <Text style={styles.row}>
                ACSET : <Text style={styles.bold}>{tx.acset ?? 0}</Text>
              </Text>

              <Text style={styles.row}>
                TAN : <Text style={styles.bold}>{tx.tan ?? 0}</Text>
              </Text>

              <Text style={styles.row}>
                Type : {renderType(tx.type)}
              </Text>

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
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 18, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: GOLD, marginTop: 8 },
  errorText: { color: "#ef4444", textAlign: "center" },
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

  row: { color: "#ccc", fontSize: 12, marginTop: 2 },
  bold: { color: "#fff", fontWeight: "700" },

  date: { color: "#6b7280", fontSize: 11, marginTop: 8 },

  /* TYPE BADGES */
  typeBadge: {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    fontWeight: "700",
  },

  typeBuy: { backgroundColor: "#14532d", color: "#bbf7d0" },
  typeConvert: { backgroundColor: "#1e3a8a", color: "#93c5fd" },
  typeReward: { backgroundColor: "#4a044e", color: "#f0abfc" },
  typeSend: { backgroundColor: "#3f3f46", color: "#e4e4e7" },
  typePending: { backgroundColor: "#facc15", color: "#000" },
});
