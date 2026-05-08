// app/user-favorites.tsx
// ✅ RHAZN — Mes Favoris • Créateurs & Auteurs suivis • Apple-like blanc

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// PALETTE APPLE LIGHT
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#F2F2F7",
  card:      "#FFFFFF",
  text:      "#111111",
  sub:       "#6E6E73",
  muted:     "#AEAEB2",
  border:    "#E5E5EA",
  gold:      "#D4AF37",
  goldDim:   "rgba(212,175,55,0.10)",
  goldBorder:"rgba(212,175,55,0.25)",
  red:       "#FF3B30",
  separator: "rgba(0,0,0,0.06)",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type FavoriteCreator = {
  id:           string;      // uid du créateur suivi
  full_name:    string | null;
  author_name:  string | null;  // nom entreprise
  avatar_url:   string | null;
  profession:   string | null;
  is_creator:   boolean;
  followed_at:  string;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7)  return `Il y a ${diffDays} jours`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
};

const initials = (name?: string | null) => {
  if (!name) return "R";
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name[0].toUpperCase();
};

const displayName = (f: FavoriteCreator) =>
  f.author_name?.trim() || f.full_name || "Créateur RHAZN";

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
type TypeKey = "TOUS" | "SUSPENTZ" | "PRODUCTS" | "AUDIO" | "VIDEO" | "KOZESANS" | "TEXT" | "IMAGES";

const TYPE_FILTERS: { label: string; key: TypeKey }[] = [
  { label: "Tous",     key: "TOUS"     },
  { label: "Suspentz", key: "SUSPENTZ" },
  { label: "Produits", key: "PRODUCTS" },
  { label: "Audio",    key: "AUDIO"    },
  { label: "Vidéo",    key: "VIDEO"    },
  { label: "KozeSans", key: "KOZESANS" },
  { label: "Texte",    key: "TEXT"     },
  { label: "Images",   key: "IMAGES"   },
];

export default function UserFavorites() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [favorites,    setFavorites]    = useState<FavoriteCreator[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [q,            setQ]            = useState("");
  const [typeFilter,   setTypeFilter]   = useState("TOUS");
  const [periodFilter, setPeriodFilter] = useState<"ALL"|"WEEK"|"MONTH">("ALL");

  // ── Charger les favoris ──
  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setLoading(false); return; }

      // ── SOURCE 1 : Créateurs suivis pour les SUSPENTZ (creator_follows) ──
      const { data: followRows } = await supabase
        .from("creator_follows")
        .select("creator_id, created_at")
        .eq("follower_id", uid)
        .order("created_at", { ascending: false });

      // ── SOURCE 2 : Créateurs dont j'ai payé l'accès aux PRODUITS (author_product_access) ──
      const { data: productAccessRows } = await supabase
        .from("author_product_access")
        .select("author_id, granted_at")
        .eq("user_id", uid)
        .order("granted_at", { ascending: false });

      // Construire une map unifiée : id → { content_types[], followed_at }
      const merged: Record<string, { content_types: Set<string>; followed_at: string }> = {};

      for (const f of followRows ?? []) {
        if (!merged[f.creator_id]) merged[f.creator_id] = { content_types: new Set(), followed_at: f.created_at };
        merged[f.creator_id].content_types.add("SUSPENTZ");
      }

      for (const a of productAccessRows ?? []) {
        if (!merged[a.author_id]) merged[a.author_id] = { content_types: new Set(), followed_at: a.granted_at };
        else if (new Date(a.granted_at) > new Date(merged[a.author_id].followed_at))
          merged[a.author_id].followed_at = a.granted_at;
        merged[a.author_id].content_types.add("PRODUCTS");
      }

      const allIds = Object.keys(merged);
      if (!allIds.length) { setFavorites([]); setLoading(false); return; }

      // Charger les profils
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, author_name, avatar_url, profession, is_creator")
        .in("id", allIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      const list: FavoriteCreator[] = allIds.map(id => {
        const prof = profileMap[id] ?? {};
        const entry = merged[id];
        return {
          id,
          full_name:     prof.full_name   ?? null,
          author_name:   prof.author_name ?? null,
          avatar_url:    prof.avatar_url  ?? null,
          profession:    prof.profession  ?? null,
          is_creator:    prof.is_creator  ?? false,
          followed_at:   entry.followed_at,
          content_types: [...entry.content_types],
        };
      }).sort((a, b) => new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime());

      // Debug
      console.log("DEBUG favorites:", {
        followRows_count:      (followRows ?? []).length,
        prodAccess_count:      (productAccessRows ?? []).length,
        merged_count:          list.length,
        suspentz_ids:          list.filter(f => f.content_types.includes("SUSPENTZ")).map(f => f.id),
        products_ids:          list.filter(f => f.content_types.includes("PRODUCTS")).map(f => f.id),
      });

      setFavorites(list);
    } catch (e) {
      console.warn("loadFavorites error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFavorites(); }, []);
  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  // ── Se désabonner ──
  const unfollow = (item: FavoriteCreator) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      "Se désabonner ?",
      `Vous allez arrêter de suivre ${displayName(item)}.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se désabonner", style: "destructive", onPress: async () => {
          await supabase.rpc("toggle_follow_creator", { p_creator_id: item.id });
          setFavorites(prev => prev.filter(f => f.id !== item.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }},
      ]
    );
  };

  // ── Filtrage ──
  const qNorm      = q.trim().toLowerCase();
  const weekAgo    = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);
  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }, []);

  const filtered = useMemo(() => {
    return favorites.filter(f => {
      const types = f.content_types ?? [];
      if (typeFilter !== "TOUS" && !f.content_types.includes(typeFilter)) return false;
      if (periodFilter === "WEEK"  && new Date(f.followed_at) < weekAgo)    return false;
      if (periodFilter === "MONTH" && new Date(f.followed_at) < monthStart) return false;
      if (!qNorm) return true;
      return [displayName(f), f.profession ?? ""].join(" ").toLowerCase().includes(qNorm);
    });
  }, [favorites, qNorm, typeFilter, periodFilter, weekAgo, monthStart]);

  // ── Render item ──
  const renderItem = ({ item, index }: { item: FavoriteCreator; index: number }) => {
    const isLast = index === filtered.length - 1;
    return (
      <View style={[s.row, !isLast && s.rowBorder]}>
        {/* Avatar — cliquable → page auteur */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/rz-channel/auteur", params: { uid: item.id } } as any)}
          activeOpacity={0.8}
        >
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarInitials}>{initials(item.full_name)}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Infos */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: "/rz-channel/auteur", params: { uid: item.id } } as any)}
          activeOpacity={0.75}
        >
          <View style={s.rowTop}>
            <Text style={s.rowName} numberOfLines={1}>{displayName(item)}</Text>
            {item.is_creator && (
              <View style={s.creatorBadge}>
                <Ionicons name="star" size={9} color="#000" />
                <Text style={s.creatorBadgeTxt}>CRÉATEUR</Text>
              </View>
            )}
          </View>
          {item.profession && (
            <Text style={s.rowDesc} numberOfLines={1}>{item.profession}</Text>
          )}
          <View style={s.rowMeta}>
            <Ionicons name="heart" size={10} color={C.gold} />
            <Text style={s.rowDate}>Suivi depuis {fmtDate(item.followed_at)}</Text>
          </View>
        </TouchableOpacity>

        {/* Bouton désabonnement */}
        <TouchableOpacity
          style={s.unfollowBtn}
          onPress={() => unfollow(item)}
          activeOpacity={0.82}
        >
          <Text style={s.unfollowTxt}>Suivi ✓</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ══ ZONE FIXE TOUJOURS VISIBLE ══ */}
      <View style={s.stickyTop}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Mes Favoris</Text>
            <Text style={s.headerSub}>
              {loading ? "…" : `${favorites.length} créateur${favorites.length !== 1 ? "s" : ""} suivi${favorites.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* ── Filtre TYPE — ligne séparée ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {TYPE_FILTERS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[s.typePill, typeFilter === item.key && s.typePillOn]}
              onPress={() => setTypeFilter(item.key)}
              activeOpacity={0.82}
            >
              <Text style={[s.typeTxt, typeFilter === item.key && s.typeTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

      </View>

      {/* ── STATS ── */}
      {!loading && favorites.length > 0 && (
        <View style={s.statsBanner}>
          <TouchableOpacity style={[s.statItem, periodFilter === "ALL" && s.statItemActive]} onPress={() => setPeriodFilter("ALL")} activeOpacity={0.8}>
            <Text style={[s.statValue, periodFilter === "ALL" && s.statValueActive]}>{favorites.length}</Text>
            <Text style={[s.statLabel, periodFilter === "ALL" && s.statLabelActive]}>Total</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={[s.statItem, periodFilter === "WEEK" && s.statItemActive]} onPress={() => setPeriodFilter(periodFilter === "WEEK" ? "ALL" : "WEEK")} activeOpacity={0.8}>
            <Text style={[s.statValue, periodFilter === "WEEK" && s.statValueActive]}>{favorites.filter(f => new Date(f.followed_at) >= weekAgo).length}</Text>
            <Text style={[s.statLabel, periodFilter === "WEEK" && s.statLabelActive]}>Cette semaine</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity style={[s.statItem, periodFilter === "MONTH" && s.statItemActive]} onPress={() => setPeriodFilter(periodFilter === "MONTH" ? "ALL" : "MONTH")} activeOpacity={0.8}>
            <Text style={[s.statValue, periodFilter === "MONTH" && s.statValueActive]}>{favorites.filter(f => new Date(f.followed_at) >= monthStart).length}</Text>
            <Text style={[s.statLabel, periodFilter === "MONTH" && s.statLabelActive]}>Ce mois</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── SEARCH ── */}
      {!loading && favorites.length > 0 && (
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Rechercher un créateur…"
            placeholderTextColor={C.muted}
            style={s.searchInput}
            autoCapitalize="none" autoCorrect={false}
          />
          {!!q && (
            <TouchableOpacity onPress={() => setQ("")} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── LISTE ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.gold} size="large" />
          <Text style={s.centerTxt}>Chargement…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="heart-outline" size={44} color={C.muted} />
          </View>
          <Text style={s.emptyTitle}>
            {q ? "Aucun résultat" : "Vous ne suivez personne"}
          </Text>
          <Text style={s.emptySub}>
            {q
              ? "Essayez un autre nom"
              : "Abonnez-vous à des créateurs depuis la Channel RHAZN"}
          </Text>
          {!q && (
            <TouchableOpacity
              style={s.discoverBtn}
              onPress={() => router.push("/rz-channel" as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="tv-outline" size={16} color="#000" />
              <Text style={s.discoverTxt}>Explorer la Channel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={() => (
            <View style={s.listHeader}>
              <Text style={s.listHeaderTxt}>
                {filtered.length} créateur{filtered.length !== 1 ? "s" : ""}
                {qNorm ? ` · "${q}"` : ""}
              </Text>
            </View>
          )}
          style={s.listCard}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },

  stickyTop:  { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  pillsRow:   { paddingHorizontal: 16, paddingBottom: 8 },
  typePill:   { borderWidth: 1, borderColor: C.border, paddingVertical: 5, paddingHorizontal: 13, borderRadius: 999, marginRight: 8, backgroundColor: C.card },
  typePillOn: { borderColor: C.gold, backgroundColor: C.gold },
  typeTxt:    { fontWeight: "700", color: C.sub, fontSize: 12 },
  typeTxtOn:  { color: "#000", fontWeight: "900" },
  backBtn:        { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle:    { fontSize: 20, fontWeight: "900", color: C.text },
  headerSub:      { fontSize: 12, color: C.sub, marginTop: 1 },

  statsBanner:    { flexDirection: "row", marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  statItem:       { flex: 1, alignItems: "center", paddingVertical: 14 },
  statValue:      { fontSize: 20, fontWeight: "900", color: C.gold },
  statLabel:      { fontSize: 10, fontWeight: "700", color: C.sub, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  statDivider:    { width: 1, backgroundColor: C.border },

  searchWrap:     { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 44, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput:    { flex: 1, color: C.text, fontWeight: "600", fontSize: 14 },

  listCard:       { marginHorizontal: 16, borderRadius: 18, overflow: "hidden", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  listHeader:     { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.separator },
  listHeaderTxt:  { fontSize: 12, fontWeight: "800", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5 },

  row:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: C.card },
  rowBorder:      { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },

  avatar:         { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: C.goldBorder },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 17, fontWeight: "900", color: C.gold },

  rowTop:         { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  rowName:        { fontSize: 15, fontWeight: "800", color: C.text, flexShrink: 1 },
  creatorBadge:   { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  creatorBadgeTxt:{ fontSize: 8, fontWeight: "900", color: "#000", letterSpacing: 0.5 },
  rowDesc:        { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 4 },
  rowMeta:        { flexDirection: "row", alignItems: "center", gap: 5 },
  rowDate:        { fontSize: 11, color: C.muted, fontWeight: "600" },

  unfollowBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder },
  unfollowTxt:    { fontSize: 12, fontWeight: "800", color: C.gold },

  center:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  centerTxt:      { color: C.sub, fontWeight: "700", fontSize: 14 },
  emptyIcon:      { width: 84, height: 84, borderRadius: 42, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:     { fontSize: 17, fontWeight: "900", color: C.text, textAlign: "center" },
  emptySub:       { fontSize: 13, color: C.sub, textAlign: "center", lineHeight: 19 },
  discoverBtn:    { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  discoverTxt:    { fontSize: 14, fontWeight: "900", color: "#000" },
});