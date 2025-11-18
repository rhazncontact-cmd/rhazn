import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Animated, Easing, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ResetCycle() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const pulse = useRef(new Animated.Value(0)).current;

  const run = () => {
    if (confirm !== "RESET") return Alert.alert("Confirmation requise", 'Tapez "RESET" pour confirmer.');
    Alert.alert("Cycle réinitialisé", "Classements & compteurs remis à zéro ✅");
    setConfirm("");
  };

  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ])
  ).start();

  const border = pulse.interpolate({ inputRange: [0, 1], outputRange: ["#333", "#ef4444"] });

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Text style={s.h1}>Réinitialisation du Cycle</Text>
      <Text style={s.sub}>Action critique — sauvegardez avant d’exécuter</Text>

      <Animated.View style={[s.card, { borderColor: border }]}>
        <Text style={s.warn}>⚠️ Cette action remettra à zéro :</Text>
        <Text style={s.li}>• Classement QOB</Text>
        <Text style={s.li}>• Top 10 & prix courants</Text>
        <Text style={s.li}>• Compteurs TAN/QOB du cycle</Text>

        <Text style={[s.lbl, { marginTop: 14 }]}>Confirmer en tapant : <Text style={{ color: "#ef4444", fontWeight: "900" }}>RESET</Text></Text>
        <TextInput value={confirm} onChangeText={setConfirm} placeholder="RESET" placeholderTextColor="#777" style={s.input} autoCapitalize="characters" />
      </Animated.View>

      <View style={s.row}>
        <TouchableOpacity onPress={() => router.back()} style={[s.btn, { backgroundColor: "#1f2937", borderColor: "#333" }]}>
          <Text style={s.btnTxt}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={run} style={[s.btn, { backgroundColor: "#ef4444" }]}>
          <Text style={s.btnTxt}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 70, paddingHorizontal: 18 },
  h1: { color: "#FFD700", fontSize: 22, fontWeight: "800" },
  sub: { color: "#888", marginBottom: 16 },
  card: { backgroundColor: "#0b0b0b", borderWidth: 1, borderColor: "#ef4444", borderRadius: 14, padding: 16 },
  warn: { color: "#fca5a5", fontWeight: "800", marginBottom: 8 },
  li: { color: "#ddd", marginTop: 4 },
  lbl: { color: "#cbd5e1", marginTop: 8 },
  input: { backgroundColor: "#0f0f0f", borderWidth: 1, borderColor: "#222", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", marginTop: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  btnTxt: { color: "#fff", fontWeight: "800" },
});
