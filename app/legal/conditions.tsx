// app/legal/conditions.tsx
// ✅ Conditions d'utilisation RHAZN — Apple-like

import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_VERSION = (
  Constants.expoConfig?.version ??
  Constants.manifest?.version ??
  "1.1.1"
) as string;

const C = {
  bg:      "#F2F2F7",
  card:    "#FFFFFF",
  text:    "#111111",
  sub:     "#6E6E73",
  border:  "#E5E5EA",
  gold:    "#D4AF37",
  red:     "#FF3B30",
  green:   "#34C759",
};

const SECTIONS = [
  {
    icon:  "shield-checkmark-outline" as const,
    color: C.green,
    title: "1. Acceptation des conditions",
    body:  "En utilisant l'application RHAZN, vous acceptez pleinement et sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, vous devez cesser immédiatement d'utiliser l'application.",
  },
  {
    icon:  "person-outline" as const,
    color: C.gold,
    title: "2. Inscription et compte",
    body:  "Pour accéder aux fonctionnalités de RHAZN, vous devez créer un compte avec des informations exactes et complètes. Vous êtes responsable de la confidentialité de vos identifiants. Toute activité effectuée depuis votre compte est sous votre responsabilité.",
  },
  {
    icon:  "diamond-outline" as const,
    color: C.gold,
    title: "3. Monnaie TAN et ACSET",
    body:  "Le TAN est la monnaie virtuelle de RHAZN utilisée pour les transactions entre membres. L'ACSET est un crédit de publication gagné par la consommation de contenus. Le TAN peut être converti en HTG selon les conditions tarifaires en vigueur. RHAZN se réserve le droit de modifier les taux à tout moment.",
  },
  {
    icon:  "film-outline" as const,
    color: C.gold,
    title: "4. Contenus publiés",
    body:  "Tout contenu publié sur RHAZN (vidéos SUSPENTZ, produits, actualités) est soumis à la validation CADNA. Vous garantissez détenir les droits sur tout contenu soumis. RHAZN se réserve le droit de retirer tout contenu sans préavis.",
  },
  {
    icon:  "ban-outline" as const,
    color: C.red,
    title: "5. Comportements interdits",
    body:  "Sont strictement interdits : la diffusion de contenus illicites, discriminatoires ou offensants ; l'usurpation d'identité ; les tentatives de contournement des systèmes de paiement ; le spam et la manipulation des systèmes de vote QOB.",
  },
  {
    icon:  "lock-closed-outline" as const,
    color: C.gold,
    title: "6. Identité CADNA",
    body:  "Le processus de vérification d'identité CADNA est obligatoire pour accéder à la monétisation. Les informations fournies doivent être authentiques. Toute fraude entraîne la suspension définitive du compte et peut faire l'objet de poursuites judiciaires.",
  },
  {
    icon:  "cash-outline" as const,
    color: C.green,
    title: "7. Revenus et monétisation",
    body:  "Les revenus générés sur RHAZN sont soumis à des frais de service de 30% lors du retrait. Les paiements sont traités via des Agents RHAZN agréés. RHAZN ne garantit pas un niveau de revenus minimum.",
  },
  {
    icon:  "refresh-outline" as const,
    color: C.gold,
    title: "8. Modifications",
    body:  "RHAZN se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés par notification push. La poursuite de l'utilisation de l'application après modification vaut acceptation des nouvelles conditions.",
  },
  {
    icon:  "alert-circle-outline" as const,
    color: C.red,
    title: "9. Limitation de responsabilité",
    body:  "RHAZN ne peut être tenu responsable des pertes financières résultant d'une utilisation frauduleuse d'un compte, de pannes techniques temporaires, ou d'actions de tiers. L'application est fournie \"en l'état\".",
  },
  {
    icon:  "mail-outline" as const,
    color: C.gold,
    title: "10. Contact",
    body:  "Pour toute question relative aux présentes conditions, contactez-nous à : support@rhazn.com\n\nSiège social : RHAZN Technologies, Haïti.",
  },
];

export default function ConditionsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.gold} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Conditions d'utilisation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="document-text" size={36} color={C.gold} />
          </View>
          <Text style={s.heroTitle}>Conditions d'utilisation</Text>
          <Text style={s.heroSub}>Dernière mise à jour : 15 mars 2026</Text>
          <View style={s.heroPill}>
            <Ionicons name="shield-checkmark" size={12} color={C.gold} />
            <Text style={s.heroPillTxt}>RHAZN · Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* ── Intro ── */}
        <View style={s.introCard}>
          <Text style={s.introTxt}>
            Ces conditions régissent votre utilisation de l'application RHAZN et de tous les services associés. Veuillez les lire attentivement avant d'utiliser nos services.
          </Text>
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionIconWrap, { backgroundColor: sec.color + "18", borderColor: sec.color + "35" }]}>
                <Ionicons name={sec.icon} size={18} color={sec.color} />
              </View>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>© 2026 RHAZN Technologies · Tous droits réservés</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:   { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "900", color: C.text },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  hero:       { alignItems: "center", paddingVertical: 28 },
  heroIcon:   { width: 80, height: 80, borderRadius: 24, backgroundColor: C.gold + "15", borderWidth: 1.5, borderColor: C.gold + "35", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle:  { fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 4 },
  heroSub:    { fontSize: 13, color: C.sub, fontWeight: "600" },
  heroPill:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: C.gold + "15", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: C.gold + "30" },
  heroPillTxt:{ fontSize: 11, color: C.gold, fontWeight: "800" },

  introCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  introTxt:  { color: C.sub, fontSize: 14, lineHeight: 22, fontWeight: "600" },

  section:       { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sectionTitle:  { fontSize: 14, fontWeight: "900", color: C.text, flex: 1 },
  sectionBody:   { fontSize: 13, lineHeight: 21, color: C.sub, fontWeight: "600" },

  footer:    { alignItems: "center", paddingVertical: 20 },
  footerTxt: { fontSize: 11, color: C.sub, fontWeight: "600" },
});