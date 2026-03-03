/* ─────────────────────────────────────────────
🛡️ CADNA — Dashboard LIVE (DYNAMIQUE)
RHAZN • MODE DIEU
───────────────────────────────────────────── */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

/* 🎨 PALETTE */
const COLORS = {
  bg: "#000000",
  card: "rgba(255,255,255,0.06)",
  card2: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.70)",
  muted2: "rgba(255,255,255,0.55)",
  gold: "#D4AF37",
  green: "#00C853",
  red: "#C62828",
  blue: "#007AFF",
};

type Tile = {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  badge?: string;
  tone?: "gold" | "blue" | "green" | "red";
};

export default function CadnaDashboard() {
  return (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}

function Dashboard() {
  const router = useRouter();

  const [pending, setPending] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);

  const loadStats = async () => {
    const { count: p } = await supabase
      .from("store_products")
      .select("*", { count: "exact", head: true })
      .eq("cadna_status", "pending");

    const { count: a } = await supabase
      .from("store_products")
      .select("*", { count: "exact", head: true })
      .eq("cadna_status", "approved");

    const { count: r } = await supabase
      .from("store_products")
      .select("*", { count: "exact", head: true })
      .eq("cadna_status", "rejected");

    setPending(p || 0);
    setApproved(a || 0);
    setRejected(r || 0);
  };

  useEffect(() => {
    loadStats();

    const ch = supabase
      .channel("cadna-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_products" },
        () => loadStats()
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  const tiles: Tile[] = useMemo(
    () => [
      {
        title: "File d’attente",
        subtitle: `${pending} contenus à examiner`,
        icon: "inbox",
        route: "/rz-admin-governance/cadna/cadna-review-queue",
        badge: String(pending),
        tone: "blue",
      },
      {
        title: "Dossiers",
        subtitle: `${approved} validés • ${rejected} rejetés`,
        icon: "folder",
        route: "/rz-admin-governance/cadna/cadna-dossiers",
        badge: "CASE",
      },
      {
        title: "CAD SUPRÊME",
        subtitle: "Override absolu",
        icon: "award",
        route: "/rz-admin-governance/cadna/cadna-review-content",
        badge: "SUPREME",
        tone: "red",
      },
    ],
    [pending, approved, rejected]
  );

  const go = async (route: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    router.push(route as any);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandDot} />
          <Text style={styles.brand}>RHAZN • CADNA</Text>
        </View>

        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Siège central de validation morale en temps réel.
        </Text>
      </View>

      {/* KPI LIVE */}
      <View style={styles.kpiRow}>
        <KPI title="En attente" value={pending} hint="Non traités" tone="blue" />
        <KPI title="Rejets" value={rejected} hint="Non conformes" tone="red" />
        <KPI title="Approuvés" value={approved} hint="Validés" tone="green" />
      </View>

      {/* BARRES */}
      <View style={styles.progressBlock}>
        <Progress label="Validation" value={approved} total={approved + rejected + pending} color={COLORS.green}/>
        <Progress label="Rejets" value={rejected} total={approved + rejected + pending} color={COLORS.red}/>
        <Progress label="En attente" value={pending} total={approved + rejected + pending} color={COLORS.blue}/>
      </View>

      {/* TILES */}
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.title}
            onPress={() => go(t.route)}
            style={styles.tile}
          >
            <View style={styles.tileTop}>
              <Feather name={t.icon} size={18} color={toneColor(t.tone)} />
              <View style={[styles.badge, { borderColor: toneColor(t.tone) }]}>
                <Text style={[styles.badgeText, { color: toneColor(t.tone) }]}>
                  {t.badge}
                </Text>
              </View>
            </View>

            <Text style={styles.tileTitle}>{t.title}</Text>
            <Text style={styles.tileSubtitle}>{t.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/* KPI */
function KPI({ title, value, hint, tone }: any) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color: toneColor(tone) }]}>{value}</Text>
      <Text style={styles.kpiHint}>{hint}</Text>
    </View>
  );
}

/* PROGRESS */
function Progress({ label, value, total, color }: any) {
  const percent = total === 0 ? 0 : (value / total) * 100;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "#fff", marginBottom: 6 }}>
        {label} ({value})
      </Text>

      <View
        style={{
          height: 8,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            height: "100%",
          }}
        />
      </View>
    </View>
  );
}

function toneColor(tone?: "gold" | "blue" | "green" | "red") {
  switch (tone) {
    case "blue": return COLORS.blue;
    case "green": return COLORS.green;
    case "red": return COLORS.red;
    default: return COLORS.gold;
  }
}

/* STYLE */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },

  // 🔥 ICI ON DESCEND LE CONTENU
  container: {
    padding: 18,
    paddingTop: 42,   // ⬅️ ajouté pour descendre le contenu
  },

  headerTop: { flexDirection: "row", gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: COLORS.gold },
  brand: { color: COLORS.muted, fontSize: 12 },

  title: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 10 },
  subtitle: { color: COLORS.muted, marginTop: 6 },

  kpiRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card2,
    borderRadius: 16,
    padding: 12,
  },
  kpiTitle: { color: COLORS.muted },
  kpiValue: { fontSize: 26, fontWeight: "900", marginTop: 6 },
  kpiHint: { color: COLORS.muted2, fontSize: 11 },

  progressBlock: { marginTop: 20 },

  grid: { marginTop: 20, gap: 12 },
  tile: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileTop: { flexDirection: "row", justifyContent: "space-between" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },

  tileTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 10 },
  tileSubtitle: { color: COLORS.muted, marginTop: 4 },
});