import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

/* 🍎 RHAZN — EcoFormules Admin (FINAL / SUPABASE SAFE / APPLE-LIKE) */

const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  border: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  gold: "#D4AF37",
  danger: "#FF453A",
};

type PricingModel = "pending" | "fixed" | "dynamic" | "formula";

type CategoryEco = {
  master_category_id: string;
  code: string | null;
  label: string | null;
  pricing_model: PricingModel | null;
  base_price_tan: number | null;
};

export default function EcoformuleCategoriesScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CategoryEco[]>([]);

  const [editing, setEditing] = useState<CategoryEco | null>(null);
  const [editModel, setEditModel] = useState<PricingModel>("fixed");
  const [editPrice, setEditPrice] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  /* ================= LOAD ================= */

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "get_ecoformule_categories_admin"
    );

    if (!error && Array.isArray(data)) {
      setRows(data as CategoryEco[]);
    } else {
      setRows([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= EDIT ================= */

  const openEditor = (c: CategoryEco) => {
    setEditing(c);
    setEditModel(c.pricing_model ?? "fixed");
    setEditPrice(c.base_price_tan ?? 1);
  };

  const saveEdit = async () => {
    if (!editing) return;

    if (editModel === "fixed" && editPrice <= 0) {
      setAlert({
        type: "error",
        title: "Prix invalide",
        message: "Le prix doit être strictement supérieur à 0 TAN.",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("ecoformule_categories")
      .upsert(
        {
          master_category_id: editing.master_category_id,
          pricing_model: editModel,
          base_price_tan: editModel === "fixed" ? editPrice : null,
        },
        { onConflict: "master_category_id" }
      );

    setSaving(false);

    if (error) {
      setAlert({
        type: "error",
        title: "Échec d’enregistrement",
        message:
          "La modification n’a pas été appliquée.\nVérifiez Supabase ou votre connexion.",
      });
      return;
    }

    setAlert({
      type: "success",
      title: "Modification réussie",
      message:
        "Le prix a été enregistré avec succès.\nVous pouvez continuer.",
    });

    setEditing(null);
    load();
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>EcoFormules</Text>

        {rows.map((c) => {
          const model = c.pricing_model ?? "pending";

          return (
            <TouchableOpacity
              key={c.master_category_id}
              style={styles.card}
              onPress={() => openEditor(c)}
              activeOpacity={0.9}
            >
              <Text style={styles.label}>{c.label ?? "Catégorie"}</Text>
              <Text style={styles.code}>{c.code ?? "—"}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{model.toUpperCase()}</Text>

                {model === "fixed" && c.base_price_tan != null && (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>
                      {c.base_price_tan} TAN
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ================= MODAL EDIT ================= */}

      {editing && (
        <View style={styles.overlay}>
          <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>
              Modifier — {editing.label ?? "Catégorie"}
            </Text>

            <Text style={styles.editorLabel}>Modèle économique</Text>

            <View style={styles.modelRow}>
              {(["fixed", "dynamic", "formula"] as PricingModel[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setEditModel(m)}
                  style={[
                    styles.modelBtn,
                    editModel === m && styles.modelBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modelText,
                      editModel === m && { color: "#000" },
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editorLabel}>Prix (TAN)</Text>

            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              value={String(editPrice)}
              onChangeText={(v) =>
                setEditPrice(Math.max(0, Number(v) || 0))
              }
            />

            <View style={styles.editorActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveEdit}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? "…" : "Enregistrer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= ALERT PREMIUM ================= */}

      {alert && (
        <View style={styles.overlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>

            <TouchableOpacity
              style={[
                styles.alertBtn,
                alert.type === "error"
                  ? { backgroundColor: COLORS.danger }
                  : { backgroundColor: COLORS.gold },
              ]}
              onPress={() => setAlert(null)}
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: { padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { color: COLORS.gold, marginTop: 10 },

  title: { color: COLORS.gold, fontSize: 22, fontWeight: "900" },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 14,
  },

  label: { color: COLORS.text, fontWeight: "900", fontSize: 15 },
  code: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
  },

  metaText: { color: COLORS.muted, fontWeight: "800" },

  priceBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  priceText: { color: "#000", fontWeight: "900", fontSize: 12 },

  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },

  editorCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },

  editorTitle: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  editorLabel: { color: COLORS.muted, marginTop: 10 },

  modelRow: { flexDirection: "row", gap: 8, marginVertical: 12 },

  modelBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  modelBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },

  modelText: { color: COLORS.gold, fontWeight: "900" },

  priceInput: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: "#FFF",
    marginTop: 6,
  },

  editorActions: { flexDirection: "row", gap: 10, marginTop: 18 },

  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  cancelText: { color: COLORS.muted, fontWeight: "800" },

  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: "center",
  },

  saveText: { color: "#000", fontWeight: "900" },

  alertCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },

  alertTitle: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  alertMessage: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },

  alertBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  alertBtnText: { color: "#000", fontWeight: "900" },
});
