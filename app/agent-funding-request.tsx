import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const COLORS = {
  bg: "#000",
  card: "#0E0E0E",
  white: "#FFF",
  gray: "#9A9A9A",
  gold: "#D4AF37",
  border: "rgba(255,255,255,0.08)",
  red: "#FF3B30",
};

type Profile = {
  id: string;
  agent_code: string | null;
  email: string | null;
};

export default function AgentFundingRequest() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [requestedAcset, setRequestedAcset] = useState<string>("0");
  const [requestedTan, setRequestedTan] = useState<string>("0");
  const [agentNote, setAgentNote] = useState<string>("");

  const [proof, setProof] = useState<{
    uri: string;
    name: string;
    type: "image" | "pdf";
  } | null>(null);

  const canSend = useMemo(() => {
    const a = Number(requestedAcset || 0);
    const t = Number(requestedTan || 0);
    return !!profile?.agent_code && !!profile?.email && !!proof && (a > 0 || t > 0);
  }, [profile, proof, requestedAcset, requestedTan]);

  // =========================
  // Load agent profile
  // =========================
  useEffect(() => {
    const run = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) {
          router.replace("/auth/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, agent_code, email")
          .eq("id", uid)
          .maybeSingle();

        if (error || !data) {
          throw new Error("Profil introuvable (profiles).");
        }

        setProfile(data as Profile);
      } catch (e: any) {
        Alert.alert("Erreur", e.message ?? "Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  // =========================
  // Pick image (camera/gallery)
  // =========================
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Autorise l’accès aux photos.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (res.canceled) return;

    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    setProof({
      uri: asset.uri,
      name: `deposit_${Date.now()}.jpg`,
      type: "image",
    });
  };

  // =========================
  // Pick PDF
  // =========================
  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled) return;

    const file = res.assets?.[0];
    if (!file?.uri) return;

    setProof({
      uri: file.uri,
      name: file.name || `deposit_${Date.now()}.pdf`,
      type: "pdf",
    });
  };

  // =========================
  // Upload proof to Storage
  // =========================
  const uploadProof = async (uid: string) => {
    if (!proof) throw new Error("Preuve manquante.");

    const ext = proof.type === "pdf" ? "pdf" : "jpg";
    const path = `${uid}/${Date.now()}_${proof.name.replace(/\s/g, "_")}`;

    const fileRes = await fetch(proof.uri);
    const blob = await fileRes.blob();

    const { error } = await supabase.storage
      .from("agent-deposits")
      .upload(path, blob, {
        contentType: proof.type === "pdf" ? "application/pdf" : "image/jpeg",
        upsert: false,
      });

    if (error) throw error;

    return { path, proofType: proof.type as "image" | "pdf" };
  };

  // =========================
  // Submit request
  // =========================
  const submit = async () => {
    if (!profile?.id) return;

    try {
      setSending(true);

      const uid = profile.id;
      const acset = Number(requestedAcset || 0);
      const tan = Number(requestedTan || 0);

      if (!proof) throw new Error("Ajoute la preuve de dépôt.");
      if (!(acset > 0 || tan > 0)) throw new Error("Montant invalide.");

      const up = await uploadProof(uid);

      const { error } = await supabase.from("agent_funding_requests").insert({
        agent_uid: uid,
        agent_code: profile.agent_code,
        agent_email: profile.email,
        requested_acset: acset,
        requested_tan: tan,
        proof_url: up.path,
        proof_type: up.proofType,
        status: "pending",
        agent_note: agentNote?.trim() || null,
      });

      if (error) throw error;

      Alert.alert("Envoyé", "Demande transmise à l’administration.");
      setRequestedAcset("0");
      setRequestedTan("0");
      setAgentNote("");
      setProof(null);
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e.message ?? "Impossible d’envoyer la demande.");
    } finally {
      setSending(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.gold} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Renflouer mon compte</Text>
            <Text style={styles.subtitle}>Envoyez une preuve de dépôt et soumettez votre demande.</Text>

            {/* IDENTITÉ AGENT (AUTO) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Identité Agent</Text>

              <Text style={styles.label}>Code Agent (auto)</Text>
              <View style={styles.readonly}>
                <Text style={styles.readonlyText}>{profile?.agent_code || "—"}</Text>
              </View>

              <Text style={styles.label}>Email (auto)</Text>
              <View style={styles.readonly}>
                <Text style={styles.readonlyText}>{profile?.email || "—"}</Text>
              </View>
            </View>

            {/* MONTANTS */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Montant demandé</Text>

              <Text style={styles.label}>ACSET</Text>
              <TextInput
                value={requestedAcset}
                onChangeText={setRequestedAcset}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
              />

              <Text style={styles.label}>TAN</Text>
              <TextInput
                value={requestedTan}
                onChangeText={setRequestedTan}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
              />

              <Text style={styles.label}>Note (optionnel)</Text>
              <TextInput
                value={agentNote}
                onChangeText={setAgentNote}
                placeholder="Ex: dépôt Unibank, référence #..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                multiline
              />
            </View>

            {/* PREUVE */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preuve de dépôt</Text>
              <Text style={styles.help}>
                Ajoute une photo (JPG/PNG) ou un PDF scanné.
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={styles.btnGold} onPress={pickImage}>
                  <MaterialIcons name="photo" size={18} color="#000" />
                  <Text style={styles.btnGoldText}>Choisir photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnSoft} onPress={pickPdf}>
                  <Feather name="file-text" size={16} color={COLORS.gold} />
                  <Text style={styles.btnSoftText}>Choisir PDF</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.proofRow}>
                <Text style={styles.proofLabel}>Fichier :</Text>
                <Text style={styles.proofValue}>{proof ? `${proof.name} (${proof.type})` : "Aucun"}</Text>
              </View>
            </View>

            {/* SUBMIT */}
            <TouchableOpacity
              style={[styles.submit, (!canSend || sending) && { opacity: 0.55 }]}
              disabled={!canSend || sending}
              onPress={submit}
              activeOpacity={0.9}
            >
              {sending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#000" />
                  <Text style={styles.submitText}>Envoyer à l’administration</Text>
                </>
              )}
            </TouchableOpacity>

            {!canSend && (
              <Text style={styles.warn}>
                Ajoute une preuve + un montant (ACSET ou TAN) pour envoyer.
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </AgentGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 22 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  title: { color: COLORS.white, fontSize: 24, fontWeight: "900", marginTop: 40 },
  subtitle: { color: COLORS.gray, fontSize: 13, marginTop: 6, marginBottom: 14 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { color: COLORS.gold, fontSize: 13, fontWeight: "900", marginBottom: 10 },

  label: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 10, marginBottom: 6 },

  readonly: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  readonlyText: { color: COLORS.white, fontWeight: "800" },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  help: { color: COLORS.gray, fontSize: 12, lineHeight: 18 },

  btnGold: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnGoldText: { color: "#000", fontWeight: "900", fontSize: 13 },

  btnSoft: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  btnSoftText: { color: COLORS.gold, fontWeight: "900", fontSize: 13 },

  proofRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  proofLabel: { color: COLORS.gray, fontSize: 12 },
  proofValue: { color: COLORS.white, fontSize: 12, fontWeight: "800", flex: 1 },

  submit: {
    marginTop: 18,
    backgroundColor: COLORS.gold,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  submitText: { color: "#000", fontWeight: "900", fontSize: 14 },

  warn: { marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center" },
});
