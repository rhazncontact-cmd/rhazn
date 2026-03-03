// app/user-withdraw-history.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 RHAZN */
const GOLD = "#D4AF37";

type WithdrawRow = {
  id: string;
  amount_tan: number;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  note: string | null;
  created_at: string;
  decided_at: string | null;
};

export default function UserWithdrawHistory() {
  const router = useRouter();

  const [rows, setRows] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("agent_requests")
      .select(
        "id, amount_tan, status, note, created_at, decided_at"
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data as WithdrawRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const statusColor = (s: WithdrawRow["status"]) => {
    switch (s) {
      case "approved":
        return "#00FF6A";
      case "pending":
        return GOLD;
      case "rejected":
        return "#FF453A";
      case "expired":
      case "cancelled":
        return "rgba(255,255,255,0.45)";
      default:
        return "#AAA";
    }
  };

  const statusLabel = (s: WithdrawRow["status"]) => {
    switch (s) {
      case "approved":
        return "Approuvé";
      case "pending":
        return "En attente";
      case "rejected":
        return "Rejeté";
      case "expired":
        return "Expiré";
      case "cancelled":
        return "Annulé";
      default:
        return s;
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Historique des retraits</Text>
          <Text style={styles.sub}>Vos demandes TAN</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>Aucune demande enregistrée.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.amount}>{r.amount_tan} TAN</Text>
                <Text
                  style={[
                    styles.status,
                    { color: statusColor(r.status) },
                  ]}
                >
                  {statusLabel(r.status)}
                </Text>
              </View>

              {r.note && <Text style={styles.note}>{r.note}</Text>}

              <Text style={styles.date}>
                Demandé le {new Date(r.created_at).toLocaleString()}
              </Text>

              {r.decided_at && (
                <Text style={styles.date}>
                  Décision le {new Date(r.decided_at).toLocaleString()}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* 🎨 STYLES — Apple-like */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 56 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  title: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },

  sub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 2,
  },

  empty: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 40,
  },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amount: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
  },

  status: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  note: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
  },

  date: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 6,
  },
});
