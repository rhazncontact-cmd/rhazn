import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import SecureScreen from "../components/SecureScreen";

const GOLD = "#D4AF37";
const AUTO_REFRESH_MS = 25_000;

type Dashboard = {
  days: number;
  totals: {
    sales: number;
    revenue_tan: number;
    preview_audio: number;
    preview_video: number;
    open_consume: number;
    open_video_full: number;
    play_audio: number;
    download_text: number;
  };
  top_products: Array<{
    product_id: string;
    title: string;
    type: string;
    sales: number;
    revenue_tan: number;
  }>;
  daily: Array<{ day: string; sales: number; revenue_tan: number }>;
};

export default function CreatorDashboardStore() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [days, setDays] = useState(30);
  const [data, setData] = useState<Dashboard | null>(null);

  const mountedRef = useRef(true);

  const load = useCallback(
    async (d = days) => {
      try {
        // si c’est un refresh manuel
        if (!loading) setRefreshing(true);
        else setLoading(true);

        const { data: res, error } = await supabase.rpc(
          "creator_store_dashboard",
          { p_days: d }
        );

        if (!mountedRef.current) return;

        if (error) {
          console.log("creator_store_dashboard error:", error.message);
          // on garde l'écran stable, on ne casse pas l'UI
        } else {
          setData(res as Dashboard);
        }
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, loading]
  );

  // 1) premier load
  useEffect(() => {
    mountedRef.current = true;
    load(30);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 2) reload quand on revient sur l’écran
  useFocusEffect(
    useCallback(() => {
      load(days);
      return () => {};
    }, [days, load])
  );

  // 3) auto refresh périodique
  useEffect(() => {
    const t = setInterval(() => {
      load(days);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(t);
  }, [days, load]);

  // 4) realtime (si tes tables existent — sinon c'est silencieux)
  useEffect(() => {
    const channel = supabase
      .channel("creator-dashboard-store-live")
      // store_events : vues/achats/consommations (si tu as une table d’événements)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_events" },
        () => load(days)
      )
      // store_products : si tu modifies un titre/prix/catégorie côté admin
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_products" },
        () => load(days)
      )
      .subscribe((status) => {
        // si la table n’existe pas, Supabase peut logguer, mais ça ne doit pas casser l’app
        // console.log("realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [days, load]);

  const maxRevenue = useMemo(() => {
    if (!data?.daily?.length) return 0;
    return Math.max(...data.daily.map((x) => Number(x.revenue_tan || 0)));
  }, [data]);

  const onPullRefresh = useCallback(() => {
    load(days);
  }, [days, load]);

  return (
    <SecureScreen scope="RHAZN-Store">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={GOLD}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mes Gains</Text>

          <View style={styles.filters}>
            {[7, 30, 90].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.pill, days === d && styles.pillActive]}
                onPress={() => {
                  setDays(d);
                  load(d);
                }}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.pillText,
                    days === d && styles.pillTextActive,
                  ]}
                >
                  {d}j
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.refresh}
              onPress={() => load(days)}
              activeOpacity={0.9}
            >
              <Feather name="refresh-cw" size={16} color={GOLD} />
            </TouchableOpacity>
          </View>
        </View>

        {loading || !data ? (
          <View style={styles.boot}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={{ color: "#777", marginTop: 10 }}>
              Chargement des statistiques…
            </Text>
          </View>
        ) : (
          <>
            {/* KPI */}
            <View style={styles.kpiRow}>
              <Kpi label="Revenus" value={`${data.totals.revenue_tan} TAN`} />
              <Kpi label="Ventes" value={`${data.totals.sales}`} />
            </View>

            <View style={styles.kpiRow}>
              <Kpi
                label="Preview audio"
                value={`${data.totals.preview_audio}`}
              />
              <Kpi
                label="Preview vidéo"
                value={`${data.totals.preview_video}`}
              />
            </View>

            <View style={styles.kpiRow}>
              <Kpi label="Ouvertures" value={`${data.totals.open_consume}`} />
              <Kpi
                label="Téléchargements"
                value={`${data.totals.download_text}`}
              />
            </View>

            {/* MINI CHART */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Revenus par jour</Text>

              {data.daily?.length ? (
                <View style={{ marginTop: 12 }}>
                  {data.daily.slice(-14).map((d) => {
                    const w =
                      maxRevenue > 0
                        ? Math.max(
                            6,
                            (Number(d.revenue_tan) / maxRevenue) * 100
                          )
                        : 6;

                    return (
                      <View key={d.day} style={styles.barRow}>
                        <Text style={styles.barLabel}>{d.day.slice(5)}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${w}%` }]} />
                        </View>
                        <Text style={styles.barValue}>{d.revenue_tan}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.muted}>Aucune vente sur la période.</Text>
              )}
            </View>

            {/* TOP PRODUCTS */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top œuvres (revenus)</Text>

              {data.top_products?.length ? (
                <View style={{ marginTop: 10 }}>
                  {data.top_products.map((p, idx) => (
                    <View key={p.product_id} style={styles.topRow}>
                      <Text style={styles.rank}>{idx + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.topTitle} numberOfLines={1}>
                          {p.title}
                        </Text>
                        <Text style={styles.topMeta}>
                          {p.type} • {p.sales} ventes
                        </Text>
                      </View>
                      <Text style={styles.topValue}>{p.revenue_tan} TAN</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>Aucune donnée pour l’instant.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SecureScreen>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    paddingVertical: 40,
    alignItems: "center",
  },
  container: {
    padding: 18,
    paddingBottom: 90,
    backgroundColor: "#000",
  },
  header: {
    marginBottom: 14,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  pill: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: "#111",
  },
  pillActive: {
    borderColor: GOLD,
  },
  pillText: {
    color: "#aaa",
    fontWeight: "800",
  },
  pillTextActive: {
    color: GOLD,
  },
  refresh: {
    marginLeft: "auto",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  kpi: {
    flex: 1,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 18,
    padding: 14,
  },
  kpiLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kpiValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  muted: {
    color: "#777",
    marginTop: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  barLabel: {
    width: 46,
    color: "#aaa",
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    marginHorizontal: 10,
  },
  barFill: {
    height: "100%",
    backgroundColor: GOLD,
  },
  barValue: {
    width: 52,
    textAlign: "right",
    color: "#aaa",
    fontSize: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    gap: 10,
  },
  rank: {
    color: GOLD,
    fontWeight: "900",
    width: 18,
    textAlign: "center",
  },
  topTitle: {
    color: "#fff",
    fontWeight: "800",
  },
  topMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  topValue: {
    color: GOLD,
    fontWeight: "900",
  },
});
