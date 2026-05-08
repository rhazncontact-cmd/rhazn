import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

/* 🍎 RHAZN — Supreme Finance Stats (WEB + MOBILE SAFE) */

const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  text: "#FFFFFF",
  gold: "#D4AF37",
  green: "#00C853",
  red: "#E53935",
  muted: "#9A9A9A",
  border: "rgba(255,255,255,0.08)",
};

type StatRow = {
  day: string; // ex: 2026-01-02
  tan_issued: number;
  tan_consumed: number;
  tan_net: number;
};

const formatDay = (d: string) => (d?.length >= 10 ? d.slice(5) : d);

export default function SupremeStatsScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setError(null);
    const { data, error } = await supabase.rpc("get_supreme_stats", {
      p_days: 14,
    });

    if (error) {
      console.error("SUPREME STATS ERROR:", error);
      setRows([]);
      setError("Impossible de charger les statistiques.");
      return;
    }

    setRows((data as StatRow[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    })();
  }, []);

  const maxValue = useMemo(() => {
    let max = 0;
    rows.forEach((r) => {
      max = Math.max(
        max,
        Number(r.tan_issued || 0),
        Number(r.tan_consumed || 0)
      );
    });
    return max || 1;
  }, [rows]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.screen}>
        <Text style={styles.title}>Statistiques SUPREME (14 jours)</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        {rows.length === 0 ? (
          <Text style={styles.empty}>Aucune donnée disponible</Text>
        ) : (
          <>
            {/* Légende */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.green }]} />
                <Text style={styles.legendText}>TAN émis</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.red }]} />
                <Text style={styles.legendText}>TAN consommés</Text>
              </View>
            </View>

            {/* Graphique (View pur) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {rows.map((r) => {
                const issuedH = Math.max(
                  4,
                  Math.round((r.tan_issued / maxValue) * 140)
                );
                const consumedH = Math.max(
                  4,
                  Math.round((r.tan_consumed / maxValue) * 140)
                );

                return (
                  <View key={r.day} style={styles.barCard}>
                    <View style={styles.barZone}>
                      <View
                        style={[
                          styles.bar,
                          { height: issuedH, backgroundColor: COLORS.green },
                        ]}
                      />
                      <View style={{ width: 6 }} />
                      <View
                        style={[
                          styles.bar,
                          { height: consumedH, backgroundColor: COLORS.red },
                        ]}
                      />
                    </View>

                    <Text style={styles.day}>{formatDay(r.day)}</Text>
                    <Text style={styles.small}>
                      +{r.tan_issued} / -{r.tan_consumed}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Résumé */}
            <View style={styles.summary}>
              {(() => {
                const totalIssued = rows.reduce(
                  (a, r) => a + Number(r.tan_issued || 0),
                  0
                );
                const totalConsumed = rows.reduce(
                  (a, r) => a + Number(r.tan_consumed || 0),
                  0
                );
                const net = totalIssued - totalConsumed;

                return (
                  <>
                    <Text style={styles.summaryText}>
                      Total émis :{" "}
                      <Text style={{ color: COLORS.green }}>
                        +{totalIssued} TAN
                      </Text>
                    </Text>
                    <Text style={styles.summaryText}>
                      Total consommé :{" "}
                      <Text style={{ color: COLORS.red }}>
                        -{totalConsumed} TAN
                      </Text>
                    </Text>
                    <Text style={styles.summaryText}>
                      Net :{" "}
                      <Text
                        style={{
                          color: net >= 0 ? COLORS.green : COLORS.red,
                        }}
                      >
                        {net >= 0 ? "+" : ""}
                        {net} TAN
                      </Text>
                    </Text>
                  </>
                );
              })()}
            </View>
          </>
        )}
      </View>
    </AdminGuard>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  error: {
    color: COLORS.red,
    marginBottom: 10,
    fontWeight: "700",
  },
  empty: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 30,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  barCard: {
    width: 80,
    marginRight: 10,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  barZone: {
    height: 150,
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  bar: {
    width: 14,
    borderRadius: 10,
  },
  day: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  small: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  summary: {
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryText: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: 6,
  },
});
