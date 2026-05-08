// app/user-followers.tsx
// ✅ RHAZN — Mes Abonnés (payants)
// Abonné = utilisateur qui a PAYÉ pour accéder à vos contenus
//   • author_product_access → accès Produits
//   • user_paid_contents    → accès Suspentz
// Filtre TYPE : Tous / Suspentz / Produits

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
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
// PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#F2F2F7",
  card:     "#FFFFFF",
  text:     "#111111",
  sub:      "#6E6E73",
  muted:    "#AEAEB2",
  border:   "#E5E5EA",
  separator:"rgba(0,0,0,0.06)",
  gold:     "#D4AF37",
  goldDim:  "rgba(212,175,55,0.12)",
  goldBorder:"rgba(212,175,55,0.28)",
  green:    "#34C759",
  blue:     "#007AFF",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type AccessType = "products" | "suspentz";

type Follower = {
  id:           string;         // uid de l'abonné
  full_name:    string | null;
  avatar_url:   string | null;
  access_types: AccessType[];   // ["products"] ou ["suspentz"] ou les deux
  access_since: string;         // date du premier accès
};

type TypeKey = "TOUS" | "SUSPENTZ" | "PRODUCTS" | "AUDIO" | "VIDEO" | "KOZESANS" | "TEXT" | "IMAGES";

const TYPE_FILTERS: { label: string; key: TypeKey }[] = [
  { label: "Tous",      key: "TOUS"      },
  { label: "Suspentz",  key: "SUSPENTZ"  },
  { label: "Produits",  key: "PRODUCTS"  },
  { label: "Audio",     key: "AUDIO"     },
  { label: "Vidéo",     key: "VIDEO"     },
  { label: "KozeSans",  key: "KOZESANS"  },
  { label: "Texte",     key: "TEXT"      },
  { label: "Images",    key: "IMAGES"    },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
};

const initials = (name?: string | null) => {
  if (!name) return "R";
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name[0].toUpperCase();
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function UserFollowers() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [followers,    setFollowers]    = useState<Follower[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [q,            setQ]            = useState("");
  const [typeFilter,   setTypeFilter]   = useState<TypeKey>("TOUS");
  const [periodFilter, setPeriodFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");

  // ── Charger les abonnés payants ──
  const loadFollowers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { setLoading(false); return; }

      // 1. Abonnés Produits (author_product_access)
      const { data: prodAccess } = await supabase
        .from("author_product_access")
        .select("user_id, granted_at")
        .eq("author_id", uid);

      // 2. Abonnés Suspentz = ceux qui ont cliqué "Suivre" dans banq/suspentz
      //    Source : creator_follows (follower_id = celui qui suit, creator_id = moi)
      const { data: followRows } = await supabase
        .from("creator_follows")
        .select("follower_id, created_at")
        .eq("creator_id", uid);

      // Transformer en format compatible avec le reste
      const spAccess = (followRows ?? []).map((r: any) => ({
        user_uid:   r.follower_id,
        created_at: r.created_at,
      }));

      // 3. Fusionner — un utilisateur peut avoir les deux types
      const accessMap: Record<string, { types: Set<AccessType>; since: string }> = {};

      (prodAccess ?? []).forEach((r: any) => {
        if (!accessMap[r.user_id]) accessMap[r.user_id] = { types: new Set(), since: r.granted_at };
        accessMap[r.user_id].types.add("products");
        // Garder la date la plus ancienne
        if (r.granted_at < accessMap[r.user_id].since) accessMap[r.user_id].since = r.granted_at;
      });

      spAccess.forEach((r: any) => {
        if (!accessMap[r.user_uid]) accessMap[r.user_uid] = { types: new Set(), since: r.created_at };
        accessMap[r.user_uid].types.add("suspentz");
        if (r.created_at < accessMap[r.user_uid].since) accessMap[r.user_uid].since = r.created_at;
      });

      // Exclure soi-même
      delete accessMap[uid];



      const allUids = Object.keys(accessMap);
      if (!allUids.length) { setFollowers([]); setLoading(false); return; }

      // 4. Récupérer les profils
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", allUids);

      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      const list: Follower[] = allUids.map(followerId => {
        const prof   = profileMap[followerId] ?? {};
        const access = accessMap[followerId];
        return {
          id:           followerId,
          full_name:    prof.full_name  ?? null,
          avatar_url:   prof.avatar_url ?? null,
          access_types: [...access.types],
          access_since: access.since,
          // ✅ content_types basé sur access_types pour le filtre
          content_types: [...access.types].map(t => t === "suspentz" ? "SUSPENTZ" : t === "products" ? "PRODUCTS" : t.toUpperCase()),
        };
      }).sort((a, b) => new Date(b.access_since).getTime() - new Date(a.access_since).getTime());

      console.log("DEBUG followers:", {
        followRows_count:  (followRows ?? []).length,
        prodAccess_count:  (prodAccess ?? []).length,
        merged_count:      list.length,
        suspentz_ids:      list.filter(f => f.content_types.includes("SUSPENTZ")).map(f => f.id),
        products_ids:      list.filter(f => f.content_types.includes("PRODUCTS")).map(f => f.id),
      });
      setFollowers(list);
    } catch (e) {
      console.warn("loadFollowers error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFollowers(); }, []);
  useFocusEffect(useCallback(() => { loadFollowers(); }, [loadFollowers]));

  // ── Filtrage ──
  const weekAgo    = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, []);
  const monthStart = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }, []);

  const qNorm   = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return followers.filter(f => {
      // Filtre TYPE
      // Filtre TYPE via content_types
      if (typeFilter !== "TOUS" && !f.content_types.includes(typeFilter)) return false;
      // Filtre PÉRIODE
      if (periodFilter === "WEEK"  && new Date(f.access_since) < weekAgo)    return false;
      if (periodFilter === "MONTH" && new Date(f.access_since) < monthStart)  return false;
      // Recherche
      if (qNorm) return (f.full_name ?? "").toLowerCase().includes(qNorm);
      return true;
    });
  }, [followers, typeFilter, periodFilter, qNorm, weekAgo, monthStart]);

  // ── Compteurs ──
  const countAll   = followers.length;
  const countWeek  = useMemo(() => followers.filter(f => new Date(f.access_since) >= weekAgo).length,   [followers, weekAgo]);
  const countMonth = useMemo(() => followers.filter(f => new Date(f.access_since) >= monthStart).length, [followers, monthStart]);
  const countSp    = useMemo(() => followers.filter(f => f.access_types.includes("suspentz")).length, [followers]);
  const countProd  = useMemo(() => followers.filter(f => f.access_types.includes("products")).length, [followers]);

  // ── Render ──
  const renderItem = ({ item, index }: { item: Follower; index: number }) => {
    const isLast = index === filtered.length - 1;
    return (
      <TouchableOpacity
        style={[s.row, !isLast && s.rowBorder]}
        onPress={() => router.push({ pathname: "/rz-channel/auteur", params: { uid: item.id } } as any)}
        activeOpacity={0.75}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.avatar} />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitials}>{initials(item.full_name)}</Text>
          </View>
        )}

        <View style={s.rowInfo}>
          <Text style={s.rowName} numberOfLines={1}>
            {item.full_name ?? "Utilisateur RHAZN"}
          </Text>
          {/* Badges types d'accès */}
          <View style={s.badgesRow}>
            {item.access_types.includes("suspentz") && (
              <View style={[s.badge, { backgroundColor: C.goldDim, borderColor: C.goldBorder }]}>
                <Ionicons name="play-circle" size={10} color={C.gold} />
                <Text style={[s.badgeTxt, { color: C.gold }]}>Suspentz</Text>
              </View>
            )}
            {item.access_types.includes("products") && (
              <View style={[s.badge, { backgroundColor: "rgba(0,122,255,0.10)", borderColor: "rgba(0,122,255,0.28)" }]}>
                <Ionicons name="cube" size={10} color={C.blue} />
                <Text style={[s.badgeTxt, { color: C.blue }]}>Produits</Text>
              </View>
            )}
          </View>
          <View style={s.rowMeta}>
            <Ionicons name="calendar-outline" size={11} color={C.muted} />
            <Text style={s.rowDate}>Accès depuis le {fmtDate(item.access_since)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ══ ZONE FIXE ══ */}
      <View style={s.stickyTop}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Mes Abonnés</Text>
            <Text style={s.headerSub}>
              {loading ? "…" : `${filtered.length} abonné${filtered.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* Filtre TYPE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {TYPE_FILTERS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[s.typePill, typeFilter === item.key && s.typePillOn]}
              onPress={() => setTypeFilter(item.key)}
              activeOpacity={0.82}
            >
              <Text style={[s.typeTxt, typeFilter === item.key && s.typeTxtOn]}>
                {item.label}
                {item.key === "SUSPENTZ" && !loading && ` (${countSp})`}
                {item.key === "PRODUCTS" && !loading && ` (${countProd})`}
                {item.key === "TOUS"     && !loading && ` (${countAll})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── STATS CLIQUABLES ── */}
      {!loading && (
        <View style={s.statsBanner}>
          <TouchableOpacity
            style={[s.statItem, periodFilter === "ALL" && s.statItemActive]}
            onPress={() => setPeriodFilter("ALL")}
            activeOpacity={0.8}
          >
            <Text style={[s.statValue, periodFilter === "ALL" && s.statValueActive]}>{countAll}</Text>
            <Text style={[s.statLabel, periodFilter === "ALL" && s.statLabelActive]}>Total</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={[s.statItem, periodFilter === "WEEK" && s.statItemActive]}
            onPress={() => setPeriodFilter(periodFilter === "WEEK" ? "ALL" : "WEEK")}
            activeOpacity={0.8}
          >
            <Text style={[s.statValue, periodFilter === "WEEK" && s.statValueActive]}>{countWeek}</Text>
            <Text style={[s.statLabel, periodFilter === "WEEK" && s.statLabelActive]}>Cette semaine</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={[s.statItem, periodFilter === "MONTH" && s.statItemActive]}
            onPress={() => setPeriodFilter(periodFilter === "MONTH" ? "ALL" : "MONTH")}
            activeOpacity={0.8}
          >
            <Text style={[s.statValue, periodFilter === "MONTH" && s.statValueActive]}>{countMonth}</Text>
            <Text style={[s.statLabel, periodFilter === "MONTH" && s.statLabelActive]}>Ce mois</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── SEARCH ── */}
      {!loading && followers.length > 0 && (
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Rechercher un abonné…"
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
            <Ionicons name="people-outline" size={44} color={C.muted} />
          </View>
          <Text style={s.emptyTitle}>
            {typeFilter !== "TOUS" ? `Aucun abonné ${typeFilter === "SUSPENTZ" ? "Suspentz" : "Produits"}` : "Aucun abonné"}
          </Text>
          <Text style={s.emptySub}>
            {typeFilter !== "TOUS"
              ? "Personne n'a encore payé pour ce type de contenu."
              : "Publiez des contenus pour attirer des abonnés payants."}
          </Text>
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
                {filtered.length} abonné{filtered.length !== 1 ? "s" : ""}
                {typeFilter !== "TOUS" ? ` · ${typeFilter === "SUSPENTZ" ? "Suspentz" : "Produits"}` : ""}
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
  container:    { flex: 1, backgroundColor: C.bg },
  stickyTop:    { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 20, fontWeight: "900", color: C.text },
  headerSub:    { fontSize: 12, color: C.sub, marginTop: 1 },

  pillsRow:     { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 0 },
  typePill:     { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, marginRight: 8, backgroundColor: C.card },
  typePillOn:   { borderColor: C.gold, backgroundColor: C.gold },
  typeTxt:      { fontWeight: "700", color: C.sub, fontSize: 12 },
  typeTxtOn:    { color: "#000", fontWeight: "900" },

  statsBanner:  { flexDirection: "row", marginHorizontal: 16, marginTop: 12, marginBottom: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  statItem:     { flex: 1, alignItems: "center", paddingVertical: 14 },
  statItemActive:{ backgroundColor: C.goldDim },
  statValue:    { fontSize: 20, fontWeight: "900", color: C.gold },
  statValueActive:{ color: C.gold },
  statLabel:    { fontSize: 10, fontWeight: "700", color: C.sub, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  statLabelActive:{ color: C.gold, fontWeight: "900" },
  statDivider:  { width: 1, backgroundColor: C.border },

  searchWrap:   { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 44, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput:  { flex: 1, color: C.text, fontWeight: "600", fontSize: 14 },

  listCard:     { marginHorizontal: 16, borderRadius: 18, overflow: "hidden", backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  listHeader:   { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.separator },
  listHeaderTxt:{ fontSize: 12, fontWeight: "800", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5 },

  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: C.card },
  rowBorder:    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  avatar:       { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: C.border },
  avatarFallback:{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  avatarInitials:{ fontSize: 16, fontWeight: "900", color: C.gold },
  rowInfo:      { flex: 1, gap: 4 },
  rowName:      { fontSize: 15, fontWeight: "800", color: C.text },
  badgesRow:    { flexDirection: "row", gap: 6 },
  badge:        { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  badgeTxt:     { fontSize: 10, fontWeight: "800" },
  rowMeta:      { flexDirection: "row", alignItems: "center", gap: 5 },
  rowDate:      { fontSize: 11, color: C.muted, fontWeight: "600" },

  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  centerTxt:    { color: C.sub, fontWeight: "700", fontSize: 14 },
  emptyIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:   { fontSize: 17, fontWeight: "900", color: C.text },
  emptySub:     { fontSize: 13, color: C.sub, textAlign: "center", paddingHorizontal: 40 },

  blue: C.blue,
});