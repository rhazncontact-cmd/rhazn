// app/user-history.tsx
// ✅ RHAZN — Historique Wallet · Apple Fintech Premium
// ✅ Langage humain · Code agent · Détails complets

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ─── Palette dark fintech ────────────────────────────────────
const GOLD      = "#D4AF37";
const GOLD_DIM  = "rgba(212,175,55,0.12)";
const GOLD_BD   = "rgba(212,175,55,0.28)";
const BG        = "#000000";
const CARD      = "#0D0D0D";
const CARD2     = "#111111";
const BORDER    = "#1C1C1C";
const HAIRLINE  = "rgba(255,255,255,0.08)";
const GLASS     = "rgba(255,255,255,0.055)";
const WHITE     = "#FFFFFF";
const MUTED     = "rgba(255,255,255,0.45)";
const MUTED_MED = "rgba(255,255,255,0.65)";
const GREEN     = "#30D158";
const GREEN_DIM = "rgba(48,209,88,0.12)";
const GREEN_BD  = "rgba(48,209,88,0.28)";
const RED       = "#FF453A";
const RED_DIM   = "rgba(255,69,58,0.12)";
const RED_BD    = "rgba(255,69,58,0.28)";
const ORANGE    = "#FF9F0A";
const BLUE      = "#007AFF";

// ─── Types ──────────────────────────────────────────────────
type WalletTx = {
  id: string; user_id: string; tx_type: string | null;
  direction: "IN" | "OUT"; amount: number; reason: string | null;
  created_at: string; action_code: string | null; actor_role: string | null;
  agent_uid: string | null; is_supreme: boolean | null;
  ref_table: string | null; ref_id: string | null; meta: any | null;
  actor_name?: string | null; actor_avatar?: string | null;
  from_name?: string | null; to_name?: string | null;
  agent_code?: string | null;
  content_type?: string | null; // suspentz / product
  content_title?: string | null;
};

type ListItem =
  | { kind: "header"; key: string; totalIn: number; totalOut: number; net: number }
  | { kind: "tx"; tx: WalletTx };

// ─── Labels humains ──────────────────────────────────────────
// Tout utilisateur non-technique doit comprendre ces labels
function getHumanLabel(code?: string | null, meta?: any): {
  label: string; detail: string; icon: string; color: string; emoji: string;
} {
  const c = (code ?? "").toUpperCase();

  // Contenu payé — distinguer Suspentz vs Produit
  if (c === "SUSPENTZ_CONSUME" || c === "WATCH_SUSPENTZ") {
    const title = meta?.content_title ?? meta?.title ?? null;
    return {
      label:  "Contenu payé · Suspentz",
      detail: title ? `Vidéo : "${title}"` : "Vous avez regardé une vidéo Suspentz",
      icon:   "play-circle",
      color:  GOLD,
      emoji:  "▶️",
    };
  }
  if (c === "AUTEUR_ACCESS") {
    const title = meta?.product_title ?? meta?.title ?? null;
    return {
      label:  "Produit acheté",
      detail: title ? `Produit : "${title}"` : "Vous avez acheté un produit RHAZN",
      icon:   "bag-handle",
      color:  GOLD,
      emoji:  "🛍️",
    };
  }
  if (c === "SUSPENTZ_EARN") {
    return {
      label:  "Gain créateur · Suspentz",
      detail: "Quelqu'un a regardé votre contenu",
      icon:   "trophy",
      color:  GREEN,
      emoji:  "🎬",
    };
  }
  if (c === "AUTEUR_EARN") {
    return {
      label:  "Vente de produit",
      detail: "Un membre a acheté votre produit",
      icon:   "storefront",
      color:  GREEN,
      emoji:  "⭐",
    };
  }
  if (c === "TRANSFER_IN") {
    return {
      label:  "TAN reçu",
      detail: "Un membre RHAZN vous a envoyé du TAN",
      icon:   "arrow-down-circle",
      color:  GREEN,
      emoji:  "💰",
    };
  }
  if (c === "TRANSFER_OUT") {
    return {
      label:  "TAN envoyé",
      detail: "Vous avez envoyé du TAN à un membre",
      icon:   "arrow-up-circle",
      color:  RED,
      emoji:  "💸",
    };
  }
  if (c === "WITHDRAW_TAN") {
    return {
      label:  "Retrait en cash",
      detail: "Vous avez retiré du TAN chez un agent RHAZN",
      icon:   "wallet",
      color:  GOLD,
      emoji:  "🏦",
    };
  }
  if (c === "DEPOSIT_TAN") {
    return {
      label:  "Achat de TAN",
      detail: "Vous avez acheté du TAN chez un agent RHAZN",
      icon:   "cash",
      color:  GREEN,
      emoji:  "📥",
    };
  }
  if (c === "BONUS_SIGNUP") {
    return {
      label:  "Bonus de bienvenue",
      detail: "Cadeau RHAZN pour votre inscription",
      icon:   "gift",
      color:  GREEN,
      emoji:  "🎁",
    };
  }
  if (c === "CREDIT_TARGET") {
    return {
      label:  "Crédit reçu",
      detail: "Un crédit a été ajouté sur votre compte",
      icon:   "add-circle",
      color:  GREEN,
      emoji:  "✅",
    };
  }
  if (c === "DEBIT_TARGET") {
    return {
      label:  "Débit effectué",
      detail: "Un montant a été retiré de votre compte",
      icon:   "remove-circle",
      color:  RED,
      emoji:  "📤",
    };
  }
  if (c === "SYSTEM") {
    return {
      label:  "Opération automatique",
      detail: "Ajustement effectué par le système RHAZN",
      icon:   "settings",
      color:  MUTED,
      emoji:  "⚙️",
    };
  }
  return {
    label:  code?.trim() || "Transaction",
    detail: "Opération sur votre wallet RHAZN",
    icon:   "ellipse",
    color:  GOLD,
    emoji:  "💳",
  };
}

const fmtAmt   = (n: number) => Math.abs(Number(n || 0)).toLocaleString("fr-FR");
const fmtShort = (iso: string) => {
  try { return new Date(iso).toLocaleString("fr-FR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }); }
  catch { return iso; }
};
const fmtLong = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })
      + " à " + d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  } catch { return iso; }
};

// ─── Modal Détail ────────────────────────────────────────────
function TxDetail({ tx, onClose }: { tx: WalletTx; onClose: () => void }) {
  const h         = getHumanLabel(tx.action_code, tx.meta);
  const isIn      = tx.direction === "IN";
  const amt       = Number(tx.amount ?? 0);
  const isTransfer = (tx.action_code ?? "").toUpperCase().includes("TRANSFER");
  const feeAmt    = isTransfer && !isIn ? Math.ceil(amt * 0.02 / 1.02) : 0;
  const netAmt    = feeAmt > 0 ? amt - feeAmt : amt;
  const txId      = "TX-" + tx.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (val: string, field: string) => {
    Clipboard.setString(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const Row = ({ icon, label, value, color, copyable, copyVal }: {
    icon: string; label: string; value: string;
    color?: string; copyable?: boolean; copyVal?: string;
  }) => (
    <TouchableOpacity
      style={d.row}
      onPress={() => copyable && copyVal && copyToClipboard(copyVal, label)}
      activeOpacity={copyable ? 0.7 : 1}
      disabled={!copyable}
    >
      <Ionicons name={icon as any} size={15} color={MUTED} />
      <Text style={d.rowLabel}>{label}</Text>
      <View style={d.rowRight}>
        {copiedField === label
          ? <Text style={[d.rowValue, { color: GREEN }]}>Copié ✓</Text>
          : <Text style={[d.rowValue, color ? { color } : {}]} numberOfLines={1}>{value}</Text>
        }
        {copyable && <Ionicons name="copy-outline" size={12} color={MUTED} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={d.handle} />

      {/* ── Hero ── */}
      <View style={d.hero}>
        <View style={[d.heroIcon, { backgroundColor: h.color+"18", borderColor: h.color+"35" }]}>
          <Ionicons name={h.icon as any} size={34} color={h.color} />
        </View>
        <Text style={d.heroTitle}>{h.emoji} {h.label}</Text>
        <Text style={[d.heroAmt, { color: isIn ? GREEN : RED }]}>
          {isIn ? "+" : "-"}{fmtAmt(amt)} TAN
        </Text>
        <Text style={d.heroDate}>{fmtLong(tx.created_at)}</Text>

        {/* Statut pill */}
        <View style={[d.statusPill, { backgroundColor: isIn ? GREEN_DIM : RED_DIM, borderColor: isIn ? GREEN_BD : RED_BD }]}>
          <Ionicons name={isIn ? "arrow-down-circle" : "arrow-up-circle"} size={13} color={isIn ? GREEN : RED} />
          <Text style={[d.statusTxt, { color: isIn ? GREEN : RED }]}>
            {isIn ? "ARGENT REÇU" : "ARGENT ENVOYÉ"}
          </Text>
        </View>
      </View>

      <View style={d.divider} />

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 430 }}>

        {/* ── Ce qui s'est passé ── */}
        <Text style={d.section}>📋 Ce qui s'est passé</Text>
        <View style={d.block}>
          <View style={d.row}>
            <Ionicons name="information-circle-outline" size={15} color={MUTED} />
            <Text style={d.rowLabel}>Opération</Text>
            <Text style={[d.rowValue, { color: WHITE }]}>{h.label}</Text>
          </View>
          <View style={d.sep} />
          <View style={d.row}>
            <Ionicons name="chatbubble-outline" size={15} color={MUTED} />
            <Text style={d.rowLabel}>Explication</Text>
            <Text style={[d.rowValue, { maxWidth: "58%", fontSize: 11 }]}>{h.detail}</Text>
          </View>
          {/* Contenu payé — type Suspentz ou Produit */}
          {(tx.meta?.content_title || tx.meta?.product_title || tx.meta?.title) && (
            <>
              <View style={d.sep} />
              <View style={d.row}>
                <Ionicons name="document-text-outline" size={15} color={GOLD} />
                <Text style={d.rowLabel}>Contenu</Text>
                <Text style={[d.rowValue, { color: GOLD }]} numberOfLines={2}>
                  {tx.meta?.content_title ?? tx.meta?.product_title ?? tx.meta?.title}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Participants ── */}
        {isTransfer && (tx.from_name || tx.to_name) && (
          <>
            <Text style={d.section}>👥 Qui est impliqué</Text>
            <View style={d.block}>
              <View style={d.row}>
                <Ionicons name="person-circle-outline" size={15} color={MUTED} />
                <Text style={d.rowLabel}>Expéditeur</Text>
                <Text style={d.rowValue}>{tx.from_name ?? (isIn ? "Membre RHAZN" : "Vous")}</Text>
              </View>
              <View style={d.sep} />
              <View style={d.row}>
                <Ionicons name="person-circle" size={15} color={GOLD} />
                <Text style={d.rowLabel}>Destinataire</Text>
                <Text style={[d.rowValue, { color: GOLD }]}>{tx.to_name ?? (isIn ? "Vous" : "Membre RHAZN")}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Agent RHAZN ── */}
        {(tx.agent_code || tx.agent_uid || tx.actor_name) && (
          <>
            <Text style={d.section}>🛡️ Agent RHAZN impliqué</Text>
            <View style={d.block}>
              {tx.actor_name && (
                <>
                  <View style={d.row}>
                    <Ionicons name="person-outline" size={15} color={MUTED} />
                    <Text style={d.rowLabel}>Nom de l'agent</Text>
                    <Text style={d.rowValue}>{tx.actor_name}</Text>
                  </View>
                  <View style={d.sep} />
                </>
              )}
              {tx.agent_code && (
                <>
                  <Row
                    icon="barcode-outline"
                    label="Code agent"
                    value={tx.agent_code}
                    color={GOLD}
                    copyable
                    copyVal={tx.agent_code}
                  />
                  <View style={d.sep} />
                </>
              )}
              <View style={d.row}>
                <Ionicons name="shield-checkmark-outline" size={15} color={GREEN} />
                <Text style={d.rowLabel}>Statut</Text>
                <View style={[d.pill, { backgroundColor: GREEN_DIM, borderColor: GREEN_BD }]}>
                  <Text style={[d.pillTxt, { color: GREEN }]}>AGENT CERTIFIÉ ✓</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Montants détaillés ── */}
        <Text style={d.section}>💰 Montants</Text>
        <View style={d.block}>
          <View style={d.row}>
            <Ionicons name={isIn ? "arrow-down-circle" : "arrow-up-circle"} size={15} color={isIn ? GREEN : RED} />
            <Text style={d.rowLabel}>{isIn ? "Montant reçu" : "Montant envoyé"}</Text>
            <Text style={[d.rowValue, { color: isIn ? GREEN : RED, fontSize: 15, fontWeight: "900" }]}>
              {isIn ? "+" : "-"}{fmtAmt(amt)} TAN
            </Text>
          </View>
          {feeAmt > 0 && (
            <>
              <View style={d.sep} />
              <View style={d.row}>
                <Ionicons name="receipt-outline" size={15} color={ORANGE} />
                <Text style={d.rowLabel}>Frais de service (2%)</Text>
                <Text style={[d.rowValue, { color: ORANGE }]}>{fmtAmt(feeAmt)} TAN</Text>
              </View>
              <View style={d.sep} />
              <View style={d.row}>
                <Ionicons name="checkmark-circle-outline" size={15} color={GREEN} />
                <Text style={d.rowLabel}>Montant réel reçu</Text>
                <Text style={[d.rowValue, { color: GREEN }]}>{fmtAmt(netAmt)} TAN</Text>
              </View>
            </>
          )}
          {/* Équivalent HTG */}
          <View style={d.sep} />
          <View style={[d.row, { backgroundColor: GOLD_DIM, borderRadius: 10, marginHorizontal: 6 }]}>
            <Ionicons name="cash-outline" size={15} color={GOLD} />
            <Text style={[d.rowLabel, { color: GOLD }]}>Équivalent en HTG</Text>
            <Text style={[d.rowValue, { color: GOLD, fontWeight: "900" }]}>{fmtAmt(amt * 0.5)} HTG</Text>
          </View>
        </View>

        {/* ── Référence technique ── */}
        <Text style={d.section}>🔍 Référence de la transaction</Text>
        <View style={d.block}>
          <Row icon="finger-print-outline" label="Numéro unique" value={txId} copyable copyVal={tx.id} />
          {tx.ref_id && (
            <>
              <View style={d.sep} />
              <Row icon="link-outline" label="Référence interne" value={tx.ref_id.slice(0,12)+"…"} copyable copyVal={tx.ref_id} />
            </>
          )}
          <View style={d.sep} />
          <View style={d.row}>
            <Ionicons name="calendar-outline" size={15} color={MUTED} />
            <Text style={d.rowLabel}>Date exacte</Text>
            <Text style={[d.rowValue, { fontSize: 11 }]}>{fmtLong(tx.created_at)}</Text>
          </View>
          {tx.is_supreme && (
            <>
              <View style={d.sep} />
              <View style={d.row}>
                <Ionicons name="shield-outline" size={15} color={GOLD} />
                <Text style={d.rowLabel}>Validé par</Text>
                <Text style={[d.rowValue, { color: GOLD }]}>Administration RHAZN</Text>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>

      <TouchableOpacity style={d.closeBtn} onPress={onClose} activeOpacity={0.85}>
        <Text style={d.closeTxt}>Fermer</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Screen ─────────────────────────────────────────────────
export default function UserHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [rows,     setRows]    = useState<WalletTx[]>([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState<string | null>(null);
  const [filter,   setFilter]  = useState<"ALL"|"IN"|"OUT">("ALL");
  const [q,        setQ]       = useState("");
  const [totalIn,  setTotalIn] = useState(0);
  const [totalOut, setTotalOut]= useState(0);
  const [selected, setSelected]= useState<WalletTx | null>(null);

  const headerFade  = useRef(new Animated.Value(0)).current;
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const slideSummary = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { setError("Session expirée."); setLoading(false); return; }

        const { data, error: dbErr } = await supabase
          .from("wallet_transactions")
          .select("id,user_id,tx_type,direction,amount,reason,created_at,action_code,actor_role,agent_uid,is_supreme,ref_table,ref_id,meta")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(500);

        if (dbErr) throw dbErr;
        const txs = (data as WalletTx[]) ?? [];

        let tIn = 0, tOut = 0;
        for (const t of txs) { const a = Number(t.amount ?? 0); t.direction === "IN" ? tIn += a : tOut += a; }
        setTotalIn(tIn); setTotalOut(tOut);

        // Enrichissement
        const allUids = new Set<string>();
        txs.forEach(t => { if (t.agent_uid) allUids.add(t.agent_uid); });

        const txIds = txs.map(t => t.ref_id).filter(Boolean) as string[];
        let transferMap: Record<string, { from_uid: string; to_uid: string }> = {};
        if (txIds.length > 0) {
          const { data: transfers } = await supabase
            .from("tan_transfers").select("id,from_uid,to_uid").in("id", txIds);
          (transfers ?? []).forEach((t: any) => {
            transferMap[t.id] = { from_uid: t.from_uid, to_uid: t.to_uid };
            if (t.from_uid) allUids.add(t.from_uid);
            if (t.to_uid)   allUids.add(t.to_uid);
          });
        }

        let profileMap: Record<string, any> = {};
        if (allUids.size > 0) {
          const { data: profs } = await supabase
            .from("profiles").select("id,full_name,avatar_url").in("id", [...allUids]);
          profileMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
        }

        // Récupérer les codes agents
        let agentCodeMap: Record<string, string> = {};
        const agentUids = txs.map(t => t.agent_uid).filter(Boolean) as string[];
        if (agentUids.length > 0) {
          const { data: edsRows } = await supabase
            .from("eds").select("auth_uid,agent_code").in("auth_uid", agentUids);
          (edsRows ?? []).forEach((e: any) => { if (e.auth_uid) agentCodeMap[e.auth_uid] = e.agent_code; });
        }

        setRows(txs.map(t => {
          const tr = t.ref_id ? transferMap[t.ref_id] : null;
          return {
            ...t,
            actor_name:    t.agent_uid ? (profileMap[t.agent_uid]?.full_name ?? null) : null,
            actor_avatar:  t.agent_uid ? (profileMap[t.agent_uid]?.avatar_url ?? null) : null,
            from_name:     tr?.from_uid ? (profileMap[tr.from_uid]?.full_name ?? null) : null,
            to_name:       tr?.to_uid   ? (profileMap[tr.to_uid]?.full_name   ?? null) : null,
            agent_code:    t.agent_uid  ? (agentCodeMap[t.agent_uid] ?? null) : null,
          };
        }));

        Animated.parallel([
          Animated.timing(headerFade,   { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(summaryAnim,  { toValue: 1, duration: 460, delay: 80, useNativeDriver: true }),
          Animated.timing(slideSummary, { toValue: 0, duration: 460, delay: 80, useNativeDriver: true }),
        ]).start();

      } catch (e: any) {
        setError(e.message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const qNorm   = q.trim().toLowerCase();
  const filtered = useMemo(() => rows.filter(tx => {
    if (filter !== "ALL" && tx.direction !== filter) return false;
    if (!qNorm) return true;
    const h = getHumanLabel(tx.action_code, tx.meta);
    return [tx.action_code, tx.reason, tx.actor_name, h.label, h.detail, String(tx.amount ?? "")]
      .join(" ").toLowerCase().includes(qNorm);
  }), [rows, filter, qNorm]);

  const listItems: ListItem[] = useMemo(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    const week  = new Date(today); week.setDate(today.getDate() - today.getDay());
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const year  = new Date(now.getFullYear(), 0, 1);
    const buckets: Record<string, WalletTx[]> = {
      "Aujourd'hui":[], "Hier":[], "Cette semaine":[], "Ce mois":[], "Cette année":[], "Années précédentes":[],
    };
    for (const tx of filtered) {
      const dd = new Date(tx.created_at);
      if      (dd >= today) buckets["Aujourd'hui"].push(tx);
      else if (dd >= yest)  buckets["Hier"].push(tx);
      else if (dd >= week)  buckets["Cette semaine"].push(tx);
      else if (dd >= month) buckets["Ce mois"].push(tx);
      else if (dd >= year)  buckets["Cette année"].push(tx);
      else                  buckets["Années précédentes"].push(tx);
    }
    const out: ListItem[] = [];
    for (const key of ["Aujourd'hui","Hier","Cette semaine","Ce mois","Cette année","Années précédentes"]) {
      const txs = buckets[key]; if (!txs.length) continue;
      let tIn = 0, tOut = 0;
      for (const t of txs) { const a = Number(t.amount ?? 0); t.direction === "IN" ? tIn += a : tOut += a; }
      out.push({ kind: "header", key, totalIn: tIn, totalOut: tOut, net: tIn - tOut });
      for (const t of txs) out.push({ kind: "tx", tx: t });
    }
    return out;
  }, [filtered]);

  const stickyIndices = useMemo(() =>
    listItems.map((x, i) => x.kind === "header" ? i : -1).filter(i => i !== -1), [listItems]);

  const renderRow = ({ item }: { item: ListItem }) => {
    if (item.kind === "header") {
      const pos = item.net >= 0;
      return (
        <View style={s.periodHeader}>
          <Text style={s.periodTitle}>{item.key}</Text>
          <View style={s.periodBadges}>
            <View style={[s.periodBadge, { borderColor: GREEN_BD, backgroundColor: GREEN_DIM }]}>
              <Ionicons name="arrow-down-circle" size={11} color={GREEN} />
              <Text style={[s.periodBadgeTxt, { color: GREEN }]}>+{fmtAmt(item.totalIn)}</Text>
            </View>
            <View style={[s.periodBadge, { borderColor: RED_BD, backgroundColor: RED_DIM }]}>
              <Ionicons name="arrow-up-circle" size={11} color={RED} />
              <Text style={[s.periodBadgeTxt, { color: RED }]}>-{fmtAmt(item.totalOut)}</Text>
            </View>
            <View style={[s.periodBadge, { borderColor: pos ? GREEN_BD : RED_BD, backgroundColor: pos ? GREEN_DIM : RED_DIM }]}>
              <Text style={[s.periodBadgeTxt, { color: pos ? GREEN : RED }]}>
                {item.net >= 0 ? "Bilan +" : "Bilan -"}{Math.abs(item.net).toLocaleString("fr-FR")}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    const tx   = item.tx;
    const h    = getHumanLabel(tx.action_code, tx.meta);
    const isIn = tx.direction === "IN";
    const amt  = Number(tx.amount ?? 0);

    return (
      <Pressable style={({ pressed }) => [s.txCard, pressed && { opacity: 0.82 }]} onPress={() => setSelected(tx)}>
        <View style={[s.txIcon, { backgroundColor: h.color+"18", borderColor: h.color+"28" }]}>
          <Ionicons name={h.icon as any} size={20} color={h.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.txLabel}>{h.emoji} {h.label}</Text>
          <Text style={s.txDetail} numberOfLines={1}>{h.detail}</Text>
          {tx.actor_name && (
            <View style={s.txActorRow}>
              <Ionicons name="shield-checkmark" size={11} color={GOLD} />
              <Text style={s.txActorTxt}>Agent : {tx.actor_name}{tx.agent_code ? ` · ${tx.agent_code}` : ""}</Text>
            </View>
          )}
          <Text style={s.txDate}>{fmtShort(tx.created_at)}</Text>
        </View>
        <View style={s.txRight}>
          <Text style={[s.txAmt, { color: isIn ? GREEN : RED }]}>{isIn ? "+" : "-"}{fmtAmt(amt)}</Text>
          <Text style={s.txCurrency}>TAN</Text>
          <View style={[s.txBadge, { backgroundColor: isIn ? GREEN_DIM : RED_DIM, borderColor: isIn ? GREEN_BD : RED_BD }]}>
            <Text style={[s.txBadgeTxt, { color: isIn ? GREEN : RED }]}>{isIn ? "REÇU" : "ENVOYÉ"}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR");

  return (
    <View style={s.screen}>

      {/* ── Header ─────────────────────────────── */}
      <Animated.View style={[s.header, { paddingTop: insets.top + 10, opacity: headerFade }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.hTitle}>Mon historique</Text>
          <Text style={s.hSub}>{filtered.length} opération{filtered.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* ── Résumé ─────────────────────────────── */}
      {!loading && rows.length > 0 && (
        <Animated.View style={[s.summaryCard, { opacity: summaryAnim, transform: [{ translateY: slideSummary }] }]}>
          <View style={s.summaryBlock}>
            <View style={[s.summaryIcon, { backgroundColor: GREEN_DIM, borderColor: GREEN_BD }]}>
              <Ionicons name="arrow-down-circle" size={16} color={GREEN} />
            </View>
            <Text style={[s.summaryVal, { color: GREEN }]}>+{fmt(totalIn)}</Text>
            <Text style={s.summaryLbl}>Reçu</Text>
          </View>
          <View style={s.summarySep} />
          <View style={s.summaryBlock}>
            <View style={[s.summaryIcon, { backgroundColor: RED_DIM, borderColor: RED_BD }]}>
              <Ionicons name="arrow-up-circle" size={16} color={RED} />
            </View>
            <Text style={[s.summaryVal, { color: RED }]}>-{fmt(totalOut)}</Text>
            <Text style={s.summaryLbl}>Dépensé</Text>
          </View>
          <View style={s.summarySep} />
          <View style={s.summaryBlock}>
            <View style={[s.summaryIcon, { backgroundColor: GOLD_DIM, borderColor: GOLD_BD }]}>
              <Ionicons name="stats-chart" size={16} color={GOLD} />
            </View>
            <Text style={[s.summaryVal, { color: (totalIn-totalOut) >= 0 ? GREEN : RED }]}>
              {(totalIn-totalOut) >= 0 ? "+" : ""}{fmt(totalIn-totalOut)}
            </Text>
            <Text style={s.summaryLbl}>Bilan</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Recherche ──────────────────────────── */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={16} color={MUTED} />
        <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une opération…"
          placeholderTextColor={MUTED} style={s.searchInput} autoCapitalize="none" autoCorrect={false} />
        {!!q && <TouchableOpacity onPress={() => setQ("")} hitSlop={8}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity>}
      </View>

      {/* ── Filtres ─────────────────────────────── */}
      <View style={s.filtersRow}>
        {([
          { key:"ALL", label:"Tout",    icon:"list-outline"      },
          { key:"IN",  label:"Reçu",    icon:"arrow-down-circle" },
          { key:"OUT", label:"Envoyé",  icon:"arrow-up-circle"   },
        ] as const).map(f => (
          <TouchableOpacity key={f.key} activeOpacity={0.8}
            style={[s.filterChip, filter === f.key && (f.key==="IN" ? s.filterIn : f.key==="OUT" ? s.filterOut : s.filterAll)]}
            onPress={() => setFilter(f.key)}>
            <Ionicons name={f.icon} size={13} color={filter === f.key ? (f.key==="ALL" ? "#000" : "#fff") : MUTED} />
            <Text style={[s.filterTxt, filter === f.key && { color: f.key==="ALL" ? "#000" : "#fff" }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Liste ───────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={s.centerTxt}>Chargement de votre historique…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle" size={40} color={RED} />
          <Text style={[s.centerTxt, { color: RED, marginTop: 8 }]}>{error}</Text>
        </View>
      ) : listItems.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}><Ionicons name="wallet-outline" size={40} color={MUTED} /></View>
          <Text style={s.centerTxt}>Aucune opération{filter !== "ALL" ? " dans ce filtre" : ""}.</Text>
        </View>
      ) : (
        <FlatList data={listItems}
          keyExtractor={(it, idx) => it.kind==="header" ? `h-${it.key}` : `t-${it.tx.id}-${idx}`}
          renderItem={renderRow}
          stickyHeaderIndices={stickyIndices}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal détails ───────────────────────── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={s.modalBd} onPress={() => setSelected(null)}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            {selected && <TxDetail tx={selected} onClose={() => setSelected(null)} />}
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex:1, backgroundColor:BG },
  center: { flex:1, alignItems:"center", justifyContent:"center", gap:10 },

  header:  { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingBottom:12 },
  backBtn: { width:40, height:40, borderRadius:13, backgroundColor:GLASS, borderWidth:1, borderColor:HAIRLINE, alignItems:"center", justifyContent:"center" },
  hTitle:  { color:WHITE, fontSize:18, fontWeight:"900" },
  hSub:    { color:MUTED, fontSize:11, marginTop:1 },

  summaryCard:  { flexDirection:"row", marginHorizontal:16, marginBottom:12, backgroundColor:CARD, borderRadius:20, borderWidth:1, borderColor:BORDER, overflow:"hidden", padding:4 },
  summaryBlock: { flex:1, alignItems:"center", paddingVertical:14, gap:5 },
  summaryIcon:  { width:34, height:34, borderRadius:10, alignItems:"center", justifyContent:"center", borderWidth:1 },
  summaryVal:   { fontSize:14, fontWeight:"900" },
  summaryLbl:   { color:MUTED, fontSize:9, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5 },
  summarySep:   { width:1, backgroundColor:BORDER, marginVertical:8 },

  searchBox:   { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginBottom:10, paddingHorizontal:12, height:44, borderRadius:14, backgroundColor:GLASS, borderWidth:1, borderColor:HAIRLINE, gap:8 },
  searchInput: { flex:1, color:WHITE, fontWeight:"700", fontSize:13 },

  filtersRow: { flexDirection:"row", gap:8, paddingHorizontal:16, marginBottom:10 },
  filterChip: { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, height:36, borderRadius:12, backgroundColor:GLASS, borderWidth:1, borderColor:HAIRLINE },
  filterAll:  { backgroundColor:GOLD, borderColor:GOLD },
  filterIn:   { backgroundColor:GREEN, borderColor:GREEN },
  filterOut:  { backgroundColor:RED,   borderColor:RED   },
  filterTxt:  { color:MUTED_MED, fontWeight:"800", fontSize:12 },

  periodHeader: { backgroundColor:CARD2, borderRadius:14, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:BORDER },
  periodTitle:  { color:WHITE, fontWeight:"900", fontSize:12, marginBottom:7 },
  periodBadges: { flexDirection:"row", gap:6, flexWrap:"wrap" },
  periodBadge:  { flexDirection:"row", alignItems:"center", gap:4, borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1 },
  periodBadgeTxt: { fontWeight:"800", fontSize:10 },

  txCard:     { flexDirection:"row", alignItems:"center", backgroundColor:CARD, borderRadius:18, borderWidth:1, borderColor:BORDER, padding:14, gap:12 },
  txIcon:     { width:46, height:46, borderRadius:14, alignItems:"center", justifyContent:"center", borderWidth:1, flexShrink:0 },
  txLabel:    { color:WHITE, fontWeight:"900", fontSize:13 },
  txDetail:   { color:MUTED_MED, fontWeight:"600", fontSize:11 },
  txActorRow: { flexDirection:"row", alignItems:"center", gap:4 },
  txActorTxt: { color:GOLD, fontSize:10, fontWeight:"700" },
  txDate:     { color:MUTED, fontSize:10, fontWeight:"600" },
  txRight:    { alignItems:"flex-end", gap:3, flexShrink:0 },
  txAmt:      { fontSize:15, fontWeight:"900" },
  txCurrency: { color:MUTED, fontSize:9, fontWeight:"700" },
  txBadge:    { borderRadius:7, paddingHorizontal:6, paddingVertical:2, borderWidth:1 },
  txBadgeTxt: { fontWeight:"900", fontSize:9, letterSpacing:0.4 },

  centerTxt: { color:MUTED, fontWeight:"700", fontSize:13, textAlign:"center" },
  emptyIcon: { width:80, height:80, borderRadius:22, backgroundColor:CARD, borderWidth:1, borderColor:BORDER, alignItems:"center", justifyContent:"center" },

  modalBd:    { flex:1, backgroundColor:"rgba(0,0,0,0.65)", justifyContent:"flex-end" },
  modalSheet: { backgroundColor:"#0E0E0E", borderTopLeftRadius:30, borderTopRightRadius:30, paddingHorizontal:24, paddingTop:12, paddingBottom:Platform.OS==="ios"?40:28, borderTopWidth:1, borderTopColor:HAIRLINE },
});

const d = StyleSheet.create({
  handle:     { width:40, height:4, borderRadius:2, backgroundColor:HAIRLINE, alignSelf:"center", marginBottom:20 },
  hero:       { alignItems:"center", gap:7, marginBottom:16 },
  heroIcon:   { width:76, height:76, borderRadius:22, alignItems:"center", justifyContent:"center", borderWidth:1.5 },
  heroTitle:  { color:WHITE, fontWeight:"900", fontSize:17, textAlign:"center" },
  heroAmt:    { fontSize:30, fontWeight:"900", letterSpacing:0.3 },
  heroDate:   { color:MUTED, fontSize:12, fontWeight:"600", textAlign:"center" },
  statusPill: { flexDirection:"row", alignItems:"center", gap:5, borderRadius:12, paddingHorizontal:12, paddingVertical:6, borderWidth:1, marginTop:4 },
  statusTxt:  { fontSize:11, fontWeight:"900", letterSpacing:0.4 },
  divider:    { height:1, backgroundColor:BORDER, marginBottom:12 },
  section:    { color:MUTED, fontSize:10, fontWeight:"800", textTransform:"uppercase", letterSpacing:0.8, marginTop:14, marginBottom:6 },
  block:      { backgroundColor:GLASS, borderRadius:14, borderWidth:1, borderColor:BORDER, overflow:"hidden" },
  sep:        { height:1, backgroundColor:BORDER, marginHorizontal:12 },
  row:        { flexDirection:"row", alignItems:"center", paddingVertical:12, paddingHorizontal:12, gap:8 },
  rowLabel:   { flex:1, color:MUTED, fontSize:12, fontWeight:"700" },
  rowRight:   { flexDirection:"row", alignItems:"center", gap:5, maxWidth:"58%" },
  rowValue:   { color:WHITE, fontSize:12, fontWeight:"800", textAlign:"right", flexShrink:1 },
  pill:       { borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1 },
  pillTxt:    { fontSize:10, fontWeight:"900", letterSpacing:0.4 },
  closeBtn:   { backgroundColor:GOLD, borderRadius:18, paddingVertical:16, alignItems:"center", marginTop:16 },
  closeTxt:   { color:"#000", fontWeight:"900", fontSize:15 },
});