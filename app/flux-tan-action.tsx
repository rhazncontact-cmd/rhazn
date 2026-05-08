// app/flux-tan-action.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function WalletBANQ() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data: w } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", auth.user.id)
        .single();

      const { data: p } = await supabase
        .from("profiles")
        .select("is_agent, agent_status")
        .eq("id", auth.user.id)
        .single();

      setWallet(w);
      setProfile(p);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>BANQ</Text>
        <Pressable onPress={() => router.push("/banq/history")}>
          <Feather name="clock" size={22} color={GOLD} />
        </Pressable>
      </View>

      {/* STATUS AGENT */}
      {profile?.is_agent && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Agent RHAZN • {profile.agent_status?.toUpperCase()}
          </Text>
        </View>
      )}

      {/* TAN CARD */}
      <View style={styles.card}>
        <Text style={styles.label}>TAN disponible</Text>
        <Text style={styles.amount}>{wallet.tan_balance}</Text>
        <Text style={styles.sub}>Unité d’action</Text>
      </View>

      {/* ACSET CARD */}
      <View style={styles.card}>
        <Text style={styles.label}>ACSET</Text>
        <Text style={styles.amount}>{wallet.acset_balance}</Text>
        <Text style={styles.sub}>Valeur structurelle</Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <Action
          label="Publier PACT"
          icon="edit"
          onPress={() => router.push("/pact/create")}
        />
        <Action
          label="Transférer TAN"
          icon="send"
          onPress={() => router.push("/banq/transfer")}
        />
        <Action
          label="Retrait Agent"
          icon="log-out"
          onPress={() => router.push("/banq/withdraw")}
        />
      </View>
    </ScrollView>
  );
}

/* ---------- Components ---------- */

function Action({ label, icon, onPress }: any) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <Feather name={icon} size={20} color={GOLD} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: { color: GOLD, fontSize: 26, fontWeight: "900" },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#333",
  },

  badgeText: { color: GOLD, fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: "#0c0c0c",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222",
    padding: 20,
    marginBottom: 16,
  },

  label: { color: "#aaa", fontSize: 13 },
  amount: { color: "#fff", fontSize: 34, fontWeight: "900", marginVertical: 4 },
  sub: { color: "#666", fontSize: 12 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  actionBtn: {
    flex: 1,
    backgroundColor: "#0e0e0e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    paddingVertical: 14,
    marginHorizontal: 6,
  },

  actionText: {
    color: "#ddd",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
});
