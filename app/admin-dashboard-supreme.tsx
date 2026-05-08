// app/rz-admin-governance/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

// ─── Palette ───────────────────────────────────────────────
const GOLD     = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.12)";
const GOLD_BD  = "rgba(212,175,55,0.28)";
const BG       = "#000000";
const CARD     = "#0D0D0D";
const CARD2    = "#141414";
const SOFT     = "rgba(255,255,255,0.08)";
const TEXT     = "#FFFFFF";
const MUTED    = "rgba(255,255,255,0.50)";
const SUB      = "rgba(255,255,255,0.28)";
const RED      = "#FF3B30";

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

// ─── Section actions ──────────────────────────────────────
const ACTIONS = [
  {
    id:    "wallet",
    icon:  "bank-outline" as const,
    lib:   "mci",
    label: "Finance · Control-Center",
    sub:   "Wallets, TAN, mouvements",
    route: "/rz-admin-governance/admin-finance/wallets-control-center",
    gold:  true,
    red:   false,
  },
  {
    id:    "nomination",
    icon:  "ribbon-outline" as const,
    lib:   "ion",
    label: "Nomination",
    sub:   "Rôles, statuts, agents",
    route: "/rz-admin-governance/admin-command/nomination",
    gold:  false,
    red:   false,
  },
  {
    id:    "broadcast",
    icon:  "radio" as const,
    lib:   "ion",
    label: "RHAZN MOMENT",
    sub:   "Broadcast Supreme",
    route: "/broadcast/publish-broadcast",
    gold:  true,
    red:   false,
  },
  // ✅ AJOUT : Carte CAD SUPRÊME — déplacée depuis cadna-dashboard
  {
    id:    "cadna-supreme",
    icon:  "shield-checkmark-outline" as const,
    lib:   "ion",
    label: "CAD SUPRÊME",
    sub:   "Override absolu · Accès restreint",
    route: "/rz-admin-governance/cadna/cadna-dossiers",
    gold:  false,
    red:   true,    // ← style rouge danger
  },
];

// ─── Composant principal ──────────────────────────────────
export default function AdminDashboard() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [meEmail,   setMeEmail]   = useState("");
  const [walletBal, setWalletBal] = useState<number | null>(null);

  const fadeAnims   = useRef(ACTIONS.map(() => new Animated.Value(0))).current;
  const slideAnims  = useRef(ACTIONS.map(() => new Animated.Value(24))).current;
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    ACTIONS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(fadeAnims[i],  { toValue: 1, duration: 380, delay: 120 + i * 80, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 380, delay: 120 + i * 80, useNativeDriver: true }),
      ]).start();
    });

    supabase.auth.getUser().then(({ data }) => {
      setMeEmail(data?.user?.email || "");
    });

    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id;
      if (!uid) return;
      const { data: w } = await supabase.from("wallets").select("tan_balance").eq("user_id", uid).single();
      if (w) setWalletBal(Number(w.tan_balance));
    });
  }, []);

  const fmt = (n: number) => Number(n).toLocaleString("fr-FR");

  return (
    <View style={styles.screen}>

      {/* ── Grille décorative ─────────────────────── */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${i * 14}%` as any }]} />
        ))}
      </View>

      {/* ── Halo doré ─────────────────────────────── */}
      <View style={styles.halo} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Header ────────────────────────────────── */}
        <Animated.View style={[
          styles.header,
          { paddingTop: insets.top + 16, opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.push("/banq/suspentz")}
              style={styles.logoWrap}
              activeOpacity={0.8}
            >
              <Image source={require("../assets/images/rz-logo-trans.png")} style={styles.logo} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>RZ · ADMIN</Text>
              <Text style={styles.headerSub}>Centre de Commandement</Text>
            </View>
          </View>

          <View style={styles.supremeBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#000" />
            <Text style={styles.supremeBadgeTxt}>SUPREME</Text>
          </View>
        </Animated.View>

        {/* ── Solde Supreme ─────────────────────────── */}
        {walletBal !== null && (
          <Animated.View style={[styles.balanceCard, { opacity: headerFade }]}>
            <View>
              <Text style={styles.balanceLbl}>Solde TAN Supreme</Text>
              <Text style={styles.balanceVal}>{fmt(walletBal)}</Text>
            </View>
            <View style={styles.tanTag}>
              <Text style={styles.tanTagTxt}>TAN</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Divider doré ──────────────────────────── */}
        <View style={styles.dividerWrap}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        {/* ── Actions ───────────────────────────────── */}
        <View style={styles.actionsWrap}>
          {ACTIONS.map((a, i) => (
            <Animated.View
              key={a.id}
              style={{ opacity: fadeAnims[i], transform: [{ translateY: slideAnims[i] }] }}
            >
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  a.gold && styles.actionCardGold,
                  // ✅ Style spécial rouge pour CAD SUPRÊME
                  a.red  && styles.actionCardRed,
                ]}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.8}
              >
                {/* Icône */}
                <View style={[
                  styles.actionIcon,
                  a.gold && styles.actionIconGold,
                  a.red  && styles.actionIconRed,
                ]}>
                  {a.lib === "mci"
                    ? <MaterialCommunityIcons
                        name={a.icon as any}
                        size={24}
                        color={a.gold ? "#000" : a.red ? "#FFF" : GOLD}
                      />
                    : <Ionicons
                        name={a.icon as any}
                        size={24}
                        color={a.gold ? "#000" : a.red ? "#FFF" : GOLD}
                      />
                  }
                </View>

                {/* Texte */}
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.actionLabel,
                    a.gold && styles.actionLabelGold,
                    a.red  && styles.actionLabelRed,
                  ]}>
                    {a.label}
                  </Text>
                  <Text style={[
                    styles.actionSub,
                    a.gold && styles.actionSubGold,
                    a.red  && styles.actionSubRed,
                  ]}>
                    {a.sub}
                  </Text>
                </View>

                {/* ✅ Badge SUPREME pour la carte rouge */}
                {a.red && (
                  <View style={styles.supremeInlineBadge}>
                    <Text style={styles.supremeInlineBadgeTxt}>SUPREME</Text>
                  </View>
                )}

                {/* Flèche */}
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    a.gold ? "rgba(0,0,0,0.4)" :
                    a.red  ? "rgba(255,255,255,0.35)" :
                             "rgba(255,255,255,0.20)"
                  }
                />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* ── Footer ────────────────────────────────── */}
        <Text style={styles.footer}>RHAZN · Sanctuaire du Mérite</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  gridOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  gridLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.025)" },

  halo: {
    position: "absolute", top: -120, right: -120,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: "rgba(212,175,55,0.07)", zIndex: 0,
  },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 20, zIndex: 1,
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 14 },
  logoWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: GOLD_DIM, borderWidth: 1.5, borderColor: GOLD_BD,
    alignItems: "center", justifyContent: "center",
  },
  logo:        { width: 32, height: 32, resizeMode: "contain" },
  headerTitle: { color: GOLD, fontSize: 18, fontWeight: "900", letterSpacing: 1.5 },
  headerSub:   { color: MUTED, fontSize: 11, marginTop: 2, fontWeight: "600" },

  supremeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: GOLD, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  supremeBadgeTxt: { color: "#000", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  balanceCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: GOLD_BD, zIndex: 1,
  },
  balanceLbl: { color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  balanceVal: { color: GOLD, fontSize: 28, fontWeight: "900", marginTop: 2 },
  tanTag: {
    backgroundColor: GOLD_DIM, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: GOLD_BD,
  },
  tanTagTxt: { color: GOLD, fontWeight: "900", fontSize: 14, letterSpacing: 1 },

  dividerWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 24, gap: 10, zIndex: 1 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(212,175,55,0.20)" },
  dividerDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },

  actionsWrap: { paddingHorizontal: 20, gap: 12, zIndex: 1 },

  // Carte standard (fond sombre)
  actionCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  // Carte dorée
  actionCardGold: {
    backgroundColor: GOLD, borderColor: "rgba(212,175,55,0.3)",
    shadowColor: GOLD, shadowOpacity: 0.30,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  // ✅ Carte rouge CAD SUPRÊME
  actionCardRed: {
    backgroundColor: RED,
    borderColor: "rgba(255,59,48,0.35)",
    shadowColor: RED, shadowOpacity: 0.32,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  actionIcon: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BD,
    alignItems: "center", justifyContent: "center",
  },
  actionIconGold: { backgroundColor: "rgba(0,0,0,0.15)", borderColor: "rgba(0,0,0,0.10)" },
  // ✅ Icône rouge semi-transparent
  actionIconRed:  { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.20)" },

  actionLabel:     { color: TEXT, fontWeight: "800", fontSize: 15 },
  actionLabelGold: { color: "#000", fontWeight: "900" },
  actionLabelRed:  { color: "#FFF", fontWeight: "900" },   // ✅
  actionSub:       { color: MUTED, fontSize: 12, marginTop: 3, fontWeight: "600" },
  actionSubGold:   { color: "rgba(0,0,0,0.55)" },
  actionSubRed:    { color: "rgba(255,255,255,0.60)" },    // ✅

  // ✅ Badge SUPREME inline sur la carte rouge
  supremeInlineBadge: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.30)",
  },
  supremeInlineBadgeTxt: { color: "#FFF", fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },

  footer: {
    color: SUB, fontSize: 11, fontWeight: "600",
    textAlign: "center", marginTop: 36, letterSpacing: 0.5, zIndex: 1,
  },
});