import { useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import AdminGuard from "../../components/admin/AdminGuard";
import { financeApi } from "../../lib/finance/mockApi";
import { FinanceStats } from "../../lib/finance/types";

export default function RZAdminFinanceStats() {
  const [data, setData] = useState<FinanceStats | null>(null);
  useEffect(() => { (async () => setData(await financeApi.getStats()))() }, []);

  return (
    <AdminGuard>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.container}>
        
        <Text style={styles.title}>Statistiques du Système Interne</Text>

        {!data ? (
          <Text style={{ color: "#aaa", marginLeft: 18 }}>Chargement…</Text>
        ) : (
          <View style={{ padding: 18, gap: 14 }}>
            
            <Kpi 
              label="ACSET en circulation" 
              value={`${data.totalAcsetInCirculation.toLocaleString()} ACSET`} 
              delta={data.variation.acset} 
            />

            <Kpi 
              label="TAN convertis en interne" 
              value={`${data.totalTanConverted.toLocaleString()} TAN`} 
              delta={data.variation.tan} 
            />

            <Kpi 
              label="Ajustements TAN internes (ED)" 
              value={`${data.totalWithdrawRequests.toLocaleString()}`} 
              delta={data.variation.withdraws} 
            />

            <Kpi 
              label="Frais système (ACSET internes)" 
              value={`${data.systemFeesAcset.toLocaleString()} ACSET`} 
              delta={data.variation.fees} 
            />

            {/* Mini-chart (doctrinal : ajustements TAN internes, pas retraits externes) */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Ajustements TAN / 7 jours</Text>
              <View style={styles.barRow}>
                {[42, 38, 50, 47, 60, 33, 28].map((v, i) => (
                  <View key={i} style={[styles.bar, { height: 4 + v, flex: 1 }]} />
                ))}
              </View>
            </View>

          </View>
        )}

      </View>
    </AdminGuard>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: number }) {
  const color = delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#a1a1a1";
  const sign = delta > 0 ? "▲" : delta < 0 ? "▼" : "•";

  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={{ color }}>{sign} {Math.round(delta * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 70 },
  title: { color: "#FFD700", fontSize: 20, fontWeight: "700", marginLeft: 18, marginBottom: 10 },

  kpi: { backgroundColor: "#0B0B0B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#222" },
  kpiLabel: { color: "#a1a1a1", fontSize: 12, marginBottom: 6 },
  kpiValue: { color: "#fff", fontSize: 18, fontWeight: "800" },

  chartCard: { backgroundColor: "#0B0B0B", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#222" },
  chartTitle: { color: "#fff", fontWeight: "700", marginBottom: 10 },

  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 90 },
  bar: { backgroundColor: "#FFD700", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
});
