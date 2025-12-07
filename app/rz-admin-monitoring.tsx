// app/rz-admin-monitoring.tsx

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
import { supabase } from "../lib/supabase";
import AdminGuard from "./components/AdminGuard";

const GOLD = "#D4AF37";

type AgentWallet = {
  agent_uid: string;
  tan: number;
  acset: number;
};

export default function AdminMonitoring() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalAgents, setTotalAgents] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [totalTan, setTotalTan] = useState(0);
  const [totalAcset, setTotalAcset] = useState(0);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      setLoading(true);

      const { data: agentsData } = await supabase
        .from("agents")
        .select("id, status");

      const total = agentsData?.length || 0;
      const active =
        agentsData?.filter((a: any) => a.status === "ACTIVE").length || 0;

      setTotalAgents(total);
      setActiveAgents(active);

      const { data: walletsData } = await supabase
        .from("agents_wallet")
        .select("agent_uid, tan, acset");

      let tanSum = 0;
      let acsetSum = 0;

      (walletsData as AgentWallet[] | null)?.forEach((w) => {
        tanSum += w.tan ?? 0;
        acsetSum += w.acset ?? 0;
      });

      setTotalTan(tanSum);
      setTotalAcset(acsetSum);

      setLoading(false);

      // Realtime sur wallets
      channel = supabase
        .channel("admin-monitoring-wallets")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agents_wallet" },
          () => load() // reload on change
        )
        .subscribe();
    };

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <AdminGuard>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.loadingText}>Analyse de l’écosystème...</Text>
        </View>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Feather
            name="chevron-left"
            size={28}
            color={GOLD}
            onPress={() => router.back()}
          />
          <Text style={styles.title}>Monitoring RZ-Agent</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KpiCard label="Agents total" value={totalAgents.toString()} />
            <KpiCard
              label="Agents actifs"
              value={activeAgents.toString()}
              accent
            />
          </View>

          <View style={styles.kpiRow}>
            <KpiCard label="TAN en circulation Agents" value={totalTan.toString()} />
            <KpiCard
              label="ACSET détenus Agents"
              value={totalAcset.toString()}
            />
          </View>

          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.noteText}>
            • Les montants TAN et ACSET reflètent les soldes actuels des wallets
            Agents.{"\n\n"}
            • Le monitoring temps réel est basé sur les mises à jour de la table
            <Text style={{ color: GOLD }}> agents_wallet</Text>.{"\n\n"}
            • Tu peux enrichir ce screen avec des graphiques (Recharts,
            Victory Native, etc.) dès que tu auras stabilisé les volumes.
          </Text>
        </ScrollView>
      </View>
    </AdminGuard>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.kpiCard, accent && styles.kpiAccent]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
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

  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },
  kpiAccent: {
    borderColor: GOLD,
  },
  kpiLabel: { color: "#aaa", fontSize: 12, marginBottom: 6 },
  kpiValue: { color: "#fff", fontSize: 20, fontWeight: "900" },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 8,
  },
  noteText: { color: "#aaa", fontSize: 13, lineHeight: 20 },
});
