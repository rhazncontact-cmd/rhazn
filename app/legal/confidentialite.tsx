// app/legal/confidentialite.tsx
// ✅ Politique de confidentialité RHAZN — Apple-like

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
  bg:     "#F2F2F7",
  card:   "#FFFFFF",
  text:   "#111111",
  sub:    "#6E6E73",
  border: "#E5E5EA",
  gold:   "#D4AF37",
  red:    "#FF3B30",
  blue:   "#007AFF",
  green:  "#34C759",
};

const SECTIONS = [
  {
    icon:  "information-circle-outline" as const,
    color: C.blue,
    title: "1. Données collectées",
    items: [
      { label: "Identité", detail: "Nom, prénom, date de naissance, sexe, NIF, département et ville de naissance." },
      { label: "Contact", detail: "Adresse email, numéro de téléphone, numéro WhatsApp." },
      { label: "Photo de profil", detail: "Image de profil soumise lors de la vérification CADNA." },
      { label: "Données financières", detail: "Solde TAN, solde ACSET, historique des transactions." },
      { label: "Contenus publiés", detail: "Vidéos SUSPENTZ, images produits, publications." },
      { label: "Données techniques", detail: "Token Expo pour les notifications push, logs d'activité." },
    ],
  },
  {
    icon:  "build-outline" as const,
    color: C.gold,
    title: "2. Utilisation des données",
    items: [
      { label: "Authentification", detail: "Vérification de votre identité lors de la connexion." },
      { label: "CADNA", detail: "Validation de vos PACTs." },
      { label: "Transactions", detail: "Traitement des transferts TAN et retraits HTG." },
      { label: "Notifications", detail: "Envoi d'alertes importantes via votre token Expo." },
      { label: "Sécurité", detail: "Détection des fraudes et protection de votre compte." },
    ],
  },
  {
    icon:  "people-outline" as const,
    color: C.gold,
    title: "3. Partage des données",
    items: [
      { label: "Agents RHAZN", detail: "Vos informations de paiement sont partagées uniquement avec les Agents agréés pour les retraits." },
      { label: "Aucune vente", detail: "RHAZN ne vend jamais vos données personnelles à des tiers." },
      { label: "Autorités", detail: "En cas d'obligation légale uniquement." },
    ],
  },
  {
    icon:  "lock-closed-outline" as const,
    color: C.green,
    title: "4. Sécurité des données",
    items: [
      { label: "Chiffrement", detail: "Toutes les communications sont chiffrées via HTTPS/TLS." },
      { label: "Code PIN", detail: "Votre code PIN est haché et jamais stocké en clair." },
      { label: "RZ-ID", detail: "Votre identifiant immuable est généré par algorithme cryptographique." },
      { label: "Supabase", detail: "Infrastructure sécurisée avec politiques RLS strictes." },
    ],
  },
  {
    icon:  "person-outline" as const,
    color: C.blue,
    title: "5. Vos droits",
    items: [
      { label: "Accès", detail: "Vous pouvez consulter vos données depuis votre profil RHAZN." },
      { label: "Rectification", detail: "Modifiez vos informations depuis Paramètres → Mon profil." },
      { label: "Suppression", detail: "Vous pouvez demander la suppression de votre compte via le support." },
      { label: "Portabilité", detail: "Demandez une copie de vos données à support@rhazn.com." },
    ],
  },
  {
    icon:  "time-outline" as const,
    color: C.gold,
    title: "6. Conservation des données",
    items: [
      { label: "Compte actif", detail: "Données conservées tant que votre compte est actif." },
      { label: "Après suppression", detail: "Données anonymisées sous 30 jours, sauf obligations légales." },
      { label: "Transactions", detail: "Historique financier conservé 5 ans conformément à la loi." },
    ],
  },
  {
    icon:  "mail-outline" as const,
    color: C.gold,
    title: "7. Contact DPO",
    items: [
      { label: "Email", detail: "dpo@rhazn.com" },
      { label: "Objet", detail: "Mentionnez \"Demande RGPD\" dans l'objet de votre message." },
      { label: "Délai de réponse", detail: "Sous 30 jours ouvrés." },
    ],
  },
];

export default function ConfidentialiteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={C.gold} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="lock-closed" size={36} color={C.gold} />
          </View>
          <Text style={s.heroTitle}>Politique de confidentialité</Text>
          <Text style={s.heroSub}>Dernière mise à jour : 15 mars 2026</Text>
          <View style={s.heroPill}>
            <Ionicons name="shield-checkmark" size={12} color={C.green} />
            <Text style={[s.heroPillTxt, { color: C.green }]}>Vos données sont protégées</Text>
          </View>
          <View style={[s.heroPill, { backgroundColor: C.gold + "15", borderColor: C.gold + "30", marginTop: 6 }]}>
            <Ionicons name="layers-outline" size={12} color={C.gold} />
            <Text style={[s.heroPillTxt, { color: C.gold }]}>RHAZN · Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* ── Intro ── */}
        <View style={s.introCard}>
          <Text style={s.introTxt}>
            RHAZN accorde une importance primordiale à la protection de vos données personnelles. Cette politique explique quelles données nous collectons, comment nous les utilisons et vos droits à leur égard.
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
            {sec.items.map((item, j) => (
              <View key={j} style={[s.item, j < sec.items.length - 1 && s.itemBorder]}>
                <Text style={s.itemLabel}>{item.label}</Text>
                <Text style={s.itemDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* ── Badge confiance ── */}
        <View style={s.trustCard}>
          <Ionicons name="shield-checkmark" size={22} color={C.green} />
          <Text style={s.trustTxt}>
            RHAZN s'engage à ne jamais vendre vos données personnelles et à les protéger avec les plus hauts standards de sécurité.
          </Text>
        </View>

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
  container:   { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: "900", color: C.text },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  hero:       { alignItems: "center", paddingVertical: 28 },
  heroIcon:   { width: 80, height: 80, borderRadius: 24, backgroundColor: C.gold + "15", borderWidth: 1.5, borderColor: C.gold + "35", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle:  { fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 4 },
  heroSub:    { fontSize: 13, color: C.sub, fontWeight: "600" },
  heroPill:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: "#34C75915", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#34C75930" },
  heroPillTxt:{ fontSize: 11, fontWeight: "800" },

  introCard: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  introTxt:  { color: C.sub, fontSize: 14, lineHeight: 22, fontWeight: "600" },

  section:       { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sectionTitle:  { fontSize: 14, fontWeight: "900", color: C.text, flex: 1 },

  item:        { paddingVertical: 10 },
  itemBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
  itemLabel:   { fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 2 },
  itemDetail:  { fontSize: 13, color: C.sub, fontWeight: "600", lineHeight: 19 },

  trustCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#34C75912", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#34C75930", marginBottom: 16 },
  trustTxt:  { flex: 1, color: C.sub, fontSize: 13, lineHeight: 20, fontWeight: "600" },

  footer:    { alignItems: "center", paddingVertical: 20 },
  footerTxt: { fontSize: 11, color: C.sub, fontWeight: "600" },
});