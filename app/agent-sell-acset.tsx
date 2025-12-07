// app/agent-sell-acset.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function UserBuyAcset() {
  const router = useRouter();

  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // ---------------------------------------------------------------------
  // 🔥 Charger la liste des agents
  // ---------------------------------------------------------------------
  useEffect(() => {
    const loadAgents = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("agents")
        .select("id, full_name, phone, status")
        .eq("status", "active");

      if (!error) setAgents(data);
      setLoading(false);
    };

    loadAgents();
  }, []);

  // ---------------------------------------------------------------------
  // 🟢 Envoyer la demande d’achat ACSET
  // ---------------------------------------------------------------------
  const sendRequest = async () => {
    if (!selectedAgent) {
      Alert.alert("Choix manquant", "Veuillez sélectionner un agent.");
      return;
    }

    const amountInt = parseInt(amount);
    if (!amountInt || amountInt <= 0) {
      Alert.alert("Montant incorrect", "Veuillez saisir un nombre valide d’ACSET.");
      return;
    }

    setSending(true);

    const { data: session } = await supabase.auth.getSession();
    const userUid = session?.session?.user?.id;

    if (!userUid) {
      Alert.alert("Erreur", "Impossible d’identifier votre compte.");
      setSending(false);
      return;
    }

    // Création demande
    const { error } = await supabase.from("agent_buy_requests").insert({
      user_uid: userUid,
      agent_uid: selectedAgent.id,
      amount_acset: amountInt,
      status: "pending",
    });

    setSending(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    Alert.alert(
      "Demande envoyée",
      "Votre agent RZ vient de recevoir votre demande. Vous serez crédité dès validation.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  // ---------------------------------------------------------------------
  // UI – Liste des Agents
  // ---------------------------------------------------------------------
  const renderAgent = ({ item }: any) => (
    <TouchableOpacity
      style={[
        styles.agentCard,
        selectedAgent?.id === item.id && styles.agentCardSelected
      ]}
      onPress={() => setSelectedAgent(item)}
    >
      <MaterialIcons name="person" size={26} color={GOLD} />
      <View>
        <Text style={styles.agentName}>{item.full_name}</Text>
        <Text style={styles.agentPhone}>{item.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------
  // RENDER PAGE
  // ---------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>Acheter ACSET</Text>

        <View style={{ width: 28 }} />
      </View>

      {/* AGENTS LIST */}
      <Text style={styles.sectionTitle}>Sélectionner un Agent RZ</Text>

      {loading ? (
        <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
      ) : agents.length === 0 ? (
        <Text style={styles.empty}>Aucun agent disponible.</Text>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          renderItem={renderAgent}
        />
      )}

      {/* INPUT ACSET */}
      {selectedAgent && (
        <View style={styles.inputBox}>
          <Text style={styles.label}>Quantité ACSET à acheter</Text>

          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="ex: 5"
            placeholderTextColor="#777"
          />

          <TouchableOpacity
            style={[styles.buyButton, sending && { opacity: 0.6 }]}
            onPress={sendRequest}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buyText}>Envoyer la demande</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------
// 🔥 STYLES PREMIUM RHAZN
// ---------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 18 },

  header: {
    paddingTop: 60,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: { padding: 6 },

  title: { color: GOLD, fontSize: 22, fontWeight: "900" },

  sectionTitle: {
    color: "#fff",
    marginTop: 10,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "700",
  },

  empty: { color: "#777", textAlign: "center", marginTop: 20 },

  agentCard: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },

  agentCardSelected: {
    borderColor: GOLD,
    backgroundColor: "#1a1400",
  },

  agentName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  agentPhone: { color: "#aaa", fontSize: 12 },

  inputBox: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 14,
    borderColor: "#222",
    borderWidth: 1,
    marginTop: 20,
  },

  label: { color: GOLD, fontSize: 14, fontWeight: "700", marginBottom: 8 },

  input: {
    backgroundColor: "#000",
    borderColor: "#333",
    borderWidth: 1,
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },

  buyButton: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
  },

  buyText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },
});
