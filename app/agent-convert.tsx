// app/agent-convert.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AgentGuard from "./components/AgentGuard";
import { convertTanToAcset } from "./services/agentService";

export default function AgentConvert() {
  const router = useRouter();
  const [tan, setTan] = useState<string>("");
  const [rate, setRate] = useState<string>("0.02"); // exemple: 1 TAN = 0.02 ACSET

  const onSubmit = async () => {
    try {
      const tanAmount = Number(tan);
      const r = Number(rate);
      const res = await convertTanToAcset({ tanAmount, rate: r });
      Alert.alert("Conversion réussie", res.message);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d’effectuer la conversion");
    }
  };

  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Convertir TAN → ACSET</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close-circle" size={36} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Montant en TAN</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="ex: 1000"
            placeholderTextColor="#666"
            value={tan}
            onChangeText={setTan}
            style={styles.input}
          />

          <Text style={styles.label}>Taux (ACSET / TAN)</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="ex: 0.02"
            placeholderTextColor="#666"
            value={rate}
            onChangeText={setRate}
            style={styles.input}
          />

          <TouchableOpacity onPress={onSubmit} style={styles.cta}>
            <Text style={styles.ctaText}>Convertir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AgentGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: { paddingTop: 60, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#D4AF37", fontSize: 20, fontWeight: "800" },
  card: { marginTop: 10, backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#222", borderRadius: 12, padding: 16 },
  label: { color: "#bbb", marginTop: 10, marginBottom: 6 },
  input: { color: "#fff", backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 10, padding: 12 },
  cta: { marginTop: 16, backgroundColor: "#FFD700", paddingVertical: 12, borderRadius: 10 },
  ctaText: { fontWeight: "800", textAlign: "center" },
});
