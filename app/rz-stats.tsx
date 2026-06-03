// app/statistiques.tsx
// ✅ RHAZN — Statistiques Premium Fintech
// ✅ Filtres catégorie identiques à "Mes Créations" (Tous / Suspentz / Produits / Audio / Vidéo / KozeSans / Texte / Images)
// ✅ Stats globales (TOUS) + stats indépendantes par catégorie
// ✅ TAN en circulation hors wallets Suprême — carte rectangulaire
// ✅ HTG — carte rectangulaire séparée
// ✅ Formatage français : 1 234 567 · K · M · Md · Tr
// ✅ Inactivité = 25 jours consécutifs sans activité
// ✅ Achats TAN · Retraits · Publications par catégorie
// ✅ Contenus ayant généré ≥ 1K TAN · Géographie (départements Haïti + pays)
// ✅ QOB générés par catégorie · Nombre de Suspentz / Produits / KozeSans publiés
// ✅ Design fintech haute gamme — live via Supabase Realtime
//
// ⚠️  AJUSTEMENTS SELON VOTRE SCHÉMA :
//   • "profiles.role" pour exclure les Suprême (ajuster si besoin)
//   • "store_products.price_tan" utilisé comme proxy de tan_earned (remplacer par tan_earned si existant)
//   • "transactions.type" pour achats ('tan_purchase') et retraits ('withdrawal')
//   • "profiles.department" et "profiles.country" pour la géographie

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const { width: SW }   = Dimensions.get("window");
const TAN_TO_HTG      = 10;     // 1 TAN = 10 HTG (officiel RHAZN)
const TAN_TO_USD      = 0.05;   // 1 TAN = 0.05 USD
const INACTIVE_DAYS   = 25;     // inactif = 25 jours consécutifs sans activité
const CHART_W         = SW - 64;
const CHART_H         = 130;
const MONTHS_FR       = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

// Codes catégorie utilisés comme "Produits" (tout sauf ces codes = Produit)
const NON_PRODUCT_CODES = ["SUSPENTZ","AUDIO","VIDEO","KOZESANS","TEXT","IMAGES"];

const C = {
  bg:          "#F2F2F7",
  card:        "#FFFFFF",
  cardInner:   "#F6F7F9",
  gold:        "#D4AF37",
  goldLight:   "rgba(212,175,55,0.10)",
  goldBorder:  "rgba(212,175,55,0.28)",
  text:        "#0A0A0A",
  sub:         "#6E6E73",
  muted:       "#AEAEB2",
  border:      "#E5E5EA",
  cardInner:   "#F6F7F9",
  green:       "#34C759",
  greenLight:  "rgba(52,199,89,0.10)",
  blue:        "#007AFF",
  blueLight:   "rgba(0,122,255,0.10)",
  red:         "#FF3B30",
  redLight:    "rgba(255,59,48,0.10)",
  orange:      "#FF9500",
  orangeLight: "rgba(255,149,0,0.10)",
  purple:      "#AF52DE",
  purpleLight: "rgba(175,82,222,0.10)",
  teal:        "#32ADE6",
  tealLight:   "rgba(50,173,230,0.10)",
};

// ─────────────────────────────────────────────────────────────
// FILTRES — identiques à Mes Créations
// ─────────────────────────────────────────────────────────────
type TypeKey = "TOUS" | "SUSPENTZ" | "PRODUCTS" | "AUDIO" | "VIDEO" | "KOZESANS" | "TEXT" | "IMAGES";

const TYPE_FILTERS: { label: string; key: TypeKey; icon: string; color: string }[] = [
  { label: "Tous",     key: "TOUS",     icon: "grid-outline",         color: C.gold   },
  { label: "Suspentz", key: "SUSPENTZ", icon: "play-circle-outline",  color: C.blue   },
  { label: "Produits", key: "PRODUCTS", icon: "cube-outline",         color: C.orange },
  { label: "Audio",    key: "AUDIO",    icon: "musical-notes-outline", color: C.purple },
  { label: "Vidéo",    key: "VIDEO",    icon: "videocam-outline",      color: C.red    },
  { label: "KozeSans", key: "KOZESANS", icon: "mic-outline",           color: C.teal   },
  { label: "Texte",    key: "TEXT",     icon: "document-text-outline", color: C.green  },
  { label: "Images",   key: "IMAGES",   icon: "images-outline",        color: C.gold   },
];

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type ContentRow = {
  id:             string;
  title:          string | null;
  category_code:  string | null;   // SUSPENTZ, AUDIO, VIDEO… ou "PRODUCTS"
  category_label: string | null;   // label lisible depuis products.category_label
  qob_count:      number;
  price_tan:      number;          // store_products.price_tan (Suspentz)
  price_htg:      number;          // products.price_htg (Produits)
  quantity:       number;          // products.quantity
  cover_url:      string | null;   // products.cover_url
  source:         "store" | "product";
  created_at:     string;
};

type GlobalStats = {
  totalUsers:        number;
  activeUsers:       number;
  inactiveUsers:     number;
  newUsersLast30:    number;
  newUsersLast7:     number;
  totalTan:          number;
  totalHtg:          number;
  tanPurchaseCount:  number;
  tanPurchaseTotal:  number;   // montant TAN total acheté
  tanWithdrawCount:  number;
  tanWithdrawTotal:  number;   // montant TAN total retiré
  totalSuspentz:     number;
  totalProducts:     number;
  totalAudio:        number;
  totalVideo:        number;
  totalKozesans:     number;
  totalText:         number;
  totalImages:       number;
  totalAllContent:   number;
  totalQob:          number;
  avgQobPerContent:  number;
  millionQobCount:   number;
  kTanAll:           number;
  kTanSuspentz:      number;
  kTanProducts:      number;
  departments:       number;
  countries:         number;
  deptList:          { name: string; count: number; members: { name: string; avatar: string | null; date: string }[] }[];
  countryList:       { name: string; count: number }[];
  // ── Produits réels ──
  prodSoldCount:     number;   // produits achetés (user_paid_contents)
  prodAuthorsCount:  number;   // auteurs distincts ayant publié
  prodTotalTan:      number;   // TAN générés par achats de produits
  monthlySignups:    { label: string; count: number }[];
  qobDistrib:        { label: string; count: number; color: string }[];
  contentByCategory: { label: string; count: number; color: string }[];
  qobByCategory:     { label: string; qob: number;   color: string }[];
  // ── Produits réels (revenus réels) ──
  realRevenueHTG:    number;   // revenu RÉEL = cumul_price_htg (vrais achats)
  realRevenueTAN:    number;   // TAN réellement encaissés (wallet_transactions CONTENT_PAY)
  realRevenueUSD:    number;   // USD réel = realRevenueTAN × 0.05
  avgPriceHTG:       number;   // prix moyen HTG par produit publié
  totalSuspentzCount: number;  // nombre de Suspentz disponibles
  totalProductsCount: number;  // nombre de Produits disponibles (table products)
  totalQuantity:      number;  // stock total disponible (non utilisé)
  prodWithImages:    number;   // produits avec couverture (cover_url non null)
  prodCatDistrib:    { label: string; count: number; color: string }[];
  prodMonthly:       { label: string; count: number }[];
  prodQobDistrib:    { label: string; count: number; color: string }[];
};

type CatStats = {
  typeKey:          TypeKey;
  totalPublished:   number;
  totalQob:         number;
  totalTanEarned:   number;
  avgQob:           number;
  count1kTan:       number;
  millionQob:       number;
  qobDistrib:       { label: string; count: number; color: string }[];
  monthlyPublished: { label: string; count: number }[];
  // Produits spécifiques (revenus réels)
  realRevenueHTG:   number;   // cumul_price_htg — revenus réels
  realRevenueTAN:   number;   // TAN réels encaissés
  avgPriceHTG:      number;
  totalQuantity:    number;
  prodWithImages:   number;
  prodCatDistrib:   { label: string; count: number; color: string }[];
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
// Formatage français — groupes de 3 chiffres séparés par espace
const fmtFR = (n: number): string =>
  Math.round(n).toLocaleString("fr-FR");

// ✅ Format USD — préserve les décimales (ex: $0.30 pas $0)
const fmtUSD = (n: number): string => {
  if (!isFinite(n) || n === 0) return "$0.00";
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)} Md`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)} M`;
  if (Math.abs(n) >= 1e3)  return `$${(n / 1e3).toFixed(2)} K`;
  return `$${n.toFixed(2)}`;
};

// Formatage court avec unités SI en français
const fmtShort = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2).replace(".", ",")} Tr`;
  if (abs >= 1e9)  return `${(n / 1e9).toFixed(2).replace(".", ",")} Md`;
  if (abs >= 1e6)  return `${(n / 1e6).toFixed(2).replace(".", ",")} M`;
  if (abs >= 1e3)  return `${(n / 1e3).toFixed(1).replace(".", ",")} K`;
  return fmtFR(n);
};

const fmtTime = (d: Date | null): string =>
  d ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

// Construit un tableau de 6 mois à partir d'un tableau de Date
const buildMonthMap = (dates: Date[]): { label: string; count: number }[] => {
  const now = new Date();
  const map: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map[key]  = 0;
  }
  dates.forEach(d => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in map) map[key]++;
  });
  return Object.entries(map).map(([key, count]) => ({
    label: MONTHS_FR[parseInt(key.split("-")[1]) - 1],
    count,
  }));
};

// QOB distribution helper
const buildQobDistrib = (qobArr: number[]) => [
  { label: "< 100",    count: qobArr.filter(q => q < 100).length,                        color: C.muted  },
  { label: "100–1K",   count: qobArr.filter(q => q >= 100    && q < 1_000).length,       color: C.blue   },
  { label: "1K–10K",   count: qobArr.filter(q => q >= 1_000  && q < 10_000).length,      color: C.green  },
  { label: "10K–100K", count: qobArr.filter(q => q >= 10_000 && q < 100_000).length,     color: C.orange },
  { label: "100K–1M",  count: qobArr.filter(q => q >= 100_000 && q < 1_000_000).length,  color: C.purple },
  { label: "1M+",      count: qobArr.filter(q => q >= 1_000_000).length,                 color: C.gold   },
];

// ─────────────────────────────────────────────────────────────
// BAR CHART
// ─────────────────────────────────────────────────────────────
function BarChart({ data, color, height = CHART_H }: {
  data:    { label: string; count: number }[];
  color:   string;
  height?: number;
}) {
  // Anims créées une seule fois, remplacées si nb de barres change
  const animsRef = useRef<Animated.Value[]>([]);
  if (animsRef.current.length !== data.length) {
    animsRef.current = data.map(() => new Animated.Value(0));
  }
  const anims = animsRef.current;

  useEffect(() => {
    const maxVal = Math.max(...data.map(d => d.count), 1);
    Animated.stagger(50, anims.map((a, i) =>
      Animated.spring(a, {
        toValue:  data[i].count / maxVal,
        damping:  18, stiffness: 180, useNativeDriver: false,
      })
    )).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  if (!data.length) return null;
  const barW = Math.max(8, (CHART_W - (data.length - 1) * 6) / data.length);

  return (
    <View style={{ width: CHART_W }}>
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <View key={pct} style={{
          position: "absolute", top: (1 - pct) * height,
          left: 0, right: 0, height: 1,
          backgroundColor: "rgba(0,0,0,0.05)",
        }} />
      ))}
      <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ width: barW, height, justifyContent: "flex-end", alignItems: "center" }}>
            <Animated.View style={{
              width:           barW,
              height:          anims[i].interpolate({ inputRange: [0, 1], outputRange: [2, height - 4] }),
              backgroundColor: color,
              borderRadius:    Math.min(5, barW / 2),
              opacity:         0.7 + (i / Math.max(data.length - 1, 1)) * 0.3,
            }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={{
            width: barW, textAlign: "center",
            fontSize: 8, color: C.muted, fontWeight: "700",
          }} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// HORIZONTAL BAR
// ─────────────────────────────────────────────────────────────
function HBar({ label, count, maxCount, color }: {
  label: string; count: number; maxCount: number; color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = maxCount > 0 ? count / maxCount : 0;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, damping: 20, stiffness: 160, useNativeDriver: false }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
      <Text style={{ width: 68, color: C.sub, fontWeight: "700", fontSize: 11, textAlign: "right" }}>{label}</Text>
      <View style={{ flex: 1, height: 10, backgroundColor: C.cardInner, borderRadius: 99, overflow: "hidden" }}>
        <Animated.View style={{
          height: "100%", borderRadius: 99, backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }} />
      </View>
      <Text style={{ width: 52, color, fontWeight: "900", fontSize: 11, textAlign: "right" }}>{fmtShort(count)}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, bg, anim }: {
  icon: string; label: string; value: string; sub?: string;
  color: string; bg: string; anim: Animated.Value;
}) {
  return (
    <Animated.View style={[k.card, {
      opacity:   anim,
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
    }]}>
      <View style={[k.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={17} color={color} />
      </View>
      <Text style={k.val}>{value}</Text>
      <Text style={k.lbl}>{label}</Text>
      {!!sub && <Text style={k.sub}>{sub}</Text>}
    </Animated.View>
  );
}
const k = StyleSheet.create({
  card: { flex: 1, minWidth: (SW - 48) / 2 - 4, backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.border, gap: 5 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  val:  { fontSize: 22, fontWeight: "900", color: C.text, letterSpacing: -0.3 },
  lbl:  { fontSize: 11, fontWeight: "700", color: C.sub },
  sub:  { fontSize: 10, fontWeight: "600", color: C.muted },
});

// ─────────────────────────────────────────────────────────────
// RECTANGULAR MONEY CARD
// ─────────────────────────────────────────────────────────────
function MoneyCard({ label, value, unit, color, bg, icon, note }: {
  label: string; value: string; unit: string;
  color: string; bg: string; icon: string; note?: string;
}) {
  return (
    <View style={[mc.card, { borderColor: `${color}35` }]}>
      <View style={[mc.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mc.label}>{label}</Text>
        {!!note && <Text style={mc.note}>{note}</Text>}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[mc.value, { color }]}>{value}</Text>
        <Text style={[mc.unit, { color: `${color}AA` }]}>{unit}</Text>
      </View>
    </View>
  );
}
const mc = StyleSheet.create({
  card:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 8 },
  iconWrap:{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label:   { fontSize: 13, fontWeight: "800", color: C.text },
  note:    { fontSize: 10, fontWeight: "600", color: C.muted, marginTop: 2, lineHeight: 14 },
  value:   { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  unit:    { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
function SectionHead({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={14} color={color} />
      </View>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// METRIC ROW (table résumé)
// ─────────────────────────────────────────────────────────────
function MetricRow({ icon, label, value, color, isFirst }: {
  icon: string; label: string; value: string; color: string; isFirst?: boolean;
}) {
  return (
    <View style={[mr.row, isFirst && { borderTopWidth: 0 }]}>
      <View style={[mr.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={13} color={color} />
      </View>
      <Text style={mr.lbl}>{label}</Text>
      <Text style={[mr.val, { color }]}>{value}</Text>
    </View>
  );
}
const mr = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  lbl:  { flex: 1, color: C.sub, fontWeight: "700", fontSize: 12 },
  val:  { fontWeight: "900", fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function Statistiques() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [typeFilter,  setTypeFilter]  = useState<TypeKey>("TOUS");
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [catStats,    setCatStats]    = useState<CatStats | null>(null);
  const [catLoading,  setCatLoading]  = useState(false);

  // ── Modals géographie ─────────────────────────────────────
  const [geoModal,       setGeoModal]       = useState<null | "dept" | "country">(null);
  const [selectedDept,   setSelectedDept]   = useState<string | null>(null);

  // Animations
  const kpiAnims   = useRef(Array.from({ length: 14 }, () => new Animated.Value(0))).current;
  const liveDot    = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;

  // Pulse du point live
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(liveDot, { toValue: 0.15, duration: 650, useNativeDriver: true }),
      Animated.timing(liveDot, { toValue: 1,    duration: 650, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, []);

  const animateKpis = () => {
    kpiAnims.forEach(a => a.setValue(0));
    Animated.stagger(55, kpiAnims.map(a =>
      Animated.spring(a, { toValue: 1, damping: 15, stiffness: 170, useNativeDriver: true })
    )).start();
  };

  // ── Chargement GLOBAL ──────────────────────────────────────
  // Utilise Promise.allSettled + helpers safe pour qu'une
  // table manquante ne bloque pas toute la page.
  const loadGlobal = useCallback(async () => {
    const now   = new Date();
    const ago25 = new Date(now.getTime() - INACTIVE_DAYS * 86_400_000);
    const ago30 = new Date(now.getTime() - 30 * 86_400_000);
    const ago7  = new Date(now.getTime() - 7  * 86_400_000);

    // Helper : renvoie la data ou [] / 0 sans jamais planter
    const safeQuery = async <T>(fn: () => Promise<{ data?: T | null; count?: number | null; error?: any }>): Promise<{ data: T extends Array<infer U> ? U[] : T | null; count: number }> => {
      try {
        const res = await fn();
        return { data: (res.data ?? null) as any, count: res.count ?? 0 };
      } catch {
        return { data: null as any, count: 0 };
      }
    };

    // ── Requêtes parallèles — Promise.allSettled évite qu'une erreur
    //    bloque les autres. ──────────────────────────────────────────────
    const [
      rProfiles,
      rWallets,
      rStoreProd,
      rProducts,
      rSignups,
      rTanPurch,
      rWithdraw,
      rGeo,
    ] = await Promise.allSettled([

      // 1. Nombre total de membres
      safeQuery(() =>
        supabase.from("profiles").select("*", { count: "exact", head: true })
      ),

      // 2. Wallets — sans jointure FK
      safeQuery(() =>
        supabase.from("wallets").select("tan_balance, updated_at, user_id")
      ),

      // 3. store_products (Suspentz, Audio, Vidéo, KozeSans, Text, Images)
      safeQuery(() =>
        supabase
          .from("store_products")
          .select("id, title, category_code, qob_count, price_tan, created_at")
          .is("deleted_at", null)
          .eq("cadna_status", "approved")
      ),

      // 4. products (table auteur.tsx — produits HTG)
      //    Champs : id, title, cover_url, created_at, category_label, price_htg, quantity, qob_count, user_id
      safeQuery(() =>
        supabase
          .from("products")
          .select("id, title, cover_url, created_at, category_label, price_htg, quantity, qob_count, user_id")
          .is("deleted_at", null)
          .eq("cadna_status", "approved")
      ),

      // 5. Dates d'inscription
      safeQuery(() =>
        supabase.from("profiles").select("created_at").order("created_at", { ascending: true })
      ),

      // 6. Achats TAN — wallet_transactions DEPOSIT_TAN direction IN
      //    (action_code vu dans user-history.tsx)
      safeQuery(() =>
        supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("action_code", "DEPOSIT_TAN")
          .eq("direction", "IN")
      ),

      // 7. Retraits TAN — wallet_transactions WITHDRAW_TAN direction OUT
      safeQuery(() =>
        supabase
          .from("wallet_transactions")
          .select("amount")
          .eq("action_code", "WITHDRAW_TAN")
          .eq("direction", "OUT")
      ),

      // 8. Géographie — tous les profils (dept + country)
      safeQuery(() =>
        supabase
          .from("profiles")
          .select("birth_department, birth_country")
          .not("birth_country", "is", null)
      ),
    ]);

    // ── Extraire les valeurs (fulfilled) ou fallback ──────────
    const totalUsers     = rProfiles.status  === "fulfilled" ? (rProfiles.value.count   ?? 0) : 0;
    const walletRows     = rWallets.status   === "fulfilled" ? (rWallets.value.data     ?? []) : [];
    const storeRows      = rStoreProd.status === "fulfilled" ? (rStoreProd.value.data   ?? []) : [];
    const productRows    = rProducts.status  === "fulfilled" ? (rProducts.value.data    ?? []) : [];
    const signupRows     = rSignups.status   === "fulfilled" ? (rSignups.value.data     ?? []) : [];
    // Achats TAN — nombre + montant total (champ = amount)
    const tanPurchRows   = rTanPurch.status === "fulfilled" ? ((rTanPurch.value.data as any[]) ?? []) : [];
    const tanPurchCount  = tanPurchRows.length;
    const tanPurchTotal  = tanPurchRows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

    // Retraits — nombre + montant total (champ = amount)
    const tanWithRows    = rWithdraw.status === "fulfilled" ? ((rWithdraw.value.data as any[]) ?? []) : [];
    const tanWithCount   = tanWithRows.length;
    const tanWithTotal   = tanWithRows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const geoRows        = rGeo.status       === "fulfilled" ? (rGeo.value.data         ?? []) : [];

    // Exclure les Suprême des wallets
    let supremeUids: Set<string> = new Set();
    try {
      const { data: roles } = await supabase
        .from("profiles").select("id, role").in("role", ["supreme", "SUPREME"]);
      (roles ?? []).forEach((r: any) => supremeUids.add(r.id));
    } catch { /* pas critique */ }

    const wallets: any[] = (walletRows as any[]).filter(
      (w: any) => !supremeUids.has(w.user_id ?? "")
    );

    // ── Communauté ───────────────────────────────────────────
    const activeUsers   = wallets.filter(w => w.updated_at && new Date(w.updated_at) > ago25).length;
    const inactiveUsers = Math.max(0, totalUsers - activeUsers);
    const allDates      = (signupRows as any[]).map((d: any) => new Date(d.created_at));
    const newLast30     = allDates.filter(d => d > ago30).length;
    const newLast7      = allDates.filter(d => d > ago7).length;

    // ── Économie (hors Suprême) ──────────────────────────────
    const totalTan = wallets.reduce((s: number, w: any) => s + Number(w.tan_balance ?? 0), 0);
    const totalHtg = Math.round(totalTan * TAN_TO_HTG);

    // ── Contenu store_products ───────────────────────────────
    const storeContent: ContentRow[] = (storeRows as any[]).map((c: any) => ({
      id:             c.id,
      title:          c.title ?? null,
      category_code:  (c.category_code ?? "SUSPENTZ").toUpperCase(),
      category_label: null,
      qob_count:      Number(c.qob_count ?? 0),
      price_tan:      Number(c.price_tan  ?? 0),
      price_htg:      0,
      quantity:       0,
      cover_url:      null,
      source:         "store" as const,
      created_at:     c.created_at,
    }));

    // ── Contenu products (table auteur.tsx) ──────────────────
    const prodContent: ContentRow[] = (productRows as any[]).map((c: any) => ({
      id:             c.id,
      title:          c.title ?? null,
      category_code:  "PRODUCTS",
      category_label: c.category_label ?? null,
      qob_count:      Number(c.qob_count ?? 0),
      price_tan:      0,
      price_htg:      Number(c.price_htg  ?? 0),
      quantity:       Number(c.quantity   ?? 0),
      cover_url:      c.cover_url ?? null,
      source:         "product" as const,
      created_at:     c.created_at,
    }));

    // Fusion des deux sources
    const content: ContentRow[] = [...storeContent, ...prodContent];

    // ── Compteurs par catégorie ──────────────────────────────
    const countCat   = (code: string) => content.filter(c => c.category_code === code).length;
    const qobByCat   = (code: string | null) => content
      .filter(c => code ? c.category_code === code : !NON_PRODUCT_CODES.includes(c.category_code ?? ""))
      .reduce((s, c) => s + c.qob_count, 0);

    const totalSuspentz  = countCat("SUSPENTZ");
    const totalAudio     = countCat("AUDIO");
    const totalVideo     = countCat("VIDEO");
    const totalKozesans  = countCat("KOZESANS");
    const totalText      = countCat("TEXT");
    const totalImages    = countCat("IMAGES");
    const totalProducts  = prodContent.length;   // depuis la table products
    const totalAllContent = content.length;

    // ── QOB global ───────────────────────────────────────────
    const qobArr           = content.map(c => c.qob_count);
    const totalQob         = qobArr.reduce((a, b) => a + b, 0);
    const avgQobPerContent = content.length ? Math.round(totalQob / content.length) : 0;
    const millionQobCount  = qobArr.filter(q => q >= 1_000_000).length;

    // ── ≥ 1K TAN ────────────────────────────────────────────
    const tanArr       = storeContent.map(c => c.price_tan);
    const kTanAll      = tanArr.filter(t => t >= 1_000).length;
    const kTanSuspentz = storeContent.filter(c => c.category_code === "SUSPENTZ" && c.price_tan >= 1_000).length;
    const kTanProducts = 0; // pas de TAN direct sur produits HTG

    // ── Statistiques Produits réels ─────────────────────────────
    const prodPrices     = prodContent.map(c => c.price_htg).filter(p => p > 0);
    const avgPriceHTG    = prodPrices.length
      ? Math.round(prodContent.reduce((s, c) => s + c.price_htg, 0) / prodPrices.length)
      : 0;
    // ✅ Stock = nombre de produits ayant déclaré un stock (quantity > 0)
    // On ne somme PAS les quantités — elles sont peu fiables dans products
    // On affiche combien de produits ont du stock disponible
    // ✅ Contenus disponibles réels
    const totalSuspentzCount = totalSuspentz;  // Suspentz publiés et disponibles
    const totalProductsCount = totalProducts;  // Produits publiés (table products)
    const totalQuantity      = 0;              // non utilisé
    const prodWithImages = prodContent.filter(c => c.cover_url).length;

    // Auteurs distincts ayant publié des produits
    const prodAuthorsCount = new Set(
      (productRows as any[]).map((p: any) => p.user_id).filter(Boolean)
    ).size;

    // ── Revenus RÉELS ───────────────────────────────────────────
    // Source 1 : cumul_price_htg dans la table products (somme des ventes réelles HTG)
    // Source 2 : wallet_transactions CONTENT_PAY (TAN réellement débités)
    let prodSoldCount  = 0;
    let realRevenueTAN = 0;
    let realRevenueHTG = 0;
    try {
      // Nombre de contenus vendus (toutes catégories)
      const { count: soldCount } = await supabase
        .from("user_content_access")
        .select("*", { count: "exact", head: true });
      prodSoldCount = soldCount ?? 0;

      // TAN réellement encaissés — wallet_transactions CONTENT_PAY direction OUT
      const { data: tanTxRows } = await supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("action_code", "CONTENT_PAY")
        .eq("direction", "OUT");
      realRevenueTAN = (tanTxRows ?? [])
        .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

      // Revenu HTG réel = TAN encaissés × 10 (1 TAN = 10 HTG)
      realRevenueHTG = Math.round(realRevenueTAN * TAN_TO_HTG);

      // Fallback : si cumul_price_htg existe dans products, utiliser la somme
      // (c'est le champ qui accumule le vrai chiffre d'affaires HTG par produit)
      const cumul = prodContent.reduce((s: number, c: any) =>
        s + Number((c as any).cumul_price_htg ?? 0), 0);
      if (cumul > 0) realRevenueHTG = Math.round(cumul);

    } catch { /* non critique */ }

    // ✅ USD toujours calculé depuis HTG (cohérent même si TAN wallet = 0)
    // 60 HTG / 10 (TAN_TO_HTG) × 0.05 (TAN_TO_USD) = $0.30
    // ✅ USD = HTG ÷ 10 × 0.05  (ex: 60 HTG → 6 TAN → $0.30)
    const realRevenueUSD = (realRevenueHTG / TAN_TO_HTG) * TAN_TO_USD;
    const prodTotalTan   = realRevenueTAN > 0
      ? realRevenueTAN
      : Math.round(realRevenueHTG / TAN_TO_HTG);

    // Répartition par category_label (produits)
    const catLabelMap: Record<string, number> = {};
    prodContent.forEach(c => {
      const lbl = c.category_label ?? "Autre";
      catLabelMap[lbl] = (catLabelMap[lbl] ?? 0) + 1;
    });
    const CAT_COLORS = [C.blue, C.orange, C.purple, C.teal, C.green, C.red, C.gold, C.silver ?? "#A8A9AD"];
    const prodCatDistrib = Object.entries(catLabelMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count], i) => ({ label, count, color: CAT_COLORS[i % CAT_COLORS.length] }));

    // Publications produits par mois
    const prodDates   = prodContent.map(c => new Date(c.created_at));
    const prodMonthly = buildMonthMap(prodDates);

    // Distribution QOB produits
    const prodQobArr    = prodContent.map(c => c.qob_count);
    const prodQobDistrib = buildQobDistrib(prodQobArr);

    // ── Géographie — données réelles avec profils ────────────
    // Départements = uniquement Haïti | Pays = tous les pays
    const haitiRows  = (geoRows as any[]).filter((p: any) => p.birth_country === "Haïti" || p.birth_country === "Haiti");
    const deptSet    = new Set(haitiRows.map((p: any) => p.birth_department).filter(Boolean));
    const countrySet = new Set((geoRows as any[]).map((p: any) => p.birth_country).filter(Boolean));

    // Construire la liste détaillée des départements (Haïti uniquement)
    // ✅ Normalisation : trim + capitalize pour éviter les doublons "Ouest" vs " ouest"
    const normalizeDept = (s: string) =>
      s.trim().replace(/\s+/g, " ")
       .replace(/^(\w)(.*)$/, (_, a, b) => a.toUpperCase() + b.toLowerCase());

    const deptMap: Record<string, { count: number }> = {};
    for (const row of haitiRows) {
      const dept = row.birth_department;
      if (!dept || !String(dept).trim()) continue;
      const key = normalizeDept(String(dept));
      if (!deptMap[key]) deptMap[key] = { count: 0 };
      deptMap[key].count++;
    }
    // ✅ Récupérer TOUS les membres par département
    const deptList = await Promise.all(
      Object.entries(deptMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(async ([name, info]) => {
          let members: { name: string; avatar: string | null; date: string }[] = [];
          try {
            const { data: allMembers } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, created_at")
              .ilike("birth_department", name.trim())
              .not("birth_department", "is", null)
              .order("created_at", { ascending: true })
              .limit(50); // max 50 par dept
            members = (allMembers ?? []).map((m: any) => ({
              name:   m.full_name ?? "—",
              avatar: m.avatar_url ?? null,
              date:   m.created_at?.slice(0, 10) ?? "",
            }));
          } catch {}
          return { name, count: info.count, members };
        })
    );

    // Construire la liste des pays — normalisée pour éviter les doublons
    // ✅ "Haïti" + "Haiti" + " haiti" → "Haïti" (une seule entrée)
    const normalizeCountry = (s: string) => {
      const t = s.trim().replace(/\s+/g, " ");
      // Normaliser Haïti spécifiquement
      if (/^ha[iï]ti$/i.test(t)) return "Haïti";
      // Autres pays : capitaliser la première lettre
      return t.charAt(0).toUpperCase() + t.slice(1);
    };

    const countryMap: Record<string, number> = {};
    for (const row of (geoRows as any[])) {
      const c = row.birth_country;
      if (!c || !String(c).trim()) continue;
      const key = normalizeCountry(String(c));
      countryMap[key] = (countryMap[key] ?? 0) + 1;
    }
    const countryList = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // ── Charts globaux ───────────────────────────────────────
    const monthlySignups    = buildMonthMap(allDates);
    const qobDistrib        = buildQobDistrib(qobArr);
    const contentByCategory = [
      { label: "Suspentz", count: totalSuspentz, color: C.blue   },
      { label: "Produits", count: totalProducts, color: C.orange },
      { label: "Audio",    count: totalAudio,    color: C.purple },
      { label: "Vidéo",    count: 0,             color: C.muted  },  // Fonctionnalité non encore active
      { label: "KozeSans", count: totalKozesans, color: C.teal   },
      { label: "Texte",    count: totalText,     color: C.green  },
      { label: "Images",   count: totalImages,   color: C.gold   },
    ];
    const qobByCategory = [
      { label: "Suspentz", qob: qobByCat("SUSPENTZ"), color: C.blue   },
      { label: "Produits", qob: qobByCat("PRODUCTS"),  color: C.orange },
      { label: "Audio",    qob: qobByCat("AUDIO"),     color: C.purple },
      { label: "Vidéo",    qob: 0,                      color: C.muted  },
      { label: "KozeSans", qob: qobByCat("KOZESANS"),  color: C.teal   },
      { label: "Texte",    qob: qobByCat("TEXT"),       color: C.green  },
      { label: "Images",   qob: qobByCat("IMAGES"),     color: C.gold   },
    ];

    setGlobalStats({
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersLast30:    newLast30,
      newUsersLast7:     newLast7,
      totalTan,
      totalHtg,
      tanPurchaseCount:  tanPurchCount,
      tanPurchaseTotal:  tanPurchTotal,
      tanWithdrawCount:  tanWithCount,
      tanWithdrawTotal:  tanWithTotal,
      totalSuspentz,
      totalProducts,
      totalSuspentzCount,
      totalProductsCount,
      totalAudio,
      totalVideo,
      totalKozesans,
      totalText,
      totalImages,
      totalAllContent,
      totalQob,
      avgQobPerContent,
      millionQobCount,
      kTanAll,
      kTanSuspentz,
      kTanProducts,
      departments:       deptList.length,   // normalisé
      countries:         countryList.length,  // ✅ après normalisation pour cohérence avec la modal
      deptList,
      countryList,
      prodSoldCount,
      prodAuthorsCount,
      prodTotalTan,
      monthlySignups,
      qobDistrib,
      contentByCategory,
      qobByCategory,
      realRevenueHTG,
      realRevenueTAN,
      realRevenueUSD,
      avgPriceHTG,
      totalQuantity,
      prodWithImages,
      prodCatDistrib,
      prodMonthly,
      prodQobDistrib,
    });
  }, []);

  // ── Chargement par CATÉGORIE ───────────────────────────────
  // PRODUCTS → table "products" (auteur.tsx)
  // Autres   → table "store_products"
  const loadCategory = useCallback(async (key: TypeKey) => {
    setCatLoading(true);
    try {
      let content: ContentRow[] = [];

      if (key === "PRODUCTS") {
        // ── Table products (auteur.tsx) ──────────────────────
        const { data } = await supabase
          .from("products")
          .select("id, title, cover_url, created_at, category_label, price_htg, quantity, qob_count")
          .is("deleted_at", null)
          .eq("cadna_status", "approved");

        content = (data ?? []).map((c: any) => ({
          id:             c.id,
          title:          c.title ?? null,
          category_code:  "PRODUCTS",
          category_label: c.category_label ?? null,
          qob_count:      Number(c.qob_count ?? 0),
          price_tan:      0,
          price_htg:      Number(c.price_htg  ?? 0),
          quantity:       Number(c.quantity   ?? 0),
          cover_url:      c.cover_url ?? null,
          source:         "product" as const,
          created_at:     c.created_at,
        }));
      } else {
        // ── Table store_products (Suspentz, Audio, Vidéo…) ──
        const { data } = await supabase
          .from("store_products")
          .select("id, title, category_code, qob_count, price_tan, created_at")
          .is("deleted_at", null)
          .eq("cadna_status", "approved")
          .eq("category_code", key);

        content = (data ?? []).map((c: any) => ({
          id:             c.id,
          title:          c.title ?? null,
          category_code:  (c.category_code ?? key).toUpperCase(),
          category_label: null,
          qob_count:      Number(c.qob_count ?? 0),
          price_tan:      Number(c.price_tan  ?? 0),
          price_htg:      0,
          quantity:       0,
          cover_url:      null,
          source:         "store" as const,
          created_at:     c.created_at,
        }));
      }

      const qobArr   = content.map(c => c.qob_count);
      const tanArr   = content.map(c => c.price_tan);
      const totalQob = qobArr.reduce((a, b) => a + b, 0);
      const totalTan = tanArr.reduce((a, b) => a + b, 0);
      const dates    = content.map(c => new Date(c.created_at));

      // Produits HTG stats
      const prodPrices    = content.map(c => c.price_htg).filter(p => p > 0);
      const avgPriceHTG   = prodPrices.length
        ? Math.round(content.reduce((s, c) => s + c.price_htg, 0) / prodPrices.length) : 0;
      const totalQuantity = content.reduce((s, c) => s + c.quantity, 0);
      const prodWithImages = content.filter(c => c.cover_url).length;

      // ── Revenus réels catégorie ───────────────────────────────
      // TAN réels encaissés = nombre d'achats × 2 TAN
      const paidCount    = content.reduce((s, c) => s + (c.qob_count ?? 0), 0);
      let realRevenueTAN = 0;
      let realRevenueHTG = 0;
      try {
        const ids = content.map(c => c.id);
        if (ids.length > 0) {
          const { data: tanRows } = await supabase
            .from("wallet_transactions")
            .select("amount")
            .eq("action_code", "CONTENT_PAY")
            .eq("direction", "OUT")
            .in("user_id", ids.slice(0, 50)); // limite supabase IN
          realRevenueTAN = (tanRows ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
        }
        // Fallback : cumul_price_htg
        const cumul = content.reduce((s: number, c: any) => s + Number((c as any).cumul_price_htg ?? 0), 0);
        realRevenueHTG = cumul > 0 ? Math.round(cumul) : Math.round(realRevenueTAN * 10);
      } catch { realRevenueHTG = Math.round(realRevenueTAN * 10); }

      const catLabelMap: Record<string, number> = {};
      content.forEach(c => {
        const lbl = c.category_label ?? "Autre";
        catLabelMap[lbl] = (catLabelMap[lbl] ?? 0) + 1;
      });
      const CAT_COLORS_LOCAL = [C.blue, C.orange, C.purple, C.teal, C.green, C.red, C.gold];
      const prodCatDistrib = Object.entries(catLabelMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([label, count], i) => ({ label, count, color: CAT_COLORS_LOCAL[i % CAT_COLORS_LOCAL.length] }));

      setCatStats({
        typeKey:          key,
        totalPublished:   content.length,
        totalQob,
        totalTanEarned:   totalTan,
        avgQob:           content.length ? Math.round(totalQob / content.length) : 0,
        count1kTan:       tanArr.filter(t => t >= 1_000).length,
        millionQob:       qobArr.filter(q => q >= 1_000_000).length,
        qobDistrib:       buildQobDistrib(qobArr),
        monthlyPublished: buildMonthMap(dates),
        realRevenueHTG,
        realRevenueTAN,
        avgPriceHTG,
        totalQuantity,
        prodWithImages,
        prodCatDistrib,
      });
    } catch (e) {
      console.warn("loadCategory error:", e);
    } finally {
      setCatLoading(false);
    }
  }, []);

  // ── Load principal ─────────────────────────────────────────
  const load = useCallback(async (mode: "first" | "refresh" = "first") => {
    if (mode === "first") setLoading(true);
    else                  setRefreshing(true);
    try {
      await loadGlobal(); // setGlobalStats() est appelé dans loadGlobal — await garantit l'ordre
      setLastUpdated(new Date());
      animateKpis();
    } catch (e) {
      console.warn("stats load error:", e);
    } finally {
      // setLoading(false) ici : loadGlobal() est déjà terminé, globalStats est peuplé
      if (mode === "first") setLoading(false);
      else                  setRefreshing(false);
    }
  }, [loadGlobal]);

  useEffect(() => { load("first"); }, []);

  // Recharge les stats catégorie à chaque changement de filtre
  useEffect(() => {
    if (typeFilter === "TOUS") { setCatStats(null); return; }
    // Transition douce
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      loadCategory(typeFilter).then(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    });
  }, [typeFilter]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("stats-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles"       }, () => load("refresh"))
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets"        }, () => load("refresh"))
      .on("postgres_changes", { event: "*", schema: "public", table: "store_products" }, () => load("refresh"))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // ── Loading screen ─────────────────────────────────────────
  // ── Écran de chargement OU globalStats pas encore disponible ──
  if (loading || !globalStats) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: C.goldLight, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.goldBorder }}>
          <Ionicons name="pulse-outline" size={32} color={C.gold} />
        </View>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={{ color: C.sub, fontWeight: "700", fontSize: 14 }}>Chargement des statistiques…</Text>
        <Text style={{ color: C.muted, fontWeight: "600", fontSize: 11 }}>RHAZN Analytics</Text>
      </View>
    );
  }

  const st          = globalStats;
  const cs          = catStats;
  const isCat       = typeFilter !== "TOUS";
  const activePct   = st.totalUsers ? st.activeUsers   / st.totalUsers : 0;
  const inactivePct = st.totalUsers ? st.inactiveUsers / st.totalUsers : 0;
  const filterInfo  = TYPE_FILTERS.find(f => f.key === typeFilter)!;

  return (
    <View style={s.screen}>

      {/* ══ ZONE FIXE : HEADER + FILTRES ══ */}
      <View style={s.topZone}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={C.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Statistiques</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Animated.View style={[s.liveDot, { opacity: liveDot }]} />
              <Text style={s.subtitle}>LIVE · MàJ {fmtTime(lastUpdated)}</Text>
            </View>
          </View>
          <View style={s.rhznBadge}>
            <Ionicons name="pulse-outline" size={12} color={C.gold} />
            <Text style={s.rhznTxt}>RHAZN</Text>
          </View>
        </View>

        {/* Filtres scrollables — identiques à Mes Créations */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {TYPE_FILTERS.map(f => {
            const on = typeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.pill, on && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setTypeFilter(f.key)}
                activeOpacity={0.80}
              >
                <Ionicons name={f.icon as any} size={12} color={on ? "#FFF" : C.sub} />
                <Text style={[s.pillTxt, on && { color: "#FFF", fontWeight: "900" }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ CONTENU SCROLLABLE ══ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingTop: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor={C.gold}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ════════════════ VUE CATÉGORIE ════════════════ */}
          {isCat && (
            <>
              {/* Bannière catégorie */}
              <View style={[s.catBanner, { borderColor: `${filterInfo.color}40`, backgroundColor: `${filterInfo.color}09` }]}>
                <View style={[s.catBannerIcon, { backgroundColor: `${filterInfo.color}20` }]}>
                  <Ionicons name={filterInfo.icon as any} size={24} color={filterInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.catBannerTitle, { color: filterInfo.color }]}>{filterInfo.label}</Text>
                  <Text style={s.catBannerSub}>Statistiques · catégorie sélectionnée</Text>
                </View>
                {cs && (
                  <Text style={[s.catBannerCount, { color: filterInfo.color }]}>
                    {fmtShort(cs.totalPublished)}
                  </Text>
                )}
              </View>

              {catLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                  <ActivityIndicator color={filterInfo.color} />
                  <Text style={{ color: C.muted, fontWeight: "600" }}>Chargement…</Text>
                </View>
              ) : cs && cs.typeKey === typeFilter ? (
                <>
                  {/* ── KPI généraux ── */}
                  <View style={s.section}>
                    <SectionHead icon="stats-chart-outline" label="Vue d'ensemble" color={filterInfo.color} />
                    <View style={s.kpiGrid}>
                      <KpiCard icon="layers-outline"    label="Publications"   value={fmtShort(cs.totalPublished)}  sub="Contenus approuvés"      color={filterInfo.color} bg={`${filterInfo.color}15`} anim={kpiAnims[0]} />
                      <KpiCard icon="glasses-outline"   label="Total QOB"      value={fmtShort(cs.totalQob)}        sub="Vues qualifiées"          color={C.purple}         bg={C.purpleLight}           anim={kpiAnims[1]} />
                      <KpiCard icon="bar-chart-outline" label="Moy. QOB"       value={fmtShort(cs.avgQob)}          sub="Par publication"          color={C.blue}           bg={C.blueLight}             anim={kpiAnims[2]} />
                      <KpiCard icon="star-outline"      label="≥ 1M QOB"       value={fmtFR(cs.millionQob)}         sub="Contenus d'élite"         color={C.gold}           bg={C.goldLight}             anim={kpiAnims[3]} />
                      {/* TAN — uniquement pour les catégories non-Produits */}
                      {typeFilter !== "PRODUCTS" && (
                        <KpiCard icon="flash-outline"   label="TAN générés"    value={fmtShort(cs.totalTanEarned)}  sub="price_tan cumulé"         color={C.gold}           bg={C.goldLight}             anim={kpiAnims[4]} />
                      )}
                      {typeFilter !== "PRODUCTS" && (
                        <KpiCard icon="trophy-outline"  label="≥ 1K TAN"       value={fmtFR(cs.count1kTan)}         sub="Ont généré ≥ 1 000 TAN"  color={C.orange}         bg={C.orangeLight}           anim={kpiAnims[5]} />
                      )}
                      {/* Produits HTG — uniquement pour PRODUCTS */}
                      {typeFilter === "PRODUCTS" && (
                        <KpiCard icon="cash-outline"       label="Revenu RÉEL HTG"  value={fmtShort(cs.realRevenueHTG)} sub="TAN encaissés × 10"     color={C.green}          bg={C.greenLight}            anim={kpiAnims[4]} />
                      )}
                      {typeFilter === "PRODUCTS" && (
                        <KpiCard icon="cash-outline"      label="Prix moy. HTG"    value={fmtShort(cs.avgPriceHTG)}    sub="Par produit publié"     color={C.orange}         bg={C.orangeLight}           anim={kpiAnims[5]} />
                      )}
                      {typeFilter === "PRODUCTS" && (
                        <KpiCard icon="cube-outline"      label="Stock total"      value={fmtShort(cs.totalQuantity)}  sub="Somme des quantités"    color={C.blue}           bg={C.blueLight}             anim={kpiAnims[6]} />
                      )}
                      {typeFilter === "PRODUCTS" && (
                        <KpiCard icon="images-outline"    label="Avec couverture"  value={fmtFR(cs.prodWithImages)}    sub="Produits avec image"    color={C.purple}         bg={C.purpleLight}           anim={kpiAnims[7]} />
                      )}
                    </View>
                  </View>

                  {/* ── Économie catégorie ── */}
                  <View style={s.section}>
                    <SectionHead icon="wallet-outline" label={`Économie — ${filterInfo.label}`} color={C.gold} />

                    {typeFilter === "PRODUCTS" ? (
                      // Produits → cartes HTG
                      <>
                        <MoneyCard
                          label="Revenu RÉEL total"
                          value={fmtShort(cs.realRevenueHTG)}
                          unit="HTG"
                          color={C.orange}
                          bg={C.orangeLight}
                          icon="pricetag-outline"
                          note={`Cumul price_htg · ${fmtFR(cs.totalPublished)} produits publiés`}
                        />
                        <MoneyCard
                          label="Prix moyen par produit"
                          value={fmtShort(cs.avgPriceHTG)}
                          unit="HTG"
                          color={C.green}
                          bg={C.greenLight}
                          icon="cash-outline"
                          note={`1 TAN = ${TAN_TO_HTG} HTG = $${TAN_TO_USD} · ${fmtFR(cs.totalQuantity)} produits avec stock`}
                        />
                      </>
                    ) : (
                      // Autres catégories → cartes TAN
                      <>
                        <MoneyCard
                          label="TAN générés"
                          value={fmtShort(cs.totalTanEarned)}
                          unit="TAN"
                          color={C.gold}
                          bg={C.goldLight}
                          icon="flash-outline"
                          note={`${fmtFR(cs.totalPublished)} publications · ${filterInfo.label}`}
                        />
                        <MoneyCard
                          label="Équivalent HTG"
                          value={fmtShort(cs.totalTanEarned * TAN_TO_HTG)}
                          unit="HTG"
                          color={C.green}
                          bg={C.greenLight}
                          icon="cash-outline"
                          note={`Revenu RÉEL · TAN encaissés × ${TAN_TO_HTG} = HTG`}
                        />
                      </>
                    )}
                  </View>

                  {/* ── Répartition par catégorie (Produits seulement) ── */}
                  {typeFilter === "PRODUCTS" && cs.prodCatDistrib.length > 0 && (
                    <View style={s.card}>
                      <View style={s.sectionTitleRow}>
                        <Ionicons name="grid-outline" size={14} color={C.orange} />
                        <Text style={s.cardTitle}>Répartition par catégorie produit</Text>
                      </View>
                      {cs.prodCatDistrib.map((d, i) => {
                        const maxC = Math.max(...cs.prodCatDistrib.map(x => x.count), 1);
                        return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                      })}
                    </View>
                  )}

                  {/* ── Distribution QOB ── */}
                  <View style={s.card}>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="podium-outline" size={14} color={C.purple} />
                      <Text style={s.cardTitle}>Distribution QOB — {filterInfo.label}</Text>
                    </View>
                    {cs.qobDistrib.map((d, i) => {
                      const maxC = Math.max(...cs.qobDistrib.map(x => x.count), 1);
                      return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                    })}
                    <Text style={s.noteText}>
                      {cs.millionQob > 0
                        ? `🏆 ${cs.millionQob} contenu${cs.millionQob > 1 ? "s ont" : " a"} dépassé 1 million de QOB`
                        : "Aucun contenu n'a encore atteint 1 million de QOB dans cette catégorie."}
                    </Text>
                  </View>

                  {/* ── Publications par mois ── */}
                  <View style={s.card}>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="bar-chart-outline" size={14} color={filterInfo.color} />
                      <Text style={s.cardTitle}>Publications (6 derniers mois)</Text>
                    </View>
                    <View style={{ alignItems: "center", marginTop: 10, marginBottom: 2 }}>
                      <BarChart key={`cat-bar-${typeFilter}`} data={cs.monthlyPublished} color={filterInfo.color} />
                    </View>
                  </View>

                  {/* ── Résumé catégorie ── */}
                  <View style={s.card}>
                    <View style={s.sectionTitleRow}>
                      <Ionicons name="list-outline" size={14} color={filterInfo.color} />
                      <Text style={s.cardTitle}>Résumé — {filterInfo.label}</Text>
                    </View>
                    {typeFilter === "PRODUCTS" ? (
                      [
                        { icon: "layers-outline",   label: "Produits publiés",        value: fmtFR(cs.totalPublished),       color: filterInfo.color },
                        { icon: "glasses-outline",  label: "Total QOB",               value: `${fmtShort(cs.totalQob)} QOB`, color: C.purple         },
                        { icon: "bar-chart-outline",label: "QOB moyen / produit",      value: fmtShort(cs.avgQob),            color: C.blue           },
                        { icon: "cash-outline",     label: "Revenu RÉEL HTG",          value: `${fmtShort(cs.realRevenueHTG)} HTG`,  color: C.green   },
                        { icon: "flash-outline",    label: "TAN encaissés (réels)",   value: `${fmtShort(cs.realRevenueTAN)} TAN`,  color: C.gold    },
                        { icon: "cash-outline",     label: "Prix moyen HTG",           value: `${fmtShort(cs.avgPriceHTG)} HTG`,    color: C.green   },
                        { icon: "cube-outline",     label: "Produits avec stock",        value: fmtFR(cs.totalQuantity),       color: C.blue           },
                        { icon: "images-outline",   label: "Avec image couverture",    value: fmtFR(cs.prodWithImages),       color: C.purple         },
                        { icon: "star-outline",     label: "Contenus ≥ 1M QOB",       value: fmtFR(cs.millionQob),           color: C.gold           },
                      ].map((row, i) => <MetricRow key={i} {...row} isFirst={i === 0} />)
                    ) : (
                      [
                        { icon: "layers-outline",   label: "Publications",            value: fmtFR(cs.totalPublished),             color: filterInfo.color },
                        { icon: "glasses-outline",  label: "Total QOB",               value: `${fmtShort(cs.totalQob)} QOB`,       color: C.purple         },
                        { icon: "bar-chart-outline",label: "QOB moyen / contenu",     value: fmtShort(cs.avgQob),                  color: C.blue           },
                        { icon: "flash-outline",    label: "TAN générés",             value: `${fmtShort(cs.totalTanEarned)} TAN`, color: C.gold           },
                        { icon: "cash-outline",     label: "Valeur HTG",              value: `${fmtShort(cs.totalTanEarned * TAN_TO_HTG)} HTG`, color: C.green },
                        { icon: "trophy-outline",   label: "Contenus ≥ 1K TAN",      value: fmtFR(cs.count1kTan),                 color: C.orange         },
                        { icon: "star-outline",     label: "Contenus ≥ 1M QOB",      value: fmtFR(cs.millionQob),                 color: C.gold           },
                      ].map((row, i) => <MetricRow key={i} {...row} isFirst={i === 0} />)
                    )}
                  </View>
                </>
              ) : null}
            </>
          )}

          {/* ════════════════ VUE GLOBALE (TOUS) ════════════════ */}
          {!isCat && (
            <>

              {/* ── COMMUNAUTÉ ── */}
              <View style={s.section}>
                <SectionHead icon="people-outline" label="Communauté RHAZN" color={C.blue} />
                <View style={s.kpiGrid}>
                  <KpiCard icon="people-outline"    label="Membres"         value={fmtShort(st.totalUsers)}     sub={`+${fmtFR(st.newUsersLast7)} cette semaine`}      color={C.blue}   bg={C.blueLight}   anim={kpiAnims[0]}  />
                  <KpiCard icon="flash-outline"     label="Actifs"          value={fmtShort(st.activeUsers)}    sub={`${Math.round(activePct * 100)}% · ${INACTIVE_DAYS}j`} color={C.green}  bg={C.greenLight}  anim={kpiAnims[1]}  />
                  <KpiCard icon="moon-outline"      label="Inactifs"        value={fmtShort(st.inactiveUsers)}  sub={`${Math.round(inactivePct * 100)}% du total`}     color={C.muted}  bg={C.cardInner}   anim={kpiAnims[2]}  />
                  <KpiCard icon="person-add-outline"label="Nouveaux (30j)"  value={fmtShort(st.newUsersLast30)} sub={`+${fmtFR(st.newUsersLast7)} / 7 jours`}         color={C.orange} bg={C.orangeLight} anim={kpiAnims[3]}  />
                </View>
              </View>

              {/* Barre actifs / inactifs */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="analytics-outline" size={14} color={C.sub} />
                  <Text style={s.cardTitle}>Répartition utilisateurs</Text>
                </View>
                <View style={s.splitBar}>
                  <View style={[s.splitSeg, { flex: activePct   || 0.01, backgroundColor: C.green }]} />
                  <View style={[s.splitSeg, { flex: inactivePct || 0.01, backgroundColor: C.border }]} />
                </View>
                <View style={s.splitLegend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: C.green }]} />
                    <Text style={s.legendTxt}>Actifs · {Math.round(activePct * 100)}% · {fmtFR(st.activeUsers)}</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: C.muted }]} />
                    <Text style={s.legendTxt}>Inactifs · {Math.round(inactivePct * 100)}% · {fmtFR(st.inactiveUsers)}</Text>
                  </View>
                </View>
                <Text style={s.noteText}>
                  Un membre est inactif après {INACTIVE_DAYS} jours consécutifs sans activité sur l'application.
                </Text>
              </View>

              {/* Inscriptions par mois */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="bar-chart-outline" size={14} color={C.blue} />
                  <Text style={s.cardTitle}>Inscriptions (6 derniers mois)</Text>
                </View>
                <View style={{ alignItems: "center", marginTop: 10, marginBottom: 4 }}>
                  <BarChart key="global-signups" data={st.monthlySignups} color={C.blue} />
                </View>
                {(() => {
                  const maxM = [...st.monthlySignups].sort((a, b) => b.count - a.count)[0];
                  const minM = [...st.monthlySignups].sort((a, b) => a.count - b.count)[0];
                  return (
                    <View style={s.peakRow}>
                      <View style={[s.peakBadge, { backgroundColor: C.greenLight }]}>
                        <Ionicons name="arrow-up" size={10} color={C.green} />
                        <Text style={[s.peakTxt, { color: C.green }]}>Pic · {maxM?.label}</Text>
                      </View>
                      <View style={[s.peakBadge, { backgroundColor: C.redLight }]}>
                        <Ionicons name="arrow-down" size={10} color={C.red} />
                        <Text style={[s.peakTxt, { color: C.red }]}>Creux · {minM?.label}</Text>
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* ── ÉCONOMIE ── */}
              <View style={s.section}>
                <SectionHead icon="wallet-outline" label="Économie RHAZN" color={C.gold} />

                {/* ✅ Carte TAN */}
                <MoneyCard
                  label="TAN en circulation"
                  value={fmtShort(st.totalTan)}
                  unit="TAN"
                  color={C.gold}
                  bg={C.goldLight}
                  icon="flash-outline"
                  note={`Hors wallets Suprême · ${fmtFR(st.totalUsers)} membres`}
                />

                {/* ✅ 2 cartes sous TAN : HTG + USD */}
                <View style={s.txRow}>
                  <View style={[s.txCard, { borderColor: `${C.green}30`, flex: 1 }]}>
                    <View style={[s.txIcon, { backgroundColor: C.greenLight }]}>
                      <Ionicons name="cash-outline" size={18} color={C.green} />
                    </View>
                    <Text style={[s.txVal, { color: C.green, fontSize: 17 }]}>{fmtShort(st.totalTan * TAN_TO_HTG)}</Text>
                    <Text style={s.txLbl}>HTG</Text>
                    <Text style={{ fontSize: 9, color: C.muted, fontWeight: "600", marginTop: 2 }}>1 TAN = {TAN_TO_HTG} HTG</Text>
                  </View>
                  <View style={[s.txCard, { borderColor: `${C.blue}30`, flex: 1 }]}>
                    <View style={[s.txIcon, { backgroundColor: C.blueLight }]}>
                      <Ionicons name="globe-outline" size={18} color={C.blue} />
                    </View>
                    <Text style={[s.txVal, { color: C.blue, fontSize: 17 }]}>{fmtUSD(st.totalTan * TAN_TO_USD)}</Text>
                    <Text style={s.txLbl}>USD</Text>
                    <Text style={{ fontSize: 9, color: C.muted, fontWeight: "600", marginTop: 2 }}>1 TAN = $0.05</Text>
                  </View>
                </View>

                {/* ✅ Achats TAN — nombre + montant TAN total */}
                <MoneyCard
                  label="Achats TAN"
                  value={fmtShort(st.tanPurchaseTotal)}
                  unit="TAN achetés"
                  color={C.blue}
                  bg={C.blueLight}
                  icon="arrow-down-circle-outline"
                  note={`${fmtFR(st.tanPurchaseCount)} transaction${st.tanPurchaseCount > 1 ? "s" : ""} · ${fmtShort(st.tanPurchaseTotal * TAN_TO_HTG)} HTG`}
                />

                {/* ✅ Retraits — nombre + montant TAN total */}
                <MoneyCard
                  label="Retraits validés"
                  value={fmtShort(st.tanWithdrawTotal)}
                  unit="TAN retirés"
                  color={C.orange}
                  bg={C.orangeLight}
                  icon="arrow-up-circle-outline"
                  note={`${fmtFR(st.tanWithdrawCount)} retrait${st.tanWithdrawCount > 1 ? "s" : ""} · ${fmtShort(st.tanWithdrawTotal * TAN_TO_HTG)} HTG`}
                />
              </View>

              {/* ── PUBLICATIONS PAR CATÉGORIE ── */}
              <View style={s.section}>
                <SectionHead icon="layers-outline" label="Publications par catégorie" color={C.orange} />
                <View style={s.kpiGrid}>
                  <KpiCard icon="play-circle-outline"   label="Suspentz"  value={fmtShort(st.totalSuspentz)}  color={C.blue}   bg={C.blueLight}   anim={kpiAnims[4]}  />
                  <KpiCard icon="cube-outline"          label="Produits"  value={fmtShort(st.totalProducts)}  color={C.orange} bg={C.orangeLight} anim={kpiAnims[5]}  />
                  <KpiCard icon="musical-notes-outline" label="Audio"     value={fmtShort(st.totalAudio)}     color={C.purple} bg={C.purpleLight} anim={kpiAnims[6]}  />
                  <KpiCard icon="videocam-outline"      label="Vidéo"     value="—"     sub="Bientôt disponible" color={C.muted}  bg={C.cardInner}   anim={kpiAnims[7]}  />
                  <KpiCard icon="mic-outline"           label="KozeSans"  value={fmtShort(st.totalKozesans)}  color={C.teal}   bg={C.tealLight}   anim={kpiAnims[8]}  />
                  <KpiCard icon="document-text-outline" label="Texte"     value={fmtShort(st.totalText)}      color={C.green}  bg={C.greenLight}  anim={kpiAnims[9]}  />
                  <KpiCard icon="images-outline"        label="Images"    value={fmtShort(st.totalImages)}    color={C.gold}   bg={C.goldLight}   anim={kpiAnims[10]} />
                  <KpiCard icon="layers-outline"        label="Total"     value={fmtShort(st.totalAllContent)} sub="Toutes catégories" color={C.sub} bg={C.cardInner} anim={kpiAnims[11]} />
                </View>
              </View>

              {/* Répartition barres horizontales */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="grid-outline" size={14} color={C.orange} />
                  <Text style={s.cardTitle}>Répartition des publications</Text>
                </View>
                {st.contentByCategory.map((d, i) => {
                  const maxC = Math.max(...st.contentByCategory.map(x => x.count), 1);
                  return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                })}
              </View>

              {/* ── REVENUS RÉELS + BOUTIQUE ── */}
              <View style={s.section}>
                <SectionHead icon="cube-outline" label="Boutique RHAZN — Revenus réels" color={C.orange} />
                <View style={s.kpiGrid}>
                  <KpiCard icon="cart-outline"    label="Contenus achetés"  value={fmtFR(st.prodSoldCount)}       sub="Accès réels accordés"       color={C.green}  bg={C.greenLight}  anim={kpiAnims[0]} />
                  <KpiCard icon="people-outline"  label="Auteurs"           value={fmtFR(st.prodAuthorsCount)}   sub="Créateurs distincts"         color={C.blue}   bg={C.blueLight}   anim={kpiAnims[1]} />
                  <KpiCard icon="flash-outline"   label="TAN encaissés"     value={fmtShort(st.realRevenueTAN)}  sub="Revenus réels TAN"           color={C.gold}   bg={C.goldLight}   anim={kpiAnims[2]} />
                  <KpiCard icon="cash-outline"    label="HTG réel"          value={fmtShort(st.realRevenueHTG)}  sub="1 TAN = 10 HTG"              color={C.green}  bg={C.greenLight}  anim={kpiAnims[3]} />
                  <KpiCard icon="globe-outline"   label="USD réel"          value={fmtUSD(st.realRevenueUSD)} sub="1 TAN = $0.05"          color={C.blue}   bg={C.blueLight}   anim={kpiAnims[0]} />
                  <KpiCard icon="eye-outline"     label="QOB produits"      value={fmtShort(st.qobByCategory.find(c=>c.label==="Produits")?.qob ?? 0)} sub="Vues qualifiées" color={C.purple} bg={C.purpleLight} anim={kpiAnims[1]} />
                  <KpiCard icon="cube-outline"    label="Publiés"           value={fmtFR(st.totalProducts)}      sub="Approuvés CADNA"             color={C.orange} bg={C.orangeLight} anim={kpiAnims[2]} />
                  <KpiCard icon="play-circle-outline" label="Suspentz dispo"  value={fmtFR(st.totalSuspentzCount)}  sub="Vidéos publiées"    color={C.blue}   bg={C.blueLight}   anim={kpiAnims[3]} />
                  <KpiCard icon="cube-outline"        label="Produits dispo"  value={fmtFR(st.totalProductsCount)}  sub="Produits publiés"   color={C.orange} bg={C.orangeLight} anim={kpiAnims[0]} />
                </View>
              </View>

              {/* ── Carte synthèse revenus réels ── */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="bar-chart-outline" size={14} color={C.orange} />
                  <Text style={s.cardTitle}>Synthèse revenus réels RHAZN</Text>
                </View>
                <MetricRow icon="cart-outline"   label="Contenus vendus (réels)"     value={fmtFR(st.prodSoldCount)}                   color={C.green}  isFirst />
                <MetricRow icon="flash-outline"  label="TAN encaissés (réels)"       value={`${fmtShort(st.realRevenueTAN)} TAN`}       color={C.gold}   />
                <MetricRow icon="cash-outline"   label="Revenu HTG réel"             value={`${fmtShort(st.realRevenueHTG)} HTG`}       color={C.green}  />
                <MetricRow icon="globe-outline"  label="Revenu USD réel"             value={fmtUSD(st.realRevenueUSD)}          color={C.blue}   />
                <MetricRow icon="people-outline" label="Auteurs publiants"           value={fmtFR(st.prodAuthorsCount)}                 color={C.purple} />
                <MetricRow icon="cube-outline"   label="Produits publiés"            value={fmtFR(st.totalProducts)}                   color={C.orange} />
                <MetricRow icon="play-circle-outline" label="Suspentz disponibles"   value={fmtFR(st.totalSuspentzCount)}              color={C.blue}   />
                <MetricRow icon="cube-outline"        label="Produits disponibles"      value={fmtFR(st.totalProductsCount)}              color={C.orange} />
                <Text style={s.noteText}>
                  Revenus réels · wallet_transactions CONTENT_PAY · 1 TAN = 10 HTG = $0.05 USD
                </Text>
              </View>

              {/* Publications produits par mois */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="bar-chart-outline" size={14} color={C.orange} />
                  <Text style={s.cardTitle}>Publications produits (6 derniers mois)</Text>
                </View>
                <View style={{ alignItems: "center", marginTop: 10, marginBottom: 4 }}>
                  <BarChart key="prod-monthly" data={st.prodMonthly} color={C.orange} />
                </View>
              </View>

              {/* Répartition par category_label */}
              {st.prodCatDistrib.length > 0 && (
                <View style={s.card}>
                  <View style={s.sectionTitleRow}>
                    <Ionicons name="list-outline" size={14} color={C.orange} />
                    <Text style={s.cardTitle}>Répartition par catégorie produit</Text>
                  </View>
                  {st.prodCatDistrib.map((d, i) => {
                    const maxC = Math.max(...st.prodCatDistrib.map(x => x.count), 1);
                    return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                  })}
                </View>
              )}

              {/* Distribution QOB produits */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="podium-outline" size={14} color={C.orange} />
                  <Text style={s.cardTitle}>Distribution QOB — Produits</Text>
                </View>
                {st.prodQobDistrib.map((d, i) => {
                  const maxC = Math.max(...st.prodQobDistrib.map(x => x.count), 1);
                  return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                })}
              </View>

              {/* ── QOB PAR CATÉGORIE ── */}
              <View style={s.section}>
                <SectionHead icon="glasses-outline" label="QOB générés par catégorie" color={C.purple} />
                <View style={s.kpiGrid}>
                  <KpiCard icon="eye-outline"        label="Total QOB"      value={fmtShort(st.totalQob)}         sub="Toutes catégories"       color={C.purple} bg={C.purpleLight} anim={kpiAnims[0]}  />
                  <KpiCard icon="bar-chart-outline"  label="Moy. / contenu" value={fmtShort(st.avgQobPerContent)} sub="QOB par publication"     color={C.blue}   bg={C.blueLight}   anim={kpiAnims[1]}  />
                  <KpiCard icon="trophy-outline"     label="≥ 1M QOB"       value={fmtFR(st.millionQobCount)}     sub="Contenus élites"         color={C.gold}   bg={C.goldLight}   anim={kpiAnims[2]}  />
                  <KpiCard icon="star-outline"       label="≥ 1K TAN"       value={fmtFR(st.kTanAll)}             sub="Ont généré ≥ 1 000 TAN"  color={C.orange} bg={C.orangeLight} anim={kpiAnims[3]}  />
                </View>
              </View>

              {/* QOB par catégorie — barres horizontales */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="podium-outline" size={14} color={C.purple} />
                  <Text style={s.cardTitle}>QOB générés — par catégorie</Text>
                </View>
                {st.qobByCategory.map((d, i) => {
                  const maxQ = Math.max(...st.qobByCategory.map(x => x.qob), 1);
                  return <HBar key={i} label={d.label} count={d.qob} maxCount={maxQ} color={d.color} />;
                })}
              </View>

              {/* Distribution QOB globale */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="bar-chart-outline" size={14} color={C.purple} />
                  <Text style={s.cardTitle}>Distribution QOB (tous contenus)</Text>
                </View>
                {st.qobDistrib.map((d, i) => {
                  const maxC = Math.max(...st.qobDistrib.map(x => x.count), 1);
                  return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                })}
                <Text style={s.noteText}>
                  {st.millionQobCount > 0
                    ? `🏆 ${fmtFR(st.millionQobCount)} contenu${st.millionQobCount > 1 ? "s ont" : " a"} dépassé 1 million de QOB`
                    : "Aucun contenu n'a encore atteint 1 million de QOB."}
                </Text>
              </View>

              {/* ≥ 1K TAN par catégorie */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="flash" size={14} color={C.gold} />
                  <Text style={s.cardTitle}>Contenus ayant généré ≥ 1K TAN</Text>
                </View>
                {[
                  { label: "Suspentz",  count: st.kTanSuspentz, color: C.blue   },
                  { label: "Produits",  count: st.kTanProducts,  color: C.orange },
                  { label: "Tous",      count: st.kTanAll,        color: C.gold   },
                ].map((d, i) => {
                  const maxC = Math.max(st.kTanAll, 1);
                  return <HBar key={i} label={d.label} count={d.count} maxCount={maxC} color={d.color} />;
                })}
                <Text style={s.noteText}>
                  Basé sur le champ price_tan — remplacer par tan_earned si disponible dans votre schéma.
                </Text>
              </View>

              {/* ── GÉOGRAPHIE ── */}
              <View style={s.section}>
                <SectionHead icon="earth-outline" label="Géographie" color={C.teal} />
                <View style={s.kpiGrid}>
                  {/* ✅ Carte Départements — cliquable */}
                  <TouchableOpacity
                    style={[k.card, { borderColor: `${C.teal}30` }]}
                    onPress={() => setGeoModal("dept")}
                    activeOpacity={0.8}
                  >
                    <View style={[k.icon, { backgroundColor: C.tealLight }]}>
                      <Ionicons name="map-outline" size={17} color={C.teal} />
                    </View>
                    <Text style={k.val}>{String(st.departments)}</Text>
                    <Text style={k.lbl}>Départ. Haïti</Text>
                    <Text style={k.sub}>Appuyez pour voir la liste</Text>
                  </TouchableOpacity>

                  {/* ✅ Carte Pays — cliquable */}
                  <TouchableOpacity
                    style={[k.card, { borderColor: `${C.blue}30` }]}
                    onPress={() => setGeoModal("country")}
                    activeOpacity={0.8}
                  >
                    <View style={[k.icon, { backgroundColor: C.blueLight }]}>
                      <Ionicons name="globe-outline" size={17} color={C.blue} />
                    </View>
                    <Text style={k.val}>{String(st.countries)}</Text>
                    <Text style={k.lbl}>Pays</Text>
                    <Text style={k.sub}>Appuyez pour voir la liste</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ✅ MODAL DÉPARTEMENTS — onglets horizontaux + inscrits en grille colonnes */}
              <Modal
                visible={geoModal === "dept"}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => { setGeoModal(null); setSelectedDept(null); }}
              >
                <View style={{ flex: 1, backgroundColor: C.bg }}>

                  {/* ── Header ─────────────────────────────────── */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>🇭🇹 Départements Haïti</Text>
                      <Text style={{ fontSize: 12, color: C.muted, fontWeight: "600", marginTop: 2 }}>
                        {st.deptList.length} département{st.deptList.length > 1 ? "s" : ""} · {st.deptList.reduce((s, d) => s + d.count, 0)} inscrits
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setGeoModal(null); setSelectedDept(null); }}
                      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.border, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="close" size={18} color={C.text} />
                    </TouchableOpacity>
                  </View>

                  {/* ── LIGNE 1 : Onglets départements — scroll GAUCHE → DROITE ── */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}
                    style={{ flexGrow: 0, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border }}
                  >
                    {st.deptList.map((dept, idx) => {
                      const isSelected = (selectedDept ?? st.deptList[0]?.name) === dept.name;
                      return (
                        <TouchableOpacity
                          key={dept.name}
                          onPress={() => setSelectedDept(dept.name)}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                            backgroundColor: isSelected ? C.teal : C.bg,
                            borderWidth: 1.5,
                            borderColor: isSelected ? C.teal : C.border,
                            flexDirection: "row", alignItems: "center", gap: 6,
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 9, fontWeight: "900", color: isSelected ? "#fff" : C.muted }}>
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx+1}`}
                          </Text>
                          <Text style={{ fontWeight: "900", fontSize: 12, color: isSelected ? "#fff" : C.text }}>
                            {dept.name}
                          </Text>
                          <View style={{
                            backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : C.tealLight,
                            borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: "900", color: isSelected ? "#fff" : C.teal }}>
                              {dept.count}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* ── LIGNE 2 : Inscrits du département sélectionné — grille COLONNES ── */}
                  {(() => {
                    const activeDept = st.deptList.find(d => d.name === (selectedDept ?? st.deptList[0]?.name));
                    if (!activeDept) return null;
                    return (
                      <View style={{ flex: 1 }}>
                        {/* Sous-titre département actif */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Ionicons name="location" size={14} color={C.teal} />
                            <Text style={{ fontWeight: "900", fontSize: 16, color: C.text }}>{activeDept.name}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: C.teal, fontWeight: "800" }}>
                            {activeDept.count} inscrit{activeDept.count > 1 ? "s" : ""}
                          </Text>
                        </View>

                        {/* ✅ Grille en COLONNES — 3 colonnes */}
                        <FlatList
                          key={activeDept.name}
                          data={activeDept.members}
                          keyExtractor={(m, i) => `${activeDept.name}-${i}`}
                          numColumns={3}
                          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
                          contentContainerStyle={{ paddingBottom: 40, gap: 10, paddingTop: 4 }}
                          showsVerticalScrollIndicator={false}
                          ListEmptyComponent={() => (
                            <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
                              <Ionicons name="person-outline" size={36} color={C.muted} />
                              <Text style={{ color: C.muted, fontWeight: "700" }}>Aucun inscrit trouvé</Text>
                            </View>
                          )}
                          renderItem={({ item: member, index: mIdx }) => {
                            const isFirst = mIdx === 0;
                            const isLast  = mIdx === activeDept.members.length - 1 && activeDept.members.length > 1;
                            const cardBorder = isFirst ? C.teal : isLast ? C.gold : C.border;
                            return (
                              <View style={{
                                flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 10,
                                alignItems: "center", gap: 6,
                                borderWidth: 1.5, borderColor: cardBorder,
                              }}>
                                {/* Badge premier / dernier */}
                                {(isFirst || isLast) && (
                                  <View style={{ backgroundColor: `${cardBorder}18`, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: `${cardBorder}30` }}>
                                    <Text style={{ fontSize: 7, fontWeight: "900", color: cardBorder }}>
                                      {isFirst ? "⏮ 1er" : "⏭ Dernier"}
                                    </Text>
                                  </View>
                                )}
                                {!isFirst && !isLast && (
                                  <Text style={{ fontSize: 8, color: C.muted, fontWeight: "700" }}>#{mIdx + 1}</Text>
                                )}
                                {/* Avatar */}
                                {member.avatar
                                  ? <Image source={{ uri: member.avatar }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: cardBorder }} />
                                  : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${cardBorder}15`, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: cardBorder }}>
                                      <Text style={{ fontSize: 18, fontWeight: "900", color: cardBorder }}>
                                        {(member.name ?? "?").charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                }
                                <Text style={{ fontSize: 10, fontWeight: "800", color: C.text, textAlign: "center" }} numberOfLines={2}>{member.name}</Text>
                                {member.date ? <Text style={{ fontSize: 8, color: C.muted, fontWeight: "600" }}>{member.date}</Text> : null}
                              </View>
                            );
                          }}
                        />
                      </View>
                    );
                  })()}
                </View>
              </Modal>

              {/* ✅ MODAL PAYS — dédupliqué, 1 entrée par pays */}
              <Modal visible={geoModal === "country"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGeoModal(null)}>
                <View style={{ flex: 1, backgroundColor: C.bg }}>
                  {/* Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card }}>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>🌍 Pays utilisateurs</Text>
                      <Text style={{ fontSize: 12, color: C.muted, fontWeight: "600", marginTop: 2 }}>{st.countryList.length} pays — {st.countryList.reduce((s, c) => s + c.count, 0)} utilisateurs</Text>
                    </View>
                    <TouchableOpacity onPress={() => setGeoModal(null)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.border, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="close" size={18} color={C.text} />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={st.countryList}
                    keyExtractor={(c) => c.name}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item: country, index }) => {
                      const maxC = st.countryList[0]?.count ?? 1;
                      const pct  = maxC > 0 ? country.count / maxC : 0;
                      const rankEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
                      const barColor  = index === 0 ? C.gold : index === 1 ? C.muted : index === 2 ? C.orange : C.blue;
                      return (
                        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              {/* Rang */}
                              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: index === 0 ? C.goldLight : C.cardInner, borderWidth: 1, borderColor: index === 0 ? `${C.gold}40` : C.border, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: index < 3 ? 18 : 13, fontWeight: "900", color: index < 3 ? "#000" : C.sub }}>{rankEmoji}</Text>
                              </View>
                              {/* Nom pays */}
                              <Text style={{ fontWeight: "900", fontSize: 15, color: C.text }}>{country.name}</Text>
                            </View>
                            {/* Badge count */}
                            <View style={{ backgroundColor: `${barColor}18`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: `${barColor}30` }}>
                              <Text style={{ color: barColor, fontWeight: "900", fontSize: 14 }}>
                                {country.count} <Text style={{ fontSize: 10, fontWeight: "600" }}>utilisateur{country.count > 1 ? "s" : ""}</Text>
                              </Text>
                            </View>
                          </View>
                          {/* Barre de progression */}
                          <View style={{ height: 8, backgroundColor: C.cardInner, borderRadius: 99, overflow: "hidden" }}>
                            <View style={{ height: "100%", borderRadius: 99, backgroundColor: barColor, width: `${Math.round(pct * 100)}%`, opacity: 0.85 }} />
                          </View>
                          <Text style={{ fontSize: 10, color: C.muted, fontWeight: "600", marginTop: 5, textAlign: "right" }}>
                            {Math.round(pct * 100)}% des utilisateurs
                          </Text>
                        </View>
                      );
                    }}
                  />
                </View>
              </Modal>

              {/* ── RÉSUMÉ COMPLET ── */}
              <View style={s.card}>
                <View style={s.sectionTitleRow}>
                  <Ionicons name="list-outline" size={14} color={C.gold} />
                  <Text style={s.cardTitle}>Résumé plateforme RHAZN</Text>
                </View>
                {([
                  { icon: "people-outline",           label: "Membres inscrits",                value: fmtFR(st.totalUsers),                color: C.blue   },
                  { icon: "flash-outline",            label: `Membres actifs (${INACTIVE_DAYS}j)`,value: fmtFR(st.activeUsers),             color: C.green  },
                  { icon: "moon-outline",             label: "Membres inactifs",                value: fmtFR(st.inactiveUsers),             color: C.muted  },
                  { icon: "person-add-outline",       label: "Nouveaux inscrits (7 jours)",     value: `+${fmtFR(st.newUsersLast7)}`,      color: C.orange },
                  { icon: "person-add-outline",       label: "Nouveaux inscrits (30 jours)",    value: `+${fmtFR(st.newUsersLast30)}`,     color: C.orange },
                  { icon: "flash-outline",            label: "TAN en circulation (hors Suprême)",value:`${fmtShort(st.totalTan)} TAN`,     color: C.gold   },
                  { icon: "cash-outline",    label: "Revenu HTG réel",              value: `${fmtShort(st.realRevenueHTG)} HTG`,       color: C.green  },
                  { icon: "globe-outline",   label: "Revenu USD réel (1 TAN=0.05$)", value: `$${fmtShort(st.realRevenueUSD)}`,           color: C.blue   },
                  { icon: "flash-outline",   label: "TAN encaissés (réels)",         value: `${fmtShort(st.realRevenueTAN)} TAN`,        color: C.gold   },
                  { icon: "cart-outline",    label: "Contenus vendus (réels)",       value: fmtFR(st.prodSoldCount),                    color: C.orange },
                  { icon: "people-outline",  label: "Auteurs publiants",             value: fmtFR(st.prodAuthorsCount),                 color: C.purple },
                  { icon: "arrow-down-circle-outline",label: "Achats TAN (montant)",             value: `${fmtShort(st.tanPurchaseTotal)} TAN`,  color: C.blue   },
                  { icon: "arrow-down-circle-outline",label: "Achats TAN (nombre)",              value: `${fmtFR(st.tanPurchaseCount)} transactions`, color: C.blue },
                  { icon: "arrow-up-circle-outline",  label: "Retraits (montant)",               value: `${fmtShort(st.tanWithdrawTotal)} TAN`,   color: C.orange },
                  { icon: "arrow-up-circle-outline",  label: "Retraits (nombre)",                value: `${fmtFR(st.tanWithdrawCount)} retraits`, color: C.orange },
                  { icon: "play-circle-outline",      label: "Suspentz publiés",                value: fmtFR(st.totalSuspentz),             color: C.blue   },
                  { icon: "cube-outline",             label: "Produits publiés",                value: fmtFR(st.totalProducts),             color: C.orange },
                  { icon: "cart-outline",             label: "Produits vendus",                 value: fmtFR(st.prodSoldCount),             color: C.green  },
                  { icon: "people-outline",           label: "Auteurs produits",                value: fmtFR(st.prodAuthorsCount),          color: C.blue   },
                  { icon: "flash-outline",            label: "TAN générés (produits)",          value: `${fmtShort(st.prodTotalTan)} TAN`,  color: C.gold   },
                  { icon: "mic-outline",              label: "KozeSans publiés",                value: fmtFR(st.totalKozesans),             color: C.teal   },
                  { icon: "musical-notes-outline",    label: "Audio publiés",                   value: fmtFR(st.totalAudio),                color: C.purple },
                  { icon: "videocam-outline",         label: "Vidéos publiées",                 value: fmtFR(st.totalVideo),                color: C.red    },
                  { icon: "document-text-outline",    label: "Textes publiés",                  value: fmtFR(st.totalText),                 color: C.green  },
                  { icon: "images-outline",           label: "Images publiées",                 value: fmtFR(st.totalImages),               color: C.gold   },
                  { icon: "layers-outline",           label: "Total publications",              value: fmtFR(st.totalAllContent),           color: C.sub    },
                  { icon: "eye-outline",              label: "Total QOB",                       value: fmtShort(st.totalQob),               color: C.purple },
                  { icon: "bar-chart-outline",        label: "QOB moyen / contenu",             value: fmtShort(st.avgQobPerContent),       color: C.blue   },
                  { icon: "trophy-outline",           label: "Contenus ≥ 1M QOB",              value: fmtFR(st.millionQobCount),           color: C.gold   },
                  { icon: "star-outline",             label: "Contenus ≥ 1K TAN générés",      value: fmtFR(st.kTanAll),                   color: C.orange },
                  { icon: "map-outline",              label: "Départements Haïti",              value: String(st.departments),              color: C.teal   },
                  { icon: "globe-outline",            label: "Pays ayant téléchargé l'app",     value: String(st.countries),                color: C.blue   },
                ] as const).map((row, i) => (
                  <MetricRow key={i} icon={row.icon} label={row.label} value={row.value} color={row.color} isFirst={i === 0} />
                ))}
              </View>

            </>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Zone fixe (header + filtres)
  topZone: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, zIndex: 10 },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 54, paddingBottom: 10, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 22, fontWeight: "900", color: C.text },
  subtitle:{ fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  rhznBadge:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.goldLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.goldBorder },
  rhznTxt: { color: C.gold, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },

  // Filtres
  pillsRow:{ flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  pill:    { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: C.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.card },
  pillTxt: { fontWeight: "700", color: C.sub, fontSize: 12 },

  // Sections
  section:        { paddingHorizontal: 16, marginBottom: 16, marginTop: 4 },
  sectionTitleRow:{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  kpiGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  // Card générique
  card:     { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitle:{ fontSize: 14, fontWeight: "800", color: C.text },

  // Barre actifs/inactifs
  splitBar:   { height: 14, borderRadius: 99, flexDirection: "row", overflow: "hidden", marginVertical: 12 },
  splitSeg:   { height: "100%" },
  splitLegend:{ flexDirection: "row", gap: 20, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { color: C.sub, fontWeight: "700", fontSize: 11 },

  // Peak
  peakRow:   { flexDirection: "row", gap: 10, marginTop: 8 },
  peakBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  peakTxt:   { fontWeight: "800", fontSize: 11 },

  // Transactions
  txRow:  { flexDirection: "row", gap: 10, marginTop: 4 },
  txCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: "center", gap: 6, borderWidth: 1 },
  txIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  txVal:  { fontSize: 20, fontWeight: "900", color: C.text },
  txLbl:  { fontSize: 11, fontWeight: "700", color: C.sub },

  // Bannière catégorie
  catBanner:     { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 16, marginTop: 8, borderRadius: 20, padding: 16, borderWidth: 1 },
  catBannerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  catBannerTitle:{ fontSize: 20, fontWeight: "900" },
  catBannerSub:  { fontSize: 11, fontWeight: "600", color: C.muted, marginTop: 3 },
  catBannerCount:{ fontSize: 28, fontWeight: "900" },

  // Notes
  noteText: { color: C.muted, fontWeight: "600", fontSize: 10, marginTop: 10, lineHeight: 15 },
});