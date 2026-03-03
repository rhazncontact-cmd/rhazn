import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import SecureScreen from "../components/SecureScreen";

const GOLD = "#D4AF37";

type Category = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  price_tan: number;
  is_system: boolean;
  requires_validation: boolean;
  is_active: boolean;
  display_order: number;
};

export default function AdminCategoriesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  /* ===================== LOAD CATEGORIES ===================== */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (!error && data) {
        setCategories(data);
      }

      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SecureScreen scope="RZ-Admin">
      <ScrollView style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Produits & Catégories</Text>
          <Text style={styles.subtitle}>
            Définition des univers RHAZN et des prix de référence
          </Text>
        </View>

        {/* LIST */}
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.card,
              !cat.is_active && { opacity: 0.4 },
            ]}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: "/rz-admin/category-edit",
                params: { category_id: cat.id },
              })
            }
          >
            <View style={styles.row}>
              <Text style={styles.label}>{cat.label}</Text>

              {cat.is_system && (
                <View style={styles.serviceBadge}>
                  <Text style={styles.serviceText}>SERVICE</Text>
                </View>
              )}
            </View>

            <Text style={styles.meta}>Code : {cat.code}</Text>

            <Text style={styles.meta}>
              Prix de base : {cat.price_tan} TAN
            </Text>

            {cat.requires_validation && (
              <Text style={styles.meta}>Validation requise (CADNA)</Text>
            )}

            <View style={styles.actions}>
              <View style={styles.status}>
                <Ionicons
                  name={cat.is_active ? "checkmark-circle" : "close-circle"}
                  size={18}
                  color={cat.is_active ? "#00C853" : "#D32F2F"}
                />
                <Text style={styles.statusText}>
                  {cat.is_active ? "Actif" : "Inactif"}
                </Text>
              </View>

              <Feather name="chevron-right" size={18} color="#888" />
            </View>
          </TouchableOpacity>
        ))}

        {/* ADD */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/rz-admin/category-create")}
        >
          <Ionicons name="add-circle" size={22} color="#000" />
          <Text style={styles.addText}>Ajouter une catégorie</Text>
        </TouchableOpacity>

      </ScrollView>
    </SecureScreen>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },

  header: {
    marginBottom: 18,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  serviceBadge: {
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  serviceText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
  },

  meta: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 4,
  },

  actions: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusText: {
    color: "#aaa",
    fontSize: 12,
  },

  addBtn: {
    marginTop: 20,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  addText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },
});
