import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* 🎨 RHAZN / BANQ */
const COLORS = {
  bg: "#000000",
  card: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.08)",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  gold: "#D4AF37",
};

type TanRow = {
  id: string;
  tan_amount: number;
  created_at: string;
  product: {
    title: string;
    product_type: "AUDIO" | "VIDEO" | "SUSPENTZ";
  } | null;
};

export default function BanqHistory() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TanRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ===================== LOAD ===================== */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        setError("Session expirée.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("banq_tan_logs")
        .select(
          `
          id,
          tan_amount,
          created_at,
          product:store_products (
            title,
            product_type
          )
        `
        )
        .eq("viewer_uid", uid)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (error) {
        setError(error.message || "Erreur de chargement.");
      } else {
        setRows((data as TanRow[]) ?? []);
      }

      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ===================== UI ===================== */
  return (
    <SafeAreaView style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.title}>Historique BANQ</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* BODY */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Aucun TAN généré pour l’instant.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {item.product?.title ?? "Contenu"}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.product?.product_type ?? "—"} •{" "}
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>

              <Text style={styles.rowValue}>
                +{item.tan_amount} TAN
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  error: {
    color: "#fca5a5",
    fontWeight: "700",
  },

  empty: {
    color: COLORS.gray,
    fontWeight: "600",
  },

  row: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rowTitle: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 14,
  },

  rowMeta: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 2,
  },

  rowValue: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 14,
  },
});
