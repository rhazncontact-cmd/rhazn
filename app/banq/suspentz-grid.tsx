import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import RHAZN_LOGO from "../../assets/images/rhazn-logo.png";
import { supabase } from "../../lib/supabase";

/* 🎨 PALETTE RHAZN — APPLE-LIKE PREMIUM */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F5F5F7",
  text: "#1C1C1E",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
  red: "#C62828",
};

/* ✅ IMPORTANT: mets ici ton bucket Supabase Storage si différent */
const STORAGE_BUCKET = "media"; // ex: "rhazn", "store", "public", etc.

type SortMode = "TITLE" | "DATE" | "CREATOR" | "RANK";

type VideoItem = {
  id: string;
  title: string | null;
  media_path: string | null;
  preview_path: string | null;
  qob_count?: number | null;
  created_at?: string | null;

  owner_uid?: string | null;
  profiles?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type RowItem = VideoItem[]; // 1 row = jusqu’à 3 cartes

function isHttpUrl(v?: string | null) {
  return !!v && (v.startsWith("http://") || v.startsWith("https://"));
}

/* 🔗 RESOLVE PREVIEW URL */
function resolvePreviewUrl(preview_path: string | null) {
  if (!preview_path) return null;

  if (isHttpUrl(preview_path)) {
    return preview_path;
  }

  try {
    const { data } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(preview_path);

    return data?.publicUrl ?? null;
  } catch (err) {
    console.warn("Preview URL error:", err);
    return null;
  }
}

/* 🔤 INITIALS CREATOR (Nom + Prénom) */
function getInitials(name?: string | null) {
  if (!name) return "C";

  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "C";

  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() || "C";
  }

  const first = parts[0][0] || "";
  const second = parts[1][0] || "";

  return (first + second).toUpperCase();
}

/* 📦 GRID 3 COLONNES */
function chunk3(list: VideoItem[]): RowItem[] {
  const rows: RowItem[] = [];

  for (let i = 0; i < list.length; i += 3) {
    rows.push(list.slice(i, i + 3));
  }

  return rows;
}

/* =========================
SCREEN
========================= */
export default function SuspentzGrid() {
  const router = useRouter();

  const [all, setAll] = useState<VideoItem[]>([]);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("TITLE");

  const [creatorMode, setCreatorMode] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  /* 🎥 SMART AUTOPLAY — VISIBILITY ENGINE */
const viewabilityConfig = {
  itemVisiblePercentThreshold: 70,
};

const onViewableItemsChanged = ({ viewableItems }: any) => {
  const ids = new Set<string>();

  viewableItems.forEach((row: any) => {
    if (row.item && Array.isArray(row.item)) {
      row.item.forEach((video: any) => {
        if (video?.id) ids.add(video.id);
      });
    }
  });

  setVisibleIds(ids);
};


  const creatorsRanking = useMemo(() => {
  const map: Record<string, any> = {};

  all.forEach((v) => {
    const uid = v.owner_uid;
    if (!uid) return;

    const fullName =
      v.profiles?.full_name ||
      v.profiles?.username ||
      "Creator";

    if (!map[uid]) {
      map[uid] = {
        uid,
        name: fullName,
        avatar: v.profiles?.avatar_url || null,
        initials: getInitials(fullName),
        totalQob: 0,
        totalVideos: 0,
      };
    }

    map[uid].totalQob += v.qob_count || 0;
    map[uid].totalVideos += 1;
  });

  return Object.values(map).sort(
    (a: any, b: any) => b.totalQob - a.totalQob
  );
}, [all]);


const creatorsList = useMemo(() => {
  const map: Record<string, any> = {};

  all.forEach((v) => {
    const p = v.profiles;
    const key = v.owner_uid;
    if (!key) return;

    const fullName =
      p?.full_name ||
      p?.username ||
      "Creator";

    if (!map[key]) {
      map[key] = {
        uid: key,
        name: fullName,
        avatar: p?.avatar_url || null,
        initials: getInitials(fullName), // 🔥 IMPORTANT
      };
    }
  });

  return Object.values(map).sort((a: any, b: any) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
}, [all]);

  /* =========================
     LOAD DATA (SUSPENTZ ONLY)
  ========================= */
  const load = async (mode: "first" | "refresh" = "first") => {
    if (mode === "first") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    setErrMsg(null);

    const { data, error } = await supabase
  .from("store_products")
  .select(`
    id,
    title,
    media_path,
    preview_path,
    qob_count,
    created_at,
    owner_uid
  `)
  .eq("category_code", "SUSPENTZ")
  .eq("cadna_status", "approved")
  .not("media_path", "is", null)
  .order("created_at", { ascending: false })
  .limit(200);

  if (!error && data) {
  const creatorIds = [
    ...new Set(data.map((d) => d.owner_uid).filter(Boolean)),
  ];

  let profilesMap: Record<string, any> = {};

  if (creatorIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("uid, username, full_name, avatar_url")
      .in("uid", creatorIds);

    profs?.forEach((p) => {
      profilesMap[p.uid] = p;
    });
  }

  const merged = data.map((item) => ({
    ...item,
    profiles: profilesMap[item.owner_uid] || null,
  }));

  setAll(merged as VideoItem[]);
}


    if (error) {
      setErrMsg(error.message ?? "Erreur inconnue");
      setAll([]);
    } else {
      
    }

    if (mode === "first") setLoading(false);
    if (mode === "refresh") setRefreshing(false);
  };

  useEffect(() => {
    load("first");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     FILTER + SORT
  ========================= */
  const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  if (selectedCreator) {
    return all.filter((v) => v.owner_uid === selectedCreator.uid);
  }

  let list = all.filter((v) => {
    const title = (v.title ?? "").toLowerCase();
    const creator =
      (v.profiles?.username ?? v.profiles?.full_name ?? "").toLowerCase();

    return title.includes(q) || creator.includes(q);
  });

  if (sortMode === "TITLE") {
    list = [...list].sort((a, b) =>
      (a.title ?? "").localeCompare(b.title ?? "", "fr", { sensitivity: "base" })
    );
  } else if (sortMode === "DATE") {
    list = [...list].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  } else if (sortMode === "CREATOR") {
    list = [...list].sort((a, b) =>
      (a.profiles?.username ?? a.profiles?.full_name ?? "").localeCompare(
        b.profiles?.username ?? b.profiles?.full_name ?? "",
        "fr",
        { sensitivity: "base" }
      )
    );
  }

  return list;
}, [all, query, sortMode]);

  /* =========================
     LIVE SUGGESTIONS
  ========================= */
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    setSuggestions(
      all
        .map((v) => v.title ?? "")
        .filter(Boolean)
        .filter((t) => t.toLowerCase().includes(q))
        .slice(0, 6)
    );
  }, [query, all]);

  /* =========================
     SECTIONS + GRID ROWS
  ========================= */
  const sections = useMemo(() => {
    const list = filtered;

    if (sortMode !== "TITLE") {
      return [
        {
          title: `Résultats (${list.length})`,
          data: chunk3(list),
        },
      ];
    }

    const map: Record<string, VideoItem[]> = {};
    list.forEach((v) => {
      const letter = (v.title?.[0] ?? "#").toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(v);
    });

    return Object.keys(map)
      .sort()
      .map((k) => ({ title: k, data: chunk3(map[k]) }));
  }, [filtered, sortMode]);

  if (creatorMode && !selectedCreator) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <Text style={styles.sectionTitle}>Créateurs</Text>

        {creatorsList.length === 0 && (
          <Text style={{ marginTop: 40, fontWeight: "800" }}>
            Aucun créateur trouvé
          </Text>
        )}

        {creatorsList.map((c: any) => (
          <Pressable
  key={c.uid}
  style={styles.creatorRow}
  onPress={() => {
    setSelectedCreator(c);
    setCreatorMode(false);
    setSortMode("DATE");
  }}
>
  <View style={styles.creatorAvatar}>
    {c.avatar ? (
      <Image source={{ uri: c.avatar }} style={styles.rankAvatarImg} />
    ) : (
      <Text style={{ fontWeight: "900", color: "#000", fontSize: 16 }}>
        {c.initials || getInitials(c.name)}
      </Text>
    )}
  </View>

  {/* Affiche le nom complet du créateur */}
  <Text style={styles.creatorName}>{c.profiles?.full_name ?? c.profiles?.username ?? "Créateur"}</Text>
</Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

if (sortMode === "RANK") {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={[
  styles.sectionTitle,
  {
    marginLeft:16,
    marginTop:50,
    marginBottom:10,
    letterSpacing:0.4
  }
]}>
  🏆 Classement mondial créateurs
</Text>


      {creatorsRanking.map((c: any, i: number) => (
        <Pressable
          key={c.uid}
          style={styles.rankRow}
          onPress={() => {
            setSelectedCreator(c);
            setSortMode("DATE");
          }}
        >
          <Text style={styles.rankNumber}>#{i + 1}</Text>

          <View style={styles.rankAvatar}>
            {c.avatar ? (
  <Image source={{ uri: c.avatar }} style={styles.creatorAvatarImg} />
) : (
  <Text style={{ fontWeight: "900", color:"#000", fontSize:16 }}>
    {getInitials(c.name)}
  </Text>
)}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.rankName}>{c.name}</Text>
            <Text style={styles.rankStats}>
              {c.totalVideos} vidéos • {c.totalQob.toLocaleString()} QOB
            </Text>
          </View>
        </Pressable>
      ))}
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.screen}>
      {/* 🔽 HEADER + SEARCH */}
      <View style={styles.topBlock}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SUSPENTZ</Text>
          <Image source={RHAZN_LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.sub} />
          <TextInput
            placeholder="Rechercher un Suspentz…"
            placeholderTextColor={COLORS.sub}
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>

        {/* mini status */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {loading ? "Chargement…" : `${filtered.length} contenu(s)`}
          </Text>
          {errMsg ? <Text style={styles.statusErr}>• {errMsg}</Text> : null}
        </View>
      </View>

      {/* 🔮 SUGGESTIONS */}
      {focused && suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={styles.suggestItem}
              onPress={() => {
                setQuery(s);
                setFocused(false);
              }}
            >
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 🧬 TRI */}
      <View style={styles.sortBar}>
       {[
  { k: "TITLE", label: "Titre" },
  { k: "DATE", label: "Date" },
  { k: "CREATOR", label: "Créateurs" },
  { k: "RANK", label: "Classement" },
].map((m) => (
          <Pressable
            key={m.k}
            onPress={() => {
  if (m.k === "CREATOR") {
    setSortMode("CREATOR");
    setCreatorMode(true);
    setSelectedCreator(null);
  } else if (m.k === "RANK") {
    setSortMode("RANK");
    setCreatorMode(false);
    setSelectedCreator(null);
  } else {
    setSortMode(m.k as SortMode);
    setCreatorMode(false);
    setSelectedCreator(null);
  }
}}

            style={[styles.sortBtn, sortMode === m.k && styles.sortBtnActive]}
          >
            <Text style={[styles.sortText, sortMode === m.k && styles.sortTextActive]}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ✅ LOADING STATE */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Chargement des Suspentz…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}

          keyExtractor={(_, idx) => String(idx)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
      renderItem={({ item: row }) => (
  <View style={styles.row}>
    {row.map((it) => {
      const url = resolvePreviewUrl(it.preview_path);
      return (
        <Pressable
          key={it.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/banq/suspentz",
              params: {
                focusId: it.id,
                filterQuery: query || null,
                filterMode: sortMode,
              },
            })
          }
        >
          <View style={styles.square}>
            {url ? (
              <Video
                source={{ uri: url }}
                style={styles.squareImage}
                resizeMode="cover"
                shouldPlay={visibleIds.has(it.id)}
                isLooping
                isMuted
                useNativeControls={false}
              />
            ) : (
              <View style={[styles.squareImage,{alignItems:"center",justifyContent:"center"}]}>
                <Ionicons name="videocam" size={22} color="#999" />
              </View>
            )}

            {/* Petit badge YouTube-like */}
            <View style={styles.badge}>
              <Ionicons name="play" size={14} color="#000" />
              <Text style={styles.badgeText}>SUSPENTZ</Text>
            </View>
          </View>

          <Text numberOfLines={1} style={styles.cardTitle}>
            {it.title ?? "SUSPENTZ"}
          </Text>

          <Text style={styles.cardSub}>
            {(it.qob_count ?? 0).toLocaleString()} QOB
          </Text>
        </Pressable>
      );
    })}
  </View>
)}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.centerTitle}>Aucun Suspentz trouvé</Text>
              <Text style={styles.centerText}>
                • Vérifie que tes contenus ont bien :{"\n"}
                category_code = "SUSPENTZ" et cadna_status = "approved"{"\n\n"}
                • Si preview_path est un chemin Storage, ajuste STORAGE_BUCKET.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* =========================
STYLES — PREMIUM
========================= */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
  },

  topBlock: { marginTop: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 25,
    marginTop: 12,
    color: COLORS.text,
  },
  logo: { width: 72, height: 20 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  search: { flex: 1, fontSize: 15, color: COLORS.text },

  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  statusText: { color: COLORS.sub, fontWeight: "700" },
  statusErr: { color: COLORS.red, fontWeight: "800" },

  suggestBox: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginTop: 6,
    overflow: "hidden",
  },
  suggestItem: { padding: 12 },
  suggestText: { fontWeight: "700", color: COLORS.text },

  sortBar: { flexDirection: "row", gap: 8, marginVertical: 14 },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: COLORS.card,
  },
  sortBtnActive: { backgroundColor: COLORS.gold },
  sortText: { fontWeight: "800", color: COLORS.text },
  sortTextActive: { color: "#000" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 10,
    color: COLORS.text,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  card: {
    width: "31.5%",
  },
  cardSpacer: {
    width: "31.5%",
  },

  square: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 6,
  },

  squareImage: { width: "100%", height: "100%" },

  badge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 10.5,
    color: "#000",
    letterSpacing: 0.4,
  },

  cardTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  cardSub: {
    fontSize: 10.5,
    color: COLORS.sub,
    marginTop: 1,
    fontWeight: "700",
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  centerTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },
  centerText: { color: COLORS.sub, fontWeight: "700", textAlign: "center", lineHeight: 18 },

creatorRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderColor: "#eee",
},

creatorAvatar: {
  width: 42,
  height: 42,
  borderRadius: 999,
  backgroundColor: COLORS.gold,
  alignItems: "center",
  justifyContent: "center",
},

creatorAvatarImg: {
  width: "100%",
  height: "100%",
  borderRadius: 999,
},

creatorName: {
  fontWeight: "900",
  fontSize: 15,
  color: COLORS.text,
},

rankRow: {
  flexDirection: "row",
  alignItems: "center",
  padding: 14,
  borderBottomWidth: 1,
  borderColor: "#eee",
  gap: 12,
},

rankNumber: {
  fontWeight: "900",
  fontSize: 16,
  width: 40,
},

rankAvatar: {
  width: 46,
  height: 46,
  borderRadius: 999,
  backgroundColor: COLORS.gold,
  alignItems: "center",
  justifyContent: "center",
},

rankAvatarImg: {
  width: "100%",
  height: "100%",
  borderRadius: 999,
},

rankName: {
  fontWeight: "900",
  fontSize: 15,
  color: COLORS.text,
},

rankStats: {
  color: COLORS.sub,
  fontWeight: "700",
  marginTop: 2,
},

});
