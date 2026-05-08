// app/user-corbeille.tsx
// ✅ RHAZN — Corbeille globale • Apple-like fond blanc
// ✅ Soft delete : products + store_products + publications
// ✅ Restaurer ou supprimer définitivement
// ✅ Expiration auto 30 jours
// ✅ Via RPC soft_delete_content + restore_content

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const C = {
  bg:        "#F2F2F7",
  card:      "#FFFFFF",
  text:      "#111111",
  sub:       "#6E6E73",
  muted:     "#AEAEB2",
  border:    "#E5E5EA",
  separator: "rgba(0,0,0,0.06)",
  gold:      "#D4AF37",
  goldDim:   "rgba(212,175,55,0.10)",
  goldBorder:"rgba(212,175,55,0.25)",
  red:       "#FF3B30",
  redDim:    "rgba(255,59,48,0.10)",
  redBorder: "rgba(255,59,48,0.25)",
  green:     "#34C759",
};

type TrashItem = {
  id:           string;
  table:        "products" | "store_products" | "publications";
  contentType:  "PRODUCT" | "SUSPENTZ" | "PUBLICATION";
  title:        string | null;
  cover:        string | null;
  deleted_at:   string;
  type:         string;
};

const daysLeft = (deletedAt: string) => {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
  return Math.max(0, diff);
};

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

export default function UserCorbeille() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items,   setItems]   = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"ALL" | "PRODUCT" | "SUSPENTZ">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { setLoading(false); return; }

    const [{ data: prods }, { data: sps }] = await Promise.all([
      supabase.from("products")
        .select("id, title, cover_url, deleted_at, category_label")
        .eq("user_id", uid)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      supabase.from("store_products")
        .select("id, title, thumbnail_url, deleted_at, category_code")
        .eq("owner_uid", uid)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    ]);

    const list: TrashItem[] = [
      ...(prods ?? []).map((p: any) => ({
        id: p.id, table: "products" as const, contentType: "PRODUCT" as const,
        title: p.title, cover: p.cover_url, deleted_at: p.deleted_at,
        type: p.category_label ?? "Produit",
      })),
      ...(sps ?? []).map((p: any) => ({
        id: p.id, table: "store_products" as const, contentType: "SUSPENTZ" as const,
        title: p.title, cover: p.thumbnail_url, deleted_at: p.deleted_at,
        type: "Suspentz",
      })),
    ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = filter === "ALL" ? items : items.filter(i => i.contentType === filter);

  // ── Restaurer ──
  const restore = async (item: TrashItem) => {
    const { data, error } = await supabase.rpc("restore_content", {
      p_content_id:   item.id,
      p_content_type: item.contentType,
    });
    if (error || !data?.success) {
      Alert.alert("Erreur", "Impossible de restaurer cet élément.");
      return;
    }
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  // ── Supprimer définitivement ──
  const deletePerm = (item: TrashItem) => {
    Alert.alert(
      "Suppression définitive",
      `"${item.title ?? "Cet élément"}" sera supprimé définitivement et ne pourra pas être récupéré.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: async () => {
          await supabase.from(item.table).delete().eq("id", item.id);
          setItems(prev => prev.filter(i => i.id !== item.id));
        }},
      ]
    );
  };

  // ── Vider la corbeille ──
  const emptyAll = () => {
    const target = filter === "ALL" ? items : filtered;
    if (!target.length) return;
    Alert.alert(
      "Vider la corbeille ?",
      `${target.length} élément${target.length > 1 ? "s" : ""} seront supprimés définitivement.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Vider", style: "destructive", onPress: async () => {
          const prods = target.filter(i => i.table === "products").map(i => i.id);
          const sps   = target.filter(i => i.table === "store_products").map(i => i.id);
          await Promise.all([
            prods.length ? supabase.from("products").delete().in("id", prods) : Promise.resolve(),
            sps.length   ? supabase.from("store_products").delete().in("id", sps) : Promise.resolve(),
          ]);
          if (filter === "ALL") setItems([]);
          else setItems(prev => prev.filter(i => i.contentType !== filter));
        }},
      ]
    );
  };

  const renderItem = ({ item, index }: { item: TrashItem; index: number }) => {
    const left   = daysLeft(item.deleted_at);
    const isLast = index === filtered.length - 1;
    const isSuspentz = item.contentType === "SUSPENTZ";
    return (
      <View style={[s.row, !isLast && s.rowBorder]}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={s.thumb} />
        ) : (
          <View style={s.thumbFallback}>
            <Ionicons name={isSuspentz ? "play-circle-outline" : "cube-outline"} size={20} color={C.muted} />
          </View>
        )}

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.title ?? "Sans titre"}</Text>
          <View style={s.rowMeta}>
            <View style={[s.typeBadge, {
              backgroundColor: isSuspentz ? C.goldDim : "rgba(0,122,255,0.10)",
              borderColor:     isSuspentz ? C.goldBorder : "rgba(0,122,255,0.25)",
            }]}>
              <Text style={[s.typeTxt, { color: isSuspentz ? C.gold : "#007AFF" }]}>
                {item.contentType}
              </Text>
            </View>
            <Text style={s.rowDate}>Supprimé le {fmtDate(item.deleted_at)}</Text>
          </View>
          <View style={s.expiryRow}>
            <Ionicons name="time-outline" size={11} color={left <= 5 ? C.red : C.muted} />
            <Text style={[s.expiryTxt, { color: left <= 5 ? C.red : C.muted }]}>
              {left > 0 ? `Expire dans ${left} jour${left > 1 ? "s" : ""}` : "Expiré — sera supprimé"}
            </Text>
          </View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.restoreBtn} onPress={() => restore(item)} activeOpacity={0.82}>
            <Ionicons name="arrow-undo-outline" size={14} color={C.green} />
          </TouchableOpacity>
          <TouchableOpacity style={s.deletePermBtn} onPress={() => deletePerm(item)} activeOpacity={0.82}>
            <Ionicons name="trash" size={14} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Corbeille</Text>
          <Text style={s.headerSub}>
            {loading ? "…" : `${filtered.length} élément${filtered.length !== 1 ? "s" : ""} • Auto-suppression 30 jours`}
          </Text>
        </View>
        {filtered.length > 0 && (
          <TouchableOpacity style={s.emptyBtn} onPress={emptyAll} activeOpacity={0.82}>
            <Ionicons name="trash" size={14} color={C.red} />
            <Text style={s.emptyTxt}>Vider</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── FILTRES ── */}
      <View style={s.filterRow}>
        {(["ALL", "PRODUCT", "SUSPENTZ"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)} activeOpacity={0.82}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "ALL" ? `Tout (${items.length})` : f === "PRODUCT" ? `Produits (${items.filter(i => i.contentType === "PRODUCT").length})` : `Suspentz (${items.filter(i => i.contentType === "SUSPENTZ").length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── BANNIÈRE ── */}
      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={C.gold} />
        <Text style={s.infoTxt}>
          Les éléments supprimés sont conservés 30 jours. Après expiration, ils sont effacés définitivement.
        </Text>
      </View>

      {/* ── LISTE ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.gold} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}><Ionicons name="trash-outline" size={44} color={C.muted} /></View>
          <Text style={s.emptyTitle}>Corbeille vide</Text>
          <Text style={s.emptySub}>Aucun élément supprimé pour l'instant.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => `${item.table}-${item.id}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          style={s.listCard}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 20, fontWeight: "900", color: C.text },
  headerSub:    { fontSize: 11, color: C.sub, marginTop: 1 },
  emptyBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.redDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.redBorder },
  emptyTxt:     { fontSize: 12, fontWeight: "800", color: C.red },
  filterRow:    { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  filterBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  filterBtnActive:{ backgroundColor: C.gold, borderColor: C.gold },
  filterTxt:    { fontSize: 12, fontWeight: "800", color: C.sub },
  filterTxtActive:{ color: "#000" },
  infoBanner:   { flexDirection: "row", alignItems: "flex-start", gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: C.goldDim, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.goldBorder },
  infoTxt:      { flex: 1, fontSize: 12, fontWeight: "600", color: C.sub, lineHeight: 18 },
  listCard:     { marginHorizontal: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowBorder:    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  thumb:        { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  thumbFallback:{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  rowTitle:     { fontSize: 14, fontWeight: "800", color: C.text },
  rowMeta:      { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  typeTxt:      { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  rowDate:      { fontSize: 11, color: C.muted, fontWeight: "600" },
  expiryRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  expiryTxt:    { fontSize: 10, fontWeight: "700" },
  actions:      { gap: 6 },
  restoreBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(52,199,89,0.10)", borderWidth: 1, borderColor: "rgba(52,199,89,0.28)", alignItems: "center", justifyContent: "center" },
  deletePermBtn:{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redBorder, alignItems: "center", justifyContent: "center" },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon:    { width: 84, height: 84, borderRadius: 42, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:   { fontSize: 17, fontWeight: "900", color: C.text },
  emptySub:     { fontSize: 13, color: C.sub, textAlign: "center", paddingHorizontal: 40 },
});