// app/leaderboard.tsx
// ✅ FINAL — Leaderboard Créateurs RHAZN
// 🔐 Sécurisé via RLS tables sources
// ⚡ TAN = valeur économique réelle

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

/* ===================== UI CONST ===================== */
const GOLD = "#D4AF37";
const BG = "#000000";
const CARD = "#111111";
const TEXT = "#FFFFFF";
const SUB = "rgba(255,255,255,0.6)";

/* ===================== TYPES ===================== */
type LeaderboardRow = {
  creator_id: string;
  total_tan: number;
  rank: number;
};

/* ===================== SCREEN ===================== */
export default function LeaderboardScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"ALL" | "30D">("ALL");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===================== LOAD ===================== */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const view =
        mode === "30D"
          ? "leaderboard_creators_30d"
          : "leaderboard_creators";

      const { data, error } = await supabase
        .from(view)
        .select("creator_id, total_tan, rank")
        .order("rank", { ascending: true })
        .limit(100);

      if (!mounted) return;

      if (error) {
        console.warn("Leaderboard error:", error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }

      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [mode]);

  /* ===================== UI ===================== */
  return (
    <SafeAreaView style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={22}
          color={TEXT}
          onPress={() => router.back()}
        />

        <Text style={styles.title}>Classement Créateurs</Text>

        <Ionicons name="trophy" size={22} color={GOLD} />
      </View>

      {/* TOGGLE */}
      <View style={styles.toggle}>
        <Text
          style={[
            styles.toggleItem,
            mode === "ALL" && styles.toggleActive,
          ]}
          onPress={() => setMode("ALL")}
        >
          Global
        </Text>

        <Text
          style={[
            styles.toggleItem,
            mode === "30D" && styles.toggleActive,
          ]}
          onPress={() => setMode("30D")}
        >
          30 jours
        </Text>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
          <Text style={{ color: SUB, marginTop: 10 }}>
            Chargement…
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: SUB }}>
            Aucun créateur classé pour le moment
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => i.creator_id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.rank}>#{item.rank}</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.creator}>
                  Créateur RHAZN
                </Text>
                <Text style={styles.sub}>
                  ID: {item.creator_id.slice(0, 8)}…
                </Text>
              </View>

              <Text style={styles.tan}>
                {item.total_tan} TAN
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
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  toggle: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginBottom: 12,
  },

  toggleItem: {
    color: SUB,
    fontSize: 14,
    fontWeight: "700",
  },

  toggleActive: {
    color: GOLD,
    textDecorationLine: "underline",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    marginHorizontal: 14,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },

  rank: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "900",
    width: 36,
    textAlign: "center",
  },

  creator: {
    color: TEXT,
    fontWeight: "800",
    fontSize: 14,
  },

  sub: {
    color: SUB,
    fontSize: 11,
  },

  tan: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 15,
  },
});
