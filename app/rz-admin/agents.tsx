import { Feather, MaterialIcons } from "@expo/vector-icons";
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
import { supabase } from "../../lib/supabase";
import AdminGuard from "../components/AdminGuard";

const GOLD = "#D4AF37";

export default function AdminAgentsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ============================================================
  // 🔄 LOAD DATA (NOUVEAU CONTRAT ED)
  // ============================================================
  const loadData = async () => {
    try {
      setLoading(true);

      // ✅ DOSSIERS AGENT (CONTRAT ED)
      const { data: reqData, error: reqErr } = await supabase
        .from("agent_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (reqErr) throw reqErr;

      setRequests(reqData?.filter((r) => r.status === "PENDING") ?? []);

      // ✅ AGENTS OFFICIELS
      const { data: agData, error: agErr } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (agErr) throw agErr;

      setAgents(agData ?? []);
      setError(null);
    } catch (e: any) {
      console.log("ADMIN_AGENT_LOAD_ERROR:", e);
      setError("Impossible de charger les dossiers Agent (ED).");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔁 REALTIME (CONTRAT ED)
  // ============================================================
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("admin-agents-ed-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_applications" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => loadData()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ============================================================
  // ✅ VALIDER DOSSIER ED
  // ============================================================
  const handleApprove = async (req: any) => {
    setProcessingId(req.id);

    try {
      const { data: session } = await supabase.auth.getSession();
      const adminUid = session.session?.user?.id;

      // 1️⃣ Marquer dossier VALIDATED
      await supabase
        .from("agent_applications")
        .update({
          status: "VALIDATED",
          reviewed_by: adminUid,
        })
        .eq("id", req.id);

      // 2️⃣ Créer Agent officiel
      const random = Math.floor(1000 + Math.random() * 9000);
      const code = `RZ-ED-${random}`;

      await supabase.from("agents").upsert({
        uid: req.user_uid,
        code,
        city: req.city_of_birth,
        status: "ACTIVE",
        created_from_application: req.id,
      });

      // 3️⃣ Créer Wallet Agent
      const { data: wallet } = await supabase
        .from("agents_wallet")
        .select("id")
        .eq("agent_uid", req.user_uid)
        .maybeSingle();

      if (!wallet) {
        await supabase.from("agents_wallet").insert({
          agent_uid: req.user_uid,
          tan: 0,
          acset: 0,
        });
      }

      await loadData();
    } catch (e) {
      console.log("AGENT_APPROVE_ERROR:", e);
      setError("Erreur lors de la validation du dossier ED.");
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // ❌ REJETER DOSSIER ED
  // ============================================================
  const handleReject = async (req: any) => {
    setProcessingId(req.id);

    try {
      const { data: session } = await supabase.auth.getSession();
      const adminUid = session.session?.user?.id;

      await supabase
        .from("agent_applications")
        .update({
          status: "REJECTED",
          reviewed_by: adminUid,
        })
        .eq("id", req.id);

      await loadData();
    } catch (e) {
      setError("Impossible de rejeter le dossier.");
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // ✅ ACTIVER / DÉSACTIVER AGENT
  // ============================================================
  const toggleAgentStatus = async (agent: any) => {
    setProcessingId(agent.id);

    try {
      const next = agent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      await supabase
        .from("agents")
        .update({ status: next })
        .eq("id", agent.id);

      await loadData();
    } catch (e) {
      setError("Impossible de changer le statut de l’agent.");
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // UI
  // ============================================================
  return (
    <AdminGuard>
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
            {/* ============================
                ✅ DOSSIERS EN ATTENTE
            ============================ */}
            <Text style={styles.sectionTitle}>
              Dossiers Agent (ED) – En attente
            </Text>

            {requests.length === 0 && (
              <Text style={styles.emptyText}>Aucun dossier en attente.</Text>
            )}

            {requests.map((req: any) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {req.full_name} {req.first_name}
                  </Text>
                  <Text style={styles.statusPending}>PENDING</Text>
                </View>

                <Text style={styles.cardSubtitle}>
                  Ville de naissance : {req.city_of_birth}
                </Text>
                <Text style={styles.cardSubtitle}>Email : {req.email}</Text>

                {/* ============================
                    ✅ PREUVES LÉGALES
                ============================ */}
                <View style={styles.docRow}>
                  <TouchableOpacity
                    onPress={() => setPreviewUrl(req.id_document_url)}
                  >
                    <Text style={styles.docLink}>📄 Pièce d’identité</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPreviewUrl(req.selfie_url)}
                  >
                    <Text style={styles.docLink}>🤳 Selfie</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPreviewUrl(req.deposit_slip_url)}
                  >
                    <Text style={styles.docLink}>🧾 Fiche Dépôt</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>ACSET requis :</Text>
                <Text style={styles.bodyText}>
                  {req.acset_amount} ACSET
                </Text>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnReject]}
                    onPress={() => handleReject(req)}
                    disabled={processingId === req.id}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="close" size={16} color="#fff" />
                        <Text style={styles.btnText}>Rejeter</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnApprove]}
                    onPress={() => handleApprove(req)}
                    disabled={processingId === req.id}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={16} color="#000" />
                        <Text style={[styles.btnText, { color: "#000" }]}>
                          Valider
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* ============================
                ✅ AGENTS ACTIFS / INACTIFS
            ============================ */}
            <Text style={[styles.sectionTitle, { marginTop: 26 }]}>
              Agents Officiels
            </Text>

            {agents.length === 0 && (
              <Text style={styles.emptyText}>Aucun agent enregistré.</Text>
            )}

            {agents.map((agent: any) => (
              <View key={agent.id} style={styles.agentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agentCode}>{agent.code}</Text>
                  {agent.city && (
                    <Text style={styles.agentCity}>{agent.city}</Text>
                  )}
                  <Text style={styles.agentDate}>
                    Créé le{" "}
                    {new Date(agent.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.agentStatus,
                      agent.status === "ACTIVE"
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  >
                    {agent.status}
                  </Text>

                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => toggleAgentStatus(agent)}
                  >
                    <Text style={styles.smallBtnText}>
                      {agent.status === "ACTIVE"
                        ? "Désactiver"
                        : "Activer"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ============================
            ✅ PREVIEW DOCUMENT
        ============================ */}
        <Modal
          visible={!!previewUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewUrl(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPreviewUrl(null)}
          >
            <View style={styles.modalBox}>
              {previewUrl && (
                <Image
                  source={{ uri: previewUrl }}
                  style={{ width: 280, height: 380, resizeMode: "contain" }}
                />
              )}

              <TouchableOpacity
                style={[styles.btn, styles.btnApprove, { marginTop: 10 }]}
                onPress={() => {
                  if (previewUrl) Linking.openURL(previewUrl);
                }}
              >
                <Text style={[styles.btnText, { color: "#000" }]}>
                  Ouvrir en plein écran
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    </AdminGuard>
  );
}

/* ============================
   🎨 STYLES
============================ */

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
  errorText: { color: "#f87171", paddingHorizontal: 24, textAlign: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  emptyText: { color: "#777", fontSize: 13, marginBottom: 10 },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cardSubtitle: { color: "#aaa", fontSize: 12, marginBottom: 3 },

  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },

  docLink: { color: GOLD, fontSize: 12, fontWeight: "700" },

  label: { color: GOLD, fontSize: 12, marginTop: 4 },
  bodyText: { color: "#ddd", fontSize: 12, marginTop: 2 },

  statusPending: {
    color: "#facc15",
    fontSize: 11,
    fontWeight: "700",
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10,
  },

  btn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
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
  agentCode: { color: GOLD, fontWeight: "700", fontSize: 14 },
  agentCity: { color: "#ccc", fontSize: 12 },
  agentDate: { color: "#777", fontSize: 11, marginTop: 2 },

  agentStatus: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    textAlign: "center",
    marginBottom: 6,
  },
  statusActive: { backgroundColor: "#14532d", color: "#bbf7d0" },
  statusInactive: { backgroundColor: "#3f3f46", color: "#e5e7eb" },

  smallBtn: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallBtnText: { fontSize: 11, fontWeight: "700", color: "#000" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  modalBox: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 12,
    borderColor: "#333",
    borderWidth: 1,
    alignItems: "center",
  },
});
