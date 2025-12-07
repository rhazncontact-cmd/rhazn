// app/agent-history.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type AgentTx = {
  id: string;
  kind: "BUY_ACSET" | "SELL_ACSET" | "RECEIVE_TAN" | "AUTO_CONVERT" | "ADMIN_CREDIT" | string;
  tan_amount: number;
  acset_amount: number;
  description: string | null;
  created_at: string;
};

export default function AgentHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<AgentTx[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------
  // 🔥 FETCH HISTORY
  // ------------------------------------------------------------
  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;

    if (!uid) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("agents_transactions")
      .select("*")
      .eq("agent_uid", uid)
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      console.log("HISTORY_ERROR:", error);
      setError("Impossible de charger l’historique.");
    } else {
      setTxs((data as AgentTx[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // ------------------------------------------------------------
  // 🎨 Style dynamique selon le type d'opération
  // ------------------------------------------------------------
  const getKindColor = (kind: string) => {
    switch (kind) {
      case "BUY_ACSET":
        return "#4ade80"; // vert clair
      case "SELL_ACSET":
        return "#38bdf8"; // bleu
      case "RECEIVE_TAN":
        return "#facc15"; // jaune
      case "AUTO_CONVERT":
        return "#fb923c"; // orange
      case "ADMIN_CREDIT":
        return "#f472b6"; // rose
      default:
        return GOLD;
    }
  };

  // ------------------------------------------------------------
  // RENDER ITEM
  // ------------------------------------------------------------
  const renderItem = ({ item }: { item: AgentTx }) => (
    <View style={styles.txRow}>
      <Text style={[styles.txKind, { color: getKindColor(item.kind) }]}>
        {item.kind.replace("_", " ")}
      </Text>

      <Text style={styles.txAmounts}>
        TAN : {item.tan_amount}   |   ACSET : {item.acset_amount}
      </Text>

      {item.description ? <Text style={styles.txDesc}>{item.description}</Text> : null}

      <Text style={styles.txDate}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>Historique</Text>

        <View style={{ width: 28 }} />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadHistory}>
            <Text style={{ color: GOLD, marginTop: 10 }}>Recharger</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LISTE */}
      {!loading && !error && (
        <FlatList
          data={txs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune transaction enregistrée.</Text>
          }
          refreshing={loading}
          onRefresh={loadHistory}
        />
      )}
    </View>
  );
}

// ======================================================================
// STYLES
// ======================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "800" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorText: { color: "#f87171", textAlign: "center", paddingHorizontal: 20 },

  empty: { color: "#bbb", textAlign: "center", marginTop: 40 },

  txRow: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  txKind: { fontWeight: "700", marginBottom: 4 },

  txAmounts: { color: "#fff", fontSize: 13 },

  txDesc: { color: "#bbb", fontSize: 12, marginTop: 4 },

  txDate: { color: "#777", fontSize: 11, marginTop: 6 },
});
