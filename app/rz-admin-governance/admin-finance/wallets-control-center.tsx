import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

// ─── Palette ───────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const BG       = "#F2F2F7";
const CARD     = "#FFFFFF";
const SOFT     = "#E5E5EA";
const TEXT     = "#111111";
const MUTED    = "#6E6E73";
const GREEN    = "#34C759";
const RED      = "#FF3B30";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

type WalletRow = {
  user_id: string;
  tan_balance: number;
  updated_at: string | null;
  profiles?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    author_name: string | null;
    phone: string | null;
  } | null;
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

// ─── Avatar ────────────────────────────────────────────────
function Avatar({ uri, size, name }: { uri: string | null; size: number; name?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = (name || "?")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const Fallback = () => (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: GOLD_DIM,
      borderWidth: 1.5, borderColor: "rgba(212,175,55,0.3)",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: GOLD, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );

  if (!uri || imgFailed) return <Fallback />;

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SOFT }}
      onError={() => setImgFailed(true)}
    />
  );
}

// ─── Badge rôle ────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  const r = (role || "user").toLowerCase();
  const map: Record<string, { color: string; bg: string; label: string }> = {
    supreme: { color: GOLD,      bg: GOLD_DIM,                    label: "SUPREME" },
    agent:   { color: "#007AFF", bg: "rgba(0,122,255,0.10)",      label: "AGENT"   },
    admin:   { color: RED,       bg: "rgba(255,59,48,0.10)",      label: "ADMIN"   },
    cadna:   { color: "#AF52DE", bg: "rgba(175,82,222,0.10)",     label: "CADNA"   },
    cada:    { color: "#FF9500", bg: "rgba(255,149,0,0.10)",      label: "CADA"    },
  };
  const s = map[r] || { color: MUTED, bg: "rgba(110,110,115,0.10)", label: r.toUpperCase() };
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ color: s.color, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>{s.label}</Text>
    </View>
  );
}

// ─── Toast iOS ─────────────────────────────────────────────
function IOSToast({
  toast, anim,
}: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color =
    toast.type === "success" ? GREEN :
    toast.type === "error"   ? RED   : "#007AFF";
  const icon: any =
    toast.type === "success" ? "checkmark-circle" :
    toast.type === "error"   ? "close-circle"     : "information-circle";

  return (
    <Animated.View style={[
      styles.iosToast,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      },
    ]}>
      <View style={[styles.iosToastIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.iosToastTitle}>{toast.title}</Text>
        <Text style={styles.iosToastSub}>{toast.sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Composant principal ───────────────────────────────────
export default function WalletControlCenter() {
  const router = useRouter();

  const [loading, setLoading]       = useState(true);
  const [rows, setRows]             = useState<WalletRow[]>([]);
  const [meEmail, setMeEmail]       = useState("");
  const [q, setQ]                   = useState("");

  const [selected, setSelected]     = useState<WalletRow | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [mode, setMode]             = useState<"ADD" | "SUB" | null>(null);
  const [amountText, setAmountText] = useState("");
  const [working, setWorking]       = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success" | "error" | "info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  };

  // ── fetchList ──────────────────────────────────────────
  const fetchList = async () => {
    try {
      const [{ data: wallets, error: wErr }, { data: profiles, error: pErr }] = await Promise.all([
        supabase.from("wallets").select("user_id,tan_balance,updated_at").order("updated_at", { ascending: false }),
        supabase.from("profiles").select("id,email,full_name,avatar_url,role,author_name,phone"),
      ]);
      if (wErr || pErr) { showToast("Erreur", "Lecture wallets impossible", "error"); return; }
      const pMap = new Map(((profiles as any[]) || []).map((p) => [p.id, p]));
      const merged = ((wallets as any[]) || []).map((w) => {
        const p = pMap.get(w.user_id) || null;
        return {
          ...w,
          tan_balance: Number(w.tan_balance || 0),
          profiles: p ? { id: p.id, email: p.email, full_name: p.full_name, avatar_url: p.avatar_url, role: p.role, author_name: p.author_name, phone: p.phone } : null,
        };
      });
      setRows(merged as WalletRow[]);
    } catch {
      showToast("Erreur", "Lecture wallets impossible", "error");
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { router.replace("/auth/login"); return; }
      setMeEmail(user.email || "");
      if ((user.email || "").toLowerCase() !== SUPREME_EMAIL) { router.replace("/banq/suspentz"); return; }
      await fetchList();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("wallets-realtime-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets" }, fetchList)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const supremeWallet = useMemo(
    () => rows.find((r) => (r.profiles?.email || "").toLowerCase() === SUPREME_EMAIL),
    [rows]
  );

  const openRow = (row: WalletRow) => {
    Keyboard.dismiss();
    setSelected(row);
    setMode(null);
    setAmountText("");
    setActionOpen(true);
  };

  const applyTanDelta = async () => {
    if (!selected || working) return;
    const amount = parseInt(amountText.replace(/\s/g, ""), 10);
    if (!amount || amount <= 0) {
      showToast("Montant invalide", "Veuillez saisir un montant supérieur à 0.", "error");
      return;
    }
    setWorking(true);
    const isAdd = mode === "ADD";
    const delta  = isAdd ? amount : -amount;

    const { error } = await supabase.rpc("rz_supreme_tan_move", {
      p_target: selected.user_id,
      p_amount: amount,
      p_op: isAdd ? "CREDIT_TARGET" : "DEBIT_TARGET",
      p_note: "ADMIN_CONSOLE",
    });
    setWorking(false);

    if (error) {
      showToast("Transaction refusée", error.message || "Vérifiez le solde ou le serveur.", "error");
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.user_id === selected.user_id)
          return { ...r, tan_balance: r.tan_balance + delta };
        if ((r.profiles?.email || "").toLowerCase() === SUPREME_EMAIL)
          return { ...r, tan_balance: r.tan_balance + (isAdd ? -amount : amount) };
        return r;
      })
    );

    const name = selected.profiles?.full_name || "Profil";
    showToast(
      isAdd ? `+${fmt(amount)} TAN crédités` : `-${fmt(amount)} TAN débités`,
      isAdd ? `Wallet de ${name} crédité avec succès.` : `Wallet de ${name} débité avec succès.`,
      "success"
    );
    setActionOpen(false);
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const email = (r.profiles?.email || "").toLowerCase();
      const name  = (r.profiles?.full_name || "").toLowerCase();
      const role  = (r.profiles?.role || "").toLowerCase();
      return email.includes(t) || name.includes(t) || role.includes(t) || r.user_id.includes(t);
    });
  }, [rows, q]);

  const parsedAmount  = parseInt(amountText.replace(/\s/g, ""), 10) || 0;
  const previewBal    = selected
    ? selected.tan_balance + (mode === "ADD" ? parsedAmount : mode === "SUB" ? -parsedAmount : 0)
    : 0;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: BG }]}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement…</Text>
      </View>
    );
  }

  return (
    <AdminGuard>
      <View style={styles.screen}>

        {/* ── Toast iOS haut de page ─────────────────── */}
        <IOSToast toast={toast} anim={toastAnim} />

        {/* ── Header ────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>Wallet Control Center</Text>
            <Text style={styles.hSub}>{rows.length} wallets · Console économique TAN</Text>
          </View>
        </View>

        {/* ── Supreme card ──────────────────────────── */}
        {supremeWallet && (
          <View style={styles.supremeCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ position: "relative" }}>
                <Avatar uri={supremeWallet.profiles?.avatar_url || null} size={52} name={supremeWallet.profiles?.full_name} />
                <View style={styles.crownBadge}>
                  <Text style={{ fontSize: 9 }}>👑</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.supremeName}>{supremeWallet.profiles?.full_name || "SUPREME"}</Text>
                <Text style={styles.supremeEmail}>{supremeWallet.profiles?.email || SUPREME_EMAIL}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Text style={styles.supremeBalLbl}>Solde TAN</Text>
                <Text style={styles.supremeBal}>{fmt(supremeWallet.tan_balance)}</Text>
              </View>
              <View style={styles.tanTag}>
                <Text style={styles.tanTagTxt}>TAN</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Recherche ─────────────────────────────── */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={MUTED} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Rechercher nom, email, rôle…"
            placeholderTextColor={MUTED}
            style={styles.searchInput}
            autoCapitalize="none" autoCorrect={false}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ("")}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Liste ─────────────────────────────────── */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 6 }}
        >
          {filtered.map((r) => {
            const isMe = (r.profiles?.email || "").toLowerCase() === SUPREME_EMAIL;
            return (
              <TouchableOpacity
                key={r.user_id}
                style={[styles.card, isMe && styles.cardSupreme]}
                onPress={() => openRow(r)}
                activeOpacity={0.72}
              >
                {/* Profil réel complet */}
                <View style={styles.cardTop}>
                  <Avatar uri={r.profiles?.avatar_url || null} size={50} name={r.profiles?.full_name} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {r.profiles?.full_name || "Profil inconnu"}
                      </Text>
                      <RoleBadge role={r.profiles?.role} />
                    </View>
                    {r.profiles?.author_name ? (
                      <Text style={styles.cardAuthor}>@{r.profiles.author_name}</Text>
                    ) : null}
                    <Text style={styles.cardEmail} numberOfLines={1}>{r.profiles?.email || "—"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={SOFT} />
                </View>

                {/* Solde + téléphone */}
                <View style={styles.cardFooter}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLbl}>TAN</Text>
                    <Text style={[styles.cardStatVal, isMe && { color: GOLD }]}>{fmt(r.tan_balance)}</Text>
                  </View>
                  {r.profiles?.phone && (
                    <View style={[styles.cardStat, { borderLeftWidth: 1, borderLeftColor: BG }]}>
                      <Text style={styles.cardStatLbl}>Tél</Text>
                      <Text style={styles.cardStatVal}>{r.profiles.phone}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
              <Ionicons name="search-outline" size={40} color={SOFT} />
              <Text style={{ color: MUTED, fontWeight: "600" }}>Aucun résultat trouvé</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Modal action ──────────────────────────── */}
        <Modal visible={actionOpen} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetOuter}
          >
          <Pressable style={styles.backdrop} onPress={() => { setActionOpen(false); Keyboard.dismiss(); }} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              {/* ── Profil réel complet ───────────────── */}
              {selected && (
                <View style={styles.sheetProfil}>
                  <Avatar uri={selected.profiles?.avatar_url || null} size={62} name={selected.profiles?.full_name} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.sheetName}>{selected.profiles?.full_name || "—"}</Text>
                      <RoleBadge role={selected.profiles?.role} />
                    </View>
                    {selected.profiles?.author_name && (
                      <Text style={styles.sheetAuthor}>@{selected.profiles.author_name}</Text>
                    )}
                    <Text style={styles.sheetEmail}>{selected.profiles?.email || "—"}</Text>
                    {selected.profiles?.phone && (
                      <Text style={styles.sheetEmail}>{selected.profiles.phone}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* ── Solde + preview ───────────────────── */}
              <View style={styles.balanceRow}>
                <View>
                  <Text style={styles.balLbl}>Solde actuel</Text>
                  <Text style={styles.balVal}>{fmt(selected?.tan_balance || 0)} TAN</Text>
                </View>
                {mode && parsedAmount > 0 && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.balLbl}>Après opération</Text>
                    <Text style={[styles.balVal, { color: mode === "ADD" ? GREEN : RED }]}>
                      {fmt(previewBal)} TAN
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Créditer / Débiter ────────────────── */}
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === "ADD" && { backgroundColor: GREEN, borderColor: GREEN }]}
                  onPress={() => setMode("ADD")}
                >
                  <Ionicons name="add-circle" size={18} color={mode === "ADD" ? "#fff" : MUTED} />
                  <Text style={[styles.modeTxt, mode === "ADD" && { color: "#fff" }]}>Créditer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === "SUB" && { backgroundColor: RED, borderColor: RED }]}
                  onPress={() => setMode("SUB")}
                >
                  <Ionicons name="remove-circle" size={18} color={mode === "SUB" ? "#fff" : MUTED} />
                  <Text style={[styles.modeTxt, mode === "SUB" && { color: "#fff" }]}>Débiter</Text>
                </TouchableOpacity>
              </View>

              {/* ── Saisie libre ──────────────────────── */}
              {mode && (
                <>
                  <View style={[styles.amountWrap, { borderColor: mode === "ADD" ? GREEN : RED }]}>
                    <Text style={[styles.amountCur, { color: mode === "ADD" ? GREEN : RED }]}>TAN</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amountText}
                      onChangeText={(v) => setAmountText(v.replace(/[^0-9]/g, ""))}
                      placeholder="0"
                      placeholderTextColor={SOFT}
                      keyboardType="number-pad"
                      autoFocus
                      maxLength={12}
                    />
                  </View>
                  {parsedAmount > 0 && (
                    <Text style={styles.amountFmt}>{fmt(parsedAmount)} TAN</Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      { backgroundColor: mode === "ADD" ? GREEN : RED },
                      (!parsedAmount || working) && { opacity: 0.42 },
                    ]}
                    onPress={applyTanDelta}
                    disabled={!parsedAmount || working}
                  >
                    {working ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={mode === "ADD" ? "arrow-up-circle" : "arrow-down-circle"} size={20} color="#fff" />
                        <Text style={styles.confirmTxt}>
                          {mode === "ADD" ? `Créditer +${fmt(parsedAmount)} TAN` : `Débiter -${fmt(parsedAmount)} TAN`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={() => setActionOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </AdminGuard>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, paddingTop: 58, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: CARD, borderWidth: 1, borderColor: SOFT,
    alignItems: "center", justifyContent: "center",
  },
  hTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:   { color: MUTED, fontSize: 12, marginTop: 2 },

  // Supreme
  supremeCard: {
    backgroundColor: "#000", borderRadius: 22,
    padding: 18, marginBottom: 14, gap: 14,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.35)",
    shadowColor: "#000", shadowOpacity: 0.22,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  crownBadge: {
    position: "absolute", bottom: -2, right: -4,
    width: 20, height: 20, borderRadius: 99,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5, borderColor: "rgba(212,175,55,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  supremeName:   { color: "#FFF", fontWeight: "900", fontSize: 15 },
  supremeEmail:  { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 3 },
  supremeBalLbl: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" },
  supremeBal:    { color: GOLD, fontSize: 26, fontWeight: "900", marginTop: 2 },
  tanTag: {
    backgroundColor: GOLD_DIM, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.3)",
  },
  tanTagTxt: { color: GOLD, fontWeight: "900", fontSize: 13, letterSpacing: 1 },

  // Search
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: SOFT,
    gap: 8, marginBottom: 2,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: SOFT, marginTop: 10,
  },
  cardSupreme: { borderColor: "rgba(212,175,55,0.4)", borderWidth: 1.5 },
  cardTop: {
    flexDirection: "row", alignItems: "center",
    gap: 12, padding: 14,
  },
  cardName:   { color: TEXT, fontWeight: "800", fontSize: 15, flexShrink: 1 },
  cardAuthor: { color: MUTED, fontSize: 11, marginTop: 1 },
  cardEmail:  { color: MUTED, fontSize: 12, marginTop: 2 },
  cardFooter: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BG },
  cardStat:   { flex: 1, backgroundColor: BG, paddingVertical: 10, paddingHorizontal: 14 },
  cardStatLbl: { color: MUTED, fontSize: 11, fontWeight: "700" },
  cardStatVal: { color: TEXT, fontSize: 16, fontWeight: "900", marginTop: 2 },

  // Modal
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetOuter: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 8 : 8,
    paddingTop: 10,
    borderTopWidth: 1, borderColor: SOFT,
    gap: 14,
  },
  sheetHandle: {
    width: 46, height: 4, borderRadius: 99,
    backgroundColor: "#D1D1D6",
    alignSelf: "center", marginBottom: 4,
  },

  // Sheet profil
  sheetProfil: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: BG, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: SOFT,
  },
  sheetName:   { color: TEXT, fontWeight: "800", fontSize: 16 },
  sheetAuthor: { color: MUTED, fontSize: 12 },
  sheetEmail:  { color: MUTED, fontSize: 12 },

  // Balance
  balanceRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: BG, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: SOFT,
  },
  balLbl: { color: MUTED, fontSize: 11, fontWeight: "700" },
  balVal: { color: TEXT, fontSize: 18, fontWeight: "900", marginTop: 2 },

  // Mode
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: BG, borderRadius: 14,
    paddingVertical: 13, borderWidth: 1, borderColor: SOFT,
  },
  modeTxt: { color: MUTED, fontWeight: "800", fontSize: 14 },

  // Amount input
  amountWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: BG, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 4,
    borderWidth: 2, gap: 10,
  },
  amountCur:   { fontWeight: "900", fontSize: 15 },
  amountInput: { flex: 1, color: TEXT, fontSize: 34, fontWeight: "900", paddingVertical: 12 },
  amountFmt:   { color: MUTED, fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: -8 },

  // Confirm
  confirmBtn: {
    borderRadius: 16, paddingVertical: 15,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 10,
  },
  confirmTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },

  // Cancel
  cancelBtn: { alignItems: "center", paddingVertical: 4 },
  cancelTxt: { color: MUTED, fontWeight: "700", fontSize: 14 },

  // Toast iOS
  iosToast: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 28,
    left: 14, right: 14, zIndex: 9999,
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOpacity: 0.16,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
    elevation: 14,
    borderWidth: 1, borderColor: SOFT,
  },
  iosToastIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});