import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

/* ================= TYPES ================= */

type WithdrawRequest = {
  id: string;
  user_uid: string;
  agent_uid: string;
  amount_tan: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
};

/* ================= SCREEN ================= */

export default function AgentRequests() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD REQUESTS ================= */
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      const agentUid = session.session?.user?.id;

      if (!agentUid) {
        setError("Session agent invalide.");
        return;
      }

      const { data, error } = await supabase
        .from("agent_requests")
        .select("*")
        .eq("agent_uid", agentUid)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      setRequests((data as WithdrawRequest[]) ?? []);
    } catch {
      setError("Erreur de chargement des demandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* ================= ACTIONS ================= */

  const approve = (r: WithdrawRequest) => {
    router.push({
      pathname: "/agent/approve-request",
      params: { request_id: r.id },
    } as any);
  };

  const reject = (r: WithdrawRequest) => {
    router.push({
      pathname: "/agent/reject-request",
      params: { request_id: r.id },
    } as any);
  };

  /* ================= UI ================= */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Demandes de retrait</Text>
        <Text style={styles.subtitle}>En attente de validation</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucune demande en attente.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {requests.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.amount}>{r.amount_tan} TAN</Text>
                <Text style={styles.date}>
                  {new Date(r.created_at).toLocaleString()}
                </Text>
              </View>

              {!!r.note && (
                <Text style={styles.note}>Note : {r.note}</Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.approve]}
                  onPress={() => approve(r)}
                >
                  <Feather name="check" size={18} color="#000" />
                  <Text style={styles.approveText}>Approuver</Text>
                </Pressable>

                <Pressable
                  style={[styles.btn, styles.reject]}
                  onPress={() => reject(r)}
                >
                  <Feather name="x" size={18} color="#FFF" />
                  <Text style={styles.rejectText}>Rejeter</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
    paddingHorizontal: 16,
  },

  header: {
    marginBottom: 16,
  },

  title: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  error: {
    color: "#fca5a5",
    fontWeight: "800",
  },

  empty: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  amount: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  date: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "700",
  },

  note: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  approve: {
    backgroundColor: GOLD,
  },

  reject: {
    backgroundColor: "#FF453A",
  },

  approveText: {
    color: "#000",
    fontWeight: "900",
  },

  rejectText: {
    color: "#FFF",
    fontWeight: "900",
  },
});
