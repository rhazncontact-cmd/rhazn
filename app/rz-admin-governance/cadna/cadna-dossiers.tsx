import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

/* 🎨 RHAZN — MODE DIEU (APPLE-LIKE) */
const COLORS = {
  bg: "#000",
  card: "#0E0E0E",
  border: "rgba(255,255,255,0.08)",
  text: "#FFF",
  muted: "rgba(255,255,255,0.55)",
  gold: "#D4AF37",
  green: "#34C759",
  red: "#FF453A",
  blue: "#0A84FF",
};

type CadnaStatus = "pending" | "approved" | "rejected";

type Dossier = {
  id: string;
  title: string | null;
  category_code: string;
  product_type: string | null;
  media_path: string | null;
  cadna_status: CadnaStatus;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  cadna_reviewed_by?: string;
};

const TABS: CadnaStatus[] = ["pending", "approved", "rejected"];

export default function CadnaDossiers() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

/* ================= HELPERS ================= */

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function hoursBetween(a?: string, b?: string) {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!isFinite(ta) || !isFinite(tb)) return null;
  const h = Math.max(0, (tb - ta) / (1000 * 60 * 60));
  return h;
}

function badgeColor(s: CadnaStatus) {
  if (s === "approved") return COLORS.green;
  if (s === "rejected") return COLORS.red;
  return COLORS.gold;
}

function statusIcon(s: CadnaStatus) {
  if (s === "approved") return "checkmark-circle";
  if (s === "rejected") return "close-circle";
  return "time";
}

/* ================= SCREEN ================= */

function Screen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Dossier[]>([]);
  const [tab, setTab] = useState<CadnaStatus>("pending");
  const [selected, setSelected] = useState<Dossier | null>(null);

  /* LOAD (RPC) */
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("rz_get_all_cadna_products", {
      p_status: tab,
    });
    if (error) {
      console.log("CADNA RPC ERROR:", error.message);
      setRows([]);
    } else {
      setRows((data || []) as Dossier[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const ch = supabase
      .channel("cadna-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_products" },
        () => load()
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [tab]);

  /* UPDATE */
  const updateStatus = async (productId: string, status: CadnaStatus) => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session?.session?.user?.id;

    const patch: any = {
      cadna_status: status,
      cadna_reviewed_by: uid,
    };

    if (status === "approved") {
      patch.is_public = true;
      patch.approved_at = new Date().toISOString();
    }

    if (status === "rejected") {
      patch.is_public = false;
      patch.rejected_at = new Date().toISOString();
    }

    await supabase.from("store_products").update(patch).eq("id", productId);
    load();
  };

  /* ================== MODE DIEU — KPIs ================== */

  const globalKpis = useMemo(() => {
    // NOTE: rows = seulement le statut du tab courant.
    // Mais on peut quand même faire un “mini dashboard” sur ce tab.
    const pending = rows.filter((r) => r.cadna_status === "pending").length;
    const approved = rows.filter((r) => r.cadna_status === "approved").length;
    const rejected = rows.filter((r) => r.cadna_status === "rejected").length;

    // vitesse moyenne (création -> décision)
    const decided = rows
      .map((r) => {
        const end = r.approved_at || r.rejected_at;
        const h = hoursBetween(r.created_at, end);
        return h;
      })
      .filter((x): x is number => typeof x === "number");

    const avgH =
      decided.length === 0
        ? null
        : decided.reduce((a, b) => a + b, 0) / decided.length;

    // top reviewers (sur ce tab)
    const map: Record<string, { approved: number; rejected: number; total: number }> =
      {};
    for (const r of rows) {
      if (r.cadna_status === "pending") continue;
      const k = r.cadna_reviewed_by || "UNKNOWN";
      if (!map[k]) map[k] = { approved: 0, rejected: 0, total: 0 };
      if (r.cadna_status === "approved") map[k].approved += 1;
      if (r.cadna_status === "rejected") map[k].rejected += 1;
      map[k].total += 1;
    }

    const topReviewers = Object.entries(map)
      .map(([uid, v]) => ({ uid, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { pending, approved, rejected, avgH, topReviewers };
  }, [rows]);

  const categoryKpis = useMemo(() => {
    if (!selected) return null;
    const cat = selected.category_code;

    const pending = rows.filter(
      (r) => r.category_code === cat && r.cadna_status === "pending"
    ).length;
    const approved = rows.filter(
      (r) => r.category_code === cat && r.cadna_status === "approved"
    ).length;
    const rejected = rows.filter(
      (r) => r.category_code === cat && r.cadna_status === "rejected"
    ).length;

    // vitesse catégorie
    const decided = rows
      .filter((r) => r.category_code === cat && r.cadna_status !== "pending")
      .map((r) => {
        const end = r.approved_at || r.rejected_at;
        const h = hoursBetween(r.created_at, end);
        return h;
      })
      .filter((x): x is number => typeof x === "number");

    const avgH =
      decided.length === 0
        ? null
        : decided.reduce((a, b) => a + b, 0) / decided.length;

    return { pending, approved, rejected, avgH };
  }, [selected, rows]);

  /* ================= UI ================= */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
        <Text style={styles.muted}>Chargement CADNA…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoDot} />
          <Ionicons name="shield-checkmark" size={18} color={COLORS.gold} />
          <Text style={styles.title}>CADNA · MODE DIEU</Text>
        </View>

        <View style={styles.headerChip}>
          <Ionicons name="pulse" size={14} color={COLORS.gold} />
          <Text style={styles.headerChipText}>LIVE</Text>
        </View>
      </View>

      {/* KPI BAR (sur le tab courant) */}
      <View style={styles.kpiRow}>
        <KpiPill
          label="PENDING"
          value={globalKpis.pending}
          color={COLORS.gold}
          icon="time"
        />
        <KpiPill
          label="APPROVED"
          value={globalKpis.approved}
          color={COLORS.green}
          icon="checkmark-circle"
        />
        <KpiPill
          label="REJECTED"
          value={globalKpis.rejected}
          color={COLORS.red}
          icon="close-circle"
        />
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Ionicons
              name={statusIcon(t) as any}
              size={14}
              color={tab === t ? COLORS.gold : COLORS.muted}
            />
            <Text style={[styles.tabText, tab === t && { color: COLORS.gold }]}>
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* LIST */}
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 140 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title || "Sans titre"}
                </Text>

                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.category_code}
                  </Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.product_type || "—"}
                  </Text>
                </View>

                <Text style={styles.cardSub}>
                  Créé: {fmtDate(item.created_at)}
                </Text>
              </View>

              <View style={[styles.badge, { borderColor: badgeColor(item.cadna_status) }]}>
                <Text style={styles.badgeText}>{item.cadna_status.toUpperCase()}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* ================= MODAL — APPLE BLANC JOYEUX ================= */}
<Modal visible={selected !== null} animationType="slide" transparent>
  <View style={styles.modalBg}>
    <View style={styles.sheet}>
      {selected ? (
        <>
          {/* sheet handle */}
          <View style={styles.handle} />

          {/* header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selected.title || "Sans titre"}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {selected.category_code} • {selected.product_type || "—"}
              </Text>
            </View>

            <View
              style={[
                styles.sheetStatusPill,
                { borderColor: badgeColor(selected.cadna_status) },
              ]}
            >
              <Text style={styles.sheetStatusText}>
                {selected.cadna_status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* preview */}
          {selected?.media_path ? (
            <Image
              source={{ uri: selected.media_path }}
              style={styles.preview}
            />
          ) : (
            <View style={styles.noPreview}>
              <Ionicons
                name="image-outline"
                size={22}
                color="#9AA0A6"
              />
              <Text style={styles.noPreviewText}>
                Aperçu indisponible
              </Text>
            </View>
          )}

          {/* CATEGORY KPI */}
          {categoryKpis && (
            <View style={styles.sheetKpiRow}>
              <WhiteKpi
                label="Pending"
                value={categoryKpis.pending}
                tone="gold"
              />
              <WhiteKpi
                label="Approuvés"
                value={categoryKpis.approved}
                tone="green"
              />
              <WhiteKpi
                label="Rejetés"
                value={categoryKpis.rejected}
                tone="red"
              />
            </View>
          )}

          {/* speed */}
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardTitle}>
              Vitesse de décision
            </Text>
            <Text style={styles.whiteCardValue}>
              {categoryKpis?.avgH == null
                ? "—"
                : `${categoryKpis.avgH.toFixed(1)} h (moy.)`}
            </Text>
            <Text style={styles.whiteCardHint}>
              Calcul: création → (approved_at / rejected_at)
            </Text>
          </View>

          {/* details */}
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardTitle}>Détails</Text>

            <InfoRow
              k="Créé"
              v={fmtDate(selected.created_at)}
            />
            <InfoRow
              k="Validé/Rejeté le"
              v={fmtDate(
                selected.approved_at || selected.rejected_at
              )}
            />
            <InfoRow
              k="Validé par"
              v={selected.cadna_reviewed_by || "—"}
            />
            <InfoRow k="ID" v={selected.id} mono />
          </View>

          {/* TOP REVIEWERS */}
          <View style={styles.whiteCard}>
            <Text style={styles.whiteCardTitle}>
              Top reviewers (tab courant)
            </Text>

            {globalKpis.topReviewers.length === 0 ? (
              <Text style={styles.whiteEmpty}>
                Aucun reviewer sur cette liste.
              </Text>
            ) : (
              globalKpis.topReviewers.map((r, idx) => (
                <View key={r.uid} style={styles.rankRow}>
                  <Text style={styles.rankIdx}>
                    #{idx + 1}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.rankUid}
                      numberOfLines={1}
                    >
                      {r.uid}
                    </Text>
                    <Text style={styles.rankMeta}>
                      ✅ {r.approved} ❌ {r.rejected} • Total{" "}
                      {r.total}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* actions pending */}
          {selected.cadna_status === "pending" && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  updateStatus(selected.id, "approved");
                  setSelected(null);
                }}
                style={[
                  styles.actionBtn,
                  { borderColor: COLORS.green },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: COLORS.green },
                  ]}
                >
                  Approuver
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  updateStatus(selected.id, "rejected");
                  setSelected(null);
                }}
                style={[
                  styles.actionBtn,
                  { borderColor: COLORS.red },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: COLORS.red },
                  ]}
                >
                  Rejeter
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={() => setSelected(null)}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>
              Fermer
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  </View>
</Modal>
    </View>
  );
}

/* ================= SMALL COMPONENTS ================= */

function KpiPill({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <View style={[styles.kpiPill, { borderColor: color }]}>
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function WhiteKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gold" | "green" | "red";
}) {
  const c = tone === "green" ? COLORS.green : tone === "red" ? COLORS.red : COLORS.gold;
  return (
    <View style={styles.whiteKpi}>
      <Text style={styles.whiteKpiLabel}>{label}</Text>
      <Text style={[styles.whiteKpiValue, { color: c }]}>{value}</Text>
    </View>
  );
}

function InfoRow({
  k,
  v,
  mono,
}: {
  k: string;
  v?: string | null;
  mono?: boolean;
}) {
  const safeValue = v ?? "—";

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoKey}>{k}</Text>
      <Text
        style={[styles.infoVal, mono && styles.mono]}
        numberOfLines={2}
      >
        {safeValue}
      </Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: COLORS.bg,
  paddingTop: 40,
},

  /* header */
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    opacity: 0.9,
  },
  title: { color: "#fff", fontWeight: "900", fontSize: 16 },

  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.10)",
  },
  headerChipText: { color: COLORS.gold, fontWeight: "900", fontSize: 12 },

  /* KPI row */
  kpiRow: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingBottom: 10 },
  kpiPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#0B0B0B",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderColor: COLORS.border,
  },
  kpiLabel: { color: "rgba(255,255,255,0.7)", fontWeight: "900", fontSize: 11 },
  kpiValue: { marginLeft: "auto", fontWeight: "900", fontSize: 14 },

  /* tabs */
  tabs: { flexDirection: "row", gap: 10, paddingHorizontal: 12, paddingBottom: 6 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#0B0B0B",
  },
  tabActive: {
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.10)",
  },
  tabText: { color: COLORS.muted, fontWeight: "900", fontSize: 12 },

  /* compact cards */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { color: "#fff", fontWeight: "900", fontSize: 13 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  cardMeta: { color: COLORS.muted, fontSize: 11 },
  dot: { color: "rgba(255,255,255,0.25)", fontWeight: "900" },
  cardSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 6 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  /* modal bg */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },

  /* sheet (white happy) */
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginBottom: 10,
  },

  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetTitle: { color: "#000", fontWeight: "900", fontSize: 18 },
  sheetSubtitle: { color: "rgba(0,0,0,0.55)", fontWeight: "700", marginTop: 2 },

  sheetStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  sheetStatusText: { color: "#111", fontWeight: "900", fontSize: 11 },

  preview: {
    height: 170,
    borderRadius: 18,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: "#F2F2F7",
  },

  noPreview: {
    height: 110,
    borderRadius: 18,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noPreviewText: { color: "rgba(0,0,0,0.55)", fontWeight: "800" },

  sheetKpiRow: { flexDirection: "row", gap: 10, marginTop: 6, marginBottom: 10 },
  whiteKpi: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  whiteKpiLabel: { color: "rgba(0,0,0,0.55)", fontWeight: "800", fontSize: 12 },
  whiteKpiValue: { marginTop: 4, fontWeight: "900", fontSize: 18 },

  whiteCard: {
    backgroundColor: "#F2F2F7",
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  whiteCardTitle: { color: "#000", fontWeight: "900", marginBottom: 8 },
  whiteCardValue: { color: "#111", fontWeight: "900", fontSize: 16 },
  whiteCardHint: { color: "rgba(0,0,0,0.55)", fontWeight: "700", marginTop: 6, fontSize: 12 },

  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  infoKey: { color: "rgba(0,0,0,0.55)", fontWeight: "800" },
  infoVal: { color: "#111", fontWeight: "800", textAlign: "right", flex: 1 },
  mono: { fontFamily: "Courier" as any },

  whiteEmpty: { color: "rgba(0,0,0,0.55)", fontWeight: "700" },

  rankRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  rankIdx: { width: 42, fontWeight: "900", color: "#000" },
  rankUid: { fontWeight: "900", color: "#111" },
  rankMeta: { marginTop: 2, color: "rgba(0,0,0,0.55)", fontWeight: "800" },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  actionText: { fontWeight: "900", fontSize: 13 },

  closeBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.30)",
  },
  closeText: { color: COLORS.gold, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  muted: { color: COLORS.muted },
});
