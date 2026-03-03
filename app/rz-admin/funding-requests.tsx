import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../../lib/supabase";
import AdminGuard from "../components/AdminGuard";

const COLORS = {
  bg: "#000",
  card: "#0E0E0E",
  gold: "#D4AF37",
  white: "#FFF",
  gray: "#9A9A9A",
  border: "rgba(255,255,255,0.08)",
  red: "#FF3B30",
  green: "#00C853",
};

type FundingRequest = {
  id: string;
  agent_uid: string;
  agent_code: string;
  agent_email: string;
  requested_acset: number;
  requested_tan: number;
  proof_url: string;
  proof_type: "image" | "pdf";
  status: "pending" | "approved" | "rejected";
  agent_note: string | null;
  created_at: string;
};

export default function AdminFundingRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agent_funding_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data as FundingRequest[]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Chargement impossible");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    if (!adminNote[id]) {
      Alert.alert("Note requise", "Ajoutez une note admin.");
      return;
    }

    try {
      await supabase.rpc("admin_approve_agent_funding", {
        p_request_id: id,
        p_admin_note: adminNote[id],
      });
      load();
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible d’approuver");
    }
  };

  const reject = async (id: string) => {
    if (!adminNote[id]) {
      Alert.alert("Note requise", "Ajoutez une note admin.");
      return;
    }

    try {
      await supabase.rpc("admin_reject_agent_funding", {
        p_request_id: id,
        p_admin_note: adminNote[id],
      });
      load();
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible de refuser");
    }
  };

  const openProof = async (path: string) => {
    const { data } = await supabase.storage
      .from("agent-deposits")
      .createSignedUrl(path, 60);

    if (data?.signedUrl) {
      Alert.alert("Lien preuve", data.signedUrl);
    }
  };

  return (
    <AdminGuard>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

        <View style={styles.header}>
          <Text style={styles.title}>Renflouements Agents</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {requests.length === 0 && (
              <Text style={styles.empty}>Aucune demande</Text>
            )}

            {requests.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.agent}>
                  {r.agent_code} · {r.agent_email}
                </Text>

                <Text style={styles.amount}>
                  ACSET: {r.requested_acset} | TAN: {r.requested_tan}
                </Text>

                {r.agent_note && (
                  <Text style={styles.note}>
                    Note agent : {r.agent_note}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.proofBtn}
                  onPress={() => openProof(r.proof_url)}
                >
                  <Feather name="file-text" size={16} color={COLORS.gold} />
                  <Text style={styles.proofText}>Voir preuve</Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Note admin..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                  value={adminNote[r.id] || ""}
                  onChangeText={(t) =>
                    setAdminNote((p) => ({ ...p, [r.id]: t }))
                  }
                />

                {r.status === "pending" ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: COLORS.green }]}
                      onPress={() => approve(r.id)}
                    >
                      <MaterialIcons name="check" size={18} color="#000" />
                      <Text style={styles.btnText}>Approuver</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: COLORS.red }]}
                      onPress={() => reject(r.id)}
                    >
                      <MaterialIcons name="close" size={18} color="#000" />
                      <Text style={styles.btnText}>Refuser</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: 10,
                      color:
                        r.status === "approved"
                          ? COLORS.green
                          : COLORS.red,
                      fontWeight: "800",
                    }}
                  >
                    {r.status.toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 70, paddingBottom: 16, paddingHorizontal: 20 },
  title: { color: COLORS.white, fontSize: 22, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: COLORS.gray, textAlign: "center", marginTop: 80 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  agent: { color: COLORS.white, fontWeight: "900" },
  amount: { color: COLORS.gold, marginTop: 6 },
  note: { color: COLORS.gray, marginTop: 6 },

  proofBtn: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  proofText: { color: COLORS.gold, fontWeight: "800" },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 10,
    color: COLORS.white,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },

  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: { fontWeight: "900", color: "#000" },
});
