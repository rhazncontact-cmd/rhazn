import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

/* ───────── RHAZN • CADNA Premium Palette ───────── */
const COLORS = {
  bg: "#000000",
  card: "#0C0C0E",
  border: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.68)",
  muted2: "rgba(255,255,255,0.5)",
  gold: "#D4AF37",
  blue: "#007AFF",
};

type Item = {
  id: string;
  title: string | null;
  category_code: string;
  created_at: string;
};

export default function CadnaReviewQueue() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);

  /* ================= LOAD QUEUE ================= */
  const load = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("store_products")
        .select("id,title,category_code,created_at")
        .eq("cadna_status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("❌ CADNA queue load error:", error);
        setItems([]);
        return;
      }

      setItems((data ?? []) as Item[]);
    } catch (e) {
      console.error("❌ CADNA queue fatal exception:", e);
      setItems([]);
    } finally {
      // 🔒 empêche le spinner infini quoi qu’il arrive
      setLoading(false);
    }
  };

  useEffect(() => {
  load();

  // 🔥 REALTIME CADNA QUEUE
  const ch = supabase
    .channel("cadna-queue-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "store_products" },
      () => {
        load(); // refresh instantané
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(ch);
  };
}, []);

  /* ───────── Loading ───────── */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.loadingText}>Analyse des contenus CADNA…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.dot} />
          <Text style={styles.brand}>RHAZN • CADNA</Text>
        </View>

        <Text style={styles.title}>File de validation</Text>
        <Text style={styles.subtitle}>
          Contenus soumis par les utilisateurs, en attente de validation morale.
        </Text>
      </View>

      {/* Empty state */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="checkmark-done-outline"
            size={28}
            color={COLORS.muted2}
          />
          <Text style={styles.emptyText}>
            Aucun contenu en attente de validation.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((c, index) => (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push({
                  pathname:
                    "/rz-admin-governance/cadna/cadna-review-content",
                  params: {
                    content_id: c.id,
                    content_type: c.category_code,
                  },
                })
              }
              style={({ pressed }) => [
                styles.card,
                pressed && {
                  transform: [{ scale: 0.985 }],
                  opacity: 0.92,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.indexBox}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {c.title || "Contenu sans titre"}
                  </Text>

                  <Text style={styles.cardMeta}>
                    {c.category_code} •{" "}
                    {new Date(c.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.muted2}
                />
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.pendingBadge}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={COLORS.gold}
                  />
                  <Text style={styles.pendingText}>EN ATTENTE</Text>
                </View>

                <View style={styles.reviewHint}>
                  <Text style={styles.reviewHintText}>
                    Ouvrir pour examiner
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ───────── Styles ───────── */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  container: {
  padding: 20,
  paddingBottom: 40,
  paddingTop: 42,   // ⬅️ AJOUTE CETTE LIGNE (descend le contenu)
},

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontWeight: "700",
  },

  header: { marginBottom: 22 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gold,
  },
  brand: {
    color: COLORS.muted2,
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: "700",
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 18,
  },

  empty: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: "center",
  },

  list: { gap: 14 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  indexBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 13,
  },

  cardTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 16,
  },
  cardMeta: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 12,
  },

  badgeRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  pendingText: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.4,
  },

  reviewHint: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  reviewHintText: {
    color: COLORS.muted2,
    fontSize: 11,
    fontWeight: "700",
  },
});
