/* ─────────────────────────────────────────────
🛡️ CADNA — Dashboard LIVE
RHAZN • Apple-like Premium
✅ Carte CAD SUPRÊME supprimée (déplacée dans Admin Index)
───────────────────────────────────────────── */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminGuard from "../../../components/AdminGuard";
import { supabase } from "../../../lib/supabase";

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
type Tone = "gold" | "blue" | "green" | "red";

function toneColor(t?: Tone): string {
  switch (t) {
    case "blue":  return BLUE;
    case "green": return GREEN;
    case "red":   return RED;
    default:      return GOLD;
  }
}

// ─── Toast iOS ──────────────────────────────────────────────
function IOSToast({ toast, anim }: {
  toast: { title: string; sub: string; type: "success" | "error" | "info" } | null;
  anim: Animated.Value;
}) {
  if (!toast) return null;
  const color = toast.type === "success" ? GREEN : toast.type === "error" ? RED : BLUE;
  const icon: any = toast.type === "success" ? "checkmark-circle" : toast.type === "error" ? "close-circle" : "information-circle";
  return (
    <Animated.View style={[styles.iosToast, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
    }]}>
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

// ─── Barre de progression animée ────────────────────────────
function ProgressBar({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct      = total === 0 ? 0 : Math.round((value / total) * 100);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct, duration: 700, delay: 200, useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <View style={[styles.progressDot, { backgroundColor: color }]} />
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressCount, { color }]}>{value}</Text>
        <Text style={styles.progressPct}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          },
        ]} />
      </View>
    </View>
  );
}

// ─── KPI Card ───────────────────────────────────────────────
function KPICard({ title, value, hint, tone, anim }: {
  title: string; value: number; hint: string; tone: Tone; anim: Animated.Value;
}) {
  const color  = toneColor(tone);
  const iconName: any =
    tone === "blue"  ? "time-outline" :
    tone === "green" ? "checkmark-circle-outline" :
                       "close-circle-outline";

  return (
    <Animated.View style={[
      styles.kpiCard,
      {
        opacity: anim,
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.90, 1] }) }],
      },
    ]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiHint}>{hint}</Text>
    </Animated.View>
  );
}

// ─── Dashboard principal ────────────────────────────────────
export default function CadnaDashboard() {
  return (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}

function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pending,  setPending]  = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);

  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;
  // ✅ MODIFIÉ : 2 tiles au lieu de 3 (Supreme supprimée)
  const kpiAnims    = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const tileAnims   = useRef([0, 1].map(() => new Animated.Value(0))).current;
  const slideAnims  = useRef([0, 1].map(() => new Animated.Value(20))).current;

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ title: string; sub: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (title: string, sub: string, type: "success" | "error" | "info" = "info") => {
    setToast({ title, sub, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  };

  const loadStats = async () => {
    const [{ count: p }, { count: a }, { count: r }] = await Promise.all([
      supabase.from("cadna_queue").select("*", { count: "exact", head: true }).eq("cadna_status", "pending"),
      supabase.from("cadna_queue").select("*", { count: "exact", head: true }).eq("cadna_status", "approved"),
      supabase.from("cadna_queue").select("*", { count: "exact", head: true }).eq("cadna_status", "rejected"),
    ]);
    setPending(p  || 0);
    setApproved(a || 0);
    setRejected(r || 0);
  };

  useEffect(() => {
    loadStats();

    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();

    kpiAnims.forEach((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 400, delay: 100 + i * 80, useNativeDriver: true }).start()
    );

    tileAnims.forEach((a, i) =>
      Animated.parallel([
        Animated.timing(a,             { toValue: 1, duration: 380, delay: 320 + i * 80, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 380, delay: 320 + i * 80, useNativeDriver: true }),
      ]).start()
    );

    const ch = supabase.channel("cadna-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cadna_queue" }, () => {
        loadStats();
        showToast("Mise à jour", "La file CADNA a changé.", "info");
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const total = pending + approved + rejected;

  // ✅ MODIFIÉ : 2 tiles uniquement (File d'attente + Dossiers)
  const tiles = useMemo(() => [
    {
      id:    "queue",
      title: "File d'attente",
      sub:   `${pending} contenu${pending !== 1 ? "s" : ""} à examiner`,
      icon:  "mail-unread-outline",
      route: "/rz-admin-governance/cadna/cadna-review-queue",
      badge: pending > 0 ? String(pending) : "0",
      tone:  "blue" as Tone,
      gold:  false,
    },
    {
      id:    "dossiers",
      title: "Dossiers",
      sub:   `${approved} validés · ${rejected} rejetés`,
      icon:  "folder-open-outline",
      route: "/rz-admin-governance/cadna/cadna-dossiers",
      badge: "CASE",
      tone:  "gold" as Tone,
      gold:  false,
    },
    // ✅ SUPPRIMÉ : carte "CAD SUPRÊME" — déplacée dans Admin Index
  ], [pending, approved, rejected]);

  const go = async (route: string) => {
    try { await Haptics.selectionAsync(); } catch {}
    router.push(route as any);
  };

  return (
    <View style={styles.screen}>

      <IOSToast toast={toast} anim={toastAnim} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >

        {/* ── Header ─────────────────────────────────── */}
        <Animated.View style={[
          styles.header,
          { paddingTop: insets.top + 14, opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>CADNA</Text>
            <Text style={styles.hSub}>Validation morale · Temps réel</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>LIVE</Text>
          </View>
        </Animated.View>

        {/* ── KPI ────────────────────────────────────── */}
        <View style={styles.kpiRow}>
          <KPICard title="En attente" value={pending}  hint="À examiner" tone="blue"  anim={kpiAnims[0]} />
          <KPICard title="Approuvés"  value={approved} hint="Validés"    tone="green" anim={kpiAnims[1]} />
          <KPICard title="Rejetés"    value={rejected} hint="Refusés"    tone="red"   anim={kpiAnims[2]} />
        </View>

        {/* ── Barres répartition ─────────────────────── */}
        <View style={styles.progressCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <Text style={styles.sectionTitle}>Répartition</Text>
              <Text style={styles.sectionSub}>{total} dossiers au total</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeTxt}>{total}</Text>
            </View>
          </View>
          <View style={{ gap: 16 }}>
            <ProgressBar label="Approuvés"  value={approved} total={total} color={GREEN} />
            <ProgressBar label="En attente" value={pending}  total={total} color={BLUE}  />
            <ProgressBar label="Rejetés"    value={rejected} total={total} color={RED}   />
          </View>
        </View>

        {/* ── Actions — 2 tiles uniquement ────────────── */}
        <View style={styles.tilesWrap}>
          <Text style={styles.actionsTitle}>Actions</Text>
          {tiles.map((t, i) => (
            <Animated.View
              key={t.id}
              style={{ opacity: tileAnims[i], transform: [{ translateY: slideAnims[i] }] }}
            >
              <Pressable
                style={[styles.tile, t.gold && styles.tileGold]}
                onPress={() => go(t.route)}
              >
                <View style={[
                  styles.tileIcon,
                  { backgroundColor: t.gold ? "rgba(0,0,0,0.15)" : `${toneColor(t.tone)}15` },
                  { borderColor:     t.gold ? "rgba(0,0,0,0.10)" : `${toneColor(t.tone)}30` },
                ]}>
                  <Ionicons name={t.icon as any} size={24} color={t.gold ? "#000" : toneColor(t.tone)} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.tileTitle, t.gold && { color: "#000" }]}>{t.title}</Text>
                  <Text style={[styles.tileSub,   t.gold && { color: "rgba(0,0,0,0.55)" }]}>{t.sub}</Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View style={[
                    styles.tileBadge,
                    { backgroundColor: t.gold ? "rgba(0,0,0,0.12)" : `${toneColor(t.tone)}15` },
                    { borderColor:     t.gold ? "rgba(0,0,0,0.10)" : `${toneColor(t.tone)}35` },
                  ]}>
                    <Text style={[styles.tileBadgeTxt, { color: t.gold ? "#000" : toneColor(t.tone) }]}>
                      {t.badge}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={t.gold ? "rgba(0,0,0,0.30)" : SOFT}
                  />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.footer}>RHAZN · Commission CADNA · Sanctuaire du Mérite</Text>

      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header:   { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  backBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: SOFT, alignItems: "center", justifyContent: "center" },
  hTitle:   { color: TEXT, fontSize: 20, fontWeight: "800" },
  hSub:     { color: MUTED, fontSize: 12, marginTop: 2 },
  liveBadge:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${GREEN}18`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: `${GREEN}35` },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  liveTxt:  { color: GREEN, fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },

  kpiRow:     { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  kpiCard:    { flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: SOFT, alignItems: "center", gap: 4 },
  kpiIconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  kpiValue:   { fontSize: 26, fontWeight: "900" },
  kpiTitle:   { color: TEXT, fontSize: 11, fontWeight: "800", textAlign: "center" },
  kpiHint:    { color: MUTED, fontSize: 10, fontWeight: "600", textAlign: "center" },

  progressCard:     { marginHorizontal: 16, backgroundColor: CARD, borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: SOFT },
  sectionTitle:     { color: TEXT, fontWeight: "800", fontSize: 15 },
  sectionSub:       { color: MUTED, fontSize: 12, marginTop: 2 },
  totalBadge:       { backgroundColor: GOLD_DIM, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: GOLD_BD },
  totalBadgeTxt:    { color: GOLD, fontWeight: "900", fontSize: 16 },
  progressRow:      { gap: 8 },
  progressLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressDot:      { width: 8, height: 8, borderRadius: 4 },
  progressLabel:    { flex: 1, color: TEXT, fontSize: 13, fontWeight: "700" },
  progressCount:    { fontSize: 13, fontWeight: "900" },
  progressPct:      { color: MUTED, fontSize: 11, fontWeight: "700", minWidth: 34, textAlign: "right" },
  progressTrack:    { height: 8, backgroundColor: BG, borderRadius: 99, overflow: "hidden" },
  progressFill:     { height: "100%", borderRadius: 99 },

  tilesWrap:    { paddingHorizontal: 16, gap: 12 },
  actionsTitle: { color: TEXT, fontWeight: "800", fontSize: 17, marginBottom: 4 },
  tile: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: CARD, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: SOFT,
  },
  tileGold: {
    backgroundColor: GOLD, borderColor: GOLD_BD,
    shadowColor: GOLD, shadowOpacity: 0.28,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  tileIcon:     { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  tileTitle:    { color: TEXT, fontWeight: "800", fontSize: 15 },
  tileSub:      { color: MUTED, fontSize: 12, marginTop: 3 },
  tileBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  tileBadgeTxt: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },

  footer: { color: MUTED, fontSize: 11, fontWeight: "600", textAlign: "center", marginTop: 24, letterSpacing: 0.3 },

  iosToast:      { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 14, right: 14, zIndex: 9999, backgroundColor: CARD, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14, borderWidth: 1, borderColor: SOFT },
  iosToastIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iosToastTitle: { color: TEXT, fontWeight: "800", fontSize: 14 },
  iosToastSub:   { color: MUTED, fontSize: 12, marginTop: 2 },
});