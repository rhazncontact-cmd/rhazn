import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 RHAZN — Apple-like PREMIUM (Light) */
const COLORS = {
  bg: "#FFFFFF",
  card: "#F9F9FB",
  border: "#E6E6EB",
  text: "#0A0A0A",
  gray: "#6B7280",
  gold: "#D4AF37",
  blue: "#007AFF",
  green: "#16A34A",
  orange: "#F59E0B",
  red: "#DC2626",
};

const TAN_PER_ACSET = 250;

/* ================= TYPES ================= */
type WalletUser = {
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  tan_balance: number;
  acset_balance: number;
  status: string;
};

type ActiveAction =
  | "TAN_PLUS"
  | "TAN_MINUS"
  | "ACSET_PLUS"
  | "ACSET_MINUS"
  | "STATUS"
  | null;

export default function AdminWalletScreen() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<WalletUser | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  /* inputs */
  const [tanPlus, setTanPlus] = useState("");
  const [tanMinus, setTanMinus] = useState("");
  const [acsetPlus, setAcsetPlus] = useState("");
  const [acsetMinus, setAcsetMinus] = useState("");

  /* suggestions */
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const debounceRef = useRef<any>(null);

  /* ================= EMAIL SUGGESTIONS ================= */
  useEffect(() => {
    const q = email.trim();
    if (!q) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .ilike("email", `%${q}%`)
        .limit(6);

      setSuggestions((data ?? []).map((r: any) => r.email));
      setShowSuggest(true);
    }, 200);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [email]);

  /* ================= SEARCH USER ================= */
  const searchUser = async (forcedEmail?: string) => {
    const target = (forcedEmail ?? email).trim();
    if (!target) return Alert.alert("Email requis");

    setLoading(true);
    setShowSuggest(false);

    const { data, error } = await supabase.rpc("admin_get_wallet_by_email", {
      p_email: target,
    });

    setLoading(false);

    if (error || !data) {
      Alert.alert("Utilisateur introuvable");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;

    setUser(row as WalletUser);
  };

  /* ================= APPLY CHANGE (CORE FIX) ================= */
  const applyChange = async (
    deltaTan: number,
    deltaAcset: number,
    action: ActiveAction
  ) => {
    if (!user || activeAction) return;

    setActiveAction(action);

    const { error } = await supabase.rpc("admin_refill_wallet", {
      p_email: user.email,
      p_tan: deltaTan,
      p_acset: deltaAcset,
    });

    if (error) {
      setActiveAction(null);
      Alert.alert("Erreur", error.message);
      return;
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            tan_balance: prev.tan_balance + deltaTan,
            acset_balance: prev.acset_balance + deltaAcset,
          }
        : prev
    );

    await searchUser(user.email);
    setActiveAction(null);
  };

  /* ================= STATUS ================= */
  const setStatus = async (status: string) => {
    if (!user || activeAction) return;

    setActiveAction("STATUS");

    const { error } = await supabase.rpc("admin_set_wallet_status", {
      p_email: user.email,
      p_status: status,
    });

    if (error) {
      setActiveAction(null);
      Alert.alert("Erreur", error.message);
      return;
    }

    await searchUser(user.email);
    setActiveAction(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Wallet</Text>

      {/* SEARCH */}
      <View style={{ position: "relative", zIndex: 10 }}>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Email utilisateur"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable onPress={() => searchUser()} style={styles.searchBtn}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.searchText}>Rechercher</Text>
            )}
          </Pressable>
        </View>

        {showSuggest && (
          <View style={styles.suggestBox}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setEmail(s);
                  searchUser(s);
                }}
                style={styles.suggestItem}
              >
                <Text style={styles.suggestText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {user && (
        <View style={styles.card}>
          {/* IDENTITÉ */}
          <View style={styles.identityRow}>
            <Image
              source={
                user.avatar_url
                  ? { uri: user.avatar_url }
                  : require("../assets/images/avatar1.png")
              }
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {user.first_name} {user.last_name}
              </Text>
              <Text style={styles.sub}>
                {user.city} • {user.department}
              </Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>

          <InfoRow label="TAN" value={user.tan_balance.toLocaleString()} />
          <InfoRow label="ACSET" value={user.acset_balance.toLocaleString()} />
          <InfoRow label="STATUT" value={user.status} highlight />

          {/* ACTION CARDS */}
          <AmountCard
            title="TAN +"
            color={COLORS.green}
            value={tanPlus}
            setValue={setTanPlus}
            loading={activeAction === "TAN_PLUS"}
            onApply={() =>
              applyChange(
                Number(tanPlus),
                Math.trunc(Number(tanPlus) / TAN_PER_ACSET),
                "TAN_PLUS"
              )
            }
          />

          <AmountCard
            title="TAN −"
            color={COLORS.red}
            value={tanMinus}
            setValue={setTanMinus}
            loading={activeAction === "TAN_MINUS"}
            onApply={() =>
              applyChange(
                -Number(tanMinus),
                -Math.trunc(Number(tanMinus) / TAN_PER_ACSET),
                "TAN_MINUS"
              )
            }
          />

          <AmountCard
            title="ACSET +"
            color={COLORS.green}
            value={acsetPlus}
            setValue={setAcsetPlus}
            loading={activeAction === "ACSET_PLUS"}
            onApply={() =>
              applyChange(
                Number(acsetPlus) * TAN_PER_ACSET,
                Number(acsetPlus),
                "ACSET_PLUS"
              )
            }
          />

          <AmountCard
            title="ACSET −"
            color={COLORS.red}
            value={acsetMinus}
            setValue={setAcsetMinus}
            loading={activeAction === "ACSET_MINUS"}
            onApply={() =>
              applyChange(
                -Number(acsetMinus) * TAN_PER_ACSET,
                -Number(acsetMinus),
                "ACSET_MINUS"
              )
            }
          />

          {/* STATUS */}
          <View style={styles.statusRow}>
            <StatusBtn label="ACTIVER" color={COLORS.green} onPress={() => setStatus("ACTIVE")} />
            <StatusBtn label="SUSPENDRE" color={COLORS.orange} onPress={() => setStatus("SUSPENDED")} />
            <StatusBtn label="DÉSACTIVER" color={COLORS.red} onPress={() => setStatus("DISABLED")} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= UI COMPONENTS ================= */

function InfoRow({ label, value, highlight = false }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlight && { color: COLORS.gold }]}>
        {value}
      </Text>
    </View>
  );
}

function AmountCard({ title, value, setValue, onApply, color, loading }: any) {
  return (
    <View style={styles.amountCard}>
      <Text style={[styles.amountTitle, { color }]}>{title}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          placeholder="Montant"
          keyboardType="numeric"
          value={value}
          onChangeText={setValue}
          style={styles.amountInput}
        />
        <Pressable
          onPress={onApply}
          disabled={loading}
          style={[
            styles.amountBtn,
            { borderColor: color },
            loading && { opacity: 0.6 },
          ]}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color, fontWeight: "800" }}>Appliquer</Text>
          )}
        </Pressable>
      </View>
      <Text style={styles.amountHint}>
        Sync auto (1 ACSET = {TAN_PER_ACSET} TAN)
      </Text>
    </View>
  );
}

function StatusBtn({ label, color, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.statusBtn, { borderColor: color }]}>
      <Text style={{ color, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 20 },

  searchRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  searchBtn: { backgroundColor: COLORS.blue, paddingHorizontal: 18, borderRadius: 14, justifyContent: "center" },
  searchText: { color: "#FFF", fontWeight: "800" },

  suggestBox: { marginTop: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16 },
  suggestItem: { padding: 12 },
  suggestText: { fontWeight: "800" },

  card: { marginTop: 18, backgroundColor: COLORS.card, borderRadius: 20, padding: 18 },

  identityRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32 },

  name: { fontSize: 18, fontWeight: "900" },
  sub: { color: COLORS.gray },
  email: { color: COLORS.gold, fontWeight: "800" },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: COLORS.gray, fontWeight: "700" },
  value: { fontWeight: "900" },

  amountCard: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: "#FFF", borderWidth: 1, borderColor: COLORS.border },
  amountTitle: { fontWeight: "900", marginBottom: 8 },
  amountInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12 },
  amountBtn: { paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, justifyContent: "center" },
  amountHint: { marginTop: 6, fontSize: 11, color: COLORS.gray },

  statusRow: { flexDirection: "row", gap: 10, marginTop: 20, flexWrap: "wrap" },
  statusBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});
