// app/agent-buy-acset.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AgentGuard from "./components/AgentGuard";
import { buyAcsetFromAdmin } from "./services/agentService";

export default function AgentBuyAcset() {
  const router = useRouter();
  const [amount, setAmount] = useState("");

  const onSubmit = async () => {
    try {
      const acsetAmount = Number(amount);
      const res = await buyAcsetFromAdmin({ acsetAmount });
      Alert.alert("Achat confirmé", res.message);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Achat impossible");
    }
  };

  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Acheter ACSET — Admin</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close-circle" size={36} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Montant ACSET</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="ex: 1000"
            placeholderTextColor="#666"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />

          <TouchableOpacity onPress={onSubmit} style={styles.cta}>
            <Text style={styles.ctaText}>Acheter</Text>
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
  cta: { marginTop: 16, backgroundColor: "#FFBC7E", paddingVertical: 12, borderRadius: 10 },
  ctaText: { fontWeight: "800", textAlign: "center" },
});
