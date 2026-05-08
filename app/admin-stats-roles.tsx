// app/admin/stats-roles.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const BG = "#000000";
const CARD = "#0E0E0E";
const BORDER = "rgba(255,255,255,0.10)";
const MUTED = "rgba(255,255,255,0.70)";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

type RoleStat = {
  role: string;
  total: number;
  active: number;
  paused: number;
  disabled: number;
  cadna_pending: number;
  cadna_approved: number;
  cadna_rejected: number;
};

export default function RZAdminStatsRoles() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<RoleStat[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, 2200);
  };

  const ensureSupreme = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    if (!user) {
      router.replace("/auth/login");
      return false;
    }

    if ((user.email || "").toLowerCase() !== SUPREME_EMAIL.toLowerCase()) {
      router.replace("/banq/suspentz");
      return false;
    }

    return true;
  };

  const fetchStats = async () => {
    setErr(null);

    // sécurité: accès seulement compte suprême
    const ok = await ensureSupreme();
    if (!ok) return;

    const { data, error } = await supabase.rpc("rz_role_stats");

    if (error) {
      setErr("Erreur chargement statistiques (RPC). Vérifie que rz_role_stats() existe.");
      return;
    }

    setStats((data || []) as RoleStat[]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);

      // ✅ Realtime : si profiles change => refresh stats
      const channel = supabase
        .channel("realtime:profiles:stats")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          async () => {
            await fetchStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const t = {
      total: 0,
      active: 0,
      paused: 0,
      disabled: 0,
      cadna_pending: 0,
      cadna_approved: 0,
      cadna_rejected: 0,
    };
    for (const s of stats) {
      t.total += s.total || 0;
      t.active += s.active || 0;
      t.paused += s.paused || 0;
      t.disabled += s.disabled || 0;
      t.cadna_pending += s.cadna_pending || 0;
      t.cadna_approved += s.cadna_approved || 0;
      t.cadna_rejected += s.cadna_rejected || 0;
    }
    return t;
  }, [stats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    showToast("Stats actualisées.");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: GOLD, marginTop: 10, fontWeight: "800" }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="chevron-left" size={22} color={GOLD} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Statistiques par rôle</Text>
          <Text style={styles.subtitle}>Realtime • Compte suprême</Text>
        </View>

        <Pressable onPress={onRefresh} style={styles.iconBtn}>
          <Feather name="refresh-cw" size={18} color={GOLD} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={GOLD} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {err && <Text style={styles.error}>{err}</Text>}

        {/* Totaux */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Global</Text>

          <View style={styles.kpiRow}>
            <Kpi label="Total" value={totals.total} />
            <Kpi label="Actifs" value={totals.active} />
            <Kpi label="Pause" value={totals.paused} />
            <Kpi label="Désactivés" value={totals.disabled} />
          </View>

          <View style={[styles.kpiRow, { marginTop: 10 }]}>
            <Kpi label="CADNA pending" value={totals.cadna_pending} />
            <Kpi label="CADNA ok" value={totals.cadna_approved} />
            <Kpi label="CADNA rejet" value={totals.cadna_rejected} />
          </View>
        </View>

        {/* Par rôle */}
        <Text style={styles.sectionTitle}>Détail par rôle</Text>

        {stats.map((s) => (
          <View key={s.role} style={styles.roleCard}>
            <View style={styles.roleTop}>
              <Text style={styles.roleName}>{labelRole(s.role)}</Text>
              <Text style={styles.roleTotal}>{s.total}</Text>
            </View>

            <Text style={styles.roleMeta}>
              Actifs {s.active} • Pause {s.paused} • Désactivés {s.disabled}
            </Text>

            <View style={styles.pillsRow}>
              <Pill label="CADNA pending" value={s.cadna_pending} />
              <Pill label="CADNA ok" value={s.cadna_approved} />
              <Pill label="CADNA rejet" value={s.cadna_rejected} />
            </View>
          </View>
        ))}

        {/* Next buttons (prépare la suite) */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>Prochaine couche</Text>
          <Text style={styles.nextSub}>
            Tu veux brancher ces stats sur : Wallets, CAD, CADNA, ED ?
          </Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              showToast("OK. Prochaine étape : stats + wallets.");
              // tu pourras router vers /rz-admin/admin-wallet quand prêt
            }}
          >
            <Text style={styles.primaryText}>Brancher aux wallets</Text>
          </Pressable>
        </View>
      </ScrollView>

      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ===================== UI HELPERS ===================== */

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function labelRole(role: string) {
  const r = (role || "user").toLowerCase();
  if (r === "supreme") return "SUPREME";
  if (r === "cad") return "CAD (Conseil Admin)";
  if (r === "cadna") return "CADNA";
  if (r === "ed" || r === "agent") return "ED (Agent)";
  if (r === "admin") return "ADMIN";
  return "USER";
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingHorizontal: 16, paddingTop: 18 },
  center: { flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },

  title: { color: "#fff", fontSize: 18, fontWeight: "900" },
  subtitle: { color: MUTED, marginTop: 2, fontSize: 12 },

  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 10,
  },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 14, marginBottom: 10 },

  kpiRow: { flexDirection: "row", gap: 10 },
  kpi: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
  },
  kpiLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  kpiValue: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 6 },

  sectionTitle: { color: "#fff", marginTop: 18, marginBottom: 10, fontWeight: "900" },

  roleCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  roleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roleName: { color: "#fff", fontSize: 15, fontWeight: "900" },
  roleTotal: { color: GOLD, fontSize: 18, fontWeight: "900" },
  roleMeta: { color: MUTED, marginTop: 6, fontSize: 12, fontWeight: "700" },

  pillsRow: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillLabel: { color: MUTED, fontSize: 11, fontWeight: "800" },
  pillValue: { color: "#fff", fontSize: 12, fontWeight: "900" },

  nextCard: {
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
  },
  nextTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  nextSub: { color: MUTED, marginTop: 6, fontSize: 12, fontWeight: "700" },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#000", fontWeight: "900" },

  error: { color: "#f87171", textAlign: "center", marginTop: 8, marginBottom: 8, fontWeight: "800" },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  toastText: { color: "#fff", textAlign: "center", fontWeight: "900" },
});
