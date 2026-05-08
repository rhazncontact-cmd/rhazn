import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface Agent {
  id: string;
  name: string;
  phone: string;
  zone: string;
  qr: string;
}

function AgentCard({ agent, onPress }: { agent: Agent; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={styles.qrBox}>
          <Image source={{ uri: agent.qr }} style={styles.qr} />
        </View>

        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{agent.name}</Text>
          <Text style={styles.sub}>📞 {agent.phone}</Text>
          <Text style={styles.sub}>📍 {agent.zone}</Text>
          <Text style={styles.id}>ID: {agent.id}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default AgentCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },
  qrBox: {
    backgroundColor: "#000",
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  qr: { width: 50, height: 50, borderRadius: 8 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sub: { color: "#aaa", fontSize: 12 },
  id: { marginTop: 4, color: "#FFD700", fontSize: 11 },
});
