// app/rz-agent-dashboard.tsx
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AgentGuard from "./components/AgentGuard";

export default function AgentDashboard() {
  const router = useRouter();

  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Agent RZ — Tableau de Bord</Text>

          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-circle" size={38} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          <Text style={styles.sectionTitle}>Opérations</Text>

          <View style={styles.grid}>
            <Tile
              title="Convertir TAN → ACSET"
              icon={<MaterialIcons name="swap-horiz" size={28} color="#FFD700" />}
              onPress={() => router.push("/agent-convert")}
            />
            <Tile
              title="Retraits Utilisateurs"
              icon={<MaterialIcons name="payment" size={28} color="#4ade80" />}
              onPress={() => router.push("/agent-withdrawals")}
            />
            <Tile
              title="Acheter ACSET (Admin)"
              icon={<MaterialIcons name="shopping-cart" size={28} color="#FFBC7E" />}
              onPress={() => router.push("/agent-buy-acset")}
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Rappels</Text>
          <View style={styles.card}>
            <Text style={styles.note}>
              • Un Agent ne peut pas partager TAN ni publier de PACT.{"\n"}
              • Les conversions TAN→ACSET et achats ACSET doivent suivre les taux officiels.{"\n"}
              • Les retraits utilisateurs nécessitent une vérification d’identité conforme à RHAZN.
            </Text>
          </View>
        </ScrollView>
      </View>
    </AgentGuard>
  );
}

function Tile({ title, icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tile}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: { paddingTop: 60, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#D4AF37", fontSize: 20, fontWeight: "800" },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", backgroundColor: "#111", paddingVertical: 18, marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  iconWrap: { backgroundColor: "#222", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#333" },
  tileText: { color: "#fff", fontSize: 13, textAlign:"center" },
  card: { backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#222", borderRadius: 12, padding: 14 },
  note: { color: "#bbb", lineHeight: 20 },
});
