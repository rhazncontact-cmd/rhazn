import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function AdminAgentsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* ===================== LOAD DATA ===================== */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: reqData, error: reqErr } = await supabase
        .from("agent_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (reqErr) throw reqErr;

      const { data: agData, error: agErr } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (agErr) throw agErr;

      setRequests(reqData?.filter((r) => r.status === "PENDING") ?? []);
      setAgents(agData ?? []);
    } catch (e: any) {
      console.log("ADMIN_AGENTS_ERROR:", e);
      setError("Impossible de charger les données agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ===================== ACTIONS ===================== */
  const handleApprove = async (req: any) => {
    setProcessingId(req.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const adminUid = session.session?.user?.id;

      await supabase
        .from("agent_applications")
        .update({ status: "VALIDATED", reviewed_by: adminUid })
        .eq("id", req.id);

      const code = `RZ-ED-${Math.floor(1000 + Math.random() * 9000)}`;

      await supabase.from("agents").upsert({
        uid: req.user_uid,
        code,
        city: req.city_of_birth,
        status: "ACTIVE",
        created_from_application: req.id,
      });

      await loadData();
    } catch (e) {
      setError("Erreur lors de la validation du dossier.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: any) => {
    setProcessingId(req.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const adminUid = session.session?.user?.id;

      await supabase
        .from("agent_applications")
        .update({ status: "REJECTED", reviewed_by: adminUid })
        .eq("id", req.id);

      await loadData();
    } catch {
      setError("Impossible de rejeter le dossier.");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleAgentStatus = async (agent: any) => {
    setProcessingId(agent.id);
    try {
      const next = agent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await supabase.from("agents").update({ status: next }).eq("id", agent.id);
      await loadData();
    } catch {
      setError("Impossible de modifier le statut.");
    } finally {
      setProcessingId(null);
    }
  };

  /* ===================== UI ===================== */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Administration Agents (ED)</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* DOSSIERS */}
          <Text style={styles.sectionTitle}>Dossiers en attente</Text>

          {requests.length === 0 && (
            <Text style={styles.emptyText}>Aucun dossier.</Text>
          )}

          {requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {req.full_name} {req.first_name}
              </Text>
              <Text style={styles.cardSubtitle}>{req.email}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => handleReject(req)}
                  disabled={processingId === req.id}
                >
                  <Text style={styles.btnText}>Rejeter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  onPress={() => handleApprove(req)}
                  disabled={processingId === req.id}
                >
                  <Text style={[styles.btnText, { color: "#000" }]}>
                    Valider
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* AGENTS */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Agents Officiels
          </Text>

          {agents.map((agent) => (
            <View key={agent.id} style={styles.agentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentCode}>{agent.code}</Text>
                <Text style={styles.agentDate}>
                  {new Date(agent.created_at).toLocaleDateString()}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => toggleAgentStatus(agent)}
              >
                <Text style={styles.smallBtnText}>
                  {agent.status === "ACTIVE" ? "Désactiver" : "Activer"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* PREVIEW */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPreviewUrl(null)}
        >
          <View style={styles.modalBox}>
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                style={{ width: 260, height: 360, resizeMode: "contain" }}
              />
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnApprove, { marginTop: 10 }]}
              onPress={() => previewUrl && Linking.openURL(previewUrl)}
            >
              <Text style={[styles.btnText, { color: "#000" }]}>
                Ouvrir
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: GOLD, fontSize: 18, fontWeight: "800" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#f87171", textAlign: "center", paddingHorizontal: 20 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyText: { color: "#777", fontSize: 13 },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardSubtitle: { color: "#aaa", fontSize: 12 },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  btnReject: { backgroundColor: "#451a1a" },
  btnApprove: { backgroundColor: GOLD },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  agentRow: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    marginBottom: 10,
  },
  agentCode: { color: GOLD, fontWeight: "700" },
  agentDate: { color: "#777", fontSize: 11 },

  smallBtn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: "center",
  },
  smallBtnText: { fontSize: 11, fontWeight: "700", color: "#000" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
});
