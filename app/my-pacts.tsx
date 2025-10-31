import { StyleSheet, Text, View } from "react-native";

export default function MyPactsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mes créations PACT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  text: { color: "#D4AF37", fontSize: 18, fontWeight: "600" },
});
