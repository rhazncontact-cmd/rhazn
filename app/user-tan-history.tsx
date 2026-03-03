import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type TanRow = {
  id: string;
  tan_amount: number;
  created_at: string;
  store_products: {
    title: string;
  } | null;
};

export default function UserTanHistory() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TanRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* ===================== LOAD TAN HISTORY ===================== */
  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user?.id;

        if (!uid) {
          setError("Session expirée.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("tan_rewards")
          .select(`
            id,
            tan_amount,
            created_at,
            store_products (
              title
            )
          `)
          .eq("user_id", uid)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRows(data ?? []);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }: { item: TanRow }) => {
    return (
      <View style={styles.row}>
        <View>
          <Text style={styles.rowTitle}>
            {item.store_products?.title || "Contenu BANQ"}
          </Text>
          <Text style={styles.rowDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>

        <Text style={styles.rowValue}>
          +{item.tan_amount} TAN
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Historique TAN</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* BODY */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>
            Aucun TAN gagné pour le moment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

/* ===============================
   STYLES — Apple-like / RHAZN
=============================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  title: { color: "#FFF", fontSize: 18, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  error: { color: "#fca5a5", fontWeight: "700" },

  empty: { color: "rgba(255,255,255,0.55)", fontWeight: "600" },

  row: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rowTitle: { color: "#FFF", fontWeight: "800", fontSize: 14 },

  rowDate: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    marginTop: 2,
  },

  rowValue: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 14,
  },
});
