import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AdminGuard from "../../components/AdminGuard";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

/* ================= TYPES ================= */
type CategoryKind = "multimedia" | "text" | "service";

type Category = {
  id: string;
  code: string;
  label: string;
};

/* ================= SCREEN ================= */
export default function AdminProductCategories() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    code?: string;
    label?: string;
    kind?: CategoryKind;
  }>({
    kind: "multimedia",
  });

  /* ================= LOAD ================= */
  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("categories_master")
      .select("id, code, label")
      .order("created_at", { ascending: true });

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      setRows(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= MODAL ================= */
  const openCreate = () => {
    setForm({ kind: "multimedia" });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setForm({ kind: "multimedia" });
  };

  /* ================= SAVE (SUPREME) ================= */
  const save = async () => {
    if (saving) return;

    if (!form.code || !form.label) {
      Alert.alert("Champs requis", "Code et label sont obligatoires.");
      return;
    }

    setSaving(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        Alert.alert("Session expirée");
        return;
      }

      const { data, error } = await supabase.rpc(
        "create_master_category",
        {
          p_code: form.code.toLowerCase().trim(),
          p_label: form.label.trim(),
          p_description: `Catégorie ${form.label}`,
        }
      );

      if (error) throw error;
      if (!data) throw new Error("ID catégorie non retourné");

      Alert.alert(
        "Catégorie créée",
        "Configure maintenant son modèle économique."
      );

      setOpen(false);
      load();

      router.replace({
        pathname: "/rz-admin-governance/admin-finance/ecoformule-category-pricing",
        params: { id: data },
      });

    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Échec de création.");
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>Catégories (SUPREME)</Text>

        <TouchableOpacity onPress={openCreate}>
          <Feather name="plus" size={22} color={GOLD} />
        </TouchableOpacity>
      </View>

      {rows.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>{c.label}</Text>
          <Text style={styles.meta}>{c.code}</Text>
        </View>
      ))}

      {/* MODAL */}
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={closeModal} />

        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Nouvelle catégorie</Text>

          <Field
            label="Code"
            value={form.code}
            onChange={(v: string) => setForm({ ...form, code: v })}
          />

          <Field
            label="Label"
            value={form.label}
            onChange={(v: string) => setForm({ ...form, label: v })}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveText}>
                Enregistrer & Configurer le pricing
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ================= HELPERS ================= */
function Field({ label, value, onChange }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value ?? ""}
        onChangeText={onChange}
        autoCapitalize="characters"
      />
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 18 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { color: GOLD, fontSize: 18, fontWeight: "900" },

  card: {
    backgroundColor: "#0b0b0b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: "#fff", fontWeight: "900" },
  meta: { color: "#777", fontSize: 12, marginTop: 4 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  modalCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    margin: 20,
  },

  modalTitle: { color: GOLD, fontSize: 16, fontWeight: "900", marginBottom: 10 },

  label: { color: "#aaa", fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#000",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    padding: 10,
    color: "#fff",
    marginBottom: 10,
  },

  saveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#000", fontWeight: "900", textAlign: "center" },
});
