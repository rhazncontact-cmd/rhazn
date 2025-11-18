import { useRouter } from "expo-router";
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TOP10 = [
  "Vanessalurbina","Emole Fuea","Andren Neris","TerenzoPhoto","Aïda K",
  "User007","Mika","Jill A.","Sonia D.","Aylan"
].map((u, i) => ({ id: String(i+1), user: u, qob: Math.floor(15000 - i*1100) }));

export default function Top10() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={s.h1}>Top 10 — Mérite</Text>
      <Text style={s.sub}>Classement officiel sur base QOB</Text>

      <FlatList
        data={TOP10}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item, index }) => (
          <View style={[s.card, index < 3 && { borderColor: "#FFD700" }]}>
            <Text style={[s.badge, index===0 && s.gold, index===1 && s.silver, index===2 && s.bronze]}>{index+1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.user}>{item.user}</Text>
              <Text style={s.meta}>Mérite – Cycle en cours</Text>
            </View>
            <Text style={s.qob}>{item.qob.toLocaleString("fr-FR")} QOB</Text>
          </View>
        )}
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
  sub: { color: "#888", marginBottom: 14 },
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  badge: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#111", borderWidth: 1, borderColor: "#333", textAlign: "center", textAlignVertical: "center", color: "#fff", fontWeight: "900" },
  gold: { backgroundColor: "#1a1400", color: "#FFD700", borderColor: "#FACC15" },
  silver: { backgroundColor: "#161616", color: "#d1d5db", borderColor: "#525252" },
  bronze: { backgroundColor: "#1a120c", color: "#f59e0b", borderColor: "#92400e" },
  user: { color: "#fff", fontWeight: "700" },
  meta: { color: "#888", fontSize: 11, marginTop: 2 },
  qob: { color: "#FACC15", fontWeight: "800" },
  btn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#1f2937", borderWidth: 1, borderColor: "#333", alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
