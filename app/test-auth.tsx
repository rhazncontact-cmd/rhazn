import { Text, View } from "react-native";
import { auth } from "../firebase";

export default function TestAuth() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <Text style={{ color: "white", fontSize: 18 }}>
        AUTH = {auth ? "EXISTE" : "NULL"}
      </Text>

      <Text style={{ color: "yellow", marginTop: 20 }}>
        {JSON.stringify(auth, null, 2)}
      </Text>
    </View>
  );
}
