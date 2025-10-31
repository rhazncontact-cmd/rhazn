import { StyleSheet, Text, View } from "react-native";

export default function ChannelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chaîne RHAZN</Text>
      <Text style={styles.subtitle}>Mode sanctuaire — accès réservé</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  title: { color: "#D4AF37", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#aaa", fontSize: 14, marginTop: 4 }
});
