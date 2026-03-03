import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";

/* ===================== CONSTANTES ===================== */
const GOLD = "#D4AF37";
const BG = "#FFFFFF";
const CARD = "#F6F6F8";
const TEXT = "#0A0A0A";
const MUTED = "#6E6E73";

/* ===================== TYPES ===================== */

type AgentED = {
  id: string;
  agent_code: string | null;
};

/* ===================== SCREEN ===================== */
export default function AgentDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [todayOpsCount, setTodayOpsCount] = useState(0);
  const [todayTanReceived, setTodayTanReceived] = useState(0);

  const [pendingTanRequests, setPendingTanRequests] = useState<any[]>([]);
  const [agentCode, setAgentCode] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [tanBalance, setTanBalance] = useState(0);

  const pendingCount = useMemo(
    () => pendingTanRequests.length,
    [pendingTanRequests]
  );

  /* =========================================================
     🔒 RHAZN FINAL GUARD — AGENT = EDS UNIQUEMENT
     ========================================================= */
  const ensureAgentOrRedirect = async (uid: string) => {
    const { data: ed } = await supabase
      .from("eds")
      .select("id")
      .eq("auth_uid", uid)
      .eq("is_active", true)
      .maybeSingle();

    if (!ed) {
      router.replace("/user-dashboard");
      return false;
    }

    return true;
  };

  /* ===================== LOAD DASHBOARD ===================== */
  const loadDashboard = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      const agentUid = session.session?.user?.id;

      if (!agentUid) {
        router.replace("/auth/login");
        return;
      }

      /* 🔥 GUARD IMMÉDIAT */
      const ok = await ensureAgentOrRedirect(agentUid);
      if (!ok) return;

      /* ✅ UNIQUE WALLET TAN (source officielle) */
      await supabase.rpc("ensure_wallet");

      const { data: w } = await supabase
        .from("wallets")
        .select("tan_balance")
        .eq("user_id", agentUid)
        .single();

      setTanBalance(Number(w?.tan_balance ?? 0));

      /* 🔹 IDENTITÉ AGENT (EDS = source unique) */
      const { data: ed } = await supabase
        .from("eds")
        .select("id, agent_code")
        .eq("auth_uid", agentUid)
        .eq("is_active", true)
        .maybeSingle<AgentED>();

      setAgentCode(ed?.agent_code ?? null);

      /* 🔹 STATS DU JOUR */
      const now = new Date();
      const startDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();

      const { data: txs } = await supabase
        .from("agents_transactions")
        .select("kind, tan_amount")
        .eq("agent_uid", agentUid)
        .gte("created_at", startDay);

      let tan = 0;

      (txs ?? []).forEach((t: any) => {
        if (t.tan_amount) tan += t.tan_amount;
      });

      setTodayOpsCount(txs?.length ?? 0);
      setTodayTanReceived(tan);

      /* 🔹 DEMANDES TAN */
      const { data: tanReq } = await supabase
        .from("user_tan_purchase_requests")
        .select("id")
        .eq("agent_id", agentUid)
        .eq("status", "PENDING");

      setPendingTanRequests(tanReq ?? []);
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ===================== UI ===================== */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agent RHAZN</Text>
          <Text style={styles.subtitle}>Dashboard officiel</Text>
        </View>
        <Image
          source={require("../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDashboard();
              }}
              tintColor={GOLD}
            />
          }
        >
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* WALLET */}
          <Card title="Portefeuille">
            <WalletItem label="Solde TAN" value={tanBalance} />
          </Card>

          {/* IDENTITÉ AGENT */}
          <Card title="Identité Agent">
            {agentCode ? (
              <View style={{ alignItems: "center", gap: 14 }}>
                <View style={styles.agentCodeBox}>
                  <Text style={styles.agentCodeLabel}>Code Agent</Text>
                  <Text style={styles.agentCode}>{agentCode}</Text>
                </View>

                <View style={styles.qrBox}>
                  <QRCode value={agentCode} size={160} />
                </View>
              </View>
            ) : (
              <Text style={{ color: MUTED }}>
                Code agent indisponible
              </Text>
            )}
          </Card>

          {/* STATS */}
          <Card title="Aujourd’hui">
            <Stat label="Opérations" value={todayOpsCount} />
            <Stat label="TAN traités" value={todayTanReceived} />
          </Card>

          {/* ACTIONS */}
          <Card title="Actions rapides">
            <View style={styles.row}>
              <ActionGold
                icon="point-of-sale"
                label="Vendre TAN"
                onPress={() => router.push("/agent-sell-tan")}
              />
              <ActionGold
                icon="notifications"
                label="Demandes"
                badge={pendingCount}
                onPress={() => router.push("/agent-request")}
              />
            </View>

            <View style={styles.row}>
              <ActionSoft
                icon="upload"
                label="Renflouer"
                onPress={() => router.push("/agent-funding-request")}
              />
              <ActionSoft
                icon="clock"
                label="Historique"
                onPress={() => router.push("/agent-history")}
              />
            </View>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

/* ===================== COMPONENTS & STYLES IDENTIQUES ===================== */


function Card({ title, children }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function WalletItem({ label, value }: any) {
  const v = Number(value ?? 0);

  return (
    <View>
      <Text style={styles.walletLabel}>{label}</Text>
      <Text style={styles.walletValue}>
        {v.toLocaleString("fr-FR")} TAN
      </Text>
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionGold({ icon, label, badge, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionGold} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color="#000" />
      <Text style={styles.actionGoldText}>{label}</Text>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ActionSoft({ icon, label, onPress, full }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionSoft, full && { width: "100%" }]}
      onPress={onPress}
    >
      <Feather name={icon} size={18} color={GOLD} />
      <Text style={styles.actionSoftText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  title: { color: TEXT, fontSize: 22, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 2 },
  logo: { width: 34, height: 34 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorBox: {
    backgroundColor: "#FEE2E2",
    margin: 20,
    padding: 12,
    borderRadius: 14,
  },
  errorText: { color: "#991B1B", fontSize: 13 },

  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: CARD,
  },

  cardTitle: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 12,
  },

  walletRow: { flexDirection: "row", justifyContent: "space-between" },
  walletLabel: { color: MUTED, fontSize: 12 },
  walletValue: { color: TEXT, fontSize: 22, fontWeight: "900" },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statLabel: { color: MUTED },
  statValue: { color: TEXT, fontWeight: "900" },

  row: { flexDirection: "row", gap: 10, marginBottom: 10 },

  actionGold: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionGoldText: { color: "#000", fontSize: 13, fontWeight: "900" },

  actionSoft: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GOLD,
  },
  actionSoftText: { color: GOLD, fontSize: 13, fontWeight: "900" },

  badge: {
    position: "absolute",
    top: 6,
    right: 10,
    backgroundColor: "#FF3B30",
    borderRadius: 9,
    paddingHorizontal: 6,
    height: 18,
    justifyContent: "center",
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },

  /* 🔐 AGENT CODE & QR */
  agentCodeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  agentCodeLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  agentCode: {
    marginTop: 4,
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  qrBox: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  qrHint: {
    marginTop: 6,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
