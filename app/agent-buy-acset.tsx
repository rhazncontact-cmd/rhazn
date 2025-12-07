// app/user-buy-acset.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function UserBuyACSET() {
  const router = useRouter();

  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [acsetAmount, setAcsetAmount] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);

  const ACSET_PRICE = 250; // 1 ACSET = 250 TAN

  // ============================================================
  // 🔥 Charger la liste des AGENTS RZ officiellement validés
  // ============================================================
  const loadAgents = async () => {
    setLoadingAgents(true);

    const { data, error } = await supabase
      .from("agents")
      .select("id, uid, full_name")
      .eq("is_active", true);

    if (!error) setAgents(data);
    setLoadingAgents(false);
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // ============================================================
  // 🔥 Envoi d’une demande ACSET → agent_buy_requests
  // ============================================================
  const sendRequest = async () => {
    setConfirmVisible(false);

    const amount = parseInt(acsetAmount);
    if (!selectedAgent || !amount || amount <= 0) return;

    const { data: sessionData } = await supabase.auth.getUser();
    const user = sessionData.user;

    if (!user) return Alert.alert("Erreur", "Vous devez être connecté.");

    // 🔐 Enregistrer la demande
    const { error } = await supabase.from("agent_buy_requests").insert({
      user_uid: user.id,
      agent_uid: selectedAgent.uid,
      amount_acset: amount,
      status: "pending",
    });

    if (error) {
      console.log(error);
      return Alert.alert("Erreur", "Impossible d'envoyer la demande.");
    }

    Alert.alert(
      "Demande envoyée",
      "Votre agent traitera votre demande prochainement."
    );

    setAcsetAmount("");
    setSelectedAgent(null);
  };

  // ============================================================
  // 🔥 UI
  // ============================================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>Demander ACSET</Text>

        <TouchableOpacity onPress={loadAgents}>
          <Feather name="refresh-cw" size={24} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* LISTE DES AGENTS */}
      <Text style={styles.section}>Choisir un Agent RZ</Text>

      {loadingAgents ? (
        <ActivityIndicator size="large" color={GOLD} />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.uid}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.agentCard,
                selectedAgent?.uid === item.uid && styles.agentSelected,
              ]}
              onPress={() => setSelectedAgent(item)}
            >
              <MaterialIcons name="person" size={32} color={GOLD} />
              <Text style={styles.agentName}>{item.full_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* INPUT ACSET */}
      <Text style={styles.section}>Quantité ACSET</Text>

      <TextInput
        placeholder="Ex: 5"
        placeholderTextColor="#777"
        keyboardType="numeric"
        value={acsetAmount}
        onChangeText={setAcsetAmount}
        style={styles.input}
      />

      {/* Calcul automatique */}
      {acsetAmount && (
        <Text style={styles.cost}>
          Vous devez payer environ {parseInt(acsetAmount) * ACSET_PRICE} TAN
        </Text>
      )}

      {/* BUTTON */}
      <TouchableOpacity
        style={[
          styles.button,
          (!selectedAgent || !acsetAmount) && { opacity: 0.3 },
        ]}
        disabled={!selectedAgent || !acsetAmount}
        onPress={() => setConfirmVisible(true)}
      >
        <Text style={styles.buttonText}>Envoyer la demande</Text>
      </TouchableOpacity>

      {/* CONFIRMATION MODAL */}
      <Modal transparent visible={confirmVisible} animationType="fade">
        <Pressable
          style={styles.backdrop}
          onPress={() => setConfirmVisible(false)}
        >
          <View style={styles.modal}>
            <Text style={styles.modalText}>
              Confirmer la demande d’achat ?{"\n\n"}
              Agent : {selectedAgent?.full_name}{"\n"}
              Quantité : {acsetAmount} ACSET{"\n"}
              Coût : {parseInt(acsetAmount) * ACSET_PRICE} TAN
            </Text>

            <TouchableOpacity style={styles.modalBtn} onPress={sendRequest}>
              <Text style={styles.modalBtnText}>Confirmer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#444" }]}
              onPress={() => setConfirmVisible(false)}
            >
              <Text style={styles.modalBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ============================================================
// 🎨 STYLE PREMIUM RHAZN
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 60 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  section: { color: "#fff", marginLeft: 16, marginBottom: 6, fontSize: 15 },

  agentCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 12,
  },

  agentSelected: {
    borderColor: GOLD,
    backgroundColor: "#1a1a1a",
  },

  agentName: { color: "#fff", marginTop: 4 },

  input: {
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    color: "#fff",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },

  cost: {
    color: GOLD,
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
  },

  button: {
    backgroundColor: GOLD,
    marginHorizontal: 16,
    paddingVertical: 14,
    marginTop: 30,
    borderRadius: 10,
  },

  buttonText: { color: "#000", textAlign: "center", fontSize: 16, fontWeight: "900" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  modal: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },

  modalText: {
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },

  modalBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  modalBtnText: { textAlign: "center", fontWeight: "800", fontSize: 15 },
});
