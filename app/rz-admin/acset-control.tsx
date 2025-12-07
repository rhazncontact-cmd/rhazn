// app/rz-admin/acset-control.tsx
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

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

import AdminGuard from "../components/AdminGuard";

const GOLD = "#D4AF37";

export default function AdminACSETControl() {
  const router = useRouter();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------------
  // 🔥 Charger toutes les demandes ACSET
  // ------------------------------------------------------------------
  const loadRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("agent_buy_requests")
      .select(
        `
        id,
        created_at,
        amount_acset,
        status,
        user_uid,
        agent_uid,
        users: user_uid(full_name),
        agents: agent_uid(full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (!error) setRequests(data);
    setLoading(false);
  };

  // ------------------------------------------------------------------
  // 🔥 Realtime — surveillance totale
  // ------------------------------------------------------------------
  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel("admin-acset-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_buy_requests",
        },
        () => loadRequests()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ------------------------------------------------------------------
  // 🟢 ADMIN — Valider une demande ACSET
  // ------------------------------------------------------------------
  const approveRequest = async (req: any) => {
    Alert.alert(
      "Confirmer validation",
      `Valider la demande de ${req.amount_acset} ACSET ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Valider",
          onPress: async () => {
            const { error } = await supabase.rpc("agent_sell_acset", {
              p_agent_uid: req.agent_uid,
              p_user_uid: req.user_uid,
              p_amount: req.amount_acset,
            });

            if (error) {
              Alert.alert("Erreur", error.message);
              return;
            }

            await supabase
              .from("agent_buy_requests")
              .update({ status: "approved" })
              .eq("id", req.id);

            Alert.alert("OK", "ACSET crédité à l'utilisateur.");
          },
        },
      ]
    );
  };

  // ------------------------------------------------------------------
  // 🔴 ADMIN — Annuler une demande
  // ------------------------------------------------------------------
  const cancelRequest = async (req: any) => {
    Alert.alert(
      "Annuler demande",
      "Voulez-vous annuler cette demande ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("agent_buy_requests")
              .update({ status: "cancelled" })
              .eq("id", req.id);

            Alert.alert("Annulé", "La demande ACSET est annulée.");
          },
        },
      ]
    );
  };

  // ------------------------------------------------------------------
  // 🎨 Card demande ACSET
  // ------------------------------------------------------------------
  const renderRequest = ({ item }: any) => {
    const statusColor =
      item.status === "pending"
        ? "#facc15"
        : item.status === "approved"
        ? "#4ade80"
        : "#ef4444";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.amount}>{item.amount_acset} ACSET</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.user}>
          👤 Utilisateur : {item.users?.full_name ?? "?"}
        </Text>
        <Text style={styles.agent}>
          🧑‍💼 Agent : {item.agents?.full_name ?? "?"}
        </Text>

        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleString()}
        </Text>

        {/* ACTIONS ADMIN */}
        {item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen]}
              onPress={() => approveRequest(item)}
            >
              <Ionicons name="checkmark" size={18} color="#000" />
              <Text style={styles.btnText}>Valider</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnRed]}
              onPress={() => cancelRequest(item)}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ------------------------------------------------------------------
  // UI
  // ------------------------------------------------------------------
  return (
    <AdminGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Surveillance ACSET</Text>

          <MaterialIcons name="admin-panel-settings" size={28} color={GOLD} />
        </View>

        {/* LISTE */}
        {loading ? (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 50 }}
          />
        )}
      </View>
    </AdminGuard>
  );
}

// ------------------------------------------------------------------
// 🎨 Styles Premium RHAZN
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 18 },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  card: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 14,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  amount: { color: "#fff", fontSize: 18, fontWeight: "800" },

  status: { fontSize: 14, fontWeight: "700" },

  user: { color: "#ccc", marginTop: 4 },
  agent: { color: "#ccc", marginTop: 2 },

  date: { color: "#777", fontSize: 11, marginTop: 6 },

  actions: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },

  btnGreen: { backgroundColor: "#4ade80" },
  btnRed: { backgroundColor: "#b91c1c" },

  btnText: { fontWeight: "800", color: "#000" },
});
