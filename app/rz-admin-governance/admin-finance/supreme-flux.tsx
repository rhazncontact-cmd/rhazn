// app/admin/supreme-flux.tsx
import { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

/* 🍎 RHAZN – Supreme Flux (MOBILE FIRST) */

const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  gold: "#D4AF37",
  green: "#00C853",
  red: "#E53935",
};

type FluxRow = {
  id: string;
  created_at: string;
  category_code: string;
  context: string;
  quantity: number;
  tan_effect: number;
  actor_email: string | null;
  target_email: string | null;
  note: string | null;
};

export default function SupremeFluxScreen() {
  // ⛔ WEB désactivé (évite tout crash Expo Web)
  if (Platform.OS === "web") {
    return (
      <View style={styles.webBlock}>
        <Text style={styles.webText}>
          Flux SUPREME disponible uniquement sur mobile.
        </Text>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<FluxRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchFlux = async () => {
    const { data, error } = await supabase.rpc("get_supreme_flux", {
      p_limit: 100,
    });

    if (error) {
      console.error("SUPREME FLUX ERROR:", error);
      setRows([]);
      return;
    }

    setRows(data ?? []);
  };

  /* 🔁 Chargement initial */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchFlux();
      setLoading(false);
    })();
  }, []);

  /* 🔴 Realtime sécurisé */
  useEffect(() => {
    channelRef.current = supabase
      .channel("supreme-flux-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "eco_transaction_logs",
        },
        async () => {
          // 🔔 Nouvelle transaction → refresh RPC
          await fetchFlux();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFlux();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: FluxRow }) => {
    const isPositive = item.tan_effect >= 0;

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.category}>{item.category_code}</Text>
          <Text
            style={[
              styles.amount,
              { color: isPositive ? COLORS.green : COLORS.red },
            ]}
          >
            {isPositive ? "+" : ""}
            {item.tan_effect} TAN
          </Text>
        </View>

        <Text style={styles.context}>{item.context}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            👤 {item.actor_email || "system"}
          </Text>
          <Text style={styles.metaText}>
            🎯 {item.target_email || "—"}
          </Text>
        </View>

        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={{ color: COLORS.muted, marginTop: 10 }}>
          Chargement du flux SUPREME…
        </Text>
      </View>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.screen}>
        <Text style={styles.title}>Flux SUPREME</Text>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.gold}
            />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />

        {rows.length === 0 && (
          <Text style={styles.empty}>Aucune transaction.</Text>
        )}
      </View>
    </AdminGuard>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  category: {
    color: COLORS.text,
    fontWeight: "700",
  },
  amount: {
    fontWeight: "900",
  },
  context: {
    color: COLORS.muted,
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  date: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },
  empty: {
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 40,
  },
  webBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  webText: {
    color: COLORS.muted,
    fontSize: 13,
  },
});
