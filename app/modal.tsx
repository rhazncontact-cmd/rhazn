import { useRouter } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fenêtre Modale</Text>
      <Text style={styles.text}>Ceci est un modal RHAZN simplifié.</Text>

      <Button title="Fermer" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  text: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
});
