import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 RHAZN — Apple-like palette */
const COLORS = {
  bg: "#000000",
  card: "#0F0F0F",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  gray: "#9A9A9A",
  gold: "#D4AF37",
  blue: "#007AFF",
  green: "#30D158",
  orange: "#FF9F0A",
  red: "#FF453A",
};

type WalletUser = {
  user_id: string;
  email: string;
  tan_balance: number;
  acset_balance: number;
  status: string;
};

export default function AdminWalletScreen() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<WalletUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  /* 🔍 SEARCH USER */
  const searchUser = async () => {
    if (!email.trim()) {
      Alert.alert("Email requis");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "admin_get_wallet_by_email",
        { p_email: email.trim() }
      );

      if (error || !data || data.length === 0) {
        Alert.alert("Utilisateur introuvable");
        return;
      }

      setUser(data[0]);
    } finally {
      setLoading(false);
    }
  };

  /* 💰 REFILL / DÉRENFLOUER */
  const refill = async (acset: number, tan: number) => {
    if (!user?.email) {
      Alert.alert("Aucun utilisateur sélectionné");
      return;
    }

    setWorking(true);

    const { error } = await supabase.rpc("admin_refill_wallet", {
      p_email: user.email,
      p_acset: acset,
      p_tan: tan,
    });

    setWorking(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    await searchUser(); // ✅ refresh visuel correct
  };

  /* ⚙️ SET STATUS */
  const setStatus = async (status: string) => {
    if (!user?.email) {
      Alert.alert("Aucun utilisateur sélectionné");
      return;
    }

    setWorking(true);

    const { error } = await supabase.rpc("admin_set_wallet_status", {
      p_email: user.email,
      p_status: status,
    });

    setWorking(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    await searchUser();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Wallet</Text>

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Email utilisateur"
          placeholderTextColor={COLORS.gray}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.input}
        />

        <Pressable onPress={searchUser} style={styles.searchBtn}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.searchText}>Rechercher</Text>
          )}
        </Pressable>
      </View>

      {/* USER CARD */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.email}>{user.email}</Text>

          <InfoRow label="TAN" value={user.tan_balance} />
          <InfoRow label="ACSET" value={user.acset_balance} />
          <InfoRow label="STATUS" value={user.status} highlight />

          {/* ACTIONS */}
          <View style={styles.actions}>
            <ActionBtn
              label="+10 ACSET"
              disabled={working}
              onPress={() => refill(10, 0)}
            />
            <ActionBtn
              label="+1000 TAN"
              disabled={working}
              onPress={() => refill(0, 1000)}
            />
            <ActionBtn
              label="-1000 TAN"
              danger
              disabled={working}
              onPress={() => refill(0, -1000)}
            />
          </View>

          <View style={styles.actions}>
            <StatusBtn
              label="ACTIVER"
              color={COLORS.green}
              disabled={working}
              onPress={() => setStatus("ACTIVE")}
            />
            <StatusBtn
              label="SUSPENDRE"
              color={COLORS.orange}
              disabled={working}
              onPress={() => setStatus("SUSPENDED")}
            />
            <StatusBtn
              label="DÉSACTIVER"
              color={COLORS.red}
              disabled={working}
              onPress={() => setStatus("DISABLED")}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------- UI HELPERS ---------- */

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: any;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && { color: COLORS.gold }]}>
        {value}
      </Text>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        danger && { borderColor: COLORS.red },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.btnText, danger && { color: COLORS.red }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusBtn({
  label,
  onPress,
  color,
  disabled,
}: {
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.statusBtn,
        { borderColor: color },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={{ color, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 18,
    borderRadius: 14,
    justifyContent: "center",
  },
  searchText: {
    color: "#FFF",
    fontWeight: "800",
  },
  card: {
    marginTop: 24,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  email: {
    color: COLORS.gold,
    fontWeight: "900",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    color: COLORS.gray,
  },
  value: {
    color: COLORS.text,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  btnText: {
    color: COLORS.gold,
    fontWeight: "800",
  },
  statusBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
