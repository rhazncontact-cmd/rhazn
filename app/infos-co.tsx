/* ================================================================
📱 RHAZN — INFOS • APPLE-LIKE DARK PREMIUM
   app/infos.tsx

✅ Suspentz → rz-channel/auteur?uid=xxx&tab=Suspentz
✅ Produits  → rz-channel/auteur?uid=xxx&tab=Produits
✅ KoseSans / Audio / Vidéo → restent ici (page active)
================================================================ */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#000000",
  card:      "#0E0E0E",
  surface:   "#111111",
  surface2:  "#161616",
  white:     "#FFFFFF",
  muted:     "rgba(255,255,255,0.72)",
  sub:       "rgba(255,255,255,0.42)",
  ghost:     "rgba(255,255,255,0.18)",
  border:    "rgba(255,255,255,0.10)",
  hairline:  "rgba(255,255,255,0.07)",
  gold:      "#D4AF37",
  goldDim:   "rgba(212,175,55,0.10)",
  goldBorder:"rgba(212,175,55,0.28)",
  danger:    "#FF453A",
  ok:        "#34C759",
  blue:      "#007AFF",
  purple:    "#BF5AF2",
  orange:    "#FF9F0A",
  teal:      "#5AC8FA",
};

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────────────────────────
const NAV_TABS = [
  { label: "Suspentz", route: "/publish/suspentz" },
  { label: "Produits",  route: "/publish/products"  },
  { label: "KoseSans",  route: "/infos"              },
  { label: "Audio",     route: "/infos"              },
  { label: "Vidéo",     route: "/infos"              },
] as const;

// ─────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "kosesans",
    label: "KoseSans",
    tagline: "La parole libre de RHAZN",
    accent: C.gold,
    accentDim: C.goldDim,
    accentBorder: C.goldBorder,
    icon: "chatbubble-ellipses-outline" as const,
    badge: "BIENTÔT",
    badgeBg: C.gold,
    badgeText: "#000",
    description: "KoseSans est l'espace d'expression textuelle de RHAZN. Publiez des articles, des réflexions profondes, des conseils pratiques ou des analyses — sans limite de format.",
    features: [
      { icon: "document-text-outline" as const,    title: "Articles & Réflexions", text: "Exprimez-vous en texte long, structuré ou libre. Votre voix, votre style." },
      { icon: "people-outline" as const,           title: "Audience engagée",      text: "Rejoignez une communauté qui lit, commente et partage du contenu de qualité." },
      { icon: "trophy-outline" as const,           title: "Revenus QOB",            text: "Chaque lecture génère des QOB. Plus votre contenu est lu, plus vous gagnez." },
      { icon: "shield-checkmark-outline" as const, title: "Validation CADNA",       text: "Votre publication est vérifiée avant diffusion pour garantir la qualité." },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    tagline: "Votre voix, votre univers",
    accent: C.purple,
    accentDim: "rgba(191,90,242,0.10)",
    accentBorder: "rgba(191,90,242,0.28)",
    icon: "mic-outline" as const,
    badge: "BIENTÔT",
    badgeBg: C.purple,
    badgeText: "#FFF",
    description: "Podcasts, conférences, méditations, musique — RHAZN Audio vous offre une plateforme dédiée à la création sonore. Touchez vos auditeurs là où les mots seuls ne suffisent pas.",
    features: [
      { icon: "musical-notes-outline" as const, title: "Musique & Podcasts",    text: "Publiez vos productions audio en haute qualité, de la voix à la composition." },
      { icon: "headset-outline" as const,       title: "Écoute immersive",      text: "Un lecteur optimisé pour une expérience d'écoute premium sur mobile." },
      { icon: "bar-chart-outline" as const,     title: "Statistiques d'écoute", text: "Suivez vos écoutes, durée moyenne et engagement de votre audience." },
      { icon: "sparkles-outline" as const,      title: "Monétisation ACSET",    text: "Chaque écoute complète vous rapporte des ACSET reversés directement." },
    ],
  },
  {
    id: "video",
    label: "Vidéo",
    tagline: "Le cinéma de vos idées",
    accent: C.teal,
    accentDim: "rgba(90,200,250,0.10)",
    accentBorder: "rgba(90,200,250,0.28)",
    icon: "videocam-outline" as const,
    badge: "BIENTÔT",
    badgeBg: C.teal,
    badgeText: "#000",
    description: "Documentaires, tutoriels, vlogs, films courts — RHAZN Vidéo est la plateforme pour les créateurs qui veulent aller au-delà du format court de Suspentz.",
    features: [
      { icon: "film-outline" as const,         title: "Formats longs",       text: "Publiez des vidéos jusqu'à 60 minutes. Racontez des histoires complètes." },
      { icon: "cloud-upload-outline" as const, title: "Upload HD sécurisé",  text: "Infrastructure RHAZN optimisée pour les vidéos haute définition." },
      { icon: "eye-outline" as const,          title: "Système de vues",     text: "Chaque vue validée génère des revenus QOB calculés en temps réel." },
      { icon: "lock-closed-outline" as const,  title: "Contenu Premium",     text: "Verrouillez vos meilleures vidéos derrière un accès payant en TAN." },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Feature Row
// ─────────────────────────────────────────────────────────────
function FeatureRow({ icon, title, text, accent }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; text: string; accent: string;
}) {
  return (
    <View style={fr.row}>
      <View style={[fr.iconWrap, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={fr.textWrap}>
        <Text style={fr.title}>{title}</Text>
        <Text style={fr.text}>{text}</Text>
      </View>
    </View>
  );
}
const fr = StyleSheet.create({
  row:      { flexDirection: "row", gap: 14, marginBottom: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textWrap: { flex: 1 },
  title:    { color: C.white, fontWeight: "800", fontSize: 13.5, marginBottom: 3 },
  text:     { color: "rgba(255,255,255,0.52)", fontWeight: "600", fontSize: 12, lineHeight: 17 },
});

// ─────────────────────────────────────────────────────────────
// Section Card (accordion)
// ─────────────────────────────────────────────────────────────
function SectionCard({ section }: { section: (typeof SECTIONS)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.spring(anim, { toValue: expanded ? 0 : 1, useNativeDriver: false, friction: 8 }).start();
    setExpanded(!expanded);
  };

  const chevronRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={[sc.sectionCard, { borderColor: expanded ? section.accentBorder : C.border }]}>
      <Pressable style={sc.sectionHeader} onPress={toggle}>
        <View style={[sc.sectionIconWrap, { backgroundColor: section.accentDim, borderColor: section.accentBorder }]}>
          <Ionicons name={section.icon} size={22} color={section.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={sc.labelRow}>
            <Text style={[sc.sectionLabel, { color: section.accent }]}>{section.label}</Text>
            <View style={[sc.badge, { backgroundColor: section.badgeBg }]}>
              <Text style={[sc.badgeTxt, { color: section.badgeText }]}>{section.badge}</Text>
            </View>
          </View>
          <Text style={sc.sectionTagline}>{section.tagline}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.35)" />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={sc.sectionBody}>
          <View style={[sc.divider, { backgroundColor: section.accentBorder }]} />
          <Text style={sc.description}>{section.description}</Text>
          <View style={sc.featuresWrap}>
            {section.features.map((f) => (
              <FeatureRow key={f.title} icon={f.icon} title={f.title} text={f.text} accent={section.accent} />
            ))}
          </View>
          <View style={[sc.soonBanner, { borderColor: section.accentBorder, backgroundColor: section.accentDim }]}>
            <Ionicons name="time-outline" size={16} color={section.accent} />
            <Text style={[sc.soonTxt, { color: section.accent }]}>
              Cette fonctionnalité arrive très prochainement sur RHAZN.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Pill
// ─────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={sp.wrap}>
      <Ionicons name={icon} size={16} color={C.gold} />
      <Text style={sp.val}>{value}</Text>
      <Text style={sp.lbl}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 14 },
  val:  { color: C.white, fontWeight: "900", fontSize: 17 },
  lbl:  { color: "rgba(255,255,255,0.42)", fontWeight: "700", fontSize: 10 },
});

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function InfosScreen() {
  const router = useRouter();

  // ✅ uid passé depuis auteur.tsx pour le retour correct
  const { uid } = useLocalSearchParams<{ uid?: string }>();

  const [acsetBalance,   setAcsetBalance]   = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [isSupreme,      setIsSupreme]      = useState(false);

  const fetchCredits = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const supreme = (user.email ?? "").toLowerCase() === "meyounbauniklovegodstory@gmail.com";
      setIsSupreme(supreme);
      if (supreme) { setAcsetBalance(Number.MAX_SAFE_INTEGER); return; }
      const { data: w } = await supabase
        .from("wallets").select("acset_balance").eq("user_id", user.id).single();
      setAcsetBalance(Number(w?.acset_balance ?? 0));
    } finally { setCreditsLoading(false); }
  }, []);

  useEffect(() => { setTimeout(() => fetchCredits(), 0); }, [fetchCredits]);

  // ✅ Routing des tabs
  const handleNavTab = (tab: (typeof NAV_TABS)[number]) => {
    // KoseSans / Audio / Vidéo → déjà ici
    if (tab.label === "KoseSans" || tab.label === "Audio" || tab.label === "Vidéo") return;

    // ✅ Suspentz → auteur sur tab Suspentz
    // ✅ Produits  → auteur sur tab Produits
    if (uid) {
      router.push({
        pathname: "/rz-channel/auteur",
        params: { uid, tab: tab.label },   // tab = "Suspentz" ou "Produits"
      } as any);
      return;
    }

    // Fallback si pas de uid (accès direct depuis publish/)
    router.push(tab.route as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ════════ HEADER ════════ */}
      <View style={s.floatingHeader}>

        {/* Ligne 1 : Titre + ACSET */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Publier</Text>
            <Text style={s.headerSub}>Choisissez votre format de création</Text>
          </View>
          <View style={s.creditsBadge}>
            {creditsLoading ? (
              <ActivityIndicator size="small" color={C.gold} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={14} color={C.gold} />
                <Text style={s.creditsText}>
                  {isSupreme ? "∞" : acsetBalance === null ? "—" : acsetBalance}
                </Text>
                <Text style={s.creditsLabel}>ACSET</Text>
              </>
            )}
          </View>
        </View>

        {/* Ligne 2 : Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.navTabsScroll}
          contentContainerStyle={s.navTabsContent}
        >
          {NAV_TABS.map((tab) => {
            const isActive    = tab.label === "KoseSans";
            // ✅ Suspentz et Produits ont une flèche ← si on vient d'auteur
            const isReturnTab = (tab.label === "Suspentz" || tab.label === "Produits") && !!uid;
            return (
              <Pressable
                key={tab.label}
                style={[s.navTab, isActive && s.navTabActive]}
                onPress={() => handleNavTab(tab)}
              >
                {isReturnTab && (
                  <Ionicons
                    name="chevron-back-outline"
                    size={12}
                    color="rgba(255,255,255,0.55)"
                    style={{ marginRight: 2 }}
                  />
                )}
                <Text style={[s.navTabTxt, isActive && s.navTabTxtActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Ligne 3 : Pills */}
        <View style={s.pillsRow}>
          <View style={s.pill}>
            <Ionicons name="layers-outline" size={13} color="rgba(255,255,255,0.55)" />
            <Text style={s.pillTxt}>3 formats</Text>
          </View>
          <View style={s.pill}>
            <Ionicons name="rocket-outline" size={13} color="rgba(255,255,255,0.55)" />
            <Text style={s.pillTxt}>Bientôt disponible</Text>
          </View>
          <View style={[s.pill, { borderColor: C.goldBorder }]}>
            <Ionicons name="sparkles-outline" size={13} color={C.gold} />
            <Text style={[s.pillTxt, { color: C.gold }]}>Premium</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* HERO */}
        <View style={s.hero}>
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />
          <View style={s.heroIconRow}>
            <View style={[s.heroIconWrap, { backgroundColor: C.goldDim, borderColor: C.goldBorder }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.gold} />
            </View>
            <View style={[s.heroIconWrap, { backgroundColor: "rgba(191,90,242,0.10)", borderColor: "rgba(191,90,242,0.28)" }]}>
              <Ionicons name="mic-outline" size={20} color={C.purple} />
            </View>
            <View style={[s.heroIconWrap, { backgroundColor: "rgba(90,200,250,0.10)", borderColor: "rgba(90,200,250,0.28)" }]}>
              <Ionicons name="videocam-outline" size={20} color={C.teal} />
            </View>
          </View>
          <Text style={s.heroTitle}>Créez. Publiez. Gagnez.</Text>
          <Text style={s.heroSub}>
            RHAZN prépare trois nouveaux formats de création exclusifs. Découvrez ce qui arrive bientôt sur la plateforme.
          </Text>
          <View style={s.statsRow}>
            <StatPill icon="people-outline" value="10K+"  label="Créateurs" />
            <View style={s.statsDivider} />
            <StatPill icon="eye-outline"    value="500K+" label="Vues/jour" />
            <View style={s.statsDivider} />
            <StatPill icon="cash-outline"   value="100%"  label="Revenus créateurs" />
          </View>
        </View>

        {/* SECTIONS ACCORDION */}
        <View style={s.sectionsWrap}>
          <Text style={s.sectionsTitle}>Les formats à venir</Text>
          <Text style={s.sectionsSub}>
            Appuyez sur chaque format pour découvrir ses fonctionnalités et avantages.
          </Text>
          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </View>

        {/* REVENUS */}
        <View style={s.revenueCard}>
          <View style={s.revenueHeader}>
            <Ionicons name="sparkles" size={20} color={C.gold} />
            <Text style={s.revenueTitle}>Comment ça marche ?</Text>
          </View>
          <Text style={s.revenueText}>
            Sur RHAZN, chaque publication consomme des <Text style={s.goldTxt}>ACSET</Text> pour accéder à la plateforme. En échange, chaque interaction de votre audience vous rapporte des <Text style={s.goldTxt}>QOB</Text> et des <Text style={s.goldTxt}>TAN</Text> — la monnaie de l'écosystème RHAZN.
          </Text>
          {[
            { icon: "sparkles-outline" as const,  color: C.gold,   label: "ACSET", desc: "Crédit de publication. Rechargez votre wallet pour publier." },
            { icon: "diamond-outline" as const,   color: C.teal,   label: "QOB",   desc: "Gagnés à chaque vue, écoute ou lecture de votre contenu." },
            { icon: "logo-bitcoin" as const,      color: C.orange, label: "TAN",   desc: "La monnaie principale de RHAZN pour les transactions premium." },
          ].map((item) => (
            <View key={item.label} style={s.tokenRow}>
              <View style={[s.tokenIcon, { backgroundColor: `${item.color}15`, borderColor: `${item.color}28` }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.tokenLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={s.tokenDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={s.ctaCard}>
          <Text style={s.ctaTitle}>Commencez dès maintenant</Text>
          <Text style={s.ctaSub}>
            En attendant les nouveaux formats, publiez votre premier Suspentz et rejoignez la communauté RHAZN.
          </Text>

          {/* ✅ Suspentz → retour auteur tab Suspentz si uid connu */}
          <Pressable
            style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.88 }]}
            onPress={() => {
              if (uid) router.push({ pathname: "/rz-channel/auteur", params: { uid, tab: "Suspentz" } } as any);
              else router.push("/rz-channel/auteur");
            }}
          >
            <Ionicons name="play-circle-outline" size={18} color="#000" />
            <Text style={s.ctaBtnTxt}>Publier un Suspentz</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.55)" />
          </Pressable>

          {/* ✅ Produits → retour auteur tab Produits si uid connu */}
          <Pressable
            style={({ pressed }) => [s.ctaBtnSecondary, pressed && { opacity: 0.88 }]}
            onPress={() => {
              if (uid) router.push({ pathname: "/rz-channel/auteur", params: { uid, tab: "Produits" } } as any);
              else router.push("/rz-channel/auteur");
            }}
          >
            <Ionicons name="cube-outline" size={18} color={C.gold} />
            <Text style={s.ctaBtnSecondaryTxt}>Publier un Produit</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(212,175,55,0.45)" />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>RHAZN • Plateforme de création premium</Text>
          <Text style={s.footerSub}>
            Toutes les fonctionnalités en développement sont soumises à validation CADNA avant leur lancement officiel.
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

/* ==================== STYLES ==================== */
const s = StyleSheet.create({
  scrollContent: { paddingTop: 225 },
  floatingHeader: {
    position: "absolute", top: 42, left: 0, right: 0,
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 12,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.hairline,
    zIndex: 50, elevation: 12,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  headerRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 12 },
  headerTitle:  { color: C.white, fontSize: 26, fontWeight: "900" },
  headerSub:    { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4 },
  creditsBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)", backgroundColor: "rgba(212,175,55,0.08)",
  },
  creditsText:  { color: C.gold, fontWeight: "900", fontSize: 15 },
  creditsLabel: { color: "rgba(212,175,55,0.65)", fontWeight: "800", fontSize: 10 },
  navTabsScroll:   { marginBottom: 10 },
  navTabsContent:  { gap: 8, paddingRight: 4 },
  navTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  navTabActive:    { backgroundColor: C.gold, borderColor: "transparent" },
  navTabTxt:       { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 13 },
  navTabTxtActive: { color: "#000", fontWeight: "900" },
  pillsRow: { flexDirection: "row", gap: 8 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: C.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  pillTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 11 },
  hero: {
    margin: 16, padding: 24, borderRadius: 24,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    overflow: "hidden", position: "relative",
  },
  heroCircle1:  { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(212,175,55,0.04)", top: -60, right: -60 },
  heroCircle2:  { position: "absolute", width: 150, height: 150, borderRadius: 75,  backgroundColor: "rgba(90,200,250,0.04)", bottom: -40, left: -30 },
  heroIconRow:  { flexDirection: "row", gap: 10, marginBottom: 18 },
  heroIconWrap: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroTitle:    { color: C.white, fontSize: 22, fontWeight: "900", marginBottom: 10, lineHeight: 28 },
  heroSub:      { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20, marginBottom: 20 },
  statsRow:     { flexDirection: "row", backgroundColor: C.surface2, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  statsDivider: { width: 1, backgroundColor: C.border, marginVertical: 10 },
  sectionsWrap:  { paddingHorizontal: 16, marginBottom: 6 },
  sectionsTitle: { color: C.white, fontWeight: "900", fontSize: 20, marginBottom: 6 },
  sectionsSub:   { color: "rgba(255,255,255,0.42)", fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
  revenueCard: {
    margin: 16, marginTop: 4,
    backgroundColor: C.card, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.border,
  },
  revenueHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  revenueTitle:  { color: C.white, fontWeight: "900", fontSize: 16 },
  revenueText:   { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20, marginBottom: 16, fontWeight: "600" },
  goldTxt:       { color: C.gold, fontWeight: "900" },
  tokenRow:      { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  tokenIcon:     { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tokenLabel:    { fontWeight: "900", fontSize: 13, marginBottom: 2 },
  tokenDesc:     { color: "rgba(255,255,255,0.45)", fontWeight: "600", fontSize: 11.5, lineHeight: 16 },
  ctaCard: {
    margin: 16, marginTop: 4,
    backgroundColor: C.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: C.goldBorder,
  },
  ctaTitle: { color: C.white, fontWeight: "900", fontSize: 18, marginBottom: 8 },
  ctaSub:   { color: "rgba(255,255,255,0.50)", fontSize: 13, lineHeight: 19, marginBottom: 18, fontWeight: "600" },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.gold, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 10,
    shadowColor: C.gold, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  ctaBtnTxt:          { flex: 1, color: "#000", fontWeight: "900", fontSize: 15 },
  ctaBtnSecondary:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.goldDim, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, borderWidth: 1, borderColor: C.goldBorder },
  ctaBtnSecondaryTxt: { flex: 1, color: C.gold, fontWeight: "900", fontSize: 15 },
  footer:    { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 4, alignItems: "center" },
  footerTxt: { color: "rgba(255,255,255,0.28)", fontWeight: "900", fontSize: 11, marginBottom: 5, letterSpacing: 0.5 },
  footerSub: { color: "rgba(255,255,255,0.20)", fontWeight: "600", fontSize: 10, lineHeight: 15, textAlign: "center" },
});

const sc = StyleSheet.create({
  sectionCard:     { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  sectionIconWrap: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  labelRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionLabel:    { fontWeight: "900", fontSize: 16 },
  badge:           { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeTxt:        { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  sectionTagline:  { color: "rgba(255,255,255,0.50)", fontWeight: "700", fontSize: 12 },
  sectionBody:     { paddingHorizontal: 16, paddingBottom: 16 },
  divider:         { height: 1, marginBottom: 16, opacity: 0.35 },
  description:     { color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 20, marginBottom: 18, fontWeight: "600" },
  featuresWrap:    { marginBottom: 6 },
  soonBanner:      { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  soonTxt:         { flex: 1, fontWeight: "700", fontSize: 12, lineHeight: 17 },
});