// app/rz-admin-agents-dashboard.tsx

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
import { supabase } from "../lib/supabase";
import AdminGuard from "./components/AdminGuard";

const GOLD = "#D4AF37";

type AgentRow = {
  id: string;
  uid: string;
  code: string;
  city: string | null;
  status: string;
  created_at: string;
  stats?: {
    total_acset_sold: number;
    total_tan_received: number;
    clients_served: number;
    last_activity_at: string | null;
  };
};

export default function AdminAgentsDashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: agData } = await supabase
        .from("agents")
        .select("id, uid, code, city, status, created_at")
        .order("created_at", { ascending: false });

      let rows: AgentRow[] = (agData as any[]) || [];

      const { data: statsData } = await supabase
        .from("agents_stats")
        .select(
          "agent_uid, total_acset_sold, total_tan_received, clients_served, last_activity_at"
        );

      const statsByUid: Record<string, any> = {};
      (statsData || []).forEach((s: any) => {
        statsByUid[s.agent_uid] = s;
      });

      rows = rows.map((a) => ({
        ...a,
        stats: statsByUid[a.uid] || {
          total_acset_sold: 0,
          total_tan_received: 0,
          clients_served: 0,
          last_activity_at: null,
        },
      }));

      setAgents(rows);
      setLoading(false);
    };

    load();
  }, []);

  const toggleStatus = async (agent: AgentRow) => {
    const next =
      agent.status === "ACTIVE"
        ? "INACTIVE"
        : agent.status === "INACTIVE"
        ? "SUSPENDED"
        : "ACTIVE";

    setProcessingId(agent.id);
    await supabase.from("agents").update({ status: next }).eq("id", agent.id);

    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, status: next } : a))
    );
    setProcessingId(null);
  };

  if (loading) {
    return (
      <AdminGuard>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.loadingText}>Chargement Agents...</Text>
        </View>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>
          <Text style={styles.title}>Dashboard Agents</Text>
          <TouchableOpacity onPress={() => router.push("/rz-admin-agents-codes")}>
            <MaterialIcons name="vpn-key" size={24} color={GOLD} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {agents.map((agent) => (
            <View key={agent.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.code}>{agent.code}</Text>
                  {agent.city && (
                    <Text style={styles.city}>{agent.city}</Text>
                  )}
                  <Text style={styles.date}>
                    Créé le{" "}
                    {new Date(agent.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.status,
                      agent.status === "ACTIVE"
                        ? styles.statusActive
                        : agent.status === "INACTIVE"
                        ? styles.statusInactive
                        : styles.statusSuspended,
                    ]}
                  >
                    {agent.status}
                  </Text>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => toggleStatus(agent)}
                    disabled={processingId === agent.id}
                  >
                    {processingId === agent.id ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.smallBtnText}>Changer statut</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* STATS */}
              {agent.stats && (
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>ACSET vendus</Text>
                    <Text style={styles.statValue}>
                      {agent.stats.total_acset_sold}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>TAN reçus</Text>
                    <Text style={styles.statValue}>
                      {agent.stats.total_tan_received}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Clients</Text>
                    <Text style={styles.statValue}>
                      {agent.stats.clients_served}
                    </Text>
                  </View>
                </View>
              )}

              {agent.stats?.last_activity_at && (
                <Text style={styles.lastActivity}>
                  Dernière activité :{" "}
                  {new Date(
                    agent.stats.last_activity_at
                  ).toLocaleString()}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: GOLD, marginTop: 10 },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  code: { color: GOLD, fontSize: 18, fontWeight: "900" },
  city: { color: "#ccc", fontSize: 13 },
  date: { color: "#777", fontSize: 11, marginTop: 2 },

  status: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: "center",
    marginBottom: 6,
  },
  statusActive: { backgroundColor: "#14532d", color: "#bbf7d0" },
  statusInactive: { backgroundColor: "#3f3f46", color: "#e5e7eb" },
  statusSuspended: { backgroundColor: "#7f1d1d", color: "#fecaca" },

  smallBtn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallBtnText: { color: "#000", fontSize: 11, fontWeight: "800" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statBox: { flex: 1, alignItems: "center" },
  statLabel: { color: "#aaa", fontSize: 11 },
  statValue: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 2 },

  lastActivity: { color: "#888", fontSize: 11, marginTop: 8 },
});
