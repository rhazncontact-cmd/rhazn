import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D4AF37";

type WalletRow = {
  agent_uid: string;
  tan: number | null;
  acset: number | null;
};

export default function FinanceStats() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalAgents, setTotalAgents] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [inactiveAgents, setInactiveAgents] = useState(0);

  const [totalTan, setTotalTan] = useState(0);
  const [totalAcset, setTotalAcset] = useState(0);

  const [txCount, setTxCount] = useState(0);
  const [txThisMonth, setTxThisMonth] = useState(0);

  const [tan30days, setTan30Days] = useState(0);
  const [acset30days, setAcset30Days] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // =========================================================
      // 1️⃣  WALLET AGENTS
      // =========================================================
      const { data: wallets, error: wErr } = await supabase
        .from("agents_wallet")
        .select("agent_uid, tan, acset");

      if (wErr) throw wErr;

      const rows = (wallets as WalletRow[]) || [];

      setTotalAgents(rows.length);

      // SUM
      let tanSum = 0;
      let acsetSum = 0;
      rows.forEach((w) => {
        tanSum += w.tan ?? 0;
        acsetSum += w.acset ?? 0;
      });

      setTotalTan(tanSum);
      setTotalAcset(acsetSum);

      // =========================================================
      // 2️⃣ AGENTS actifs / inactifs
      // =========================================================
      const { data: agentsData } = await supabase
        .from("agents")
        .select("status");

      setActiveAgents(agentsData?.filter((a) => a.status === "ACTIVE").length ?? 0);
      setInactiveAgents(agentsData?.filter((a) => a.status === "INACTIVE").length ?? 0);

      // =========================================================
      // 3️⃣  TRANSACTIONS — global count
      // =========================================================
      const { count: txTotal } = await supabase
        .from("agents_transactions")
        .select("*", { count: "exact", head: true });

      setTxCount(txTotal ?? 0);

      // =========================================================
      // 4️⃣ TRANSACTIONS — ce mois
      // =========================================================
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: txMonth } = await supabase
        .from("agents_transactions")
        .select("*", { count: "exact" })
        .gte("created_at", startOfMonth.toISOString());

      setTxThisMonth(txMonth ?? 0);

      // =========================================================
      // 5️⃣ Somme TAN & ACSET sur les 30 jours
      // =========================================================
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);

      const { data: recentTx } = await supabase
        .from("agents_transactions")
        .select("acset, tan, created_at")
        .gte("created_at", last30.toISOString());

      let ac30 = 0;
      let t30 = 0;

      recentTx?.forEach((t) => {
        ac30 += t.acset ?? 0;
        t30 += t.tan ?? 0;
      });

      setAcset30Days(ac30);
      setTan30Days(t30);

    } catch (e) {
      console.log("FINANCE_STATS_ERROR:", e);
      setError("Erreur lors du chargement des statistiques.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =====================================================
  // 🧠 Analyse automatique — Insight
  // =====================================================
  const insight = (() => {
    if (txThisMonth === 0) return "Aucune activité ce mois — calme total.";
    if (txThisMonth < 10) return "Activité faible mais stable.";
    if (txThisMonth < 40) return "Flux modéré — le système tourne bien.";
    return "🔥 Forte activité — les agents sont très actifs !";
  })();

  // =====================================================
  //   UI
  // =====================================================
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
        <Text style={styles.title}>Statistiques Financières</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.loadingText}>Calcul en cours...</Text>
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* CONTENT */}
      {!loading && !error && (
        <View style={{ marginTop: 8 }}>

          {/* ROW 1 */}
          <View style={styles.kpiRow}>
            <KPI label="Agents total" value={totalAgents} />
            <KPI label="Transactions" value={txCount} />
          </View>

          {/* ROW 2 */}
          <View style={styles.kpiRow}>
            <KPI label="Agents actifs" value={activeAgents} color="#4ade80" />
            <KPI label="Agents inactifs" value={inactiveAgents} color="#ef4444" />
          </View>

          {/* ROW 3 */}
          <View style={styles.kpiRow}>
            <KPI label="TAN cumulés" value={totalTan} />
            <KPI label="ACSET cumulés" value={totalAcset} />
          </View>

          {/* ROW 4 */}
          <View style={styles.kpiRow}>
            <KPI label="Tx ce mois" value={txThisMonth} />
            <KPI label="TAN — 30 jours" value={tan30days} />
          </View>

          {/* ROW 5 */}
          <View style={styles.kpiRow}>
            <KPI label="ACSET — 30 jours" value={acset30days} />
          </View>

          {/* INSIGHT */}
          <Text style={styles.insight}>
            {insight}
          </Text>
        </View>
      )}
    </View>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color: color || "#fff" }]}>{value}</Text>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================
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
  errorText: { color: "#ef4444", textAlign: "center", paddingHorizontal: 24 },

  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  kpiCard: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },

  kpiLabel: { color: "#9ca3af", fontSize: 12 },
  kpiValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },

  insight: {
    marginTop: 26,
    textAlign: "center",
    color: GOLD,
    fontSize: 14,
    fontStyle: "italic",
  },
});
