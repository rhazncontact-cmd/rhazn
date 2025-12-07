// app/rz-admin/agents-monitoring.tsx
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

import AdminGuard from "../components/AdminGuard";

const GOLD = "#D4AF37";

export default function AgentsMonitoring() {
  const router = useRouter();

  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"acset" | "tan" | "activity">("acset");

  // ------------------------------------------------------------------
  // 🔥 CHARGER MONITORING GLOBAL
  // ------------------------------------------------------------------
  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("agents")
      .select(
        `
        uid:id,
        full_name,
        is_active,
        updated_at,
        wallet:agents_wallet (acset, tan),
        stats:agents_stats (total_sold_acset, total_bought_acset, operations_count)
      `
      )
      .order("updated_at", { ascending: false });

    if (!error) setAgents(data);
    setLoading(false);
  };

  // ------------------------------------------------------------------
  // 🔥 REALTIME — Agents + wallets + transactions
  // ------------------------------------------------------------------
  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-agent-monitor")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agents_wallet",
        },
        load
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agents_transactions",
        },
        load
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agents",
        },
        load
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ------------------------------------------------------------------
  // 🔥 TRI INTELLIGENT
  // ------------------------------------------------------------------
  const sortAgents = (list: any[]) => {
    if (sortMode === "acset")
      return [...list].sort(
        (a, b) =>
          (b.wallet?.acset ?? 0) + (b.stats?.total_sold_acset ?? 0) -
          ((a.wallet?.acset ?? 0) + (a.stats?.total_sold_acset ?? 0))
      );

    if (sortMode === "tan")
      return [...list].sort(
        (a, b) => (b.wallet?.tan ?? 0) - (a.wallet?.tan ?? 0)
      );

    if (sortMode === "activity")
      return [...list].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime()
      );

    return list;
  };

  const sortedList = sortAgents(agents);

  // ------------------------------------------------------------------
  // 🔥 RENDU D’UNE CARTE AGENT
  // ------------------------------------------------------------------
  const renderAgent = ({ item }: any) => {
    const acset = item.wallet?.acset ?? 0;
    const tan = item.wallet?.tan ?? 0;
    const totalSold = item.stats?.total_sold_acset ?? 0;
    const ops = item.stats?.operations_count ?? 0;

    const activeColor = item.is_active ? "#4ade80" : "#f87171";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/rz-admin/agent/${item.uid}`)}
      >
        {/* HEADER */}
        <View style={styles.cardHeader}>
          <Text style={styles.agentName}>{item.full_name}</Text>
          <MaterialIcons name="circle" size={14} color={activeColor} />
        </View>

        {/* SOLDE */}
        <Text style={styles.label}>Solde actuel</Text>
        <Text style={styles.solde}>
          {acset} ACSET · {tan} TAN
        </Text>

        {/* VENTES / OPERATIONS */}
        <View style={styles.row}>
          <Text style={styles.statBox}>
            🟡 Vendu : <Text style={styles.bold}>{totalSold} ACSET</Text>
          </Text>
          <Text style={styles.statBox}>
            🔧 Opérations : <Text style={styles.bold}>{ops}</Text>
          </Text>
        </View>

        {/* TIMESTAMP */}
        <Text style={styles.timestamp}>
          Dernière activité :{" "}
          {new Date(item.updated_at).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  // ------------------------------------------------------------------
  // 🌕 UI
  // ------------------------------------------------------------------
  return (
    <AdminGuard>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Monitoring Agents</Text>

          <TouchableOpacity onPress={load}>
            <Feather name="refresh-ccw" size={24} color={GOLD} />
          </TouchableOpacity>
        </View>

        {/* MODE DE TRI */}
        <View style={styles.sortRow}>
          <TouchableOpacity onPress={() => setSortMode("acset")}>
            <Text
              style={[
                styles.sortBtn,
                sortMode === "acset" && styles.sortActive,
              ]}
            >
              ACSET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSortMode("tan")}>
            <Text
              style={[
                styles.sortBtn,
                sortMode === "tan" && styles.sortActive,
              ]}
            >
              TAN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSortMode("activity")}>
            <Text
              style={[
                styles.sortBtn,
                sortMode === "activity" && styles.sortActive,
              ]}
            >
              Activité
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTE */}
        {loading ? (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={sortedList}
            keyExtractor={(item) => item.uid}
            renderItem={renderAgent}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
    </AdminGuard>
  );
}

// ------------------------------------------------------------------
// 🎨 STYLE PREMIUM RHAZN
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  sortRow: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 16,
    marginBottom: 12,
  },

  sortBtn: {
    color: "#777",
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },

  sortActive: {
    color: GOLD,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
  },

  card: {
    backgroundColor: "#111",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  agentName: { color: "#fff", fontSize: 17, fontWeight: "700" },

  label: { color: "#888", fontSize: 12 },
  solde: { color: GOLD, fontSize: 18, marginBottom: 10 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statBox: { color: "#ccc", fontSize: 13 },
  bold: { fontWeight: "700", color: "#fff" },

  timestamp: { color: "#666", fontSize: 11 },
});
