import { StyleSheet, Text, View } from "react-native";
import AdminGuard from "../../components/AdminGuard";

export default function SupremeStatsWeb() {
  return (
    <AdminGuard>
      <View style={styles.container}>
        <Text style={styles.text}>
          Statistiques SUPREME disponibles uniquement sur mobile.
        </Text>
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#9A9A9A",
    fontSize: 14,
  },
});
