import { Text, View } from "react-native";
import { auth } from "../firebase";

export default function TestFirebase() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <Text style={{ color: "#FFD700", fontSize: 20, fontWeight: "600" }}>
        Firebase Test
      </Text>

      <Text style={{ color: "#fff", marginTop: 20 }}>
        Auth: {auth ? "OK ✔" : "ERREUR ❌"}
      </Text>
    </View>
  );
}
