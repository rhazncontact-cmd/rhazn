// ======================================================
// RHAZN — MES GAINS PRO+ (ULTRA PREMIUM • TAN ONLY)
// ✅ Profil réel (DB) + Avatar dynamique (lettre si pas d'image)
// ✅ Revenus = wallet_transactions (RPC creator_products_with_revenue)
// ✅ QOB (au lieu de "vues")
// ✅ Tri par QOB / TAN / Récent
// ✅ Catégories dynamiques serveur (publication_tariffs comme user-publish-pact)
// ✅ UI haute gamme RHAZN
// ✅ Realtime auto refresh
// ✅ Fullscreen classement (swipe down)
// ======================================================

import { Ionicons } from "@expo/vector-icons";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

/* ================= TYPES ================= */

type Work = {
  id: string;
  title: string;
  category_code: string | null;
  created_at: string;
  qob_count: number;
  revenue_tan: number;
  thumbnail_url: string | null;
};

type Profile = {
  username: string | null;
  avatar_url: string | null;
};

type Category = {
  code: string;
  acset_cost: number;
  active: boolean;
};

/* ================= HELPERS ================= */

const safeS = (v: any) => (typeof v === "string" ? v : "");
const safeN = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const humanCategory = (code?: string | null) => {
  const c = (code || "").toUpperCase();
  switch (c) {
    case "SUSPENTZ":
      return "Suspentz";
    case "AUDIO":
      return "Audio";
    case "VIDEO":
      return "Vidéo";
    case "PACT":
      return "PACT";
    case "KOZESANS":
      return "KozeSans";
    case "IMAGES_PUB":
      return "Images";
    default:
      return c || "—";
  }
};

/* ================= AVATAR ================= */

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  const letter = (name?.[0] || "?").toUpperCase();

  if (url) return <Image source={{ uri: url }} style={styles.avatar} />;

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarLetter}>{letter}</Text>
    </View>
  );
}

/* ================= CHIP ================= */

/* ================= APPLE CHIP (MINIMAL) ================= */

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.appleChip, active && styles.appleChipActive]}
    >
      <Text style={[styles.appleChipText, active && styles.appleChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ================= SCREEN ================= */

export default function UserMesGainsProPlus() {
  const [loading, setLoading] = useState(true);

  const [works, setWorks] = useState<Work[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  // catégories serveur (comme user-publish-pact)
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  // PRO states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<"qob" | "tan" | "recent">("qob"); // ✅ par défaut : QOB

  // FULLSCREEN CLASSEMENT
  const [rankOpen, setRankOpen] = useState(false);

  const screenH = Dimensions.get("window").height;
  const translateY = useState(new Animated.Value(screenH))[0];

  /* =====================================================
     FULLSCREEN CLASSEMENT FUNCTIONS
  ===================================================== */

  const openRanking = () => {
    setRankOpen(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const closeRanking = () => {
    Animated.timing(translateY, {
      toValue: screenH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setRankOpen(false));
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120) closeRanking();
      else openRanking();
    },
  });

  /* =====================================================
     LOAD ALL (profil + works + categories)
  ===================================================== */

  const loadProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    const { data: p } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", uid)
      .single();

    setProfile(p || null);
  };

  const loadWorks = async () => {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return;

  /* -------------------------------
     1️⃣ LOAD PRODUCTS (TOUJOURS)
  -------------------------------- */
  const { data: products, error: e1 } = await supabase
    .from("store_products")
    .select(`
      id,
      title,
      category_code,
      created_at,
      qob_count,
      thumbnail_url
    `)
    .eq("owner_uid", uid);

  if (e1 || !products) {
    console.log(e1);
    setWorks([]);
    return;
  }

  /* -------------------------------
     2️⃣ LOAD TAN REVENUE (OPTIONNEL)
  -------------------------------- */
  const { data: revenueRows } = await supabase
    .from("creator_video_tan")
    .select("content_id, revenue_tan");

  /* -------------------------------
     3️⃣ MAP REVENUE → DICTIONARY
  -------------------------------- */
  const revenueMap: Record<string, number> = {};

  (revenueRows || []).forEach((r: any) => {
    revenueMap[r.content_id] = Number(r.revenue_tan) || 0;
  });

  /* -------------------------------
     4️⃣ MERGE
  -------------------------------- */
  const rows: Work[] = products.map((p: any) => ({
    id: p.id,
    title: p.title,
    category_code: p.category_code,
    created_at: p.created_at,
    qob_count: p.qob_count || 0,
    thumbnail_url: p.thumbnail_url,
    revenue_tan: revenueMap[p.id] || 0, // ✅ toujours visible même 0
  }));

  setWorks(rows);
};

  const loadCategories = async () => {
    setCatsLoading(true);
    try {
      const { data, error } = await supabase
        .from("publication_tariffs")
        .select("code, acset_cost, active")
        .eq("active", true)
        .order("acset_cost", { ascending: true });

      if (error) throw error;

      setCategories((data as Category[]) || []);
    } catch {
      setCategories([]);
    } finally {
      setCatsLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadWorks(), loadCategories()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* =====================================================
     REALTIME AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    let channel: RealtimeChannel;

    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id;
      if (!uid) return;

      channel = supabase
        .channel("gains-proplus-live")

        // ventes / gains TAN
        .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, loadWorks)

        // produits (qob_count, thumbnail, title, etc.)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "store_products", filter: `owner_uid=eq.${uid}` },
          loadWorks
        )

        // profil (avatar, username)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
          loadProfile
        )

        // catégories (publication_tariffs)
        .on("postgres_changes", { event: "*", schema: "public", table: "publication_tariffs" }, loadCategories)

        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* =====================================================
     DERIVED
  ===================================================== */

  const totalTan = useMemo(() => works.reduce((a, w) => a + safeN(w.revenue_tan), 0), [works]);
  const totalQob = useMemo(() => works.reduce((a, w) => a + safeN(w.qob_count), 0), [works]);

  const categoryCodes = useMemo(() => {
    // toutes les catégories serveur + ALL
    const codes = categories.map((c) => c.code).filter(Boolean);
    return ["ALL", ...codes];
  }, [categories]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    let list = [...works];

    // search
    if (s) {
      list = list.filter((w) => safeS(w.title).toLowerCase().includes(s));
    }

    // category filter
    if (typeFilter !== "ALL") {
      list = list.filter((w) => (w.category_code || "").toUpperCase() === typeFilter.toUpperCase());
    }

    // sort
    if (sort === "qob") list.sort((a, b) => safeN(b.qob_count) - safeN(a.qob_count)); // ✅ QOB
    if (sort === "tan") list.sort((a, b) => safeN(b.revenue_tan) - safeN(a.revenue_tan));
    if (sort === "recent")
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [works, search, typeFilter, sort]);

  const best = useMemo(() => {
    if (!filtered.length) return null;
    return filtered[0];
  }, [filtered]);

  /* =====================================================
     UI
  ===================================================== */

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.bootText}>Chargement des gains…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* ================= HEADER PREMIUM ================= */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar url={profile?.avatar_url} name={profile?.username} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hName} numberOfLines={1}>
              {profile?.username || "Utilisateur"}
            </Text>
            <Text style={styles.hSub} numberOfLines={1}>
              Revenus TAN • Audience QOB
            </Text>
          </View>
        </View>

        <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.headerChipsRow}
>
  {categoryCodes.map((code) => (
    <Chip
      key={code}
      label={code === "ALL" ? "Toutes" : humanCategory(code)}
      active={typeFilter.toUpperCase() === code.toUpperCase()}
      onPress={() => setTypeFilter(code)}
    />
  ))}
</ScrollView>

      </View>

      {/* ================= SEARCH ================= */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.55)" />
        <TextInput
          placeholder="Rechercher une œuvre…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!search && (
          <Pressable onPress={() => setSearch("")} style={styles.clearBtn}>
            <Ionicons name="close" size={16} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* ================= SORT ================= */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Classement</Text>
        <Text style={styles.sectionHint}>par défaut : QOB</Text>
      </View>

      <View style={styles.sortRow}>
  <Chip
    label={`QOB • ${totalQob.toLocaleString()}`}
    active={sort === "qob"}
    onPress={() => setSort("qob")}
  />

  <Chip
    label={`TAN • ${totalTan.toLocaleString()}`}
    active={sort === "tan"}
    onPress={() => setSort("tan")}
  />

  <Chip
    label="Récent"
    active={sort === "recent"}
    onPress={() => setSort("recent")}
  />
</View>

      {/* ================= TOP HIGHLIGHT ================= */}
      {best ? (
        <Pressable onPress={openRanking} style={styles.topCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.topLabel}>TOP {sort === "qob" ? "QOB" : sort === "tan" ? "TAN" : "RÉCENT"}</Text>
            <Text style={styles.topTitle} numberOfLines={1}>
              {best.title}
            </Text>
            <Text style={styles.topMeta}>
              {humanCategory(best.category_code)} • 👁️ {best.qob_count} QOB • 💰 {best.revenue_tan} TAN
            </Text>
          </View>
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>🔥</Text>
          </View>
        </Pressable>
      ) : null}

      {/* ================= LIST ================= */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucune œuvre trouvée pour ce filtre.
          </Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                {index < 3 && (safeN(item.qob_count) > 0 || safeN(item.revenue_tan) > 0) ? (
                  <View style={styles.rankChip}>
                    <Text style={styles.rankChipText}>TOP {index + 1}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.meta}>
                {humanCategory(item.category_code)} • {new Date(item.created_at).toLocaleDateString()}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Ionicons name="eye-outline" size={14} color={GOLD} />
                  <Text style={styles.statText}>{item.qob_count} QOB</Text>
                </View>

                <View style={styles.statPill}>
                  <Ionicons name="cash-outline" size={14} color={GOLD} />
                  <Text style={styles.statText}>{item.revenue_tan} TAN</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* ================= FULLSCREEN CLASSEMENT MODAL ================= */}
      <Modal visible={rankOpen} transparent animationType="none">
        <Animated.View
          style={[
            styles.rankSheet,
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <Text style={styles.rankTitle}>Classement complet</Text>

          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: 18, paddingBottom: 80 }}
            renderItem={({ item, index }) => (
              <View style={styles.rankRow}>
                <Text style={styles.rankIndex}>#{index + 1}</Text>
                <Text style={styles.rankName} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rankValue}>
                  {sort === "tan"
                    ? `${item.revenue_tan} TAN`
                    : `${item.qob_count} QOB`}
                </Text>
              </View>
            )}
          />
        </Animated.View>
      </Modal>
    </View>
  );
}

/* ================= STYLES (RHAZN HIGH-END) ================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },

  boot: { flex: 1, justifyContent: "center", alignItems: "center" },
  bootText: { marginTop: 10, color: "rgba(255,255,255,0.55)", fontWeight: "800" },

  header: {
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: { width: 54, height: 54, borderRadius: 16 },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#000", fontWeight: "900", fontSize: 18 },

  hName: { color: "#FFF", fontWeight: "900", fontSize: 18 },
  hSub: { color: "rgba(255,255,255,0.55)", fontWeight: "800", marginTop: 2, fontSize: 12 },

  kpiMini: { flexDirection: "row", gap: 10 },
  kpiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  kpiText: { color: GOLD, fontWeight: "900", fontSize: 12 },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: { flex: 1, color: "#FFF", fontWeight: "900", fontSize: 13 },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  sectionRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: { color: "#FFF", fontWeight: "900", fontSize: 13 },
  sectionHint: { color: "rgba(255,255,255,0.45)", fontWeight: "800", fontSize: 11 },

  chipsRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10 },
  sortRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    maxWidth: 180,
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: "rgba(0,0,0,0.30)",
  },
  chipText: { color: "rgba(255,255,255,0.80)", fontWeight: "900", fontSize: 12 },
  chipTextActive: { color: "#000" },

  topCard: {
    marginTop: 14,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    backgroundColor: "rgba(212,175,55,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topLabel: { color: GOLD, fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
  topTitle: { color: "#FFF", fontWeight: "900", fontSize: 14, marginTop: 4 },
  topMeta: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12, marginTop: 6 },
  topBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
  },
  topBadgeText: { fontSize: 18 },

  empty: { color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 60, fontWeight: "800" },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
    marginBottom: 12,
  },

  thumb: { width: 72, height: 72, borderRadius: 14 },
  thumbPlaceholder: { width: 72, height: 72, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)" },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: "#FFF", fontWeight: "900", fontSize: 14, flex: 1 },

  rankChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
  },
  rankChipText: { color: GOLD, fontWeight: "900", fontSize: 11 },

  meta: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 12, marginTop: 6 },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.20)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  statText: { color: GOLD, fontWeight: "900", fontSize: 12 },

  /* FULLSCREEN CLASSEMENT */
  rankSheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    paddingTop: 70,
  },

  rankTitle: {
    color: GOLD,
    fontWeight: "900",
    fontSize: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },

  rankIndex: {
    color: GOLD,
    fontWeight: "900",
    width: 40,
  },

  rankName: {
    flex: 1,
    color: "#FFF",
    fontWeight: "800",
  },

  rankValue: {
    color: GOLD,
    fontWeight: "900",
  },

  /* ================= APPLE LIKE CHIPS ================= */

headerChipsRow: {
  flexDirection: "row",
  gap: 8,
  marginTop: 6,
},

appleChip: {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 999,

  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",

  justifyContent: "center",
  alignItems: "center",
},

appleChipActive: {
  backgroundColor: GOLD,
  borderColor: "rgba(0,0,0,0.3)",
},

appleChipText: {
  fontSize: 12,
  fontWeight: "800",
  color: "rgba(255,255,255,0.75)",
},

appleChipTextActive: {
  color: "#000",
},


});