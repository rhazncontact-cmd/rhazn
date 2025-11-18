import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AgentCard, { Agent } from "./components/AgentCard";

// ====== Données locales (mock) ======
const AGENTS: Agent[] = [
  { id: "RZ-AG-0021", name: "Agent BA", phone: "+50937000001", zone: "Pétion-Ville" },
  { id: "RZ-AG-0034", name: "Agent Doc", phone: "+50937000002", zone: "Delmas" },
  { id: "RZ-AG-0099", name: "Agent Nel", phone: "+50937000003", zone: "Carrefour" },
  { id: "RZ-AG-0102", name: "Agent Sinsin", phone: "+50937000004", zone: "Tabarre" },
];

export default function AgentsScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [qrAgent, setQrAgent] = useState<Agent | null>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return AGENTS;
    return AGENTS.filter(a =>
      a.name.toLowerCase().includes(t) ||
      a.id.toLowerCase().includes(t) ||
      a.zone.toLowerCase().includes(t)
    );
  }, [q]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trouver Agent RZ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Nom, ID ou zone…"
          placeholderTextColor="#777"
          style={styles.input}
        />

        <Text style={styles.count}>{results.length} agent(s)</Text>

        <View style={{ marginTop: 10 }}>
          {results.map((a) => (
            <AgentCard key={a.id} agent={a} onPressQR={setQrAgent} />
          ))}
        </View>
      </ScrollView>

      {/* Modal QR Placeholder */}
      <Modal visible={!!qrAgent} transparent animationType="fade" onRequestClose={() => setQrAgent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.qrTitle}>QR — {qrAgent?.name}</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={{ color: "#fff" }}>{qrAgent?.id}</Text>
            </View>
            <TouchableOpacity onPress={() => setQrAgent(null)} style={styles.closeBtn}>
              <Text style={{ textAlign: "center", fontWeight: "800" }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: "#1b1b1b",
  },
  headerTitle: { color: "#D4AF37", fontSize: 18, fontWeight: "700" },
  input: {
    color: "#fff", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#222",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
  },
  count: { color: "#888", marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  modalBox: { width: "84%", backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 12, padding: 16 },
  qrTitle: { color: "#fff", fontWeight: "800", textAlign: "center", marginBottom: 10 },
  qrPlaceholder: {
    height: 180, borderWidth: 1, borderColor: "#333", borderStyle: "dashed",
    borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  closeBtn: { backgroundColor: "#FFBC7E", borderRadius: 10, paddingVertical: 12 },
});
