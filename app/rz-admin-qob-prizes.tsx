import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function PrizesCIR() {
  const router = useRouter();
  const [winner, setWinner] = useState("Vanessalurbina");
  const [cir, setCir] = useState(true);

  const save = () => Alert.alert("Enregistré", "Prix d'Honneur & CIR mis à jour ✅");

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={s.h1}>Prix d’Honneur & CIR</Text>
      <Text style={s.sub}>Attribution officielle du cycle</Text>

      <View style={s.card}>
        <Text style={s.lbl}>Lauréat Prix d’Honneur</Text>
        <TextInput style={s.input} value={winner} onChangeText={setWinner} placeholder="Utilisateur" placeholderTextColor="#777" />
        <Text style={[s.lbl, { marginTop: 14 }]}>CIR (Créateur Inspirant du Raisin)</Text>
        <View style={s.row}>
          <Text style={{ color: "#fff" }}>{cir ? "Activé" : "Désactivé"}</Text>
          <Switch value={cir} onValueChange={setCir} thumbColor={cir ? "#FACC15" : "#555"} trackColor={{ true: "#3f3f46", false: "#27272a" }} />
        </View>
      </View>

      <View style={s.row}>
        <TouchableOpacity onPress={() => router.back()} style={[s.btn, { backgroundColor: "#1f2937", borderColor: "#333" }]}>
          <Text style={s.btnTxt}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} style={[s.btn, { backgroundColor: "#22c55e" }]}>
          <Text style={[s.btnTxt, { color: "#000" }]}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 70, paddingHorizontal: 18 },
  h1: { color: "#FFD700", fontSize: 22, fontWeight: "800" },
  sub: { color: "#888", marginBottom: 16 },
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#222", borderRadius: 14, padding: 16 },
  lbl: { color: "#C7C7C7", marginBottom: 6 },
  input: { backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#222", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", marginTop: 16 },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
