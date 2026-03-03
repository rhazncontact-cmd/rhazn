import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    SectionList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* 🍎 RHAZN — Apple-like premium */
const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  text: "#FFFFFF",
  gray: "#9CA3AF",
  muted: "#6B7280",
  gold: "#D4AF37",
  border: "rgba(255,255,255,0.08)",
};

type LogItem = {
  id: string;
  tan_earned: number;
  seconds_watched: number | null;
  created_at: string;
  store_products?: {
    title: string;
    category_code: string;
  } | null;
};

type Section = {
  title: string;
  data: LogItem[];
};

export default function BanqHistory() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);

  /* ================= LOAD ================= */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("banq_tan_logs")
        .select(
          `
          id,
          tan_earned,
          seconds_watched,
          created_at,
          store_products (
            title,
            category_code
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data as LogItem[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  /* ================= GROUP BY DAY ================= */
  const sections: Section[] = useMemo(() => {
    const groups: Record<string, LogItem[]> = {};

    logs.forEach((log) => {
      const d = new Date(log.created_at);
      const key = d.toDateString(); // ex: Mon Jan 22 2025
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });

    return Object.entries(groups).map(([date, data]) => {
      const today = new Date().toDateString();
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toDateString();

      let title = date;
      if (date === today) title = "Aujourd’hui";
      else if (date === yesterday) title = "Hier";

      return { title, data };
    });
  }, [logs]);

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Feather
          name="arrow-left"
          size={22}
          color={COLORS.text}
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Historique BANQ</Text>
      </View>

      {/* ================= LIST ================= */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const isSuspentz =
            item.store_products?.category_code === "SUSPENTZ";

          return (
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={isSuspentz ? "flash" : "pricetag"}
                  size={16}
                  color={COLORS.gold}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {item.store_products?.title ?? "Interaction RHAZN"}
                </Text>
                <Text style={styles.rowSub}>
                  {item.seconds_watched
                    ? `${item.seconds_watched}s regardées`
                    : "Action système"}
                </Text>
              </View>

              <Text style={styles.amount}>+{item.tan_earned} TAN</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucun historique pour le moment.
          </Text>
        }
      />
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
  },

  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    color: COLORS.gray,
    fontWeight: "800",
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  rowTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 14,
  },

  rowSub: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 11,
  },

  amount: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 13,
  },

  empty: {
    textAlign: "center",
    color: COLORS.gray,
    marginTop: 60,
    fontWeight: "700",
  },
});
