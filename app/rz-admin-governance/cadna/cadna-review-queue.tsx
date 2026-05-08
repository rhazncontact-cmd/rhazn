import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.28)";
const BG       = "#F2F2F7";
const CARD     = "#FFFFFF";
const SOFT     = "#E5E5EA";
const TEXT     = "#111111";
const MUTED    = "#6E6E73";
const BLUE     = "#007AFF";
const GREEN    = "#34C759";
const RED      = "#FF3B30";
const ORANGE   = "#FF9500";

// ─── Types ──────────────────────────────────────────────────
type Item = {
  id:           string;
  title:        string | null;
  content_type: string;
  created_at:   string;
};

// ─── Badge type contenu ─────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const t = (type || "").toUpperCase();
  const map: Record<string, { color: string; bg: string }> = {
    SUSPENTZ: { color: GOLD,     bg: GOLD_DIM },
    PRODUCT:  { color: BLUE,     bg: "rgba(0,122,255,0.10)" },
    PRODUCTS: { color: BLUE,     bg: "rgba(0,122,255,0.10)" },
    AUDIO:    { color: "#AF52DE", bg: "rgba(175,82,222,0.10)" },
    VIDEO:    { color: ORANGE,   bg: "rgba(255,149,0,0.10)"  },
    TEXT:     { color: GREEN,    bg: "rgba(52,199,89,0.10)"  },
    IMAGE:    { color: "#5AC8FA", bg: "rgba(90,200,250,0.10)" },
  };
  const s = map[t] ?? { color: MUTED, bg: "rgba(110,110,115,0.10)" };
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: s.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{t}</Text>
    </View>
  );
}

// ─── Toast iOS ───────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color = toast.type === "success" ? GREEN : toast.type === "error" ? RED : BLUE;
  const icon: any = toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "close-circle" : "information-circle";
  return (
    <Animated.View style={[styles.iosToast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }]}>
      <View style={[styles.iosToastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.iosToastTitle}>{toast.title}</Text>
        <Text style={styles.iosToastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Composant principal ────────────────────────────────────
export default function CadnaReviewQueue() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items,      setItems]      = useState<Item[]>([]);

  const toastAnim  = useRef(new Animated.Value(0)).current;
  const itemAnims  = useRef<Animated.Value[]>([]);
  const slideAnims = useRef<Animated.Value[]>([]);

  const [toast, setToast] = useState<{ title: string; sub: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success" | "error" | "info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cadna_queue")
        .select("id, title, content_type, created_at")
        .eq("cadna_status", "pending")
        .order("created_at", { ascending: true });

      if (error) { setItems([]); return; }

      const list = (data ?? []) as Item[];
      setItems(list);

      // Préparer + lancer animations
      list.forEach((_, i) => {
        if (!itemAnims.current[i])  itemAnims.current[i]  = new Animated.Value(0);
        if (!slideAnims.current[i]) slideAnims.current[i] = new Animated.Value(14);
        Animated.parallel([
          Animated.timing(itemAnims.current[i],  { toValue: 1, duration: 340, delay: i * 55, useNativeDriver: true }),
          Animated.timing(slideAnims.current[i], { toValue: 0, duration: 340, delay: i * 55, useNativeDriver: true }),
        ]).start();
      });

    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("cadna-queue-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cadna_queue" }, () => {
        load(true);
        showToast("File mise à jour", "Nouveau contenu dans la queue.", "info");
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return iso; }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.loadingTxt}>Chargement de la file…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {/* ── Toast iOS ──────────────────────────── */}
      <IOSToast toast={toast} anim={toastAnim} />

      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>File de validation</Text>
          <Text style={styles.hSub}>Contenus en attente · CADNA</Text>
        </View>
        <View style={[styles.countBadge, items.length > 0 && styles.countBadgeAlert]}>
          <Text style={[styles.countBadgeTxt, items.length > 0 && { color: GOLD }]}>
            {items.length}
          </Text>
        </View>
      </View>

      {/* ── Empty state ────────────────────────── */}
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done-circle" size={48} color={GREEN} />
          </View>
          <Text style={styles.emptyTitle}>File vide ✓</Text>
          <Text style={styles.emptySub}>
            Tous les contenus ont été examinés.{"\n"}Aucun dossier en attente.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Bandeau info ──────────────────────── */}
          <View style={styles.infoBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Ionicons name="time-outline" size={15} color={GOLD} />
              <Text style={styles.infoBannerTxt}>
                <Text style={{ color: GOLD, fontWeight: "900" }}>{items.length}</Text>
                {" "}contenu{items.length !== 1 ? "s" : ""} en attente de validation
              </Text>
            </View>
            <View style={styles.liveDot} />
          </View>

          {/* ── Liste ────────────────────────────── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={GOLD} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 6 }}
          >
            {items.map((item, i) => {
              const fadeAnim  = itemAnims.current[i]  || new Animated.Value(1);
              const slideAnim = slideAnims.current[i] || new Animated.Value(0);

              return (
                <Animated.View
                  key={item.id}
                  style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                >
                  <Pressable
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.86, transform: [{ scale: 0.988 }] }]}
                    onPress={() => router.push({
                      pathname: "/rz-admin-governance/cadna/cadna-review-content",
                      params: { content_id: item.id, content_type: item.content_type },
                    })}
                  >
                    {/* Haut de la carte */}
                    <View style={styles.cardTop}>
                      <View style={styles.indexBox}>
                        <Text style={styles.indexTxt}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title || "Contenu sans titre"}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <TypeBadge type={item.content_type} />
                          <Text style={styles.cardDate}>{fmtDate(item.created_at)}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={SOFT} />
                    </View>

                    {/* Pied de la carte */}
                    <View style={styles.cardFooter}>
                      <View style={styles.pendingBadge}>
                        <View style={styles.pendingDot} />
                        <Text style={styles.pendingTxt}>EN ATTENTE</Text>
                      </View>
                      <View style={styles.examineBtn}>
                        <Ionicons name="eye-outline" size={12} color={MUTED} />
                        <Text style={styles.examineTxt}>Examiner</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: BG },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { color: MUTED, fontWeight: "600", fontSize: 14 },

  // Header
  header:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:         { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:          { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:            { color: MUTED, fontSize: 12, marginTop: 2 },
  countBadge:      { backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SOFT, minWidth: 40, alignItems: "center" },
  countBadgeAlert: { backgroundColor: GOLD_DIM, borderColor: GOLD_BD },
  countBadgeTxt:   { color: MUTED, fontWeight: "900", fontSize: 15 },

  // Bandeau info
  infoBanner:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 8, backgroundColor: GOLD_DIM, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: GOLD_BD },
  infoBannerTxt: { color: TEXT, fontSize: 13, fontWeight: "600" },
  liveDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },

  // Empty
  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon:  { width: 92, height: 92, borderRadius: 26, backgroundColor: `${GREEN}12`, borderWidth: 1.5, borderColor: `${GREEN}30`, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontWeight: "900", fontSize: 20 },
  emptySub:   { color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 21 },

  // Card
  card:      { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: SOFT, marginBottom: 12, overflow: "hidden" },
  cardTop:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  indexBox:  { width: 36, height: 36, borderRadius: 11, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  indexTxt:  { color: GOLD, fontWeight: "900", fontSize: 14 },
  cardTitle: { color: TEXT, fontWeight: "800", fontSize: 15 },
  cardDate:  { color: MUTED, fontSize: 11, fontWeight: "600" },

  cardFooter:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: BG, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: SOFT },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD },
  pendingTxt:   { color: GOLD, fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  examineBtn:   { flexDirection: "row", alignItems: "center", gap: 5 },
  examineTxt:   { color: MUTED, fontSize: 11, fontWeight: "700" },

  // Toast iOS
  iosToast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  iosToastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});