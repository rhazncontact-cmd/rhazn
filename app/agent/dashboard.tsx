// app/agent/dashboard.tsx
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

/* 🍎 RHAZN */
const GOLD = "#D4AF37";

type Stats = {
  pending: number;
  approved: number;
  rejected: number;
  total_tan_handled: number;
  agent_commission: number;
};

type RequestRow = {
  id: string;
  user_id: string;
  amount_tan: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  note: string | null;
};

export default function AgentDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DASHBOARD ================= */
  const loadDashboard = async () => {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setLoading(false);
      return;
    }

    const agentId = auth.user.id;

    /* 1️⃣ Stats Agent */
    const { data: statData } = await supabase.rpc(
      "agent_dashboard_stats"
    );

    if (statData) {
      setStats(statData as Stats);
    }

    /* 2️⃣ Demandes TAN en attente (ACHAT TAN) */
    const { data } = await supabase
      .from("user_tan_purchase_requests")
      .select("id, user_id, amount_tan, status, created_at, note")
      .eq("agent_id", agentId)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setRequests(data as RequestRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ================= UI ================= */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Agent</Text>
        <Text style={styles.sub}>
          Gestion des demandes d’achat TAN
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* STATS */}
          {stats && (
            <View style={styles.statsGrid}>
              <StatCard label="En attente" value={stats.pending} color={GOLD} />
              <StatCard label="Approuvés" value={stats.approved} color="#00FF6A" />
              <StatCard label="Rejetés" value={stats.rejected} color="#FF453A" />
              <StatCard
                label="TAN traités"
                value={stats.total_tan_handled}
                color="#FFF"
              />
              <StatCard
                label="Commission Agent"
                value={stats.agent_commission}
                color={GOLD}
                suffix=" TAN"
              />
            </View>
          )}

          {/* REQUESTS */}
          <Text style={styles.sectionTitle}>Demandes en attente</Text>

          {requests.length === 0 ? (
            <Text style={styles.empty}>
              Aucune demande en attente.
            </Text>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <Text style={styles.amount}>{r.amount_tan} TAN</Text>
                  <Text style={styles.pending}>EN ATTENTE</Text>
                </View>

                {r.note && <Text style={styles.note}>{r.note}</Text>}

                <Text style={styles.date}>
                  {new Date(r.created_at).toLocaleString()}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/agent/approve-request",
                        params: { request_id: r.id },
                      })
                    }
                  >
                    <Feather name="check" size={14} color="#000" />
                    <Text style={styles.approveText}>Approuver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() =>
                      router.push({
                        pathname: "/agent/reject-request",
                        params: { request_id: r.id },
                      })
                    }
                  >
                    <Feather name="x" size={14} color="#FFF" />
                    <Text style={styles.rejectText}>Rejeter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ================= COMPONENTS ================= */
function StatCard({
  label,
  value,
  color,
  suffix = "",
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {value}
        {suffix}
      </Text>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 56,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
  },
  sub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionTitle: {
    marginTop: 20,
    marginHorizontal: 16,
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },
  empty: {
    marginTop: 12,
    marginHorizontal: 16,
    color: "rgba(255,255,255,0.5)",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },
  pending: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 12,
  },
  note: {
    marginTop: 6,
    color: "rgba(255,255,255,0.7)",
  },
  date: {
    marginTop: 6,
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  approveText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 12,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "rgba(255,69,58,0.85)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  rejectText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 12,
  },
});
