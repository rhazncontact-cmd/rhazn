import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

/* 🍎 RHAZN */
const GOLD = "#D4AF37";

type WithdrawRequest = {
  request_id: string;
  created_at: string;
  status: string;

  user_email: string;
  amount_tan: number;

  agent_commission_tan: number;
  admin_commission_tan: number;

  user_net_tan: number;
  user_net_htg: number;
};

export default function AgentWithdrawRequests() {
  const router = useRouter();

  const [data, setData] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("v_agent_withdraw_requests_ui")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setData(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={{ color: GOLD, marginTop: 8 }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GOLD}
        />
      }
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Demandes de retrait</Text>
      </View>

      {data.length === 0 && (
        <Text style={styles.empty}>Aucune demande pour le moment.</Text>
      )}

      {data.map((r) => (
        <View key={r.request_id} style={styles.card}>
          {/* TOP */}
          <View style={styles.rowBetween}>
            <Text style={styles.email}>{r.user_email}</Text>
            <Text style={styles.status(r.status)}>{r.status}</Text>
          </View>

          {/* BODY */}
          <View style={styles.line} />
          <Info label="Montant demandé" value={`${r.amount_tan} TAN`} />
          <Info label="Commission agent" value={`${r.agent_commission_tan} TAN`} />
          <Info label="Commission admin" value={`${r.admin_commission_tan} TAN`} />

          <View style={styles.line} />

          <Info
            label="À verser utilisateur"
            value={`${r.user_net_tan} TAN  •  ${r.user_net_htg} HTG`}
            highlight
          />

          {/* ACTIONS */}
          {r.status === "pending" && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.reject}
                onPress={() =>
                  router.push({
                    pathname: "/agent/reject-request",
                    params: { request_id: r.request_id },
                  })
                }
              >
                <Feather name="x" size={14} color="#fff" />
                <Text style={styles.btnText}>Rejeter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approve}
                onPress={() =>
                  router.push({
                    pathname: "/agent/approve-request",
                    params: { request_id: r.request_id },
                  })
                }
              >
                <Feather name="check" size={14} color="#000" />
                <Text style={[styles.btnText, { color: "#000" }]}>
                  Approuver
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

/* ===== UI HELPERS ===== */

function Info({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

/* ===== STYLES ===== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },

  header: { marginBottom: 14 },
  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  empty: { color: "#777", textAlign: "center", marginTop: 40 },

  card: {
    backgroundColor: "#0b0b0b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 14,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  email: { color: "#fff", fontWeight: "700" },

  status: (s: string) => ({
    color:
      s === "approved" ? "#22c55e" : s === "rejected" ? "#ef4444" : "#facc15",
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 11,
  }),

  line: { height: 1, backgroundColor: "#222", marginVertical: 6 },

  label: { color: "#999", fontSize: 12 },
  value: { color: "#fff", fontWeight: "700" },
  valueHighlight: { color: GOLD, fontSize: 15, fontWeight: "900" },

  actions: { flexDirection: "row", gap: 10, marginTop: 10 },

  reject: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  approve: {
    flex: 1,
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  btnText: { color: "#fff", fontWeight: "900" },
});
