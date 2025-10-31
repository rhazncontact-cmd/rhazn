import { useRouter } from "expo-router";
import { Lock, RefreshCw, User } from "lucide-react-native";
import React, { useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AccessScreen() {
  const router = useRouter();
  const [balance, setBalance] = useState(0.0);

  const agents = [
    { id: "1", name: "Agent Méa" },
    { id: "2", name: "Agent Sindinie" },
    { id: "3", name: "Agent Nelcie" },
  ];

  const refreshBalance = () => {
    Alert.alert(
      "RHAZN",
      "Actualisation du solde en cours...",
      [
        {
          text: "OK",
          onPress: () => setTimeout(() => setBalance(1.0), 1500), // Simulation d’un achat d’ACSET
        },
      ],
      { cancelable: false }
    );
  };

  const accessGranted = balance >= 1;

  return (
    <View style={styles.container}>
      <Lock color="#FFD700" size={42} style={{ marginBottom: 12 }} />
      <Text style={styles.title}>Accès réservé aux membres actifs</Text>
      <Text style={styles.subtitle}>Votre solde actuel :</Text>

      <Text style={[styles.balance, { color: accessGranted ? "#00FF88" : "#FFD700" }]}>
        {balance.toFixed(2)} ACSET
      </Text>

      {!accessGranted ? (
        <>
          <Text style={styles.info}>
            Pour accéder à RHAZN, achetez au moins{" "}
            <Text style={{ color: "#FFD700", fontWeight: "700" }}>1 ACSET</Text>{" "}
            auprès d’un agent agréé :
          </Text>

          <FlatList
            data={agents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.agentButton}>
                <User color="#FFD700" size={18} />
                <Text style={styles.agentText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.refreshButton} onPress={refreshBalance}>
            <RefreshCw color="#000" size={18} />
            <Text style={styles.refreshText}>Rafraîchir mon solde</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.success}>✅ Accès autorisé !</Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.replace("/dashboard")}
          >
            <Text style={styles.continueText}>Entrer dans RHAZN</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
  },
  balance: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 22,
  },
  info: {
    color: "#ccc",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
  },
  agentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 5,
    width: 220,
  },
  agentText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  refreshText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  success: {
    color: "#00FF88",
    fontSize: 16,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  continueText: {
    color: "#000",
    fontWeight: "700",
  },
});
