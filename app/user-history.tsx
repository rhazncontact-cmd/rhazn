// ======================================================
// RHAZN — USER HISTORY (FINTECH PREMIUM • TAN ONLY)
// ✅ Filtres CRÉDIT/DÉBIT
// ✅ Total journalier (groupé par date)
// ✅ Recherche
// ✅ Modal détails + labels humains
// ======================================================

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserRequestNotifications } from "../hooks/useUserRequestNotifications";
import { supabase } from "../lib/supabase";
import UserToast from "./components/UserToast";

const GOLD = "#D4AF37";

/* ======================================================
   TYPES (DB SAFE • TAN ONLY)
====================================================== */

type WalletTx = {
  id: string;
  user_id: string;

  tx_type: string | null;
  direction: "IN" | "OUT";
  amount: number;

  reason: string | null;
  created_at: string;

  action_code: string | null;
  actor_role: string | null;

  agent_uid: string | null;
  is_supreme: boolean | null;

  ref_table: string | null;
  ref_id: string | null;

  meta: any | null;
};

/* ======================================================
   HUMAN LABELS (FINTECH TRANSLATION)
====================================================== */

const ACTION_LABELS: Record<string, string> = {
  CREDIT_TARGET: "Crédit administratif",
  DEBIT_TARGET: "Débit administratif",

  WATCH_SUSPENTZ: "Visionnage contenu",
  SUSPENTZ_CONSUME: "Consommation SUSPENTZ",
  SUSPENTZ_EARN: "Gain créateur",

  TRANSFER_IN: "Transfert reçu",
  TRANSFER_OUT: "Transfert envoyé",

  WITHDRAW_TAN: "Retrait TAN",
  SYSTEM: "Opération système",
};

const REASON_LABELS: Record<string, string> = {
  SUPREME_MANUAL: "Ajustement manuel Supreme",
  SUSPENTZ_CONSUME: "Paiement visionnage",
  SUSPENTZ_EARNING: "Récompense créateur",
};

const humanAction = (c?: string | null) =>
  ACTION_LABELS[c ?? ""] || (c?.trim() ? c.trim() : "Transaction");

const humanReason = (r?: string | null) =>
  REASON_LABELS[r ?? ""] || (r?.trim() ? r.trim() : "Transaction RHAZN");

/* ======================================================
   HELPERS
====================================================== */

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const dateKey = (iso: string) => {
  // YYYY-MM-DD local
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ======================================================
   🛡️ SAFE PERIOD LABEL (no Invalid Date ever)
====================================================== */

const prettyDate = (label: string) => {
  // ✅ Si c’est déjà un label humain → retourner tel quel
  if (
    label === "Aujourd’hui" ||
    label === "Hier" ||
    label === "Cette semaine" ||
    label === "Ce mois" ||
    label === "Ce trimestre" ||
    label === "Cette année" ||
    label === "Années précédentes"
  ) {
    return label;
  }

  // sinon tentative date brute (fallback sécurité)
  try {
    return new Date(label).toLocaleDateString();
  } catch {
    return label;
  }
};

const safeJson = (obj: any) => {
  try {
    if (!obj) return null;
    return JSON.stringify(obj, null, 2);
  } catch {
    return null;
  }
};

/* ======================================================
   GROUPED LIST ITEM TYPE
====================================================== */

type ListItem =
  | { kind: "header"; key: string; totalIn: number; totalOut: number; net: number }
  | { kind: "tx"; tx: WalletTx };

/* ======================================================
   SMALL UI COMPONENTS
====================================================== */

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

/* ======================================================
   COMPONENT
====================================================== */

export default function UserHistory() {
  const router = useRouter();

  const [rows, setRows] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userUid, setUserUid] = useState<string | null>(null);

  /* toast */
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  useUserRequestNotifications(userUid, showToast);

  /* ======================================================
     FILTERS + SEARCH
  ====================================================== */
  const [filter, setFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [q, setQ] = useState("");

  const qNorm = q.trim().toLowerCase();

  const getCategory = (tx: WalletTx) => tx.actor_role?.trim() || "SYSTEM";
  const getAmount = (tx: WalletTx) => `${Number(tx.amount ?? 0).toLocaleString()} TAN`;

  const matchesSearch = (tx: WalletTx) => {
    if (!qNorm) return true;

    const hay = [
      getCategory(tx),
      humanReason(tx.reason),
      humanAction(tx.action_code),
      tx.reason ?? "",
      tx.action_code ?? "",
      String(tx.amount ?? ""),
      tx.ref_table ?? "",
      tx.ref_id ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return hay.includes(qNorm);
  };

  /* ================= LOAD ================= */
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;

        if (!uid) {
          setError("Session expirée.");
          setLoading(false);
          return;
        }

        setUserUid(uid);

        const { data, error } = await supabase
          .from("wallet_transactions")
          .select(
            "id,user_id,tx_type,direction,amount,reason,created_at,action_code,actor_role,agent_uid,is_supreme,ref_table,ref_id,meta"
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(300);

        if (error) throw error;

        setRows((data as WalletTx[]) ?? []);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ======================================================
     APPLY FILTERS + SEARCH
  ====================================================== */

  const filtered = useMemo(() => {
    return rows.filter((tx) => {
      if (filter !== "ALL" && tx.direction !== filter) return false;
      if (!matchesSearch(tx)) return false;
      return true;
    });
  }, [rows, filter, qNorm]);

  /* ======================================================
   🧠 FINTECH SMART PERIOD GROUPING (BANQUE STYLE)
====================================================== */

const listItems: ListItem[] = useMemo(() => {
  const now = new Date();

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startYesterday = new Date(startToday);
  startYesterday.setDate(startToday.getDate() - 1);

  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - startWeek.getDay());

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startQuarter = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1
  );

  const startYear = new Date(now.getFullYear(), 0, 1);

  const buckets: Record<string, WalletTx[]> = {
    "Aujourd’hui": [],
    "Hier": [],
    "Cette semaine": [],
    "Ce mois": [],
    "Ce trimestre": [],
    "Cette année": [],
    "Années précédentes": [],
  };

  /* ---------- assign tx to bucket ---------- */
  for (const tx of filtered) {
    const d = new Date(tx.created_at);

    if (d >= startToday) buckets["Aujourd’hui"].push(tx);
    else if (d >= startYesterday) buckets["Hier"].push(tx);
    else if (d >= startWeek) buckets["Cette semaine"].push(tx);
    else if (d >= startMonth) buckets["Ce mois"].push(tx);
    else if (d >= startQuarter) buckets["Ce trimestre"].push(tx);
    else if (d >= startYear) buckets["Cette année"].push(tx);
    else buckets["Années précédentes"].push(tx);
  }

  const order = [
    "Aujourd’hui",
    "Hier",
    "Cette semaine",
    "Ce mois",
    "Ce trimestre",
    "Cette année",
    "Années précédentes",
  ];

  const out: ListItem[] = [];

  for (const key of order) {
    const txs = buckets[key];
    if (!txs.length) continue;

    let totalIn = 0;
    let totalOut = 0;

    for (const t of txs) {
      const amt = Number(t.amount ?? 0);
      if (t.direction === "IN") totalIn += amt;
      else totalOut += amt;
    }

    out.push({
      kind: "header",
      key,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    });

    for (const t of txs) out.push({ kind: "tx", tx: t });
  }

  return out;
}, [filtered]);

  const totalCount = useMemo(() => filtered.length, [filtered]);

  /* ======================================================
     DETAILS MODAL
  ====================================================== */

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WalletTx | null>(null);

  const openDetails = (tx: WalletTx) => {
    setSelected(tx);
    setOpen(true);
  };

  /* ======================================================
     RENDER
  ====================================================== */

  const renderRow = ({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      const netColor =
        item.net > 0 ? "#22c55e" : item.net < 0 ? "#fca5a5" : "rgba(255,255,255,0.65)";

      return (
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{prettyDate(item.key)}</Text>

          <View style={styles.dayTotalsRow}>
            <Text style={styles.dayTotalIn}>+ {item.totalIn.toLocaleString()} TAN</Text>
            <Text style={styles.dayTotalOut}>- {item.totalOut.toLocaleString()} TAN</Text>
            <Text style={[styles.dayNet, { color: netColor }]}>
              NET {item.net.toLocaleString()} TAN
            </Text>
          </View>
        </View>
      );
    }

    const tx = item.tx;
    const sign = tx.direction === "IN" ? "➕" : "➖";
    const badgeColor = tx.direction === "IN" ? "#22c55e" : GOLD;

    return (
      <Pressable onPress={() => openDetails(tx)} style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topLine}>{getCategory(tx)}</Text>

          <Text style={styles.amountLine}>
            {sign} {getAmount(tx)}
          </Text>

          <Text style={styles.reasonLine}>{humanReason(tx.reason)}</Text>

          <Text style={styles.dateLine}>{formatDateTime(tx.created_at)}</Text>
        </View>

        <Text style={[styles.badge, { color: badgeColor }]}>
          {tx.direction === "IN" ? "CRÉDIT" : "DÉBIT"}
        </Text>
      </Pressable>
    );
  };

  return (
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <UserToast message={toast} />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Historique</Text>
            <Text style={styles.subtitle}>{totalCount} transactions</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.55)" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher (montant, système, raison...)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!q && (
            <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
              <Feather name="x" size={16} color="#FFF" />
            </Pressable>
          )}
        </View>

        {/* FILTERS */}
        <View style={styles.filtersRow}>
          <Pill label="Tous" active={filter === "ALL"} onPress={() => setFilter("ALL")} />
          <Pill label="Crédits" active={filter === "IN"} onPress={() => setFilter("IN")} />
          <Pill label="Débits" active={filter === "OUT"} onPress={() => setFilter("OUT")} />
        </View>

        {/* LIST */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : listItems.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>Aucune transaction.</Text>
          </View>
        ) : (

          

          <FlatList
  data={listItems}
  keyExtractor={(it, idx) =>
    it.kind === "header" ? `h-${it.key}` : `t-${it.tx.id}-${idx}`
  }
  renderItem={renderRow}

  /* 🔥 STICKY HEADERS */
  stickyHeaderIndices={listItems
    .map((x, i) => (x.kind === "header" ? i : -1))
    .filter((i) => i !== -1)
  }

  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
/>
        )}

        {/* MODAL DETAILS */}
        <Modal visible={open} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails</Text>
                <Pressable onPress={() => setOpen(false)} style={styles.modalClose}>
                  <Feather name="x" size={18} color="#FFF" />
                </Pressable>
              </View>

              {!selected ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator color={GOLD} />
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <KV k="Catégorie" v={getCategory(selected)} />
                  <KV k="Montant" v={getAmount(selected)} />
                  <KV k="Direction" v={selected.direction === "IN" ? "CRÉDIT" : "DÉBIT"} />
                  <KV k="Action" v={humanAction(selected.action_code)} />
                  <KV k="Raison" v={humanReason(selected.reason)} />
                  <KV k="Date" v={formatDateTime(selected.created_at)} />

                  <KV
                    k="Référence"
                    v={
                      (selected.ref_table || "—") +
                      (selected.ref_id ? ` / ${selected.ref_id}` : "")
                    }
                  />
                  <KV k="Agent" v={selected.agent_uid || "—"} />
                  <KV k="Supreme" v={selected.is_supreme ? "Oui" : "Non"} />

                  {safeJson(selected.meta) ? (
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.k}>Meta</Text>
                      <View style={styles.metaBox}>
                        <Text style={styles.metaText}>{safeJson(selected.meta)}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
  );
}

/* ======================================================
   STYLES — Apple-like / Fintech premium
====================================================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  title: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#fca5a5", fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.55)", fontWeight: "600" },

  /* Search */
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },

  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  /* Filters */
  filtersRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  pill: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  pillActive: {
    backgroundColor: GOLD,
    borderColor: "rgba(0,0,0,0.35)",
  },

  pillText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  pillTextActive: {
    color: "#000",
  },

  /* Day header (totals) */
  dayHeader: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
  },

  dayTitle: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 13,
  },

  dayTotalsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  dayTotalIn: { color: "#22c55e", fontWeight: "900", fontSize: 11 },
  dayTotalOut: { color: GOLD, fontWeight: "900", fontSize: 11 },
  dayNet: { fontWeight: "900", fontSize: 11 },

  /* Cards */
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    justifyContent: "space-between",
    gap: 12,
  },

  topLine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  amountLine: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
    marginTop: 6,
  },

  reasonLine: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "800",
  },

  dateLine: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "700",
  },

  badge: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 18,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: "#0E0E0E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalTitle: { color: "#FFF", fontSize: 16, fontWeight: "900" },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  k: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "900" },
  v: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
    flexShrink: 1,
    textAlign: "right",
  },

  metaBox: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
  },

  metaText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800" },
});
