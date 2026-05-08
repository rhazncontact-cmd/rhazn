// app/user-gains.tsx
// ✅ RHAZN — Mes Gains • Filtre type + filtre période toujours visibles

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const COLORS = {
  bg:     "#FFFFFF",
  card:   "#F6F7F9",
  border: "#E5E7EB",
  gold:   "#D4AF37",
  goldBg: "#FBF7E9",
  text:   "#0A0A0A",
  gray:   "#6B7280",
  muted:  "#9CA3AF",
  danger: "#DC2626",
  green:  "#16A34A",
};

type TotalsByType = Record<string, { revenue: number; sales: number }>;
type TopProduct = { product_id: string; title: string; type: string; sales: number; revenue_tan: number; };
type DailyPoint = { day_key: string; revenue: number; sales: number; };
type DashboardV2 = { is_creator: boolean; totals: TotalsByType; top_products: TopProduct[]; daily?: DailyPoint[]; };

const TYPE_FILTERS = [
  { label: "Tous",     key: "TOUS"     },
  { label: "Suspentz", key: "SUSPENTZ" },
  { label: "Produits", key: "PRODUCTS" },
  { label: "Audio",    key: "AUDIO"    },
  { label: "Vidéo",    key: "VIDEO"    },
  { label: "KozeSans", key: "KOZESANS" },
  { label: "Texte",    key: "TEXT"     },
  { label: "Images",   key: "IMAGES"   },
];

const formatTypeLabel = (type: string) => {
  const t = (type || "").toUpperCase();
  const found = TYPE_FILTERS.find(f => f.key === t);
  if (found && found.key !== "TOUS") return found.label;
  switch (t) {
    case "VIDEO":    return "Vidéo";
    case "SUSPENTZ": return "Suspentz";
    case "TEXT":     return "Texte";
    case "AUDIO":    return "Audio";
    case "LYRICS":   return "Lyrics";
    case "IMAGES":   return "Images";
    case "KOZESANS": return "KozeSans";
    case "PRODUCTS": return "Produits";
    default:         return type || "—";
  }
};

const formatDayLabel = (dayKey: string) => {
  try {
    const [y, m, d] = dayKey.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch { return dayKey; }
};

const safeN = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export default function UserGainsScreenV3() {
  const router = useRouter();
  const [loading,    setLoading]    = useState(true);
  const [days,       setDays]       = useState(30);
  const [typeFilter, setTypeFilter] = useState("TOUS");
  const [data,       setData]       = useState<DashboardV2 | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const ty   = useRef(new Animated.Value(6)).current;

  const playIntro = () => {
    fade.setValue(0); ty.setValue(6);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(ty,   { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const load = async (d = days) => {
    setLoading(true); setErrorMsg(null);
    try {
      const { data: res, error } = await supabase.rpc("creator_store_dashboard_v2", { p_days: d });
      if (error || !res) { setData(null); setErrorMsg(error?.message || "Impossible de charger les gains."); return; }
      setData({
        is_creator:   !!res.is_creator,
        totals:       res.totals || {},
        top_products: Array.isArray(res.top_products) ? res.top_products : [],
        daily:        Array.isArray(res.daily) ? res.daily : [],
      });
      playIntro();
    } catch (e: any) {
      setData(null); setErrorMsg(e?.message || "Erreur réseau. Réessayez.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(30); }, []);
  useEffect(() => { load(days); }, [days]);

  const allEntries = useMemo(() => (data ? Object.entries(data.totals) : []), [data]);

  const totalEntries = useMemo(() => {
    if (typeFilter === "TOUS") return allEntries;
    return allEntries.filter(([type]) => type.toUpperCase() === typeFilter);
  }, [allEntries, typeFilter]);

  const topProducts = useMemo(() => {
    const all = data?.top_products ?? [];
    if (typeFilter === "TOUS") return all;
    return all.filter(p => (p.type || "").toUpperCase() === typeFilter);
  }, [data, typeFilter]);

  const totalRevenue = useMemo(() => totalEntries.reduce((acc, [, v]) => acc + safeN(v?.revenue), 0), [totalEntries]);
  const totalSales   = useMemo(() => totalEntries.reduce((acc, [, v]) => acc + safeN(v?.sales), 0), [totalEntries]);
  const avgPerDay    = useMemo(() => Math.round(totalRevenue / Math.max(1, days)), [totalRevenue, days]);

  const daily    = useMemo(() => (data?.daily || []) as DailyPoint[], [data]);
  const maxDaily = useMemo(() => daily.reduce((m, p) => Math.max(m, safeN(p.revenue)), 0), [daily]);
  const bestDay  = useMemo(() => {
    if (!daily.length) return null;
    return daily.reduce((best, p) => safeN(p.revenue) > safeN(best.revenue) ? p : best, daily[0]);
  }, [daily]);

  const isCreator = data?.is_creator ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>

      {/* ══ ZONE FIXE TOUJOURS VISIBLE ══ */}
      <View style={s.sticky}>
        <View style={s.titleRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={COLORS.gold} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Mes Gains</Text>
            <Text style={s.subtitle}>Revenus basés uniquement sur tes œuvres</Text>
          </View>
        </View>

        {/* Filtre PÉRIODE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {[
            { label: "Toutes",  d: 3650 },
            { label: "Jour",    d: 1    },
            { label: "Semaine", d: 7    },
            { label: "Mois",    d: 30   },
            { label: "Année",   d: 365  },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[s.pill, days === item.d && s.pillOn]}
              onPress={() => setDays(item.d)}
            >
              <Text style={[s.pillTxt, days === item.d && s.pillTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtre TYPE */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
          {TYPE_FILTERS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[s.typePill, typeFilter === item.key && s.typePillOn]}
              onPress={() => setTypeFilter(item.key)}
            >
              <Text style={[s.typeTxt, typeFilter === item.key && s.typeTxtOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ══ CONTENU SCROLLABLE ══ */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {loading ? (
          <View style={s.boot}><ActivityIndicator size="large" color={COLORS.gold} /></View>

        ) : errorMsg ? (
          <View style={s.notice}><Text style={s.noticeText}>{errorMsg}</Text></View>

        ) : isCreator === false ? (
          <View style={s.notice}>
            <Text style={s.noticeText}>Tu n'es pas encore créateur.{"\n\n"}Publie au moins une œuvre pour commencer à générer des gains.</Text>
            <TouchableOpacity style={s.cta} onPress={() => router.push("/user-publish-pact/" as any)}>
              <Text style={s.ctaTxt}>Publier une œuvre</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <Animated.View style={{ opacity: fade, transform: [{ translateY: ty }] }}>

            {/* Badge filtre type actif */}
            {typeFilter !== "TOUS" && (
              <View style={s.activeBadge}>
                <Text style={s.activeBadgeTxt}>Filtre : {formatTypeLabel(typeFilter)}</Text>
                <TouchableOpacity onPress={() => setTypeFilter("TOUS")}>
                  <Text style={s.activeBadgeClear}>✕ Effacer</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.kpiRow}>
              <Kpi label={typeFilter === "TOUS" ? "Toutes catégories" : formatTypeLabel(typeFilter)} value={`${totalRevenue.toLocaleString()} TAN`} />
              <Kpi label="Ventes totales" value={`${totalSales.toLocaleString()}`} />
            </View>

            <View style={s.kpiRow}>
              <Kpi label="Moyenne / jour" value={`${avgPerDay.toLocaleString()} TAN`} />
              <Kpi label="Meilleur jour" value={bestDay ? `${safeN(bestDay.revenue).toLocaleString()} TAN` : "—"} sub={bestDay ? formatDayLabel(bestDay.day_key) : undefined} />
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Évolution (jour par jour)</Text>
              {!daily.length ? (
                <Text style={s.muted}>Aucune donnée journalière pour cette période.</Text>
              ) : (
                <View style={s.chartWrap}>
                  <Text style={s.chartHint}>{days} jours • max {maxDaily} TAN</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={s.barsRow}>
                      {daily.map(p => {
                        const v = safeN(p.revenue);
                        const h = maxDaily > 0 ? Math.max(6, Math.round((v / maxDaily) * 86)) : 6;
                        return (
                          <View key={p.day_key} style={s.barCol}>
                            <View style={[s.bar, { height: h }]} />
                            <Text style={s.barValue} numberOfLines={1}>{v}</Text>
                            <Text style={s.barLabel}>{formatDayLabel(p.day_key)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {typeFilter === "TOUS" && allEntries.map(([type, v]) => (
              <View key={type} style={s.kpiRow}>
                <Kpi label={formatTypeLabel(type)}             value={`${safeN(v.revenue)} TAN`} />
                <Kpi label={`Ventes ${formatTypeLabel(type)}`} value={`${safeN(v.sales)}`} />
              </View>
            ))}

            <View style={s.card}>
              <Text style={s.cardTitle}>{typeFilter === "TOUS" ? "Œuvres les plus rentables" : `Top ${formatTypeLabel(typeFilter)}`}</Text>
              {topProducts.length ? (
                topProducts.map((p, i) => (
                  <View key={p.product_id} style={s.topRow}>
                    <Text style={s.rank}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.topTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={s.topMeta}>{formatTypeLabel(p.type)} • {p.sales} vente{p.sales > 1 ? "s" : ""}</Text>
                    </View>
                    <Text style={s.topValue}>{p.revenue_tan} TAN</Text>
                  </View>
                ))
              ) : (
                <Text style={s.muted}>{typeFilter === "TOUS" ? "Aucune œuvre rentable pour cette période." : `Aucun résultat pour ${formatTypeLabel(typeFilter)} sur cette période.`}</Text>
              )}
            </View>

            <View style={s.insights}>
              <Insight title="Conseil" text="Plus tu publies régulièrement, plus tes gains deviennent stables sur la courbe." />
              <Insight title="Focus"   text="Travaille les formats qui apparaissent souvent dans le TOP rentable." />
            </View>

          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <View style={s.insightCard}>
      <Text style={s.insightTitle}>{title}</Text>
      <Text style={s.insightText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Zone sticky (toujours visible)
  sticky:     { backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 },
  titleRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 50, marginBottom: 10, gap: 10 },
  backBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 24, fontWeight: "900", color: COLORS.text },
  subtitle:   { fontSize: 12, color: COLORS.gray, marginTop: 3 },

  pillsRow:   { flexDirection: "row", paddingHorizontal: 18, gap: 0, marginBottom: 8 },

  // Pill période
  pill:       { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, backgroundColor: COLORS.card },
  pillOn:     { borderColor: COLORS.gold, backgroundColor: COLORS.goldBg },
  pillTxt:    { fontWeight: "700", color: COLORS.gray, fontSize: 13 },
  pillTxtOn:  { color: COLORS.gold, fontWeight: "800" },

  // Pill type — rempli quand actif
  typePill:   { borderWidth: 1, borderColor: COLORS.border, paddingVertical: 5, paddingHorizontal: 13, borderRadius: 999, marginRight: 8, backgroundColor: "#FFFFFF" },
  typePillOn: { borderColor: COLORS.gold, backgroundColor: COLORS.gold },
  typeTxt:    { fontWeight: "700", color: COLORS.gray, fontSize: 12 },
  typeTxtOn:  { color: "#000000", fontWeight: "900" },

  // Badge type actif
  activeBadge:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.goldBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.gold + "55", marginBottom: 12 },
  activeBadgeTxt: { fontWeight: "800", color: COLORS.gold, fontSize: 13 },
  activeBadgeClear:{ color: COLORS.gold, fontWeight: "700", fontSize: 12 },

  content:    { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 110 },
  boot:       { paddingVertical: 60, alignItems: "center" },

  notice:     { backgroundColor: COLORS.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
  noticeText: { fontSize: 13, color: COLORS.gray },
  cta:        { marginTop: 14, backgroundColor: COLORS.gold, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  ctaTxt:     { color: "#fff", fontWeight: "900" },

  kpiRow:     { flexDirection: "row", gap: 12, marginBottom: 12 },
  kpi:        { flex: 1, backgroundColor: COLORS.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  kpiLabel:   { fontSize: 11, fontWeight: "800", textTransform: "uppercase", color: COLORS.gray },
  kpiValue:   { fontSize: 18, fontWeight: "900", marginTop: 8, color: COLORS.text },
  kpiSub:     { marginTop: 6, color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  card:       { backgroundColor: COLORS.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  cardTitle:  { fontWeight: "900", fontSize: 15, marginBottom: 10, color: COLORS.text },
  muted:      { color: COLORS.muted, fontSize: 13 },

  chartWrap:  { marginTop: 8 },
  chartHint:  { color: COLORS.muted, fontWeight: "700", fontSize: 12, marginBottom: 10 },
  barsRow:    { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingRight: 10 },
  barCol:     { width: 46, alignItems: "center", justifyContent: "flex-end" },
  bar:        { width: 18, borderRadius: 10, backgroundColor: COLORS.gold },
  barValue:   { marginTop: 6, fontSize: 11, fontWeight: "900", color: COLORS.text },
  barLabel:   { marginTop: 4, fontSize: 11, color: COLORS.muted, fontWeight: "700" },

  topRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  rank:       { width: 18, textAlign: "center", fontWeight: "900", color: COLORS.gold },
  topTitle:   { fontWeight: "800", color: COLORS.text },
  topMeta:    { fontSize: 12, color: COLORS.gray },
  topValue:   { fontWeight: "900", color: COLORS.gold },

  insights:     { gap: 10 },
  insightCard:  { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  insightTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 6 },
  insightText:  { color: COLORS.gray, fontWeight: "700", fontSize: 13 },
});