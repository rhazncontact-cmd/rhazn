import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Row = { id: string; user: string; reported: number; reason?: string };

const PENDING: Row[] = [
  { id: "r1", user: "User445", reported: 320, reason: "Pics suspects de QOB (bots?)" },
  { id: "r2", user: "User999", reported: 190, reason: "Anomalies de pics nocturnes" },
];

export default function ValidateQOB() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(PENDING);

  const approve = (id: string) => {
    setRows((r) => r.filter(x => x.id !== id));
    Alert.alert("Validé", "Scores QOB validés ✅");
  };
  const reject = (id: string) => {
    setRows((r) => r.filter(x => x.id !== id));
    Alert.alert("Rejeté", "Signalement confirmé — QOB ajusté ❌");
  };

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={s.h1}>Validation QOB & Scores</Text>
      <Text style={s.sub}>Vérifier les anomalies signalées</Text>

      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.user}>{item.user}</Text>
              <Text style={s.meta}>Signalements: {item.reported}</Text>
              {!!item.reason && <Text style={s.reason}>🔎 {item.reason}</Text>}
            </View>
            <View style={s.actions}>
              <TouchableOpacity onPress={() => approve(item.id)} style={[s.smallBtn, { backgroundColor: "#22c55e" }]}>
                <Text style={[s.smallTxt, { color: "#000" }]}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => reject(item.id)} style={[s.smallBtn, { backgroundColor: "#ef4444" }]}>
                <Text style={s.smallTxt}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>✅ Aucun élément en attente</Text>}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      <TouchableOpacity onPress={() => router.back()} style={s.btn}>
        <Text style={s.btnTxt}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 70, paddingHorizontal: 18 },
  h1: { color: "#FFD700", fontSize: 22, fontWeight: "800" },
  sub: { color: "#888", marginBottom: 12 },
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 14, flexDirection: "row", gap: 12, marginBottom: 10 },
  user: { color: "#fff", fontWeight: "800" },
  meta: { color: "#aaa", marginTop: 2 },
  reason: { color: "#cbd5e1", fontSize: 12, marginTop: 6 },
  actions: { justifyContent: "center", gap: 8 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  smallTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  empty: { color: "#22c55e", textAlign: "center", marginTop: 30, fontWeight: "700" },
  btn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#1f2937", borderWidth: 1, borderColor: "#333", alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
