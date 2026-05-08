import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RHAZN_LOGO from "../../assets/images/rhazn-logo.png";
import { supabase } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const SCREEN_W       = Dimensions.get("window").width;
const FOOTER_HEIGHT  = 72;
const BIG_CARD_W     = SCREEN_W - 32;
const SMALL_CARD_W   = Math.floor(BIG_CARD_W / 2) - 6;
const CARD_H         = 210;
const ACTUS_CARD_H   = 110;
const PRODUCT_CARD_W = 150;
const SUPREME_EMAIL  = "meyounbauniklovegodstory@gmail.com";
const MAX_DELETE_SEL = 50;

const COLORS = {
  bg:     "#F9FAFB",
  card:   "#FFFFFF",
  gold:   "#D4AF37",
  text:   "#111111",
  muted:  "#888888",
  border: "#EFEFEF",
  dark:   "#1C1C1E",
  red:    "#FF3B30",
};

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
const FILTERS = ["Date", "Produits", "Auteur", "Catégorie"] as const;
type Filter = (typeof FILTERS)[number];

type ActualiteItem = {
  id:          string;
  title:       string;
  content:     string;
  image_url:   string | null;
  video_url?:  string | null;
  media_type?: string | null;
  is_featured: boolean;
  created_at?: string;
};

type ProductItem = {
  id:           string;
  name:         string;
  image:        string;
  quantity:     number;
  author:       string;
  authorUid:    string;
  authorAvatar: string | null;
  date:         string;
  category:     string;
  qob:          number;
  price:        number;
  showPrice:    boolean;
  showQob:      boolean;
  showQuantity: boolean;
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function chunkProducts(arr: ProductItem[], size: number): ProductItem[][] {
  const result: ProductItem[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  return n.toLocaleString("fr-FR");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────
// SECTION 1 – ACTUALITÉS — ✅ PAS d'icône corbeille ici
// ─────────────────────────────────────────────────────────────────
function ActualitesSection({
  dbItems,
  isSupreme,
  onEditPress,
  onCardPress,
}: {
  dbItems:      ActualiteItem[];
  isSupreme:    boolean;
  onEditPress:  () => void;
  onCardPress:  () => void;
}) {
  const flatRef         = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);

  const combinedData: Array<{
    id: string; isBig?: boolean; title?: string;
    content?: string; image?: string; summary?: string;
  }> = (() => {
    if (dbItems.length === 0) return [];
    const bigItem   = dbItems.find((i) => i.is_featured) ?? dbItems[0];
    const smallList = dbItems.filter((i) => i.id !== bigItem.id);
    return [
      { id: bigItem.id, isBig: true, title: bigItem.title, content: bigItem.content, image: bigItem.image_url ?? undefined },
      ...smallList.map((i) => ({ id: i.id, isBig: false, image: i.image_url ?? undefined, summary: i.content, title: i.title })),
    ];
  })();

  useEffect(() => {
    if (combinedData.length === 0) return;
    const interval = setInterval(() => {
      const next = (currentIndexRef.current + 1) % combinedData.length;
      currentIndexRef.current = next;
      flatRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0 });
    }, 5000);
    return () => clearInterval(interval);
  }, [combinedData.length]);

  const getItemLayout = (_: any, index: number) => {
    const w = index === 0 ? BIG_CARD_W + 12 : SMALL_CARD_W + 12;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += i === 0 ? BIG_CARD_W + 12 : SMALL_CARD_W + 12;
    return { length: w, offset, index };
  };

  if (combinedData.length === 0) {
    return (
      <View>
        <View style={sStyles.sectionTitleRow}>
          <Text style={sStyles.sectionTitle}>RHAZN-ACTUS</Text>
          {isSupreme && (
            <Pressable style={sStyles.editActuBtn} onPress={onEditPress}>
              <Ionicons name="pencil" size={14} color="#000" />
              <Text style={sStyles.editActuTxt}>Gérer</Text>
            </Pressable>
          )}
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{
            backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 16,
            borderWidth: 1, borderColor: "rgba(212,175,55,0.15)",
            paddingHorizontal: 20, paddingVertical: 16,
            flexDirection: "row", alignItems: "center", gap: 12,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>📢</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.text, fontWeight: "900", fontSize: 14, marginBottom: 3 }}>Aucune actualité</Text>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "600" }}>Les annonces officielles RHAZN apparaîtront ici.</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={sStyles.sectionTitleRow}>
        <Text style={sStyles.sectionTitle}>RHAZN-ACTUS</Text>
        {isSupreme && (
          <Pressable style={sStyles.editActuBtn} onPress={onEditPress}>
            <Ionicons name="pencil" size={14} color="#000" />
            <Text style={sStyles.editActuTxt}>Gérer</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        ref={flatRef}
        horizontal
        data={combinedData}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          if (item.isBig) return (
            <Pressable style={[sStyles.bigCard, { width: BIG_CARD_W, height: CARD_H }]} onPress={onCardPress}>
              {item.image
                ? <Image source={{ uri: item.image }} style={sStyles.bigCardImage} />
                : <View style={[sStyles.bigCardImage, { backgroundColor: "#222" }]} />
              }
              <View style={sStyles.bigCardOverlay} />
              <View style={sStyles.bigCardContent}>
                <View style={sStyles.officialBadge}>
                  <Text style={sStyles.officialBadgeText}>RHAZN OFFICIEL</Text>
                </View>
                <Text style={sStyles.bigCardTitle}>{item.title}</Text>
                <Text style={sStyles.bigCardBody} numberOfLines={2}>{item.content}</Text>
              </View>
            </Pressable>
          );
          return (
            <Pressable style={[sStyles.smallCard, { width: SMALL_CARD_W, height: CARD_H }]} onPress={onCardPress}>
              {item.image
                ? <Image source={{ uri: item.image }} style={sStyles.smallCardImage} />
                : <View style={[sStyles.smallCardImage, { backgroundColor: "#333" }]} />
              }
              <View style={sStyles.smallCardOverlay} />
              <View style={sStyles.smallCardContent}>
                <Text style={sStyles.smallCardSummary} numberOfLines={3}>
                  {item.summary ?? item.title ?? ""}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
      <DotsIndicator count={combinedData.length} activeRef={currentIndexRef} />
    </View>
  );
}

function DotsIndicator({ count, activeRef }: { count: number; activeRef: React.MutableRefObject<number> }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(activeRef.current), 100);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10, gap: 5 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          width: i === active ? 18 : 6, height: 6, borderRadius: 3,
          backgroundColor: i === active ? COLORS.gold : COLORS.border,
        }} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 2 – ACTUS — ✅ SANS icône corbeille (supprimée)
// ─────────────────────────────────────────────────────────────────
function ActusSection({ items, onAuthorPress }: {
  items:         ProductItem[];
  onAuthorPress: (uid: string) => void;
}) {
  const scrollRef   = useRef<ScrollView>(null);
  const offsetRef   = useRef(0);
  const isPausedRef = useRef(false);
  const TOTAL_H     = items.length * (ACTUS_CARD_H + 12);
  const CONTAINER_H = 420;

  useEffect(() => {
    const frame = setInterval(() => {
      if (isPausedRef.current) return;
      offsetRef.current += 0.6;
      if (offsetRef.current >= Math.max(TOTAL_H - CONTAINER_H, 1)) offsetRef.current = 0;
      scrollRef.current?.scrollTo({ y: offsetRef.current, animated: false });
    }, 16);
    return () => clearInterval(frame);
  }, [TOTAL_H]);

  if (items.length === 0) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[sStyles.sectionTitle, { paddingHorizontal: 16, marginBottom: 14, marginTop: 20 }]}>ACTUS</Text>
      <ScrollView
        ref={scrollRef}
        style={{ height: CONTAINER_H }}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => { isPausedRef.current = true; }}
        onScrollEndDrag={() => { setTimeout(() => { isPausedRef.current = false; }, 2500); }}
        onMomentumScrollEnd={(e) => { offsetRef.current = e.nativeEvent.contentOffset.y; }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 20 }}
      >
        {items.map((item) => (
          // ✅ Pas d'icône corbeille dans ACTUS — simple carte cliquable
          <Pressable
            key={item.id}
            style={sStyles.actusCard}
            onPress={() => onAuthorPress(item.authorUid)}
          >
            <Image source={{ uri: item.image }} style={sStyles.actusImage} />
            <View style={sStyles.actusContent}>
              <View style={sStyles.actusAuthorRow}>
                {item.authorAvatar
                  ? <Image source={{ uri: item.authorAvatar }} style={sStyles.actusAvatarImg} />
                  : <View style={sStyles.actusAvatarPlaceholder}>
                      <Text style={sStyles.actusAvatarInitial}>
                        {(item.author ?? "R")[0].toUpperCase()}
                      </Text>
                    </View>
                }
                <Text style={sStyles.actusAuthor} numberOfLines={1}>{item.author}</Text>
                <View style={sStyles.actusLikeBadge}>
                  <Ionicons name="eye" size={11} color={COLORS.gold} />
                  <Text style={sStyles.actusLikeText}>{formatNum(item.qob)}</Text>
                </View>
              </View>
              <Text style={sStyles.actusSummary} numberOfLines={1}>{item.name}</Text>
              <Text style={sStyles.actusDate}>{item.category} • {item.date}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onPress,
  selectionMode,
  isSelected,
  onToggleSelect,
  isOwner,
  onDeleteSingle,
}: {
  product:         ProductItem;
  onPress:         () => void;
  selectionMode:   boolean;
  isSelected:      boolean;
  onToggleSelect:  (id: string) => void;
  isOwner:         boolean;
  onDeleteSingle:  (id: string) => void;
}) {
  const [showPrice,    setShowPrice]    = useState(product.showPrice);
  const [showQob,      setShowQob]      = useState(product.showQob);
  const [showQuantity, setShowQuantity] = useState(product.showQuantity);

  const toggle = async (field: "show_price" | "show_qob" | "show_quantity", value: boolean) => {
    await supabase.from("products").update({ [field]: value }).eq("id", product.id);
  };

  return (
    <Pressable
      style={[sStyles.productCard, isSelected && sStyles.productCardSelected]}
      onPress={() => { if (selectionMode) onToggleSelect(product.id); else onPress(); }}
      onLongPress={() => onToggleSelect(product.id)}
    >
      {/* ✅ Checkbox visible en mode sélection */}
      {selectionMode && (
        <View style={[sStyles.checkbox, isSelected && sStyles.checkboxOn]}>
          {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
        </View>
      )}

      <Image source={{ uri: product.image }} style={sStyles.productImage} />
      <Text style={sStyles.productName} numberOfLines={2}>{product.name}</Text>

      {showPrice && product.price > 0 && (
        <View style={sStyles.productPriceRow}>
          <Ionicons name="pricetag-outline" size={11} color={COLORS.gold} />
          <Text style={sStyles.productPrice}>{formatNum(product.price)} HTG</Text>
        </View>
      )}
      {showQob && (
        <View style={sStyles.productQobRow}>
          <Ionicons name="eye-outline" size={11} color={COLORS.gold} />
          <Text style={sStyles.productQty}>{formatNum(product.qob)} QOB</Text>
        </View>
      )}
      {showQuantity && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <Text style={sStyles.productQty}>Qté : {formatNum(product.quantity)}</Text>
          <Text style={sStyles.productDate}>{product.date}</Text>
        </View>
      )}
      <Text style={sStyles.productAuthor} numberOfLines={1}>{product.author}</Text>
      <View style={sStyles.productMeta}>
        <View style={sStyles.productCatBadge}>
          <Text style={sStyles.productCatText} numberOfLines={1}>{product.category ?? "—"}</Text>
        </View>
      </View>
      {/* ✅ Icône corbeille — visible pour le créateur ET pour Supreme */}
      {isOwner && !selectionMode && (
        <TouchableOpacity
          style={sStyles.productDeleteBtn}
          onPress={() => onDeleteSingle(product.id)}
          activeOpacity={0.80}
        >
          <Ionicons name="trash-outline" size={13} color={COLORS.red} />
          <Text style={sStyles.productDeleteTxt}>Supprimer</Text>
        </TouchableOpacity>
      )}

      <View style={sStyles.productToggleRow}>
        <Pressable style={[sStyles.productToggleBtn, showPrice && sStyles.productToggleBtnOn]}
          onPress={() => { const v = !showPrice; setShowPrice(v); toggle("show_price", v); }}>
          <Ionicons name={showPrice ? "eye" : "eye-off"} size={10} color={showPrice ? COLORS.gold : COLORS.muted} />
          <Text style={[sStyles.productToggleTxt, showPrice && { color: COLORS.gold }]}>Prix</Text>
        </Pressable>
        <Pressable style={[sStyles.productToggleBtn, showQob && sStyles.productToggleBtnOn]}
          onPress={() => { const v = !showQob; setShowQob(v); toggle("show_qob", v); }}>
          <Ionicons name={showQob ? "eye" : "eye-off"} size={10} color={showQob ? COLORS.gold : COLORS.muted} />
          <Text style={[sStyles.productToggleTxt, showQob && { color: COLORS.gold }]}>QOB</Text>
        </Pressable>
        <Pressable style={[sStyles.productToggleBtn, showQuantity && sStyles.productToggleBtnOn]}
          onPress={() => { const v = !showQuantity; setShowQuantity(v); toggle("show_quantity", v); }}>
          <Ionicons name={showQuantity ? "eye" : "eye-off"} size={10} color={showQuantity ? COLORS.gold : COLORS.muted} />
          <Text style={[sStyles.productToggleTxt, showQuantity && { color: COLORS.gold }]}>Qté</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────
// SECTION 3 – PRODUITS
// ✅ Icône corbeille ICI uniquement (Supreme)
// ✅ Sélection max 50 ou Supprimer tout
// ✅ FIX : onDelete met à jour le state parent immédiatement
// ─────────────────────────────────────────────────────────────────
function ProduitsSection({
  items,
  onAuthorPress,
  isSupreme,
  currentUid,
  onDelete,
}: {
  items:         ProductItem[];
  onAuthorPress: (uid: string) => void;
  isSupreme:     boolean;
  currentUid:    string | null;
  onDelete:      (ids: string[]) => void;
}) {
  const [activeFilter,   setActiveFilter]  = useState<Filter>("Date");
  const [selectionMode,  setSelectionMode] = useState(false);
  const [selectedIds,    setSelectedIds]   = useState<Set<string>>(new Set());
  const [confirmModal,   setConfirmModal]  = useState<"selection"|"all"|"single"|null>(null);
  const [singleDeleteId, setSingleDeleteId]= useState<string | null>(null);
  const [deleting,       setDeleting]      = useState(false);

  const filtered = [...items].sort((a, b) => {
    switch (activeFilter) {
      case "Produits":  return a.name.localeCompare(b.name);
      case "Auteur":    return a.author.localeCompare(b.author);
      case "Catégorie": return a.category.localeCompare(b.category);
      default:          return 0;
    }
  });

  const productRows = chunkProducts(filtered, 10);

  const toggleSelect = (id: string) => {
    if (!isSupreme) return;
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); }
      else if (n.size < MAX_DELETE_SEL) { n.add(id); }
      return n;
    });
  };

  const selectAll = () => {
    const ids = filtered.slice(0, MAX_DELETE_SEL).map(p => p.id);
    setSelectedIds(new Set(ids));
  };

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // ✅ Ouvre la confirmation de suppression single
  const deleteSingle = (id: string) => {
    setSingleDeleteId(id);
    setConfirmModal("single");
  };

  // ✅ Exécute la suppression single après confirmation
  const executeSingleDelete = async () => {
    if (!singleDeleteId) return;
    setDeleting(true);
    try {
      await supabase.from("products").delete().eq("id", singleDeleteId);
      onDelete([singleDeleteId]);
    } catch (e) {
      console.warn("delete single error:", e);
    } finally {
      setDeleting(false);
      setConfirmModal(null);
      setSingleDeleteId(null);
    }
  };

  // ✅ Suppression en masse (Supreme uniquement)
  const executeDelete = async (mode: "selection" | "all") => {
    setDeleting(true);
    try {
      let ids: string[] = [];
      if (mode === "all") {
        ids = filtered.map(p => p.id);
        await supabase.from("products").delete().in("id", ids);
      } else {
        ids = Array.from(selectedIds);
        await supabase.from("products").delete().in("id", ids);
      }
      onDelete(ids);
      exitSelection();
    } catch (e) {
      console.warn("delete error:", e);
    } finally {
      setDeleting(false);
      setConfirmModal(null);
    }
  };

  return (
    <View style={{ marginBottom: 24 }}>
      {/* ── Filtre + boutons Supreme ── */}
      <View style={sStyles.filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[sStyles.filterBtn, activeFilter === f && sStyles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[sStyles.filterText, activeFilter === f && sStyles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* ✅ Barre d'actions Supreme — uniquement dans cette section */}
      {isSupreme && (
        <View style={sStyles.supremeBar}>
          {!selectionMode ? (
            <>
              <TouchableOpacity style={sStyles.supremeBtn} onPress={() => setSelectionMode(true)} activeOpacity={0.8}>
                <Ionicons name="checkmark-done-outline" size={13} color={COLORS.gold} />
                <Text style={sStyles.supremeBtnTxt}>Sélectionner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sStyles.supremeBtn, { backgroundColor: "rgba(255,59,48,0.08)", borderColor: "rgba(255,59,48,0.25)" }]}
                onPress={() => setConfirmModal("all")} activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={13} color={COLORS.red} />
                <Text style={[sStyles.supremeBtnTxt, { color: COLORS.red }]}>Supprimer tout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={sStyles.supremeBtn} onPress={selectAll} activeOpacity={0.8}>
                <Text style={sStyles.supremeBtnTxt}>Tout sélect. ({Math.min(filtered.length, MAX_DELETE_SEL)})</Text>
              </TouchableOpacity>
              <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "700" }}>
                {selectedIds.size}/{MAX_DELETE_SEL}
              </Text>
              <TouchableOpacity
                style={[sStyles.supremeBtn, { backgroundColor: "rgba(255,59,48,0.08)", borderColor: "rgba(255,59,48,0.25)", opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                onPress={() => { if (selectedIds.size > 0) setConfirmModal("selection"); }}
                disabled={selectedIds.size === 0} activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={13} color={COLORS.red} />
                <Text style={[sStyles.supremeBtnTxt, { color: COLORS.red }]}>Supprimer ({selectedIds.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exitSelection} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {productRows.map((row, rowIdx) => (
        <View key={rowIdx} style={{ marginBottom: 24 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {row.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => onAuthorPress(product.authorUid)}
                selectionMode={isSupreme && selectionMode}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={toggleSelect}
                isOwner={isSupreme || product.authorUid === currentUid}
                onDeleteSingle={deleteSingle}
              />
            ))}
          </ScrollView>
        </View>
      ))}

      {/* ✅ Modal confirmation suppression */}
      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => { setConfirmModal(null); setSingleDeleteId(null); }}>
        <Pressable style={sStyles.modalOverlay} onPress={() => { setConfirmModal(null); setSingleDeleteId(null); }}>
          <View style={sStyles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={sStyles.modalIconWrap}>
              <Ionicons name="trash" size={28} color={COLORS.red} />
            </View>
            <Text style={sStyles.modalTitle}>
              {confirmModal === "all"
                ? "Supprimer tous les produits ?"
                : confirmModal === "single"
                ? "Supprimer ce produit ?"
                : `Supprimer ${selectedIds.size} produit(s) ?`}
            </Text>
            <Text style={sStyles.modalSub}>
              {confirmModal === "all"
                ? `${filtered.length} produit(s) seront supprimés définitivement.`
                : confirmModal === "single"
                ? "Ce produit sera supprimé définitivement. Aucune récupération possible."
                : `${selectedIds.size} produit(s) sélectionné(s) seront supprimés.`}
            </Text>
            <View style={sStyles.modalBtnRow}>
              <TouchableOpacity
                style={sStyles.modalCancelBtn}
                onPress={() => { setConfirmModal(null); setSingleDeleteId(null); }}
                disabled={deleting}
              >
                <Text style={sStyles.modalCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sStyles.modalConfirmBtn, deleting && { opacity: 0.55 }]}
                onPress={() => {
                  if (confirmModal === "single") executeSingleDelete();
                  else executeDelete(confirmModal!);
                }}
                disabled={deleting}
              >
                <Text style={sStyles.modalConfirmTxt}>
                  {deleting ? "Suppression…" : "Supprimer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MARQUEE TEXT
// ─────────────────────────────────────────────────────────────────
const MARQUEE_SPEED = 18;

function MarqueeText({ text, style, containerWidth }: {
  text: string; style?: any; containerWidth: number;
}) {
  const translateX   = React.useRef(new Animated.Value(0)).current;
  const textWidthRef = React.useRef(0);
  const animRef      = React.useRef<Animated.CompositeAnimation | null>(null);

  const startAnim = (textW: number) => {
    if (textW <= containerWidth) return;
    const distance = textW + 40;
    const duration = (distance / MARQUEE_SPEED) * 1000;
    translateX.setValue(0);
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(translateX, { toValue: -distance, duration, easing: (t) => t, useNativeDriver: true }),
        Animated.delay(800),
      ])
    );
    animRef.current.start();
  };

  React.useEffect(() => { return () => { animRef.current?.stop(); }; }, []);

  return (
    <View style={{ width: containerWidth, overflow: "hidden" }}>
      <Animated.Text
        style={[style, { transform: [{ translateX }] }]}
        numberOfLines={1}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== textWidthRef.current) {
            textWidthRef.current = w;
            animRef.current?.stop();
            startAnim(w);
          }
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function RhaznChannel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [prodItems,   setProdItems]   = useState<ProductItem[]>([]);
  const [actuItems,   setActuItems]   = useState<ActualiteItem[]>([]);
  const [isSupreme,   setIsSupreme]   = useState(false);
  const [currentUid,  setCurrentUid]  = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([fetchProduits(), fetchActualites(), checkSupreme()])
      .finally(() => setLoading(false));
  }, []);

  const checkSupreme = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsSupreme(session?.user?.email === SUPREME_EMAIL);
    setCurrentUid(session?.user?.id ?? null);
  };

  const fetchActualites = async () => {
    try {
      const { data, error } = await supabase
        .from("channel_news")
        .select("id, title, content, image_url, video_url, media_type, is_featured, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) { console.warn("fetchActualites error:", error.message); return; }
      if (data && data.length > 0) setActuItems(data as ActualiteItem[]);
    } catch (e) { console.warn("fetchActualites error:", e); }
  };

  const fetchProduits = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, cover_url, quantity, price_htg, user_id, created_at, category_label, show_price, show_qob, show_quantity, qob_count")
        .eq("cadna_status", "approved")
        .not("cover_url", "is", null)
        .neq("cover_url", "")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error || !data || data.length === 0) return;

      const userIds = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, author_name, avatar_url").in("id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      const seenUsers = new Set<string>();
      const mapped: ProductItem[] = [];

      for (const item of data) {
        if (!item.user_id || seenUsers.has(item.user_id)) continue;
        seenUsers.add(item.user_id);
        const profile = profileMap[item.user_id] ?? {};
        mapped.push({
          id:           item.id,
          name:         item.title           ?? "Produit RHAZN",
          image:        item.cover_url,
          quantity:     item.quantity        ?? 0,
          author:       profile.author_name ?? profile.full_name ?? "Vendeur RHAZN",
          authorUid:    item.user_id         ?? "",
          authorAvatar: profile.avatar_url   ?? null,
          showPrice:    item.show_price    !== false,
          showQob:      item.show_qob      !== false,
          showQuantity: item.show_quantity !== false,
          date:         item.created_at    ? fmtDate(item.created_at) : "—",
          category:     item.category_label ?? "—",
          qob:          Number(item.qob_count ?? 0),
          price:        Number(item.price_htg  ?? 0),
        });
      }
      setProdItems(mapped);
    } catch (e) { console.warn("fetchProduits error:", e); }
  };

  // ✅ FIX : handler de suppression — retire les IDs du state sans refetch
  const handleDelete = (deletedIds: string[]) => {
    const idSet = new Set(deletedIds);
    setProdItems(prev => prev.filter(p => !idSet.has(p.id)));
  };

  const goToAuteur = (uid: string) => {
    if (!uid) return;
    router.push({ pathname: "/rz-channel/auteur", params: { uid } } as any);
  };

  const q = searchQuery.trim().toLowerCase();
  const searchResults: ProductItem[] = q.length === 0 ? [] : prodItems.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.author.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
  const showSearch = q.length > 0;

  return (
    <View style={sStyles.screen}>
      {/* HEADER */}
      <View style={[sStyles.headerSafe, { paddingTop: insets.top }]}>
        <View style={sStyles.header}>
          <ExpoImage source={RHAZN_LOGO} style={sStyles.rhaznLogoImg} contentFit="contain" />
          <View style={sStyles.searchBar}>
            <Ionicons name="search" size={15} color={COLORS.muted} />
            <TextInput
              style={sStyles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
              blurOnSubmit={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={15} color={COLORS.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {showSearch && (
          <View style={sStyles.searchDropdown}>
            {searchResults.length === 0 ? (
              <View style={sStyles.searchEmpty}>
                <Ionicons name="search-outline" size={18} color={COLORS.muted} />
                <Text style={sStyles.searchEmptyTxt}>Aucun résultat pour "{searchQuery}"</Text>
              </View>
            ) : (
              searchResults.slice(0, 6).map(item => (
                <Pressable
                  key={item.id}
                  style={sStyles.searchResultRow}
                  onPress={() => { goToAuteur(item.authorUid); setSearchQuery(""); }}
                >
                  <View style={sStyles.searchResultIcon}>
                    <Ionicons name="cube-outline" size={14} color={COLORS.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sStyles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={sStyles.searchResultMeta} numberOfLines={1}>{item.author} • {item.category}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={13} color={COLORS.muted} />
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* SCROLLABLE BODY */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 20 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        {loading && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
            <Text style={{ color: COLORS.muted, fontWeight: "700", fontSize: 14 }}>Chargement...</Text>
          </View>
        )}

        <ActualitesSection
          dbItems={actuItems}
          isSupreme={isSupreme}
          onEditPress={() => router.push("rz-channel/publish-news" as any)}
          onCardPress={() => router.push("/rz-channel/archive" as any)}
        />

        {/* ✅ ACTUS — sans corbeille */}
        <ActusSection items={prodItems} onAuthorPress={goToAuteur} />

        {/* ✅ PRODUITS — avec corbeille Supreme + sélection + FIX delete */}
        <ProduitsSection
          items={prodItems}
          onAuthorPress={goToAuteur}
          isSupreme={isSupreme}
          currentUid={currentUid}
          onDelete={handleDelete}
        />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const sStyles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: COLORS.bg },
  headerSafe: { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 6, marginTop: 30 },

  searchBar:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: "transparent", marginLeft: 12 },
  searchInput:     { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.text, padding: 0, margin: 0 },
  searchDropdown:  { marginHorizontal: 16, marginTop: 4, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 12, elevation: 5, overflow: "hidden" },
  searchEmpty:     { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  searchEmptyTxt:  { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  searchResultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchResultIcon:{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(212,175,55,0.10)", alignItems: "center", justifyContent: "center" },
  searchResultName:{ fontSize: 13, fontWeight: "800", color: COLORS.text },
  searchResultMeta:{ fontSize: 11, fontWeight: "600", color: COLORS.muted, marginTop: 1 },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14, marginTop: 20 },
  sectionTitle:    { fontSize: 22, fontWeight: "900", color: COLORS.text, letterSpacing: 0.3 },
  editActuBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  editActuTxt:     { color: "#000", fontWeight: "900", fontSize: 12 },

  bigCard:           { borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.card, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, elevation: 5 },
  bigCardImage:      { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  bigCardOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)" },
  bigCardContent:    { position: "absolute", bottom: 0, left: 0, right: 0, padding: 18 },
  officialBadge:     { backgroundColor: COLORS.gold, alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
  officialBadgeText: { color: "#000", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  bigCardTitle:      { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 6 },
  bigCardBody:       { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  smallCard:         { borderRadius: 18, overflow: "hidden", backgroundColor: COLORS.card, shadowColor: "#000", shadowOpacity: 0.10, shadowRadius: 10, elevation: 4 },
  smallCardImage:    { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  smallCardOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)" },
  smallCardContent:  { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12 },
  smallCardSummary:  { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 17 },

  actusCard:             { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 16, overflow: "hidden", height: ACTUS_CARD_H, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  actusImage:            { width: 110, height: ACTUS_CARD_H },
  actusContent:          { flex: 1, padding: 12, justifyContent: "space-between" },
  actusAuthorRow:        { flexDirection: "row", alignItems: "center", gap: 7 },
  actusAvatarPlaceholder:{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center" },
  actusAvatarImg:        { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ddd", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.30)" },
  actusAvatarInitial:    { color: COLORS.gold, fontWeight: "900", fontSize: 12 },
  actusAuthor:           { flex: 1, fontSize: 13, fontWeight: "800", color: COLORS.text },
  actusLikeBadge:        { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(212,175,55,0.1)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  actusLikeText:         { fontSize: 11, fontWeight: "800", color: COLORS.gold },
  actusSummary:          { fontSize: 13, color: COLORS.text, lineHeight: 17, fontWeight: "700" },
  actusDate:             { fontSize: 11, color: COLORS.muted, fontWeight: "600" },

  filterBar:        { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 12, marginTop: 20, backgroundColor: COLORS.bg, paddingVertical: 10, zIndex: 1000 },
  filterBtn:        { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: COLORS.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterBtnActive:  { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  filterText:       { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  filterTextActive: { color: "#000" },

  // ✅ Barre actions Supreme — dans Produits uniquement
  supremeBar:    { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12, flexWrap: "wrap" },
  supremeBtn:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(212,175,55,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(212,175,55,0.28)" },
  supremeBtnTxt: { color: COLORS.gold, fontWeight: "800", fontSize: 11 },

  // ✅ Modal confirmation
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.50)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  modalCard:      { width: "100%", backgroundColor: COLORS.card, borderRadius: 24, padding: 24, alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.20, shadowRadius: 24, elevation: 16 },
  modalIconWrap:  { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,59,48,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,59,48,0.25)" },
  modalTitle:     { color: COLORS.text, fontWeight: "900", fontSize: 17, textAlign: "center" },
  modalSub:       { color: COLORS.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  modalBtnRow:    { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  modalCancelTxt: { color: COLORS.muted, fontWeight: "800", fontSize: 14 },
  modalConfirmBtn:{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: COLORS.red, alignItems: "center" },
  modalConfirmTxt:{ color: "#FFF", fontWeight: "900", fontSize: 14 },

  // ✅ Product card + checkbox
  productCard:         { width: PRODUCT_CARD_W, backgroundColor: COLORS.card, borderRadius: 16, padding: 10, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  productCardSelected: { borderWidth: 2, borderColor: COLORS.gold },
  checkbox:            { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", zIndex: 10 },
  checkboxOn:          { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  productImage:        { width: "100%", height: 100, borderRadius: 10, marginBottom: 8 },
  productName:         { fontSize: 13, fontWeight: "800", color: COLORS.text, marginBottom: 3, flexShrink: 1 },
  productQobRow:       { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2 },
  productQty:          { fontSize: 11, fontWeight: "700", color: COLORS.gold, marginBottom: 2 },
  productAuthor:       { fontSize: 11, color: COLORS.muted, fontWeight: "600", marginBottom: 6 },
  productMeta:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 4 },
  productDate:         { fontSize: 9, color: COLORS.muted, fontWeight: "600", textAlign: "right" },
  productCatBadge:     { backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  productCatText:      { fontSize: 9, fontWeight: "800", color: COLORS.gold },
  productPriceRow:     { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 3 },
  productPrice:        { fontSize: 11, fontWeight: "900", color: COLORS.gold },
  productToggleRow:    { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  productToggleBtn:    { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.04)", borderWidth: 1, borderColor: COLORS.border },
  productToggleBtnOn:  { backgroundColor: "rgba(212,175,55,0.10)", borderColor: "rgba(212,175,55,0.35)" },
  productToggleTxt:    { fontSize: 9, fontWeight: "800", color: COLORS.muted },
  // ✅ Bouton supprimer sur la carte produit
  productDeleteBtn:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,59,48,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(255,59,48,0.22)", marginTop: 6, alignSelf: "flex-start" },
  productDeleteTxt:    { color: COLORS.red, fontWeight: "800", fontSize: 9 },

  rhaznLogoImg: { width: 40, height: 40 },
});