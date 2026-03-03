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
import { supabase } from "../../../lib/supabase";

/* 🍎 RHAZN — EcoFormule Categories (Premium Admin) */

const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  gold: "#D4AF37",
  green: "#00C853",
  red: "#E53935",
};

type CategoryEco = {
  master_category_id: string;
  code: string;
  label: string;
  pricing_model: "pending" | "fixed" | "dynamic" | "formula";
  base_price_tan: number | null;
};

export default function EcoformuleCategoriesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CategoryEco[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  /* ================= LOAD ================= */
  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "get_ecoformule_categories_admin"
    );

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de charger les catégories.");
      setRows([]);
    } else {
      setRows(data as CategoryEco[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ================= ACTIVATE + REDIRECT ================= */
  const activateAndRedirect = async (
    master_category_id: string,
    model: CategoryEco["pricing_model"]
  ) => {
    setSavingId(master_category_id);

    const { error } = await supabase
      .from("ecoformule_categories")
      .update({
        pricing_model: model,
        base_price_tan: model === "fixed" ? 1 : 0,
      })
      .eq("master_category_id", master_category_id);

    setSavingId(null);

    if (error) {
      Alert.alert("Erreur", "Activation échouée.");
      return;
    }

    // 🔐 Redirection OBLIGATOIRE vers le pricing
    router.push({
      pathname: "/rz-admin-governance/admin-finance/ecoformule-category-pricing",
      params: { id: master_category_id },
    });
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>EcoFormules</Text>
      <Text style={styles.subtitle}>
        Une catégorie ne devient active qu’après définition de son pricing.
      </Text>

      {rows.map((c) => {
        const isPending = c.pricing_model === "pending";

        return (
          <View key={c.master_category_id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.label}>{c.label}</Text>
                <Text style={styles.code}>{c.code}</Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    borderColor: isPending
                      ? "rgba(229,57,53,0.35)"
                      : "rgba(0,200,83,0.35)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isPending ? COLORS.red : COLORS.green },
                  ]}
                >
                  {c.pricing_model}
                </Text>
              </View>
            </View>

            {isPending ? (
              <View style={styles.actions}>
                <ActionBtn
                  label="Fixe"
                  onPress={() =>
                    activateAndRedirect(c.master_category_id, "fixed")
                  }
                  loading={savingId === c.master_category_id}
                />
                <ActionBtn
                  label="Dynamique"
                  onPress={() =>
                    activateAndRedirect(c.master_category_id, "dynamic")
                  }
                  loading={savingId === c.master_category_id}
                />
                <ActionBtn
                  label="Formule"
                  onPress={() =>
                    activateAndRedirect(c.master_category_id, "formula")
                  }
                  loading={savingId === c.master_category_id}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.editPricingBtn}
                onPress={() =>
                  router.push({
                    pathname: "/rz-admin-governance/admin-finance/ecoformule-category-pricing",
                    params: { id: c.master_category_id },
                  })
                }
              >
                <Text style={styles.editPricingText}>
                  Modifier le pricing →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ================= UI HELPERS ================= */

function ActionBtn({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    color: COLORS.gold,
    marginTop: 10,
    fontWeight: "700",
  },

  title: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 18,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 15,
  },

  code: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },

  badgeText: {
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  btn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  btnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 13,
  },

  editPricingBtn: {
    marginTop: 14,
    paddingVertical: 10,
  },

  editPricingText: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 13,
  },
});
