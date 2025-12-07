// app/agent-buy-requests.tsx
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";

export default function AgentBuyRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // 🔥 Charger les demandes ACSET + Realtime
  // -------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const load = async () => {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const agentUid = session?.session?.user?.id;
      if (!agentUid) return;

      const { data, error } = await supabase
        .from("agent_buy_requests")
        .select("*")
        .eq("agent_uid", agentUid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && mounted) {
        setRequests(data);
      }

      setLoading(false);

      // Realtime
      channel = supabase
        .channel(`agent-requests-${agentUid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agent_buy_requests",
            filter: `agent_uid=eq.${agentUid}`,
          },
          (payload) => {
            if (!payload.new) return;
            load();
          }
        )
        .subscribe();
    };

    load();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // -------------------------------------------------------------------
  // 🟢 Accepter la demande = Exécuter la RPC process_agent_sale
  // -------------------------------------------------------------------
  const approveRequest = async (req: any) => {
    Alert.alert(
      "Confirmer la vente",
      `Vendre ${req.amount_acset} ACSET à l’utilisateur ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui, confirmer",
          onPress: () => executeSale(req),
        },
      ]
    );
  };

  const executeSale = async (req: any) => {
    setProcessingId(req.id);

    const { data, error } = await supabase.rpc("process_agent_sale", {
      p_request_id: req.id
    });

    setProcessingId(null);

    if (error) {
      console.log("RPC ERROR:", error);
      Alert.alert("Erreur", error.message);
      return;
    }

    Alert.alert("Succès", "La vente a été effectuée.");
  };

  // -------------------------------------------------------------------
  // 🔴 Refuser la demande
  // -------------------------------------------------------------------
  const rejectRequest = async (req: any) => {
    Alert.alert(
      "Refuser la demande",
      "Êtes-vous sûr de vouloir refuser cette demande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui, refuser",
          onPress: async () => {
            await supabase
              .from("agent_buy_requests")
              .update({ status: "rejected" })
              .eq("id", req.id);
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------
  // UI – Affichage de chaque demande
  // -------------------------------------------------------------------
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.user}>
        Utilisateur :  
        <Text style={styles.value}>{item.user_uid}</Text>
      </Text>

      <Text style={styles.amount}>
        Quantité demandée :{" "}
        <Text style={styles.value}>{item.amount_acset} ACSET</Text>
      </Text>

      <Text style={styles.date}>
        Demandé le {new Date(item.created_at).toLocaleString()}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => rejectRequest(item)}
          disabled={processingId === item.id}
        >
          <Text style={styles.rejectText}>Refuser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => approveRequest(item)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.acceptText}>Accepter</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // -------------------------------------------------------------------
  // RENDER PAGE
  // -------------------------------------------------------------------
  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Demandes ACSET</Text>

          <View style={{ width: 28 }} />
        </View>

        {/* CONTENU */}
        {loading ? (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        ) : requests.length === 0 ? (
          <Text style={styles.empty}>Aucune demande reçue.</Text>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        )}
      </View>
    </AgentGuard>
  );
}

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

  empty: {
    color: "#777",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },

  card: {
    backgroundColor: "#111",
    padding: 18,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
  },

  user: { color: "#ddd", fontSize: 14, marginBottom: 4 },
  value: { color: GOLD, fontWeight: "700" },

  amount: { color: "#ddd", fontSize: 14, marginBottom: 6 },
  date: { color: "#666", fontSize: 12, marginBottom: 12 },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  rejectBtn: {
    backgroundColor: "#550000",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  rejectText: {
    color: "#ff7777",
    fontWeight: "700",
    fontSize: 14,
  },

  acceptBtn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  acceptText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 14,
  },
});
