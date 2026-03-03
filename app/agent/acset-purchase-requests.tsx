// app/agent/acset-purchase-requests.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* 🍎 RHAZN */
const GOLD = "#D4AF37";
const TAN_PER_ACSET = 250;

type AcsetRequest = {
  id: string;
  user_uid: string;
  amount_acset: number;
  status: string;
  created_at: string;
};

export default function AgentAcsetPurchaseRequests() {
  const router = useRouter();

  const [requests, setRequests] = useState<AcsetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  /* 🔄 Charger les demandes ACSET en attente */
  const loadRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("acset_purchase_requests")
      .select("id, user_uid, amount_acset, status, created_at")
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (!error) {
      setRequests((data as AcsetRequest[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* ✅ APPROUVER */
  const approveRequest = (id: string) => {
    Alert.alert(
      "Confirmer l’approbation",
      "Approuver cette demande d’achat TAN ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          onPress: async () => {
            setProcessingId(id);

            const { error } = await supabase.rpc(
              "agent_approve_acset_request",
              { p_request_id: id }
            );

            if (error) {
              Alert.alert("Erreur", error.message);
            } else {
              loadRequests();
            }

            setProcessingId(null);
          },
        },
      ]
    );
  };

  /* ❌ REJETER */
  const rejectRequest = (id: string) => {
    Alert.alert(
      "Refuser la demande",
      "Confirmer le rejet de cette demande ACSET ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Refuser",
          style: "destructive",
          onPress: async () => {
            setProcessingId(id);

            const { error } = await supabase.rpc(
              "agent_reject_acset_request",
              { p_request_id: id }
            );

            if (error) {
              Alert.alert("Erreur", error.message);
            } else {
              loadRequests();
            }

            setProcessingId(null);
          },
        },
      ]
    );
  };

  /* 🎨 UI */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Demandes ACSET</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.empty}>Aucune demande en attente.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {requests.map((r) => {
            const tanAmount = r.amount_acset * TAN_PER_ACSET;

            return (
              <View key={r.id} style={styles.card}>
                <Text style={styles.amount}>
                  {r.amount_acset} ACSET
                </Text>

                <Text style={styles.sub}>
                  ≈ {tanAmount} TAN
                </Text>

                <Text style={styles.date}>
                  {new Date(r.created_at).toLocaleString()}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.reject]}
                    disabled={processingId === r.id}
                    onPress={() => rejectRequest(r.id)}
                  >
                    <Text style={styles.rejectText}>Refuser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.approve]}
                    disabled={processingId === r.id}
                    onPress={() => approveRequest(r.id)}
                  >
                    {processingId === r.id ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.approveText}>Approuver</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* 🎨 STYLES — RHAZN */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 56 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },

  empty: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  amount: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  sub: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  date: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 6,
  },

  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },

  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },

  approve: {
    backgroundColor: GOLD,
  },

  reject: {
    backgroundColor: "rgba(255,69,58,0.15)",
    borderWidth: 1,
    borderColor: "#FF453A",
  },

  approveText: {
    fontWeight: "900",
    color: "#000",
  },

  rejectText: {
    fontWeight: "900",
    color: "#FF453A",
  },
});
