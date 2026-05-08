// app/agent-history.tsx
// ✅ RHAZN — Agent History · Apple-like Premium

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AgentGuard from "../components/AgentGuard";
import { supabase } from "../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.28)";
const BG       = "#F2F2F7";
const CARD     = "#FFFFFF";
const SOFT     = "#E5E5EA";
const TEXT     = "#111111";
const MUTED    = "#6E6E73";
const GREEN    = "#34C759";
const RED      = "#FF3B30";
const BLUE     = "#007AFF";

// ─── Types ──────────────────────────────────────────────────
type AgentTx = {
  id:           string;
  kind:         "SELL_ACSET" | "RECEIVE_TAN" | "SELL_TAN" | "WITHDRAW" | string;
  tan_amount:   number | null;
  acset_amount: number | null;
  created_at:   string;
  // Champs enrichis (optionnels selon la table)
  user_uid?:    string | null;
  ed_id?:       string | null;
  status?:      string | null;
  note?:        string | null;
  reference?:   string | null;
};

// ─── Config par type ────────────────────────────────────────
function txConfig(kind: string) {
  switch (kind) {
    case "SELL_ACSET":
    case "SELL_TAN":
      return { label: "Vente TAN",       icon: "arrow-up-circle",   color: GREEN, sign: "-" };
    case "RECEIVE_TAN":
      return { label: "Réception TAN",   icon: "arrow-down-circle", color: BLUE,  sign: "+" };
    case "WITHDRAW":
      return { label: "Retrait validé",  icon: "checkmark-circle",  color: GOLD,  sign: "-" };
    default:
      return { label: kind ?? "Opération", icon: "swap-horizontal", color: MUTED, sign: " " };
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

// ─── Modal détail transaction ───────────────────────────────
function DetailModal({ tx, onClose, showToast }: {
  tx: AgentTx | null;
  onClose: () => void;
  showToast: (t: string, s: string) => void;
}) {
  if (!tx) return null;
  const cfg  = txConfig(tx.kind);
  const value = tx.tan_amount ?? tx.acset_amount ?? 0;
  const unit  = tx.tan_amount != null ? "TAN" : "TAN";
  const htg   = tx.tan_amount ? tx.tan_amount * 0.5 : null;
  const ref   = tx.reference ?? tx.id.slice(0, 8).toUpperCase();

  const copy = (val: string, label: string) => {
    Clipboard.setString(val);
    showToast(`${label} copié ✓`, "");
  };

  const Row = ({ label, value: v, copyable, color }: { label: string; value: string; copyable?: boolean; color?: string }) => (
    <TouchableOpacity
      style={ds.row}
      onPress={() => copyable && copy(v, label)}
      activeOpacity={copyable ? 0.7 : 1}
      disabled={!copyable}
    >
      <Text style={ds.rowLabel}>{label}</Text>
      <View style={ds.rowRight}>
        <Text style={[ds.rowVal, color ? { color } : {}]} numberOfLines={1}>{v}</Text>
        {copyable && <Ionicons name="copy-outline" size={13} color={MUTED} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal transparent visible={!!tx} animationType="slide">
      <Pressable style={ds.backdrop} onPress={onClose} />
      <View style={ds.sheet}>
        <View style={ds.handle} />

        {/* Icône + titre */}
        <View style={ds.iconRow}>
          <View style={[ds.icon, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}30` }]}>
            <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
          </View>
          <View>
            <Text style={ds.txType}>{cfg.label}</Text>
            <Text style={[ds.txAmt, { color: cfg.color }]}>
              {cfg.sign}{Number(value).toLocaleString("fr-FR")} {unit}
            </Text>
            {htg != null && (
              <Text style={ds.txHtg}>{Number(htg).toLocaleString("fr-FR")} HTG</Text>
            )}
          </View>
        </View>

        <View style={ds.divider} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Identifiants */}
          <Text style={ds.section}>Identifiants</Text>
          <View style={ds.block}>
            <Row label="TX ID"        value={tx.id}  copyable />
            <Row label="Référence"    value={ref}     copyable />
          </View>

          {/* Montants */}
          <Text style={ds.section}>Montants</Text>
          <View style={ds.block}>
            <Row label="Montant TAN"  value={`${Number(tx.tan_amount ?? 0).toLocaleString("fr-FR")} TAN`}  color={cfg.color} />
            {htg != null && (
              <Row label="Équivalent HTG" value={`${Number(htg).toLocaleString("fr-FR")} HTG`} color={GREEN} />
            )}
            {tx.acset_amount != null && (
              <Row label="Montant ACSET" value={`${Number(tx.acset_amount).toLocaleString("fr-FR")} ACSET`} color={BLUE} />
            )}
          </View>

          {/* Compte */}
          <Text style={ds.section}>Compte</Text>
          <View style={ds.block}>
            {tx.user_uid && <Row label="ID Utilisateur" value={tx.user_uid} copyable />}
            {tx.ed_id     && <Row label="ID Agent (ED)"     value={tx.ed_id.slice(0,8).toUpperCase()  + "…"} copyable />}
            {tx.status    && (
              <Row label="Statut"
                value={tx.status}
                color={tx.status === "APPROVED" || tx.status === "COMPLETED" ? GREEN
                     : tx.status === "PENDING"  ? "#FF9500"
                     : RED}
              />
            )}
          </View>

          {/* Date */}
          <Text style={ds.section}>Horodatage</Text>
          <View style={ds.block}>
            <Row label="Date"  value={new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
            <Row label="Heure" value={new Date(tx.created_at).toLocaleTimeString("fr-FR")} />
          </View>

          {/* Note */}
          {tx.note && (
            <>
              <Text style={ds.section}>Note</Text>
              <View style={ds.block}>
                <Text style={ds.noteVal}>{tx.note}</Text>
              </View>
            </>
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        <TouchableOpacity style={ds.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <Text style={ds.closeTxt}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Styles détail ───────────────────────────────────────────
const ds = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:    {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 10,
    maxHeight: "85%", borderTopWidth: 1, borderColor: "#E5E5EA",
  },
  handle:   { width: 46, height: 4, borderRadius: 99, backgroundColor: "#D1D1D6", alignSelf: "center", marginBottom: 16 },

  iconRow:  { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  icon:     { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  txType:   { color: "#111", fontWeight: "800", fontSize: 16 },
  txAmt:    { fontWeight: "900", fontSize: 22, marginTop: 2 },
  txHtg:    { color: "#6E6E73", fontSize: 12, fontWeight: "600", marginTop: 2 },

  divider:  { height: 1, backgroundColor: "#E5E5EA", marginBottom: 14 },
  section:  { color: "#6E6E73", fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 8, marginTop: 10 },

  block:    { backgroundColor: "#F2F2F7", borderRadius: 16, paddingVertical: 4, marginBottom: 2 },
  row:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  rowLabel: { color: "#6E6E73", fontSize: 13, fontWeight: "700" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "60%" },
  rowVal:   { color: "#111", fontWeight: "800", fontSize: 13, textAlign: "right" },

  noteVal:  { color: "#111", fontSize: 13, fontWeight: "600", lineHeight: 19, padding: 14 },

  closeBtn: { backgroundColor: "#F2F2F7", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  closeTxt: { color: "#6E6E73", fontWeight: "700", fontSize: 14 },
});

// ─── Wrapper ────────────────────────────────────────────────
export default function AgentHistory() {
  return (
    <AgentGuard>
      <Screen />
    </AgentGuard>
  );
}

// ─── Screen ─────────────────────────────────────────────────
function Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows,       setRows]       = useState<AgentTx[]>([]);
  const [error,      setError]      = useState<string | null>(null);
  const [totalTan,   setTotalTan]   = useState(0);
  const [totalOps,   setTotalOps]   = useState(0);
  const [selected,   setSelected]   = useState<AgentTx | null>(null);
  const [filter,     setFilter]     = useState<"ALL" | "SELL" | "WITHDRAW">("ALL");

  // Toast copié
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (t: string, _s: string) => {
    setToastMsg(t);
    Animated.timing(toastAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    setTimeout(() => Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(), 2000);
  };

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(16)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) { setError("Session expirée."); return; }

      const { data, error: err } = await supabase
        .from("agents_transactions")
        .select("id, kind, tan_amount, acset_amount, created_at, user_uid, ed_id, status, note, reference")
        .eq("agent_uid", uid)
        .order("created_at", { ascending: false });

      if (err) {
        // Fallback → user_withdraw_requests
        const { data: wr } = await supabase
          .from("user_withdraw_requests")
          .select("id, amount_tan, status, created_at")
          .eq("status", "APPROVED")
          .order("created_at", { ascending: false });

        const mapped = (wr ?? []).map((r: any) => ({
          id:           r.id,
          kind:         "WITHDRAW",
          tan_amount:   r.amount_tan,
          acset_amount: null,
          created_at:   r.created_at,
          user_uid:     r.user_uid ?? null,
          ed_id:        r.ed_id    ?? null,
          status:       r.status   ?? null,
          note:         r.note     ?? null,
          reference:    null,
        }));
        setRows(mapped);
        setTotalOps(mapped.length);
        setTotalTan(mapped.reduce((s: number, r: any) => s + Number(r.tan_amount || 0), 0));
      } else {
        const list = (data as AgentTx[]) ?? [];
        setRows(list);
        setTotalOps(list.length);
        setTotalTan(list.reduce((s, r) => s + Number(r.tan_amount || 0), 0));
      }

      // Animations
      Animated.parallel([
        Animated.timing(headerFade, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(statsAnim,  { toValue: 1, duration: 400, delay: 80, useNativeDriver: true }),
        Animated.timing(statsSlide, { toValue: 0, duration: 400, delay: 80, useNativeDriver: true }),
      ]).start();

    } catch (e: any) {
      setError(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

  const countSell     = rows.filter(r => r.kind === "SELL_TAN" || r.kind === "SELL_ACSET").length;
  const countWithdraw = rows.filter(r => r.kind === "WITHDRAW" || r.kind === "RECEIVE_TAN").length;

  const filteredRows = rows.filter(r => {
    if (filter === "SELL")     return r.kind === "SELL_TAN" || r.kind === "SELL_ACSET";
    if (filter === "WITHDRAW") return r.kind === "WITHDRAW" || r.kind === "RECEIVE_TAN";
    return true;
  });

  // ── Rendu item ───────────────────────────────────────────
  const renderItem = ({ item, index }: { item: AgentTx; index: number }) => {
    const cfg   = txConfig(item.kind);
    const value = item.tan_amount ?? item.acset_amount ?? 0;
    const unit  = item.tan_amount != null ? "TAN" : "ACSET";
    const htg   = item.tan_amount ? item.tan_amount * 0.5 : null;

    return (
      <View style={[styles.item, index === 0 && { marginTop: 0 }]}>
        {/* Icône */}
        <View style={[styles.itemIcon, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}30` }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>

        {/* Infos */}
        <View style={{ flex: 1 }}>
          <Text style={styles.itemLabel}>{cfg.label}</Text>
          <Text style={styles.itemDate}>{fmtDate(item.created_at)}</Text>
        </View>

        {/* Montant */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.itemVal, { color: cfg.color }]}>
            {cfg.sign}{fmt(value)} {unit}
          </Text>
          {htg != null && (
            <Text style={styles.itemHtg}>{fmt(htg)} HTG</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>

      {/* ── Header ────────────────────────────── */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 10, opacity: headerFade }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>Historique</Text>
          <Text style={styles.hSub}>Toutes vos opérations</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); load(true); }} activeOpacity={0.75}>
          <Ionicons name="refresh" size={18} color={GOLD} />
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={{ color: MUTED, marginTop: 12, fontWeight: "600" }}>Chargement…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={36} color={RED} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={GOLD} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          ListHeaderComponent={() => (
            <>
              {/* ── Stats ─────────────────────── */}
              <Animated.View style={[styles.statsCard, { opacity: statsAnim, transform: [{ translateY: statsSlide }] }]}>
                <View style={styles.statBlock}>
                  <View style={[styles.statIcon, { backgroundColor: GOLD_DIM, borderColor: GOLD_BD }]}>
                    <Ionicons name="stats-chart" size={16} color={GOLD} />
                  </View>
                  <Text style={styles.statVal}>{fmt(totalOps)}</Text>
                  <Text style={styles.statLbl}>Opérations</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statBlock}>
                  <View style={[styles.statIcon, { backgroundColor: `${GREEN}15`, borderColor: `${GREEN}30` }]}>
                    <Ionicons name="diamond-outline" size={16} color={GREEN} />
                  </View>
                  <Text style={[styles.statVal, { color: GREEN }]}>{fmt(totalTan)}</Text>
                  <Text style={styles.statLbl}>TAN traités</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statBlock}>
                  <View style={[styles.statIcon, { backgroundColor: `${BLUE}15`, borderColor: `${BLUE}30` }]}>
                    <Ionicons name="cash-outline" size={16} color={BLUE} />
                  </View>
                  <Text style={[styles.statVal, { color: BLUE }]}>{fmt(totalTan * 0.5)}</Text>
                  <Text style={styles.statLbl}>HTG total</Text>
                </View>
              </Animated.View>

              {/* ── Filtres section ──────────────── */}
              {rows.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Transactions</Text>
                  <View style={styles.filterRow}>
                    <TouchableOpacity style={[styles.filterChip, filter === "ALL" && styles.filterChipActive]} onPress={() => setFilter("ALL")} activeOpacity={0.8}>
                      <Ionicons name="list-outline" size={14} color={filter === "ALL" ? "#000" : MUTED} />
                      <Text style={[styles.filterChipTxt, filter === "ALL" && { color:"#000" }]}>Tous</Text>
                      <View style={[styles.filterCount, filter === "ALL" && styles.filterCountActive]}>
                        <Text style={[styles.filterCountTxt, filter === "ALL" && { color:"#000" }]}>{rows.length}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterChip, filter === "SELL" && styles.filterChipSell]} onPress={() => setFilter("SELL")} activeOpacity={0.8}>
                      <Ionicons name="arrow-up-circle-outline" size={14} color={filter === "SELL" ? "#fff" : GREEN} />
                      <Text style={[styles.filterChipTxt, filter === "SELL" && { color:"#fff" }]}>Ventes</Text>
                      <View style={[styles.filterCount, filter === "SELL" && { backgroundColor:"rgba(255,255,255,0.25)" }]}>
                        <Text style={[styles.filterCountTxt, filter === "SELL" && { color:"#fff" }]}>{countSell}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.filterChip, filter === "WITHDRAW" && styles.filterChipWithdraw]} onPress={() => setFilter("WITHDRAW")} activeOpacity={0.8}>
                      <Ionicons name="arrow-down-circle-outline" size={14} color={filter === "WITHDRAW" ? "#fff" : BLUE} />
                      <Text style={[styles.filterChipTxt, filter === "WITHDRAW" && { color:"#fff" }]}>Retraits</Text>
                      <View style={[styles.filterCount, filter === "WITHDRAW" && { backgroundColor:"rgba(255,255,255,0.25)" }]}>
                        <Text style={[styles.filterCountTxt, filter === "WITHDRAW" && { color:"#fff" }]}>{countWithdraw}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={44} color={SOFT} />
              </View>
              <Text style={styles.emptyTitle}>Aucune opération</Text>
              <Text style={styles.emptySub}>Vos transactions apparaîtront ici.</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.8}>
            {renderItem({ item, index })}
          </TouchableOpacity>
        )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      {/* ── Toast copié ─────────────────────── */}
      <Animated.View pointerEvents="none" style={[styles.copyToast, { opacity: toastAnim }]}>
        <Ionicons name="checkmark-circle" size={16} color={GREEN} />
        <Text style={styles.copyToastTxt}>{toastMsg}</Text>
      </Animated.View>

      {/* ── Détail modal ──────────────────────── */}
      <DetailModal tx={selected} onClose={() => setSelected(null)} showToast={showToast} />

    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn:    { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD, alignItems: "center", justifyContent: "center" },
  hTitle:     { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:       { color: MUTED, fontSize: 12, marginTop: 2 },

  // Stats
  statsCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: SOFT,
    marginBottom: 18, marginTop: 4,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 6 },
  statIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  statVal:   { color: TEXT, fontWeight: "900", fontSize: 17 },
  statLbl:   { color: MUTED, fontSize: 10, fontWeight: "700", textAlign: "center" },
  statSep:   { width: 1, height: 48, backgroundColor: SOFT, marginHorizontal: 6 },

  // Section header
  sectionHeader:      { flexDirection: "column", gap: 10, marginBottom: 12 },
  sectionTitle:       { color: TEXT, fontWeight: "800", fontSize: 16 },
  filterRow:          { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: SOFT },
  filterChipActive:   { backgroundColor: GOLD, borderColor: GOLD },
  filterChipSell:     { backgroundColor: GREEN, borderColor: GREEN },
  filterChipWithdraw: { backgroundColor: BLUE,  borderColor: BLUE  },
  filterChipTxt:      { color: TEXT, fontWeight: "800", fontSize: 12 },
  filterCount:        { backgroundColor: BG, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" },
  filterCountActive:  { backgroundColor: "rgba(0,0,0,0.15)" },
  filterCountTxt:     { color: MUTED, fontWeight: "900", fontSize: 11 },
  countBadge:    { backgroundColor: GOLD_DIM, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: GOLD_BD },
  countBadgeTxt: { color: GOLD, fontWeight: "900", fontSize: 12 },

  // Items
  item: {
    backgroundColor: CARD, borderRadius: 16,
    padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: SOFT,
  },
  itemIcon:  { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  itemLabel: { color: TEXT, fontWeight: "800", fontSize: 14 },
  itemDate:  { color: MUTED, fontSize: 11, marginTop: 3, fontWeight: "600" },
  itemVal:   { fontWeight: "900", fontSize: 15 },
  itemHtg:   { color: MUTED, fontSize: 11, fontWeight: "700", marginTop: 2 },

  separator: { height: 8 },

  // Erreur
  errorWrap: { alignItems: "center", gap: 12 },
  errorTxt:  { color: RED, fontSize: 14, fontWeight: "600", textAlign: "center" },

  // Toast copié
  copyToast:    { position: "absolute", bottom: 40, left: 40, right: 40, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 10, borderWidth: 1, borderColor: SOFT },
  copyToastTxt: { color: TEXT, fontWeight: "800", fontSize: 13 },

  // Empty
  emptyWrap:  { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 14 },
  emptyIcon:  { width: 88, height: 88, borderRadius: 24, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: TEXT, fontWeight: "900", fontSize: 18 },
  emptySub:   { color: MUTED, fontSize: 13, textAlign: "center" },
});