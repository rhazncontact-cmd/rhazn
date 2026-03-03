// app/agent-history.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";

type AgentTx = {
  id: string;
  kind: "SELL_ACSET" | "RECEIVE_TAN";
  tan_amount: number | null;
  acset_amount: number | null;
  created_at: string;
};

export default function AgentHistory() {
  return (
    <AgentGuard>
      <AgentHistoryContent />
    </AgentGuard>
  );
}

function AgentHistoryContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AgentTx[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const agentUid = s.session?.user?.id;
        if (!agentUid) {
          setError("Session expirée.");
          return;
        }

        const { data, error } = await supabase
          .from("agents_transactions")
          .select("id, kind, tan_amount, acset_amount, created_at")
          .eq("agent_uid", agentUid)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRows((data as AgentTx[]) ?? []);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }: { item: AgentTx }) => {
    const label =
      item.kind === "SELL_ACSET" ? "Vente ACSET" : "Réception TAN";
    const value =
      item.kind === "SELL_ACSET"
        ? `${item.acset_amount ?? 0} ACSET`
        : `${item.tan_amount ?? 0} TAN`;

    return (
      <View style={styles.row}>
        <View>
          <Text style={styles.rowTitle}>{label}</Text>
          <Text style={styles.rowDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Historique Agent</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune opération.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#fca5a5" },
  empty: { color: "rgba(255,255,255,0.55)" },
  row: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTitle: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  rowDate: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 },
  rowValue: { color: GOLD, fontWeight: "900" },
});