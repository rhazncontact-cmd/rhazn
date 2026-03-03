import { Feather } from "@expo/vector-icons";
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

/* 🎨 Apple-like */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F6F7F9",
  border: "#E5E7EB",
  blue: "#007AFF",
  text: "#0A0A0A",
  gray: "#6B7280",
  muted: "#9CA3AF",
  danger: "#DC2626",
  green: "#16A34A",
};

/* ===================== TYPES ===================== */

type TotalsByType = Record<
  string,
  {
    revenue: number;
    sales: number;
  }
>;

type TopProduct = {
  product_id: string;
  title: string;
  type: string;
  sales: number;
  revenue_tan: number;
};

type DailyPoint = {
  day_key: string; // YYYY-MM-DD
  revenue: number;
  sales: number;
};

type DashboardV2 = {
  is_creator: boolean;
  totals: TotalsByType;
  top_products: TopProduct[];
  daily?: DailyPoint[];
};

/* ===================== UTILS ===================== */

const formatTypeLabel = (type: string) => {
  switch ((type || "").toUpperCase()) {
    case "VIDEO":
      return "Vidéo";
    case "SUSPENTZ":
      return "Suspentz";
    case "TEXT":
      return "Texte";
    case "AUDIO":
      return "Audio";
    case "LYRICS":
      return "Lyrics";
    case "IMAGES":
      return "Images";
    case "KOZESANS":
      return "KozeSans";
    default:
      return type || "—";
  }
};

const formatDayLabel = (dayKey: string) => {
  // dayKey = "YYYY-MM-DD"
  try {
    const [y, m, d] = dayKey.split("-").map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch {
    return dayKey;
  }
};

const safeN = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ===================== SCREEN ===================== */

export default function UserGainsScreenV3() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardV2 | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pinVisible, setPinVisible] = useState(false);

  // subtle intro animation (premium)
  const fade = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(6)).current;

  const playIntro = () => {
    fade.setValue(0);
    ty.setValue(6);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  /* ===================== LOAD ===================== */
  const load = async (d = days) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: res, error } = await supabase.rpc(
        "creator_store_dashboard_v2",
        { p_days: d }
      );

      if (error || !res) {
        setData(null);
        setErrorMsg(error?.message || "Impossible de charger les gains.");
        return;
      }

      setData({
        is_creator: !!res.is_creator,
        totals: res.totals || {},
        top_products: Array.isArray(res.top_products) ? res.top_products : [],
        daily: Array.isArray(res.daily) ? res.daily : [],
      });

      playIntro();
    } catch (e: any) {
      setData(null);
      setErrorMsg(e?.message || "Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================== DERIVED DATA ===================== */

  const totalEntries = useMemo(
    () => (data ? Object.entries(data.totals) : []),
    [data]
  );

  const totalRevenue = useMemo(() => {
    return totalEntries.reduce((acc, [, v]) => acc + safeN(v?.revenue), 0);
  }, [totalEntries]);

  const totalSales = useMemo(() => {
    return totalEntries.reduce((acc, [, v]) => acc + safeN(v?.sales), 0);
  }, [totalEntries]);

  const avgPerDay = useMemo(() => {
    const d = Math.max(1, days);
    return Math.round(totalRevenue / d);
  }, [totalRevenue, days]);

  const daily = useMemo(() => (data?.daily || []) as DailyPoint[], [data]);

  const maxDaily = useMemo(() => {
    let m = 0;
    for (const p of daily) m = Math.max(m, safeN(p.revenue));
    return m;
  }, [daily]);

  const bestDay = useMemo(() => {
    if (!daily.length) return null;
    let best = daily[0];
    for (const p of daily) {
      if (safeN(p.revenue) > safeN(best.revenue)) best = p;
    }
    return best;
  }, [daily]);

  const isCreator = data?.is_creator ?? null;

  /* ===================== RENDER ===================== */

  return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Feather name="chevron-left" size={18} color={COLORS.text} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Mes Gains</Text>
                <Text style={styles.subtitle}>
                  Revenus basés uniquement sur tes œuvres publiées
                </Text>
              </View>

              <TouchableOpacity style={styles.refresh} onPress={() => load(days)}>
                <Feather name="refresh-cw" size={16} color={COLORS.blue} />
              </TouchableOpacity>
            </View>

            <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filtersScroll}
>
  {[
    { label: "Toutes", d: 3650 },
    { label: "Jour", d: 1 },
    { label: "Semaine", d: 7 },
    { label: "Mois", d: 30 },
    { label: "Année", d: 365 },
  ].map((item) => (
    <TouchableOpacity
      key={item.label}
      style={[styles.pill, days === item.d && styles.pillActive]}
      onPress={() => {
        setDays(item.d);
        load(item.d);
      }}
    >
      <Text
        style={[
          styles.pillText,
          days === item.d && styles.pillTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

          </View>

          {/* ================= CONTENT ================= */}
          {loading ? (
            <View style={styles.boot}>
              <ActivityIndicator size="large" color={COLORS.blue} />
            </View>
          ) : errorMsg ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{errorMsg}</Text>
            </View>
          ) : isCreator === false ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Tu n’es pas encore créateur.
                {"\n\n"}
                Publie au moins une œuvre pour commencer à générer des gains.
              </Text>

              <TouchableOpacity
                style={styles.cta}
                onPress={() => router.push("/user-publish-pact/")}
              >
                <Text style={styles.ctaText}>Publier une œuvre</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={{ opacity: fade, transform: [{ translateY: ty }] }}>
             {/* ================= KPI GLOBAL (PREMIUM V4) ================= */}

{/* Ligne 1 — Totaux */}
<View style={styles.kpiRow}>
  <Kpi
    label="Toutes catégories"
    value={`${totalRevenue.toLocaleString()} TAN`}
  />

  <Kpi
    label="Ventes totales"
    value={`${totalSales.toLocaleString()}`}
  />
</View>

{/* Ligne 2 — Performance */}
<View style={styles.kpiRow}>
  <Kpi
    label="Moyenne / jour"
    value={`${avgPerDay.toLocaleString()} TAN`}
  />

  <Kpi
    label="Meilleur jour"
    value={
      bestDay
        ? `${safeN(bestDay.revenue).toLocaleString()} TAN`
        : "—"
    }
    sub={bestDay ? formatDayLabel(bestDay.day_key) : undefined}
  />
</View>


              {/* ================= COURBE JOURNALIÈRE (V3) ================= */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Évolution (jour par jour)</Text>

                {!daily.length ? (
                  <Text style={styles.muted}>
                    Aucune donnée journalière pour la période sélectionnée.
                  </Text>
                ) : (
                  <View style={styles.chartWrap}>
                    <View style={styles.chartGrid}>
                      <Text style={styles.chartHint}>
                        {days} jours • max {maxDaily} TAN
                      </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.barsRow}>
                        {daily.map((p) => {
                          const v = safeN(p.revenue);
                          const h = maxDaily > 0 ? Math.max(6, Math.round((v / maxDaily) * 86)) : 6;

                          return (
                            <View key={p.day_key} style={styles.barCol}>
                              <View style={[styles.bar, { height: h }]} />
                              <Text style={styles.barValue} numberOfLines={1}>
                                {v}
                              </Text>
                              <Text style={styles.barLabel}>
                                {formatDayLabel(p.day_key)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* ================= KPI PAR TYPE (DYNAMIQUE) ================= */}
              {totalEntries.map(([type, v]) => (
                <View key={type} style={styles.kpiRow}>
                  <Kpi label={formatTypeLabel(type)} value={`${safeN(v.revenue)} TAN`} />
                  <Kpi label={`Ventes ${formatTypeLabel(type)}`} value={`${safeN(v.sales)}`} />
                </View>
              ))}

              {/* ================= TOP PRODUCTS ================= */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Œuvres les plus rentables</Text>

                {data?.top_products.length ? (
                  data.top_products.map((p, i) => (
                    <View key={p.product_id} style={styles.topRow}>
                      <Text style={styles.rank}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                        <Text style={styles.topMeta}>
                          {formatTypeLabel(p.type)} • {p.sales} vente
                          {p.sales > 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Text style={styles.topValue}>{p.revenue_tan} TAN</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>
                    Aucune œuvre rentable pour la période sélectionnée.
                  </Text>
                )}
              </View>

              {/* ================= MINI INSIGHTS (V3) ================= */}
              <View style={styles.insights}>
                <Insight
                  title="Conseil"
                  text="Plus tu publies régulièrement, plus tes gains deviennent stables sur la courbe."
                />
                <Insight
                  title="Focus"
                  text="Travaille les formats qui apparaissent souvent dans le TOP rentable."
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
  );
}

/* ===================== COMPONENTS ===================== */

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 110 },
  header: { paddingTop: 18, paddingBottom: 16 },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.gray, marginTop: 6 },

  filters: { flexDirection: "row", alignItems: "center", marginTop: 14 },

  pill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: COLORS.card,
  },
  pillActive: { borderColor: COLORS.blue, backgroundColor: "#EEF4FF" },
  pillText: { fontWeight: "700", color: COLORS.gray },
  pillTextActive: { color: COLORS.blue },

  refresh: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  boot: { paddingVertical: 60, alignItems: "center" },

  notice: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noticeText: { fontSize: 13, color: COLORS.gray },

  cta: {
    marginTop: 14,
    backgroundColor: COLORS.blue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "900" },

  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 12 },

  kpi: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: COLORS.gray,
  },
  kpiValue: { fontSize: 20, fontWeight: "900", marginTop: 8, color: COLORS.text },
  kpiSub: { marginTop: 6, color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 14,
  },
  cardTitle: { fontWeight: "900", fontSize: 15, marginBottom: 10, color: COLORS.text },
  muted: { color: COLORS.muted },

  /* Chart */
  chartWrap: { marginTop: 8 },
  chartGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  chartHint: { color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  barsRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingRight: 10 },
  barCol: { width: 46, alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: 18,
    borderRadius: 10,
    backgroundColor: COLORS.blue,
  },
  barValue: { marginTop: 6, fontSize: 11, fontWeight: "900", color: COLORS.text },
  barLabel: { marginTop: 4, fontSize: 11, color: COLORS.muted, fontWeight: "700" },

  /* Top */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  rank: { width: 18, textAlign: "center", fontWeight: "900", color: COLORS.blue },
  topTitle: { fontWeight: "800", color: COLORS.text },
  topMeta: { fontSize: 12, color: COLORS.gray },
  topValue: { fontWeight: "900", color: COLORS.blue },

  /* Insights */
  insights: { marginTop: 14, gap: 10 },
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 6 },
  insightText: { color: COLORS.gray, fontWeight: "700", fontSize: 13 },

  filtersScroll: {
  flexDirection: "row",
  paddingRight: 8,
  marginTop: 14,
},

/* PIN */

pinOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
},

pinCard: {
  backgroundColor: "#FFF",
  width: 300,
  borderRadius: 22,
  padding: 24,
  alignItems: "center",
},

pinTitle: {
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 18,
  color: COLORS.text,
},

pinGrid: {
  width: "100%",
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},

pinKey: {
  width: 70,
  height: 58,
  borderRadius: 16,
  backgroundColor: COLORS.card,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 10,
},

pinKeyText: {
  fontSize: 20,
  fontWeight: "900",
  color: COLORS.text,
},


});
