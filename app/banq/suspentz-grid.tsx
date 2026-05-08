/* ======================================================
📱 SUSPENTZ GRID — ULTRA PREMIUM • RHAZN • APPLE-LIKE
✅ Preview silencieux TikTok-style au scroll
✅ Image statique en fallback
✅ Nom réel créateur via profiles.full_name
✅ viewabilityConfig + onViewableItemsChanged en useRef
✅ UI haute gamme Apple-like fond blanc
✅ Créateurs + Recherche + Suggestions
✅ Classement supprimé
✅ Scroll au-dessus du Footer RHAZN (safe area)
====================================================== */

import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RHAZN_LOGO from "../../assets/images/rz-logo-trans.png";
import { avatarStore } from "../../lib/avatarStore";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────
// PALETTE APPLE PREMIUM
// ─────────────────────────────────────────────────────────────
const C = {
  bg:         "#F2F2F7",
  card:       "#FFFFFF",
  cardInner:  "#F0F0F5",
  text:       "#0A0A0A",
  sub:        "#6E6E73",
  muted:      "#AEAEB2",
  border:     "#E5E5EA",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.30)",
  danger:     "#FF3B30",
};

const STORAGE_BUCKET = "suspentz";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
// ✅ RANK retiré
type SortMode = "DATE" | "TITLE" | "CREATOR";

type VideoItem = {
  id:              string;
  title:           string | null;
  media_path:      string | null;
  preview_path:    string | null;
  thumbnail_url?:  string | null;
  qob_count?:      number | null;
  created_at?:     string | null;
  owner_uid?:      string | null;
  creator_name?:   string | null;
  creator_avatar?: string | null;
};

type CreatorInfo = {
  uid:         string;
  name:        string;
  avatar:      string | null;
  initials:    string;
  totalQob:    number;
  totalVideos: number;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function getInitials(name?: string | null): string {
  if (!name) return "C";
  const p = name.trim().split(" ").filter(Boolean);
  if (p.length === 1) return (p[0][0] || "C").toUpperCase();
  return ((p[0][0] || "") + (p[1][0] || "")).toUpperCase();
}

function resolveUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("https://") || path.startsWith("http://")) return path;
  try {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch { return null; }
}

function chunk3(list: VideoItem[]): VideoItem[][] {
  const rows: VideoItem[][] = [];
  for (let i = 0; i < list.length; i += 3) rows.push(list.slice(i, i + 3));
  return rows;
}

// ─────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string | null; size?: number }) {
  const initials = getInitials(name);
  const r = Math.round(size * 0.3);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: r }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: C.goldLight, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.gold, fontWeight: "900", fontSize: Math.round(size * 0.38) }}>{initials}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PREVIEW CARD — TikTok-style silent autoplay
// ─────────────────────────────────────────────────────────────
function PreviewCard({ item, isVisible, onPress }: {
  item: VideoItem; isVisible: boolean; onPress: () => void;
}) {
  const videoUri = resolveUrl(item.preview_path || item.media_path);
  const thumbUri = resolveUrl(item.thumbnail_url || item.preview_path);
  const [videoReady, setVideoReady] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 30 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={st.card}>
      <Animated.View style={[st.cardInner, { transform: [{ scale }] }]}>

        {/* ── Zone vidéo 3:4 ── */}
        <View style={st.squareWrap}>

          {thumbUri && !videoReady && (
            <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}

          {videoUri && isVisible && (
            <Video
              source={{ uri: videoUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              shouldPlay={isVisible}
              isLooping
              isMuted
              useNativeControls={false}
              onLoad={() => setVideoReady(true)}
            />
          )}

          {!thumbUri && !videoUri && (
            <View style={[StyleSheet.absoluteFill, st.noMedia]}>
              <Ionicons name="videocam-outline" size={26} color={C.muted} />
            </View>
          )}

          {/* Badge SUSPENTZ bas gauche */}
          <View style={st.cardOverlay} pointerEvents="none">
            <View style={st.cardBadge}>
              <Ionicons name="play" size={9} color="#000" />
              <Text style={st.cardBadgeText}>SUSPENTZ</Text>
            </View>
          </View>

          {/* Indicateur PREVIEW haut droit */}
          {isVisible && videoUri && (
            <View style={st.previewPill}>
              <View style={st.previewDot} />
              <Text style={st.previewText}>PREVIEW</Text>
            </View>
          )}
        </View>

        {/* ── Texte sous la carte ── */}
        <View style={st.cardInfo}>
          <Text numberOfLines={1} style={st.cardTitle}>{item.title ?? "SUSPENTZ"}</Text>
          <View style={st.cardMeta}>
            <Avatar url={item.creator_avatar} name={item.creator_name} size={16} />
            <Text numberOfLines={1} style={st.cardCreator}>{item.creator_name ?? "Créateur"}</Text>
          </View>
          <View style={st.cardQobRow}>
            <Ionicons name="eye-outline" size={10} color={C.gold} />
            <Text style={st.cardQob}>{(item.qob_count ?? 0).toLocaleString()} QOB</Text>
          </View>
        </View>

      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function SuspentzGrid() {
  const router = useRouter();
  // ✅ Safe area pour scroll au-dessus du footer RHAZN
  const insets = useSafeAreaInsets();

  const [all,             setAll]             = useState<VideoItem[]>([]);
  const [query,           setQuery]           = useState("");
  const [focused,         setFocused]         = useState(false);
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const [sortMode,        setSortMode]        = useState<SortMode>("DATE");
  const [creatorMode,     setCreatorMode]     = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorInfo | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [errMsg,          setErrMsg]          = useState<string | null>(null);
  const [visibleIds,      setVisibleIds]      = useState<Set<string>>(new Set());

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const ids = new Set<string>();
    viewableItems.forEach((row: any) => {
      if (Array.isArray(row.item)) row.item.forEach((v: any) => { if (v?.id) ids.add(v.id); });
    });
    setVisibleIds(ids);
  }).current;

  /* ── Load ── */
  const load = useCallback(async (mode: "first" | "refresh" = "first") => {
    if (mode === "first") setLoading(true); else setRefreshing(true);
    setErrMsg(null);

    const { data, error } = await supabase
      .from("store_products")
      .select("id, title, media_path, preview_path, thumbnail_url, qob_count, created_at, owner_uid")
      .eq("category_code", "SUSPENTZ")
      .eq("cadna_status", "approved")
      .not("media_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setErrMsg(error.message);
      setAll([]);
    } else if (data) {
      const ownerIds = [...new Set(data.map((d: any) => d.owner_uid).filter(Boolean))];
      const profilesMap: Record<string, any> = {};

      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ownerIds);
        (profs ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
      }

      const merged: VideoItem[] = data.map((item: any) => {
        const p = profilesMap[item.owner_uid] ?? null;
        return {
          ...item,
          creator_name:   p?.full_name  ?? "Créateur RHAZN",
          creator_avatar: avatarStore.bust(p?.avatar_url ?? null, item.owner_uid),
        };
      });

      setAll(merged);
    }

    if (mode === "first") setLoading(false); else setRefreshing(false);
  }, []);

  useEffect(() => { load("first"); }, [load]);

  // ✅ Recharger si un avatar change globalement
  useEffect(() => {
    return avatarStore.subscribe(() => load("refresh"));
  }, [load]);

  /* ── Suggestions live ── */
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(
      all.map((v) => v.title ?? "").filter(Boolean)
         .filter((t) => t.toLowerCase().includes(q)).slice(0, 6)
    );
  }, [query, all]);

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = selectedCreator
      ? all.filter((v) => v.owner_uid === selectedCreator.uid)
      : all.filter((v) =>
          (v.title ?? "").toLowerCase().includes(q) ||
          (v.creator_name ?? "").toLowerCase().includes(q)
        );

    if (sortMode === "TITLE")   list = [...list].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "fr"));
    if (sortMode === "DATE")    list = [...list].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    if (sortMode === "CREATOR") list = [...list].sort((a, b) => (a.creator_name ?? "").localeCompare(b.creator_name ?? "", "fr"));
    return list;
  }, [all, query, sortMode, selectedCreator]);

  /* ── Sections ── */
  const sections = useMemo(() => {
    if (sortMode !== "TITLE") {
      return [{ title: `${filtered.length} contenu${filtered.length > 1 ? "s" : ""}`, data: chunk3(filtered) }];
    }
    const map: Record<string, VideoItem[]> = {};
    filtered.forEach((v) => {
      const l = (v.title?.[0] ?? "#").toUpperCase();
      if (!map[l]) map[l] = [];
      map[l].push(v);
    });
    return Object.keys(map).sort().map((k) => ({ title: k, data: chunk3(map[k]) }));
  }, [filtered, sortMode]);

  /* ── Liste créateurs ── */
  const creatorsList = useMemo((): CreatorInfo[] => {
    const map: Record<string, CreatorInfo> = {};
    all.forEach((v) => {
      if (!v.owner_uid || map[v.owner_uid]) return;
      map[v.owner_uid] = {
        uid: v.owner_uid, name: v.creator_name ?? "Créateur RHAZN",
        avatar: v.creator_avatar ?? null, initials: getInitials(v.creator_name),
        totalQob: 0, totalVideos: 0,
      };
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [all]);

  const openVideo = (id: string) =>
    router.push({ pathname: "/banq/suspentz", params: { focusId: id } });

  const selectCreator = (c: CreatorInfo) => {
    setSelectedCreator(c); setCreatorMode(false); setSortMode("DATE");
  };

  const handleSort = (k: SortMode) => {
    if (k === "CREATOR") { setSortMode("CREATOR"); setCreatorMode(true); setSelectedCreator(null); }
    else { setSortMode(k); setCreatorMode(false); setSelectedCreator(null); }
  };

  // ✅ paddingBottom dynamique — passe au-dessus du footer RHAZN
  const listPaddingBottom = 100 + insets.bottom;

  /* ══════════════════════════
     VUE : LISTE CRÉATEURS
  ══════════════════════════ */
  if (creatorMode && !selectedCreator) {
    return (
      <SafeAreaView style={st.screen}>
        <View style={st.navBar}>
          <Pressable onPress={() => { setCreatorMode(false); setSortMode("DATE"); }} style={st.navBack}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
            <Text style={st.navBackText}>Retour</Text>
          </Pressable>
          <Text style={st.navTitle}>Créateurs</Text>
          <View style={{ width: 70 }} />
        </View>
        <FlatList
          data={creatorsList}
          keyExtractor={(c) => c.uid}
          // ✅ paddingBottom safe
          contentContainerStyle={{ padding: 16, paddingBottom: listPaddingBottom }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<Text style={st.empty}>Aucun créateur trouvé</Text>}
          renderItem={({ item: c }) => (
            <Pressable style={st.creatorCard} onPress={() => selectCreator(c)}>
              <Avatar url={c.avatar} name={c.name} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={st.creatorName}>{c.name}</Text>
                <Text style={st.creatorSub}>{c.totalVideos} Suspentz</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    );
  }

  /* ══════════════════════════════════════════════════
     VUE PRINCIPALE — GRILLE PREMIUM
  ══════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={st.screen}>

      {/* ── Header ── */}
      <View style={st.header}>
        {selectedCreator ? (
          <Pressable onPress={() => setSelectedCreator(null)} style={st.navBack}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
            <Text style={st.navBackText}>Suspentz</Text>
          </Pressable>
        ) : (
          <Text style={st.headerTitle}>SUSPENTZ</Text>
        )}
        <Image source={RHAZN_LOGO} style={st.logo} resizeMode="contain" />
      </View>

      {/* ── Bannière créateur sélectionné ── */}
      {selectedCreator && (
        <View style={st.creatorBanner}>
          <Avatar url={selectedCreator.avatar} name={selectedCreator.name} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={st.bannerName}>{selectedCreator.name}</Text>
            <Text style={st.bannerSub}>{filtered.length} Suspentz · {selectedCreator.totalQob.toLocaleString()} QOB</Text>
          </View>
          <Pressable onPress={() => setSelectedCreator(null)} style={st.bannerClose}>
            <Ionicons name="close" size={15} color={C.sub} />
          </Pressable>
        </View>
      )}

      {/* ── Search ── */}
      <View style={st.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.muted} />
        <TextInput
          placeholder="Rechercher un Suspentz, un créateur…"
          placeholderTextColor={C.muted}
          style={st.searchInput}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!query && (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* ── Suggestions ── */}
      {focused && suggestions.length > 0 && (
        <View style={st.suggestBox}>
          {suggestions.map((s) => (
            <Pressable key={s} style={st.suggestItem}
              onPress={() => { setQuery(s); setFocused(false); }}>
              <Ionicons name="search-outline" size={12} color={C.muted} />
              <Text style={st.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Sort bar — ✅ RANK supprimé, seulement DATE / TITLE / CREATOR ── */}
      {!selectedCreator && (
        <View style={st.sortBar}>
          {([
            { key: "DATE",    label: "Récent"    },
            { key: "TITLE",   label: "Titre"     },
            { key: "CREATOR", label: "Créateurs" },
          ] as { key: SortMode; label: string }[]).map(({ key: k, label }) => (
            <Pressable
              key={k}
              onPress={() => handleSort(k)}
              style={[st.sortChip, sortMode === k && st.sortChipActive]}
            >
              <Text style={[st.sortChipTxt, sortMode === k && st.sortChipTxtActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Compteur + erreur ── */}
      <View style={st.countRow}>
        <Text style={st.countText}>
          {loading ? "Chargement…" : `${filtered.length} contenu${filtered.length > 1 ? "s" : ""}`}
        </Text>
        {errMsg && <Text style={st.errText}>• {errMsg}</Text>}
      </View>

      {/* ── Grille ── */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={st.centerText}>Chargement des Suspentz…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(_, idx) => String(idx)}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={C.gold} />
          }
          renderSectionHeader={({ section }) => (
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View style={st.gridRow}>
              {[0, 1, 2].map((col) => {
                const it = row[col];
                if (!it) return <View key={col} style={st.cardSpacer} />;
                return (
                  <PreviewCard
                    key={it.id}
                    item={it}
                    isVisible={visibleIds.has(it.id)}
                    onPress={() => openVideo(it.id)}
                  />
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={st.center}>
              <View style={st.emptyIconWrap}>
                <Ionicons name="film-outline" size={30} color={C.gold} />
              </View>
              <Text style={st.emptyTitle}>Aucun Suspentz trouvé</Text>
              <Text style={st.centerText}>
                Vérifie category_code = "SUSPENTZ"{"\n"}et cadna_status = "approved"
              </Text>
            </View>
          }
          // ✅ Scroll passe au-dessus du footer RHAZN
          contentContainerStyle={[st.listContent, { paddingBottom: listPaddingBottom }]}
        />
      )}
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */

const CARD_PCT = "31.5%";

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  navBack:     { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  navBackText: { color: C.text, fontWeight: "700", fontSize: 15 },
  navTitle:    { color: C.text, fontWeight: "900", fontSize: 16 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 10,
  },
  headerTitle: { color: C.text, fontWeight: "900", fontSize: 26, letterSpacing: 1.2 },
  logo:        { width: 80, height: 22 },

  creatorBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: C.goldBorder,
    shadowColor: C.gold, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  bannerName:  { color: C.text,  fontWeight: "900", fontSize: 14 },
  bannerSub:   { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 2 },
  bannerClose: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  searchInput: { flex: 1, color: C.text, fontWeight: "700", fontSize: 14 },

  suggestBox: {
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  suggestItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  suggestText: { color: C.text, fontWeight: "700", fontSize: 13 },

  sortBar:           { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  sortChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  sortChipActive:    { backgroundColor: C.gold, borderColor: "rgba(0,0,0,0.10)" },
  sortChipTxt:       { color: C.sub,  fontWeight: "800", fontSize: 12 },
  sortChipTxtActive: { color: "#000", fontWeight: "900", fontSize: 12 },

  countRow:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  countText: { color: C.muted, fontWeight: "700", fontSize: 12 },
  errText:   { color: C.danger, fontWeight: "800", fontSize: 12 },

  sectionHeader: { paddingHorizontal: 2, paddingTop: 10, paddingBottom: 6 },
  sectionTitle:  { color: C.text, fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },

  // ✅ paddingBottom mis à 0 — géré dynamiquement dans contentContainerStyle
  listContent: { paddingHorizontal: 16, paddingBottom: 0 },
  gridRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  cardSpacer:  { width: CARD_PCT },

  card:      { width: CARD_PCT },
  cardInner: {
    borderRadius: 16, overflow: "hidden",
    backgroundColor: C.card,
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  squareWrap: { width: "100%", aspectRatio: 0.72, backgroundColor: C.cardInner, overflow: "hidden" },
  noMedia:    { backgroundColor: C.cardInner, alignItems: "center", justifyContent: "center" },

  cardOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
    backgroundColor: "rgba(0,0,0,0.28)", justifyContent: "flex-end", alignItems: "flex-start",
    paddingHorizontal: 6, paddingBottom: 6,
  },
  cardBadge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
  cardBadgeText: { color: "#000", fontWeight: "900", fontSize: 8.5, letterSpacing: 0.3 },

  previewPill: { position: "absolute", top: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  previewDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },
  previewText: { color: "#FFF", fontWeight: "900", fontSize: 8, letterSpacing: 0.4 },

  cardInfo:    { padding: 7, gap: 3 },
  cardTitle:   { color: C.text, fontWeight: "800", fontSize: 11.5, lineHeight: 15 },
  cardMeta:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  cardCreator: { color: C.sub, fontWeight: "700", fontSize: 10, flex: 1 },
  cardQobRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardQob:     { color: C.gold, fontWeight: "800", fontSize: 10 },

  creatorCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  creatorName: { color: C.text, fontWeight: "900", fontSize: 15 },
  creatorSub:  { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 2 },

  center:        { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  centerText:    { color: C.muted, fontWeight: "700", fontSize: 13, textAlign: "center", lineHeight: 20 },
  emptyIconWrap: { width: 68, height: 68, borderRadius: 20, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:    { color: C.text, fontWeight: "900", fontSize: 16 },
  empty:         { color: C.muted, fontWeight: "700", textAlign: "center", marginTop: 60 },
});