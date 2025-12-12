import { Feather } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* ====================== TYPES ====================== */
type Suspentz = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  qob_total: number;
  creator_uid: string;
  created_at: string;
};

/* ====================== PAGINATION ====================== */
const PAGE_SIZE = 12;

/* ====================== COMPOSANT ====================== */
export default function LibraryRHAZN() {
  const router = useRouter();
  const { creator } = useLocalSearchParams<{ creator?: string }>();

  const [items, setItems] = useState<Suspentz[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const channelRef = useRef<any>(null);

  /* ================= ANDROID BAR VISIBLE ================= */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible");
    NavigationBar.setBehaviorAsync("inset-swipe");
  }, []);

  /* ================= LOAD DATA ================= */
  const loadSuspentz = async (reset = false) => {
    if (loading || endReached) return;
    setLoading(true);

    const from = reset ? 0 : page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("suspentz")
      .select(
        "id, title, thumbnail_url, qob_total, creator_uid, created_at"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (creator) {
      query = query.eq("creator_uid", creator);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (reset) {
        setItems(data);
      } else {
        setItems((prev) => [...prev, ...data]);
      }

      if (data.length < PAGE_SIZE) setEndReached(true);
      setPage((prev) => prev + 1);
    }

    setLoading(false);
  };

  /* ================= INIT + RESET ================= */
  useEffect(() => {
    setItems([]);
    setPage(0);
    setEndReached(false);
    loadSuspentz(true);
  }, [creator]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    channelRef.current = supabase
      .channel("library-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suspentz" },
        (payload) => {
          const s = payload.new as Suspentz;

          if (creator && s.creator_uid !== creator) return;

          setItems((prev) => {
            const exists = prev.find((x) => x.id === s.id);
            if (exists) {
              return prev.map((x) => (x.id === s.id ? s : x));
            }
            return [s, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [creator]);

  /* ================= NAV ================= */
  const openSuspentz = (id: string) => {
    router.push(`/banq?id=${id}`);
  };

  /* ================= RENDER ================= */
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {creator ? "Bibliothèque du Créateur" : "Bibliothèque RHAZN"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            nativeEvent;

          const nearBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 80;

          if (nearBottom) loadSuspentz();
        }}
        scrollEventThrottle={300}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => openSuspentz(item.id)}
            >
              <Image
                source={{
                  uri:
                    item.thumbnail_url ||
                    "https://via.placeholder.com/400x400",
                }}
                style={styles.image}
              />
              <View style={styles.overlay}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Text style={styles.qob}>{item.qob_total} QOB</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#D4AF37"
            style={{ marginVertical: 30 }}
          />
        )}

        {!loading && items.length === 0 && (
          <Text style={styles.empty}>Aucune création disponible.</Text>
        )}
      </ScrollView>
    </View>
  );
}

/* ====================== STYLES ====================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },

  title: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    height: 220,
    backgroundColor: "#111",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  cardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  qob: {
    marginTop: 4,
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "600",
  },

  empty: {
    color: "#777",
    textAlign: "center",
    marginTop: 60,
    fontSize: 14,
  },
});
