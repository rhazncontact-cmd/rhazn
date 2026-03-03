import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const RED = "#f97373";
const GREEN = "#4ade80";

type RuleRow = {
  id: string;
  created_at: string;
  content_type: string;
  code: string;
  label: string;
  description: string | null;
  correction_suggestion: string;
  active: boolean;
};

const CONTENT_TYPES = [
  "profile_photo",
  "suspentz",
  "store",
  "video",
  "audio",
  "text",
  "book",
  "art",
  "contest",
  "other",
];

export default function CadnaRejectionRulesAdmin() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rules, setRules] = useState<RuleRow[]>([]);
  const [filterType, setFilterType] = useState<string>("profile_photo");
  const [query, setQuery] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);

  // form
  const [contentType, setContentType] = useState("profile_photo");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [correction, setCorrection] = useState("");
  const [active, setActive] = useState(true);

  /* ================= LOAD ================= */
  const load = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadna_rejection_rules")
        .select(
          "id,created_at,content_type,code,label,description,correction_suggestion,active"
        )
        .order("content_type", { ascending: true })
        .order("label", { ascending: true });

      if (error) throw error;
      setRules((data as RuleRow[]) ?? []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur chargement des règles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules
      .filter((r) => (filterType ? r.content_type === filterType : true))
      .filter((r) => {
        if (!q) return true;
        return (
          r.code.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.correction_suggestion || "").toLowerCase().includes(q)
        );
      });
  }, [rules, filterType, query]);

  /* ================= FORM HELPERS ================= */
  const resetForm = () => {
    setEditing(null);
    setContentType(filterType || "profile_photo");
    setCode("");
    setLabel("");
    setDescription("");
    setCorrection("");
    setActive(true);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (r: RuleRow) => {
    setEditing(r);
    setContentType(r.content_type);
    setCode(r.code);
    setLabel(r.label);
    setDescription(r.description || "");
    setCorrection(r.correction_suggestion || "");
    setActive(!!r.active);
    setOpen(true);
  };

  /* ================= SAVE ================= */
  const saveRule = async () => {
    if (!contentType.trim())
      return Alert.alert("Erreur", "content_type requis");
    if (!code.trim())
      return Alert.alert("Erreur", "code requis");
    if (!label.trim())
      return Alert.alert("Erreur", "label requis");
    if (!correction.trim())
      return Alert.alert("Erreur", "Correction requise");

    setBusy(true);
    try {
      const payload = {
        content_type: contentType.trim(),
        code: code.trim().toUpperCase(),
        label: label.trim(),
        description: description.trim() || null,
        correction_suggestion: correction.trim(),
        active: !!active,
      };

      const q = supabase.from("cadna_rejection_rules");
      const res = editing
        ? await q.update(payload).eq("id", editing.id)
        : await q.insert(payload);

      if (res.error) throw res.error;

      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d’enregistrer.");
    } finally {
      setBusy(false);
    }
  };

  /* ================= TOGGLE / DELETE ================= */
  const toggleActive = async (r: RuleRow) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("cadna_rejection_rules")
        .update({ active: !r.active })
        .eq("id", r.id);

      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier.");
    } finally {
      setBusy(false);
    }
  };

  const removeRule = async (r: RuleRow) => {
    Alert.alert(
      "Supprimer la règle ?",
      `${r.label} (${r.code})`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const { error } = await supabase
                .from("cadna_rejection_rules")
                .delete()
                .eq("id", r.id);

              if (error) throw error;
              await load();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Suppression impossible.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>Règles de rejet (CADNA)</Text>
        <TouchableOpacity onPress={openCreate} disabled={busy}>
          <Feather name="plus" size={22} color={GOLD} />
        </TouchableOpacity>
      </View>

      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        {filtered.length === 0 ? (
          <Text style={styles.muted}>Aucune règle trouvée.</Text>
        ) : (
          filtered.map((r) => (
            <View key={r.id} style={styles.ruleCard}>
              <Text style={styles.ruleTitle}>
                {r.label} <Text style={styles.ruleCode}>({r.code})</Text>
              </Text>

              {!!r.description && (
                <Text style={styles.ruleDesc}>{r.description}</Text>
              )}

              <Text style={styles.ruleFix}>
                Correction :{" "}
                <Text style={styles.ruleFixStrong}>
                  {r.correction_suggestion}
                </Text>
              </Text>

              <View style={styles.rowBetween}>
                <TouchableOpacity
                  style={[
                    styles.stateBtn,
                    r.active ? styles.stateOn : styles.stateOff,
                  ]}
                  onPress={() => toggleActive(r)}
                  disabled={busy}
                >
                  <Text style={styles.stateText}>
                    {r.active ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 14 }}>
                  <TouchableOpacity onPress={() => openEdit(r)} disabled={busy}>
                    <Feather name="edit-2" size={18} color={GOLD} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRule(r)} disabled={busy}>
                    <Feather name="trash-2" size={18} color={RED} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL */}
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editing ? "Modifier la règle" : "Nouvelle règle"}
            </Text>

            <Text style={styles.label}>Content type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CONTENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    t === contentType && styles.chipActive,
                  ]}
                  onPress={() => setContentType(t)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      t === contentType && styles.chipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Code</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              style={styles.input}
            />

            <Text style={styles.label}>Label</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              style={styles.input}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />

            <Text style={styles.label}>Correction</Text>
            <TextInput
              value={correction}
              onChangeText={setCorrection}
              style={[styles.input, { minHeight: 80 }]}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setOpen(false);
                  resetForm();
                }}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveRule}
                disabled={busy}
                style={[styles.modalSave, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 18, fontWeight: "900" },
  error: { color: RED, textAlign: "center", marginTop: 10 },
  muted: { color: "#777", textAlign: "center" },

  ruleCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 12,
  },

  ruleTitle: { color: "#fff", fontWeight: "900" },
  ruleCode: { color: GOLD },
  ruleDesc: { color: "#999", marginTop: 6 },
  ruleFix: { color: "#bbb", marginTop: 8 },
  ruleFixStrong: { color: GREEN, fontWeight: "900" },

  rowBetween: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  stateBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  stateOn: {
    backgroundColor: "rgba(74,222,128,0.15)",
    borderColor: "rgba(74,222,128,0.35)",
  },
  stateOff: {
    backgroundColor: "rgba(249,115,115,0.12)",
    borderColor: "rgba(249,115,115,0.35)",
  },
  stateText: { color: "#fff", fontWeight: "900" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
  },

  modalTitle: { color: GOLD, fontWeight: "900", marginBottom: 10 },
  label: { color: "#aaa", fontSize: 12, marginTop: 10 },
  input: {
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    color: "#fff",
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    marginRight: 8,
  },
  chipActive: { borderColor: GOLD },
  chipText: { color: "#aaa", fontSize: 12 },
  chipTextActive: { color: GOLD },

  modalActions: { flexDirection: "row", gap: 12, marginTop: 14 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },
  modalCancelText: { color: "#fff", fontWeight: "900" },

  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
  },
  modalSaveText: { color: "#000", fontWeight: "900" },
});
