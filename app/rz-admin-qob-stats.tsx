import { useRouter } from "expo-router";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function EngagementStats() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={s.h1}>Statistiques d’Engagement</Text>
      <Text style={s.sub}>TAN, vues, QOB — cycle courant</Text>

      {/* Cards */}
      <View style={s.grid}>
        <StatCard title="Vues Totales" value="45.2K" accent="#3b82f6" />
        <StatCard title="TAN Générés" value="2.8M" accent="#f59e0b" />
        <StatCard title="Moy. QOB / PACT" value="432" accent="#22c55e" />
        <StatCard title="Taux d’achèvement" value="84%" accent="#a78bfa" />
      </View>

      {/* Fake bar chart */}
      <View style={s.chart}>
        <Text style={s.chartTitle}>Vidéos publiées / jour</Text>
        <View style={s.bars}>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((d, i) => {
            const heights = [80, 65, 90, 75, 100, 55, 45];
            return (
              <View key={d} style={{ alignItems: "center", width: 28 }}>
                <View style={[s.bar, { height: heights[i]*1.2 }]} />
                <Text style={s.dLabel}>{d}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <TouchableOpacity onPress={() => router.back()} style={s.btn}>
        <Text style={s.btnTxt}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <View style={sc.card}>
      <View style={[sc.top, { backgroundColor: accent }]} />
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.title}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 70, paddingHorizontal: 18 },
  h1: { color: "#FFD700", fontSize: 22, fontWeight: "800" },
  sub: { color: "#888", marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  chart: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 16, marginTop: 16 },
  chartTitle: { color: "#fff", fontWeight: "700", marginBottom: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingVertical: 8 },
  bar: { width: 20, backgroundColor: "#FFD700", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  dLabel: { color: "#888", fontSize: 11, marginTop: 6 },
  btn: { marginTop: 12, paddingVertical: 14, borderRadius: 12, backgroundColor: "#1f2937", borderWidth: 1, borderColor: "#333", alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
});

const sc = StyleSheet.create({
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 16, width: "48%", marginBottom: 12 },
  top: { height: 3, borderRadius: 6, marginBottom: 10 },
  value: { color: "#fff", fontSize: 20, fontWeight: "800" },
  title: { color: "#888", fontSize: 12, marginTop: 4, textTransform: "uppercase" },
});
