// app/rz-admin/cadna-review-content.tsx

import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

/* ─────────────────────────────
🛡️ CADNA — Examen moral
Voir → Comprendre → Décider
───────────────────────────── */

const COLORS = {
  bg: "#000000",
  card: "#0B0B0B",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.7)",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
};

type Rule = {
  id: string;
  code: string;
  label: string;
  correction_suggestion: string;
};

type Content = {
  id: string;
  title: string | null;
  description: string | null;
  media_path: string | null;
  category_code: string;
  created_at: string;
};

export default function CadnaReviewContent() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const { content_id, content_type } = useLocalSearchParams<{
    content_id: string;
    content_type: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Content | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [busy, setBusy] = useState(false);

  /* ───────── LOAD ───────── */
  useEffect(() => {
    const load = async () => {
      if (!content_id) {
        Alert.alert("Erreur critique", "Identifiant du contenu manquant.");
        router.back();
        return;
      }

      setLoading(true);

      const { data: c, error: ce } = await supabase
        .from("store_products")
        .select("id,title,description,media_path,category_code,created_at")
        .eq("id", content_id)
        .single();

      if (ce || !c) {
        Alert.alert(
          "Contenu introuvable",
          "Ce contenu n’existe plus ou n’est plus accessible."
        );
        router.back();
        return;
      }

      setContent(c as Content);

      const { data: r } = await supabase
        .from("cadna_rejection_rules")
        .select("id,code,label,correction_suggestion")
        .eq("content_type", content_type)
        .eq("active", true)
        .order("label");

      setRules((r ?? []) as Rule[]);
      setLoading(false);
    };

    load();
  }, []);

  /* ───────── APPROVE ───────── */
  const approve = () => {
    if (busy) return;

    Alert.alert(
      "Validation CADNA",
      "Ce contenu respecte les règles morales.\n\nSouhaitez-vous le valider et l’envoyer vers BANQ ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Approuver",
          style: "default",
          onPress: async () => {
            setBusy(true);
            try {
              const { error } = await supabase
                .from("store_products")
                .update({ cadna_status: "approved" })
                .eq("id", content_id);

              if (error) throw error;

              await supabase.from("cadna_decisions").insert({
                content_id,
                content_type,
                decision: "approve",
              });

              Alert.alert(
                "Succès",
                "✔ Le contenu est validé.\n\nIl est désormais accessible dans BANQ.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (e: any) {
              Alert.alert(
                "Erreur de validation",
                e?.message ||
                  "Une erreur est survenue. Vérifiez votre connexion ou vos droits."
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  /* ───────── REJECT ───────── */
  const reject = () => {
    if (busy) return;

    if (!selectedRule) {
      Alert.alert(
        "Action incomplète",
        "Veuillez sélectionner une règle morale afin d’indiquer précisément la correction attendue."
      );
      return;
    }

    Alert.alert(
      "Rejet CADNA",
      `Motif sélectionné :\n${selectedRule.label}\n\nSouhaitez-vous rejeter ce contenu ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Rejeter",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const { error } = await supabase
                .from("store_products")
                .update({
                  cadna_status: "rejected",
                  cadna_rule_code: selectedRule.code,
                })
                .eq("id", content_id);

              if (error) throw error;

              await supabase.from("cadna_decisions").insert({
                content_id,
                content_type,
                rule_id: selectedRule.id,
                rule_code: selectedRule.code,
                decision: "reject",
              });

              Alert.alert(
                "Contenu rejeté",
                "📌 La raison du rejet a été enregistrée.\n\nL’auteur sera informé des corrections à apporter.",
                [
                  {
                    text: "Continuer",
                    onPress: () =>
                      router.push({
                        pathname: "/rz-admin/cadna-rejection-rules",
                        params: {
                          content_id,
                          rule_code: selectedRule.code,
                        },
                      }),
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert(
                "Erreur lors du rejet",
                e?.message || "Impossible d’appliquer la décision."
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  /* ───────── UI ───────── */
  if (loading || !content) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={styles.muted}>Analyse CADNA en cours…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.gold} />
        </Pressable>
        <View>
          <Text style={styles.headerTop}>CADNA</Text>
          <Text style={styles.headerTitle}>Examen moral</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {/* CONTENT */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{content.title || "SUSPENTZ"}</Text>
          <Text style={styles.muted}>
            Type : <Text style={styles.strong}>{content.category_code}</Text>
          </Text>
        </View>

        {/* VIDEO */}
        <View style={styles.videoCard}>
          <Video
            ref={videoRef}
            source={{ uri: content.media_path ?? "" }}
            style={styles.video}
            resizeMode="contain"
            useNativeControls
          />
        </View>

        {/* RULES */}
        <Text style={styles.sectionTitle}>Règles morales applicables</Text>

        {rules.map((r) => {
          const is = selectedRule?.id === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setSelectedRule(r)}
              style={[
                styles.ruleCard,
                is && { borderColor: COLORS.gold },
              ]}
            >
              <Text style={styles.ruleTitle}>
                {r.label} <Text style={styles.ruleCode}>({r.code})</Text>
              </Text>
              <Text style={styles.ruleText}>
                {r.correction_suggestion}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ACTION BAR */}
      <View style={styles.footer}>
        <Pressable
          onPress={approve}
          disabled={busy}
          style={[styles.approveBtn, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#000" />
              <Text style={styles.approveText}>Approuver</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={reject}
          disabled={busy}
          style={[styles.rejectBtn, busy && { opacity: 0.6 }]}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.red} />
          <Text style={styles.rejectText}>Rejeter</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ───────── STYLES ───────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },

  muted: { color: COLORS.muted, fontWeight: "600" },
  strong: { color: COLORS.text, fontWeight: "900" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTop: { color: COLORS.gold, fontSize: 12, fontWeight: "900" },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900" },

  videoCard: {
    backgroundColor: "#000",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 22,
  },
  video: { width: "100%", height: 260 },

  sectionTitle: {
    color: COLORS.gold,
    fontWeight: "900",
    marginBottom: 12,
  },

  ruleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  ruleTitle: { color: COLORS.text, fontWeight: "900" },
  ruleCode: { color: COLORS.gold, fontWeight: "900" },
  ruleText: { color: COLORS.muted, marginTop: 6 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#000",
    flexDirection: "row",
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  approveText: { color: "#000", fontWeight: "900" },
  rejectText: { color: COLORS.red, fontWeight: "900" },
});
