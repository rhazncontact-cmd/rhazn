import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

const GOLD = "#D4AF37";
const BG = "#FFFFFF";
const CARD = "#F5F5F7";
const SOFT = "#E5E5EA";
const TEXT = "#111111";
const MUTED = "#6E6E73";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
const AMOUNTS = [0, 500, 1000, 10000, 25000, 100000, 250000, 1000000, 25000000, 250000000] as const;

type WalletRow = {
  user_id: string;
  tan_balance: number;
  updated_at: string | null;
  profiles?: {
    id: string;
    email: string | null;
    full_name: string | null;
    profile_photo_url: string | null;
    role: string | null;
  } | null;
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

function Avatar({ uri, size }: { uri: string | null; size: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: SOFT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="person" size={Math.floor(size * 0.55)} color={MUTED} />
    </View>
  );
}

export default function WalletControlCenter() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [meEmail, setMeEmail] = useState("");

  const [q, setQ] = useState("");
  const searchTimer = useRef<any>(null);

  const [selected, setSelected] = useState<WalletRow | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [mode, setMode] = useState<"ADD" | "SUB" | null>(null);
  const [amount, setAmount] = useState<number>(AMOUNTS[0]);
  const [working, setWorking] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(
        () => setToast(null)
      );
    }, 2200);
  };

  const isSupreme = useMemo(
    () => (meEmail || "").toLowerCase() === SUPREME_EMAIL,
    [meEmail]
  );

  const fetchList = async () => {
    try {
      const [{ data: wallets, error: wErr }, { data: profiles, error: pErr }] =
        await Promise.all([
          supabase
            .from("wallets")
            .select("user_id,tan_balance,updated_at")
            .order("updated_at", { ascending: false }),

          supabase
            .from("profiles")
            .select("id,email,full_name,profile_photo_url,role"),
        ]);

      if (wErr || pErr) {
        console.error("Wallet fetch error:", wErr || pErr);
        showToast("Lecture wallets impossible");
        return;
      }

      const profileMap = new Map(
        ((profiles as any[]) || []).map((p) => [p.id, p])
      );

      const merged = ((wallets as any[]) || []).map((w) => {
        const p = profileMap.get(w.user_id) || null;
        return {
          ...w,
          tan_balance: Number(w.tan_balance || 0),
          profiles: p
            ? {
                id: p.id,
                email: p.email,
                full_name: p.full_name,
                profile_photo_url: p.profile_photo_url,
                role: p.role,
              }
            : null,
        };
      });

      setRows(merged as WalletRow[]);
    } catch (e) {
      console.error("Wallet fetch crash:", e);
      showToast("Lecture wallets impossible");
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setMeEmail(user.email || "");

      if ((user.email || "").toLowerCase() !== SUPREME_EMAIL) {
        router.replace("/rz-roles");
        return;
      }

      await fetchList();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("wallets-realtime-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, async () => {
        await fetchList();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const supremeWallet = useMemo(() => {
    return rows.find(
      (r) => (r.profiles?.email || "").toLowerCase() === SUPREME_EMAIL
    );
  }, [rows]);

  const openRow = (row: WalletRow) => {
    Keyboard.dismiss();
    setSelected(row);
    setMode(null);
    setAmount(AMOUNTS[0]);
    setActionOpen(true);
  };

  const applyTanDelta = async () => {
  if (!selected || working) return;
  setWorking(true);

  const isAdd = mode === "ADD";
  const delta = isAdd ? amount : -amount;

  const { error } = await supabase.rpc("rz_supreme_tan_move", {
    p_target: selected.user_id,
    p_amount: amount,
    p_op: isAdd ? "CREDIT_TARGET" : "DEBIT_TARGET",
    p_note: "ADMIN_CONSOLE",
  });

  setWorking(false);

  if (error) {
    showToast("Transaction refusée");
    return;
  }

  // ✅ UPDATE LOCAL STATE IMMÉDIATEMENT
  setRows((prev) =>
    prev.map((r) =>
      r.user_id === selected.user_id
        ? { ...r, tan_balance: r.tan_balance + delta }
        : r
    )
  );

  // ✅ aussi mettre à jour Supreme instantanément
  setRows((prev) =>
    prev.map((r) =>
      (r.profiles?.email || "").toLowerCase() === SUPREME_EMAIL
        ? {
            ...r,
            tan_balance: r.tan_balance + (isAdd ? -amount : amount),
          }
        : r
    )
  );

  showToast(
    isAdd
      ? `+${fmt(amount)} TAN crédités`
      : `-${fmt(amount)} TAN débités`
  );

  setActionOpen(false);
};

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;

    return rows.filter((r) => {
      const email = (r.profiles?.email || "").toLowerCase();
      const name = (r.profiles?.full_name || "").toLowerCase();
      const role = (r.profiles?.role || "").toLowerCase();
      return email.includes(t) || name.includes(t) || role.includes(t) || r.user_id.includes(t);
    });
  }, [rows, q]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} />
        <Text style={{ color: MUTED, marginTop: 10 }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.screen}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>Wallet Control Center</Text>
            <Text style={styles.hSub}>Console économique • TAN only</Text>
          </View>
        </View>

        {/* SUPREME FLOAT */}
        {supremeWallet && (
          <View style={styles.supremeFloat}>
            <View style={styles.supremeCard}>
              <Avatar uri={supremeWallet.profiles?.profile_photo_url || null} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.supremeName}>
                  {supremeWallet.profiles?.full_name || "SUPREME"}
                </Text>
                <Text style={styles.supremeEmail}>
                  {supremeWallet.profiles?.email || SUPREME_EMAIL}
                </Text>
              </View>
              <View style={styles.supremeBalanceBox}>
                <Text style={styles.supremeBalanceLabel}>TAN</Text>
                <Text style={styles.supremeBalance}>
                  {fmt(supremeWallet.tan_balance)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={MUTED} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Chercher email, nom, rôle…"
              placeholderTextColor={MUTED}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* LIST */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {filtered.map((r) => (
            <TouchableOpacity
              key={r.user_id}
              style={styles.card}
              onPress={() => openRow(r)}
            >
              <View style={styles.cardTop}>
                <Avatar uri={r.profiles?.profile_photo_url || null} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.profiles?.full_name || "Profil"}</Text>
                  <Text style={styles.email}>{r.profiles?.email || "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>TAN</Text>
                  <Text style={styles.metricValue}>{fmt(r.tan_balance)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Rôle</Text>
                  <Text style={styles.metricValue}>{r.profiles?.role || "user"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filtered.length === 0 && (
            <View style={{ paddingTop: 40, alignItems: "center" }}>
              <Text style={{ color: MUTED }}>Aucun résultat.</Text>
            </View>
          )}
        </ScrollView>

        {/* ACTION MODAL */}
        <Modal visible={actionOpen} transparent animationType="fade">
          <Pressable style={styles.backdrop} onPress={() => setActionOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{selected?.profiles?.full_name || "Profil"}</Text>
            <Text style={styles.sheetSub}>{selected?.profiles?.email || "—"}</Text>

            <View style={styles.quickStats}>
              <View style={styles.qstat}>
                <Text style={styles.qLabel}>TAN</Text>
                <Text style={styles.qValue}>{fmt(selected?.tan_balance || 0)}</Text>
              </View>
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === "ADD" && styles.modeBtnActive]}
                onPress={() => setMode("ADD")}
              >
                <Text style={[styles.modeText, mode === "ADD" && { color: "#000" }]}>+ TAN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === "SUB" && styles.modeBtnActive]}
                onPress={() => setMode("SUB")}
              >
                <Text style={[styles.modeText, mode === "SUB" && { color: "#000" }]}>- TAN</Text>
              </TouchableOpacity>
            </View>

            {(mode === "ADD" || mode === "SUB") && (
              <>
                <Text style={styles.sectionTitle}>Montant</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipsRow}>
                    {AMOUNTS.map((a) => (
                      <TouchableOpacity
                        key={a}
                        onPress={() => setAmount(a)}
                        style={[styles.chip, amount === a && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, amount === a && styles.chipTextActive]}>
                          {fmt(a)} TAN
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 14 }]}
                  onPress={applyTanDelta}
                  disabled={working}
                >
                  {working ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.primaryText}>
                      {mode === "ADD"
                        ? `Appliquer +${fmt(amount)} TAN`
                        : `Appliquer -${fmt(amount)} TAN`}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

        {toast && (
          <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        )}
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingTop: 54, paddingHorizontal: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SOFT,
  },

  hTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub: { color: MUTED, marginTop: 2, fontSize: 12 },

  supremeFloat: {
    position: "absolute",
    top: 96,
    left: 15,
    right: 15,
    zIndex: 80,
  },

  supremeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#000",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  supremeName: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
  },

  supremeEmail: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 3,
  },

  supremeBalanceBox: { alignItems: "flex-end" },

  supremeBalanceLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "800",
  },

  supremeBalance: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  searchWrap: { position: "relative", zIndex: 20, marginTop: 110, marginBottom: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: SOFT,
    gap: 8,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },

  card: {
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: SOFT,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { color: TEXT, fontWeight: "800", fontSize: 15 },
  email: { color: MUTED, marginTop: 3, fontSize: 12 },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },

  metric: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: "47%",
    borderWidth: 1,
    borderColor: SOFT,
  },
  metricLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  metricValue: { color: TEXT, fontSize: 15, fontWeight: "800", marginTop: 4 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 45,
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: SOFT,
  },
  sheetHandle: {
    width: 46,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#D1D1D6",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: { color: TEXT, fontWeight: "800", fontSize: 16 },
  sheetSub: { color: MUTED, marginTop: 3, fontSize: 12 },

  quickStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  qstat: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: SOFT,
    minWidth: "47%",
  },
  qLabel: { color: MUTED, fontSize: 11, fontWeight: "700" },
  qValue: { color: TEXT, fontSize: 14, fontWeight: "800", marginTop: 4 },

  modeRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  modeBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: SOFT,
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: GOLD, borderColor: "rgba(0,0,0,0.08)" },
  modeText: { color: TEXT, fontWeight: "800" },

  sectionTitle: { color: TEXT, fontWeight: "800", marginTop: 16, marginBottom: 10 },

  chipsRow: { flexDirection: "row", gap: 10, paddingRight: 10 },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: SOFT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: GOLD, borderColor: "rgba(0,0,0,0.10)" },
  chipText: { color: TEXT, fontWeight: "800", fontSize: 12 },
  chipTextActive: { color: "#000" },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#000", fontWeight: "800" },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  toastText: { color: "#fff", textAlign: "center", fontWeight: "800" },
});