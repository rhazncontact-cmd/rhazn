import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const RED = "#f97373";

/* ================================
   TYPES
================================ */
type EconomyTotals = {
  tan_balance: number;
  htg_balance: number;
  tan_value_htg: number;
  acset_tan_volume: number | null;
  commissions_tan_total: number | null;
  commissions_htg_total: number | null;
};

type GraphPoint = { day: string; amount: number };

type LedgerRow = {
  id: string;
  created_at: string;
  operation: string;
  amount_tan: number;
  amount_htg: number;
  commission_tan: number;
  commission_htg: number;
  from_uid: string | null;
  to_uid: string | null;
};

/* ================================
   SCREEN
================================ */
export default function RZAdminEconomyDashboard() {
  const router = useRouter();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [totals, setTotals] = useState<EconomyTotals | null>(null);
  const [profilePhotoPrice, setProfilePhotoPrice] = useState<number>(0);

  const [acsetGraph, setAcsetGraph] = useState<GraphPoint[]>([]);
  const [transferGraph, setTransferGraph] = useState<GraphPoint[]>([]);
  const [withdrawGraph, setWithdrawGraph] = useState<GraphPoint[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  /* ================================
     LOAD DATA
  ================================ */
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;

    setRefreshing(true);
    setErrorMsg(null);

    try {
      // TOTALS
      const { data: totalsData, error: totalsError } =
        await supabase.rpc("admin_economy_totals");
      if (totalsError) throw totalsError;

      // ECO FORMULE
      const { data: ecoData } = await supabase
        .from("eco_formules")
        .select("profile_photo_change_price")
        .single();

      // GRAPHS
      const { data: acsetData } = await supabase.rpc("admin_graph_acset");
      const { data: transferData } =
        await supabase.rpc("admin_graph_tan_transfers");
      const { data: withdrawData } =
        await supabase.rpc("admin_graph_tan_withdrawals");

      // LEDGER
      const { data: ledgerData } = await supabase
        .from("rz_admin_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!mountedRef.current) return;

      setTotals((totalsData as EconomyTotals) ?? null);
      setProfilePhotoPrice(
        Number(ecoData?.profile_photo_change_price ?? 0)
      );

      setAcsetGraph(
        (acsetData || []).map((r: any) => ({
          day: r.day,
          amount: Number(r.amount ?? 0),
        }))
      );

      setTransferGraph(
        (transferData || []).map((r: any) => ({
          day: r.day,
          amount: Number(r.total_tan ?? 0),
        }))
      );

      setWithdrawGraph(
        (withdrawData || []).map((r: any) => ({
          day: r.day,
          amount: Number(r.total_tan ?? 0),
        }))
      );

      setLedger((ledgerData || []) as LedgerRow[]);
    } catch (e: any) {
      if (mountedRef.current) {
        setErrorMsg(
          e?.message ||
            "Erreur lors du chargement des données économiques."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  /* ================================
     LOADING STATE
  ================================ */
  if (loading && !totals) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.loadingText}>
          Analyse des flux économiques…
        </Text>
      </View>
    );
  }

  const t = totals;

  /* ================================
     UI
  ================================ */
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>

        <Text style={styles.title}>RZ · Économie</Text>

        <TouchableOpacity onPress={loadData} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <Feather name="refresh-ccw" size={20} color={GOLD} />
          )}
        </TouchableOpacity>
      </View>

      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      {/* PROFIL UTILISATEUR */}
      {t && (
        <View style={styles.cardPrimary}>
          <Text style={styles.cardTitle}>PROFIL UTILISATEUR</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.labelMuted}>
              Changement photo de profil
            </Text>
            <Text style={styles.valueGold}>
              {profilePhotoPrice} TAN
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/* ================================
   STYLES
================================ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: GOLD,
    marginTop: 10,
    fontWeight: "600",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "800",
  },

  errorText: {
    color: RED,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  cardPrimary: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GOLD,
    padding: 16,
  },

  cardTitle: {
    color: GOLD,
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  labelMuted: {
    color: "#888",
    fontSize: 12,
  },

  valueGold: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "900",
  },
});
