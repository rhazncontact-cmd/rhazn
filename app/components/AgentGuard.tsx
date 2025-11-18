// app/components/AgentGuard.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useUser } from "../../context/UserContext";

export default function AgentGuard({ children }) {
  const router = useRouter();
  const { user } = useUser();

  // If no user OR user isn't agent, redirect
  useEffect(() => {
    if (!user || user.role !== "agent") {
      router.replace("/auth/login");
    }
  }, [user]);

  if (!user || user.role !== "agent") {
    return (
      <View style={styles.locked}>
        <Text style={styles.text}>Accès réservé aux Agents RZ</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  locked: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { 
    color: "#FFD700", 
    fontSize: 18, 
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 20
  }
});
