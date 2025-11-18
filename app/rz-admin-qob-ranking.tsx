import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, PanResponder, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Item = { id: string; user: string; qob: number; cir?: boolean };

const MOCK: Item[] = [
  { id: "1", user: "Vanessalurbina", qob: 12540, cir: true },
  { id: "2", user: "Emole Fuea", qob: 9820 },
  { id: "3", user: "Andren Neris", qob: 7240 },
  { id: "4", user: "TerenzoPhoto", qob: 5400 },
  { id: "5", user: "Aïda K", qob: 5190 },
  { id: "6", user: "User007", qob: 4980 },
];

export default function QOBRanking() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Item[]>(MOCK);

  useEffect(() => setData(MOCK.filter(i => i.user.toLowerCase().includes(query.toLowerCase()))), [query]);

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => { if (g.dx < -70) router.back(); },
  });

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ])).start();
  }, []);
  const line = glow.interpolate({ inputRange: [0, 1], outputRange: ["#444", "#FFD700"] });

  return (
    <View style={st.root} {...pan.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={st.h1}>Classement QOB</Text>
      <Animated.View style={[st.line, { backgroundColor: line }]} />
      <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un créateur…" placeholderTextColor="#777" style={st.input} />

      <FlatList
        data={data.sort((a, b) => b.qob - a.qob)}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item, index }) => (
          <View style={st.card}>
            <Text style={st.rank}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{item.user} {item.cir && <Text style={{ color: "#22c55e" }}>• CIR</Text>}</Text>
              <Text style={st.meta}>QOB total</Text>
            </View>
            <Text style={st.qob}>{item.qob.toLocaleString("fr-FR")} QOB</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={st.empty}>Aucun résultat</Text>}
      />

      <View style={st.actions}>
        <TouchableOpacity style={[st.btn, { backgroundColor: "#1f2937", borderColor: "#333" }]} onPress={() => router.back()}>
          <Text style={st.btnTxt}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.btn, { backgroundColor: "#FACC15" }]} onPress={() => router.push("/rz-admin-qob-top10")}>
          <Text style={[st.btnTxt, { color: "#000" }]}>Voir Top 10</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 70, paddingHorizontal: 18 },
  h1: { color: "#FFD700", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  line: { height: 2, width: "48%", borderRadius: 8, marginBottom: 16 },
  input: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", marginBottom: 12 },
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  rank: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#111", borderWidth: 1, borderColor: "#333", textAlign: "center", textAlignVertical: "center", color: "#FFD700", fontWeight: "800" },
  name: { color: "#fff", fontWeight: "700" },
  meta: { color: "#888", fontSize: 11, marginTop: 2 },
  qob: { color: "#FACC15", fontWeight: "800" },
  empty: { color: "#666", textAlign: "center", marginTop: 40 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 14 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
