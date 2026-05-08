// app/user-mes-creations.tsx
// ✅ RHAZN — Mes Créations
// ✅ Filtre type scrollable toujours visible (Tous / Suspentz / Produits / Audio / Vidéo…)
// ✅ Icône lunettes (eye-outline → glasses-outline)
// ✅ Card "Apprentissage" sticky quand elle atteint le header
// ✅ Suspentz jouables exactement comme rz-channel/auteur

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
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
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mxxlchaygarszkygmylo.supabase.co";
const { height: SCREEN_H } = Dimensions.get("window");

const C = {
  bg:         "#F2F2F7",
  card:       "#FFFFFF",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.10)",
  goldBorder: "rgba(212,175,55,0.28)",
  text:       "#0A0A0A",
  sub:        "#6E6E73",
  muted:      "#AEAEB2",
  border:     "#E5E5EA",
  separator:  "#F2F2F7",
  green:      "#34C759",
  cardInner:  "#F6F7F9",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
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

type SuspentzItem = {
  id:         string;
  title:      string | null;
  media_path: string | null;
  created_at: string;
  qob_count:  number;
  price_tan:  number;
};

type ProductItem = {
  id:         string;
  title:      string | null;
  cover_url:  string | null;
  created_at: string;
  price_htg:  number;
  quantity:   number;
  category:   string | null;
  qob_count:  number;
};

type CreationItem =
  | { kind: "suspentz";  data: SuspentzItem }
  | { kind: "product";   data: ProductItem  };

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const resolveVideoUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/suspentz/${path}`;
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

const fmtN = (n: any) => Number(n ?? 0).toLocaleString("fr-FR");

// ─────────────────────────────────────────────────────────────
// SUSPENTZ CARD — jouable (même comportement qu'auteur.tsx)
// ─────────────────────────────────────────────────────────────
function SuspentzCreationCard({ item, isActive, onPlay, onDelete }: {
  item: SuspentzItem;
  isActive: boolean;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const videoUrl = resolveVideoUrl(item.media_path);
  const player   = useVideoPlayer(videoUrl ?? "file://invalid", (p) => { p.loop = false; });

  useEffect(() => {
    if (!isActive) { try { player.pause?.(); } catch {} }
  }, [isActive]);

  useEffect(() => { return () => { try { player.pause?.(); } catch {} }; }, []);

  const handlePress = () => {
    if (!videoUrl) return;
    if (isActive) {
      try { player.pause?.(); } catch {}
      onPlay("");
    } else {
      onPlay(item.id);
      try { player.play?.(); } catch {}
    }
  };

  return (
    <View style={s.workCard}>
      {/* Vignette / Player */}
      <Pressable style={s.thumbWrap} onPress={handlePress}>
        {videoUrl ? (
          <>
            {isActive ? (
              <VideoView player={player} style={s.thumb} contentFit="cover" nativeControls={false} />
            ) : (
              <Image source={{ uri: videoUrl }} style={s.thumb} />
            )}
            <View style={[s.playOverlay, isActive && { opacity: 0 }]}>
              <View style={s.playBtn}>
                <Ionicons name={isActive ? "pause" : "play"} size={20} color="#FFF" />
              </View>
            </View>
          </>
        ) : (
          <View style={[s.thumb, s.noThumb]}>
            <Ionicons name="play-circle-outline" size={28} color={C.muted} />
          </View>
        )}
      </Pressable>

      {/* Infos */}
      <View style={s.workInfo}>
        <Text style={s.workTitle} numberOfLines={1}>{item.title ?? "Suspentz"}</Text>
        <Text style={s.workDate}>{fmtDate(item.created_at)}</Text>
        <View style={s.workStats}>
          {/* ✅ Icône lunettes */}
          <View style={s.statPill}>
            <Ionicons name="glasses-outline" size={13} color={C.gold} />
            <Text style={s.statTxt}>{fmtN(item.qob_count)} QOB</Text>
          </View>
          {item.price_tan > 0 && (
            <View style={s.statPill}>
              <Ionicons name="flash" size={12} color={C.gold} />
              <Text style={s.statTxt}>{fmtN(item.price_tan)} TAN</Text>
            </View>
          )}
        </View>
      </View>

      {/* Supprimer */}
      <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item.id)} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={15} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────────────────────
function ProductCreationCard({ item, onDelete }: { item: ProductItem; onDelete: (id: string) => void }) {
  return (
    <View style={s.workCard}>
      {item.cover_url ? (
        <Image source={{ uri: item.cover_url }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.noThumb]}>
          <Ionicons name="cube-outline" size={28} color={C.muted} />
        </View>
      )}
      <View style={s.workInfo}>
        <Text style={s.workTitle} numberOfLines={1}>{item.title ?? "Produit"}</Text>
        <Text style={s.workDate}>{fmtDate(item.created_at)}</Text>
        <View style={s.workStats}>
          <View style={s.statPill}>
            <Ionicons name="glasses-outline" size={13} color={C.gold} />
            <Text style={s.statTxt}>{fmtN(item.qob_count)} QOB</Text>
          </View>
          {item.price_htg > 0 && (
            <View style={s.statPill}>
              <Ionicons name="pricetag-outline" size={12} color={C.gold} />
              <Text style={s.statTxt}>{fmtN(item.price_htg)} HTG</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item.id)} activeOpacity={0.8}>
        <Ionicons name="trash-outline" size={15} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function UserMesCreations() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();

  const [loading,      setLoading]      = useState(true);
  const [suspentz,     setSuspentz]     = useState<SuspentzItem[]>([]);
  const [products,     setProducts]     = useState<ProductItem[]>([]);
  const [typeFilter,   setTypeFilter]   = useState<TypeKey>("TOUS");
  const [search,       setSearch]       = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string>("");

  // ── Modal confirmation suppression Apple-like ──
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    id: string;
    title: string | null;
    table: "store_products" | "products";
  }>({ visible: false, id: "", title: null, table: "store_products" });
  const deleteScale = useRef(new Animated.Value(0.88)).current;
  const deleteOp    = useRef(new Animated.Value(0)).current;

  const openDeleteModal = (id: string, title: string | null, table: "store_products" | "products") => {
    setDeleteModal({ visible: true, id, title, table });
    deleteScale.setValue(0.88); deleteOp.setValue(0);
    Animated.parallel([
      Animated.spring(deleteScale, { toValue: 1, damping: 18, stiffness: 280, useNativeDriver: true }),
      Animated.timing(deleteOp,   { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(deleteScale, { toValue: 0.88, duration: 150, useNativeDriver: true }),
      Animated.timing(deleteOp,    { toValue: 0,    duration: 150, useNativeDriver: true }),
    ]).start(() => setDeleteModal(prev => ({ ...prev, visible: false })));
  };

  const confirmDelete = async () => {
    const { id, table } = deleteModal;
    await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (table === "store_products") setSuspentz(prev => prev.filter(s => s.id !== id));
    else setProducts(prev => prev.filter(p => p.id !== id));
    closeDeleteModal();
  };

  // Sticky apprentissage
  const scrollY      = useRef(new Animated.Value(0)).current;
  const [apprY,      setApprY]      = useState<number | null>(null);
  const [headerH,    setHeaderH]    = useState(0);
  const [isSticky,   setIsSticky]   = useState(false);

  // Ranking modal
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const [rankOpen, setRankOpen]  = useState(false);

  const openRanking = () => {
    setRankOpen(true);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
  };
  const closeRanking = () => {
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 220, useNativeDriver: true })
      .start(() => setRankOpen(false));
  };
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
    onPanResponderMove:    (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => { g.dy > 120 ? closeRanking() : openRanking(); },
  })).current;

  // ── Charger ──
  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { setLoading(false); return; }

    const [{ data: sp }, { data: pr }] = await Promise.all([
      supabase.from("store_products")
        .select("id, title, media_path, created_at, qob_count, price_tan")
        .eq("owner_uid", uid).eq("category_code", "SUSPENTZ")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("products")
        .select("id, title, cover_url, created_at, price_htg, quantity, category_label, qob_count")
        .eq("user_id", uid).eq("cadna_status", "approved")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    setSuspentz((sp ?? []).map((p: any) => ({
      id: p.id, title: p.title, media_path: p.media_path,
      created_at: p.created_at, qob_count: p.qob_count ?? 0, price_tan: p.price_tan ?? 0,
    })));
    setProducts((pr ?? []).map((p: any) => ({
      id: p.id, title: p.title, cover_url: p.cover_url,
      created_at: p.created_at, price_htg: p.price_htg ?? 0,
      quantity: p.quantity ?? 0, category: p.category_label ?? null, qob_count: p.qob_count ?? 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  // ── Bâtir la liste filtrée ──
  const items: CreationItem[] = useMemo(() => {
    const qNorm = search.trim().toLowerCase();
    let out: CreationItem[] = [];
    if (typeFilter === "TOUS" || typeFilter === "SUSPENTZ") {
      suspentz.forEach(d => {
        if (!qNorm || (d.title ?? "").toLowerCase().includes(qNorm))
          out.push({ kind: "suspentz", data: d });
      });
    }
    if (typeFilter === "TOUS" || typeFilter === "PRODUCTS") {
      products.forEach(d => {
        if (!qNorm || (d.title ?? "").toLowerCase().includes(qNorm))
          out.push({ kind: "product", data: d });
      });
    }
    // Trier par date desc
    return out.sort((a, b) =>
      new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
    );
  }, [suspentz, products, typeFilter, search]);

  const totalQob = useMemo(() =>
    suspentz.reduce((a, s) => a + s.qob_count, 0) +
    products.reduce((a, p) => a + p.qob_count, 0), [suspentz, products]);

  const handleDeleteSuspentz = (id: string, title: string | null) =>
    openDeleteModal(id, title, "store_products");

  const handleDeleteProduct = (id: string, title: string | null) =>
    openDeleteModal(id, title, "products");

  // ── Sticky apprentissage ──
  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.setValue(y);
    if (apprY !== null) {
      setIsSticky(y >= apprY - headerH);
    }
  };

  // ── Render item ──
  const renderItem = ({ item }: { item: CreationItem }) => {
    if (item.kind === "suspentz") {
      return (
        <SuspentzCreationCard
          item={item.data}
          isActive={activeVideoId === item.data.id}
          onPlay={id => setActiveVideoId(id)}
          onDelete={(id) => handleDeleteSuspentz(id, item.data.title)}
        />
      );
    }
    return <ProductCreationCard item={item.data} onDelete={(id) => handleDeleteProduct(id, item.data.title)} />;
  };

  // ── Card Apprentissage ──
  const ApprentissageCard = () => (
    <View style={s.apprCard}>
      <View style={s.apprIconWrap}>
        <Ionicons name="glasses-outline" size={22} color={C.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.apprTitle}>Apprentissage RHAZN</Text>
        <Text style={s.apprBody}>
          Chaque QOB = une vue qualifiée. Plus vos créations sont regardées, plus votre TAN augmente.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.screen}>

      {/* ══ ZONE FIXE TOUJOURS VISIBLE ══ */}
      <View
        style={s.stickyTop}
        onLayout={e => setHeaderH(e.nativeEvent.layout.height)}
      >
        {/* ── Header avec retour + corbeille ── */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace("/user-space/mon-espace" as any)}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Mes Créations</Text>
            <Text style={s.subtitle}>{items.length} publication{items.length !== 1 ? "s" : ""} • {fmtN(totalQob)} QOB</Text>
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
              <Text style={[s.typeTxt, typeFilter === item.key && s.typeTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recherche */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={15} color={C.muted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Rechercher une création…"
            placeholderTextColor={C.muted}
            style={s.searchInput}
            autoCapitalize="none" autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══ Card Apprentissage STICKY (flottante quand elle atteint le header) ══ */}
      {isSticky && (
        <View style={[s.apprSticky, { top: headerH }]}>
          <ApprentissageCard />
        </View>
      )}

      {/* ══ LISTE ══ */}
      <FlatList
        data={items}
        keyExtractor={(it, idx) => `${it.kind}-${it.data.id}-${idx}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom, paddingTop: 8 }}
        ListHeaderComponent={
          <View
            onLayout={e => {
              // Mesurer la position Y de la card Apprentissage dans la liste
              setApprY(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
            }}
          >
            <ApprentissageCard />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <Text style={s.centerTxt}>Chargement…</Text>
            </View>
          ) : (
            <View style={s.center}>
              <Ionicons name="layers-outline" size={48} color={C.muted} />
              <Text style={s.emptyTitle}>Aucune création</Text>
              <Text style={s.emptySub}>
                {search ? `Aucun résultat pour "${search}"` : "Publiez du contenu pour le voir apparaître ici."}
              </Text>
            </View>
          )
        }
      />

      {/* ══ RANKING MODAL ══ */}
      <Modal visible={rankOpen} transparent animationType="none">
        <Animated.View style={[s.rankSheet, { transform: [{ translateY }] }]}>
          <View style={s.rankTopBar} {...panResponder.panHandlers}>
            <View style={s.rankHandle} />
            <View style={s.rankTitleRow}>
              <Text style={s.rankTitle}>Classement Suspentz</Text>
              <TouchableOpacity style={s.rankCloseBtn} onPress={closeRanking}>
                <Ionicons name="close" size={18} color={C.sub} />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={[...suspentz].sort((a, b) => b.qob_count - a.qob_count)}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
            renderItem={({ item, index }) => (
              <View style={s.rankRow}>
                <View style={[s.rankNum, index < 3 && s.rankNumTop]}>
                  <Text style={[s.rankNumTxt, index < 3 && s.rankNumTxtTop]}>{index + 1}</Text>
                </View>
                <Text style={s.rankName} numberOfLines={1}>{item.title ?? "Suspentz"}</Text>
                <View style={s.rankStatRow}>
                  <Ionicons name="glasses-outline" size={12} color={C.gold} />
                  <Text style={s.rankVal}>{fmtN(item.qob_count)} QOB</Text>
                </View>
              </View>
            )}
          />
        </Animated.View>
      </Modal>

      {/* ══ MODAL CONFIRMATION SUPPRESSION APPLE-LIKE ══ */}
      {deleteModal.visible && (
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteModal} />
          <Animated.View style={[s.modalCard, { opacity: deleteOp, transform: [{ scale: deleteScale }] }]}>
            {/* Icône */}
            <View style={s.modalIconWrap}>
              <Ionicons name="trash" size={28} color="#FF3B30" />
            </View>
            {/* Textes */}
            <Text style={s.modalTitle}>Mettre à la corbeille ?</Text>
            <Text style={s.modalBody}>
              <Text style={s.modalItemName}>{`"${deleteModal.title ?? "Cette création"}"`}</Text>
              {" sera déplacée dans la Corbeille.\nVous pourrez la restaurer pendant 30 jours."}
            </Text>
            {/* Séparateur */}
            <View style={s.modalSep} />
            {/* Actions */}
            <TouchableOpacity style={s.modalBtnPrimary} onPress={confirmDelete} activeOpacity={0.88}>
              <Ionicons name="trash-outline" size={16} color="#FFF" />
              <Text style={s.modalBtnPrimaryTxt}>Mettre à la corbeille</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtnCancel} onPress={closeDeleteModal} activeOpacity={0.82}>
              <Text style={s.modalBtnCancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },

  // Zone fixe
  stickyTop: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8, zIndex: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 50, marginBottom: 10, gap: 10 },
  backBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  trashBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  titleRow:  { paddingHorizontal: 18, paddingTop: 14, marginBottom: 10 },
  title:     { fontSize: 24, fontWeight: "900", color: C.text },
  subtitle:  { fontSize: 12, color: C.sub, marginTop: 3 },

  pillsRow:  { flexDirection: "row", paddingHorizontal: 18, marginBottom: 8 },
  typePill:  { borderWidth: 1, borderColor: C.border, paddingVertical: 5, paddingHorizontal: 13, borderRadius: 999, marginRight: 8, backgroundColor: C.card },
  typePillOn:{ borderColor: C.gold, backgroundColor: C.gold },
  typeTxt:   { fontWeight: "700", color: C.sub, fontSize: 12 },
  typeTxtOn: { color: "#000", fontWeight: "900" },

  searchWrap:  { flexDirection: "row", alignItems: "center", marginHorizontal: 18, backgroundColor: C.card, borderRadius: 13, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: C.border, gap: 8 },
  searchInput: { flex: 1, color: C.text, fontWeight: "600", fontSize: 13 },

  // Card Apprentissage
  apprCard:    { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 12, marginTop: 8, backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.goldBorder },
  apprIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.goldLight, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.goldBorder },
  apprTitle:   { fontSize: 13, fontWeight: "900", color: C.text, marginBottom: 3 },
  apprBody:    { fontSize: 11, fontWeight: "600", color: C.sub, lineHeight: 16 },

  // Sticky version
  apprSticky:  { position: "absolute", left: 0, right: 0, zIndex: 20, backgroundColor: C.bg, paddingVertical: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },

  // Work card
  workCard:  { flexDirection: "row", gap: 12, backgroundColor: C.card, marginHorizontal: 16, marginBottom: 10, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: C.border, padding: 4, paddingRight: 12 },
  thumbWrap: { width: 120, height: 90, position: "relative" },
  thumb:     { width: 120, height: 90, borderRadius: 14 },
  noThumb:   { backgroundColor: C.cardInner, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 14 },
  playBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.50)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },

  workInfo:  { flex: 1, justifyContent: "center", gap: 4 },
  workTitle: { color: C.text, fontWeight: "900", fontSize: 13 },
  workDate:  { color: C.muted, fontWeight: "600", fontSize: 11 },
  workStats: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  statPill:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBorder },
  statTxt:   { color: C.gold, fontWeight: "900", fontSize: 11 },

  deleteBtn: { alignSelf: "center", padding: 8 },

  // Empty / Loading
  center:    { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  centerTxt: { color: C.sub, fontWeight: "700" },
  emptyTitle:{ fontSize: 16, fontWeight: "900", color: C.text },
  emptySub:  { fontSize: 13, color: C.sub, textAlign: "center", paddingHorizontal: 40 },

  // Ranking modal
  rankSheet:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 20 },
  rankTopBar:  { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  rankHandle:  { width: 38, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 8 },
  rankTitleRow:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rankTitle:   { color: C.text, fontWeight: "900", fontSize: 18 },
  rankCloseBtn:{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.separator, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  rankRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  rankNum:     { width: 30, height: 30, borderRadius: 9, backgroundColor: C.separator, alignItems: "center", justifyContent: "center" },
  rankNumTop:  { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder },
  rankNumTxt:  { color: C.sub, fontWeight: "900", fontSize: 12 },
  rankNumTxtTop:{ color: C.gold, fontWeight: "900", fontSize: 12 },
  rankName:    { flex: 1, color: C.text, fontWeight: "800", fontSize: 13 },
  rankStatRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rankVal:     { color: C.gold, fontWeight: "900", fontSize: 12 },

  // ── Modal confirmation suppression ──
  modalOverlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modalCard:         { width: "82%", backgroundColor: C.card, borderRadius: 28, padding: 24, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 24, borderWidth: 1, borderColor: C.border },
  modalIconWrap:     { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(255,59,48,0.08)", borderWidth: 1.5, borderColor: "rgba(255,59,48,0.22)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle:        { fontSize: 18, fontWeight: "900", color: C.text, textAlign: "center" },
  modalBody:         { fontSize: 13, fontWeight: "600", color: C.sub, textAlign: "center", lineHeight: 20 },
  modalItemName:     { color: C.text, fontWeight: "800" },
  modalSep:          { width: "100%", height: 1, backgroundColor: C.border, marginVertical: 4 },
  modalBtnPrimary:   { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF3B30", borderRadius: 16, paddingVertical: 15, shadowColor: "#FF3B30", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  modalBtnPrimaryTxt:{ color: "#FFF", fontWeight: "900", fontSize: 15 },
  modalBtnCancel:    { width: "100%", paddingVertical: 14, borderRadius: 16, backgroundColor: C.cardInner, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  modalBtnCancelTxt: { color: C.sub, fontWeight: "800", fontSize: 15 },
});