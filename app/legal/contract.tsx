import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

// 🎨 PALETTE RHAZN PREMIUM
const COLORS = {
  black: "#000000",
  card: "#101010",
  cardSoft: "#151515",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  softGray: "#BEBEBE",
  gold: "#D4AF37",
  red: "#C62828",
  border: "#1E1E1E",
};

// 📝 CONTRAT – TEXTE BRUT (inchangé)
const CONTRACT_TEXT = `
📜 CONDITIONS GÉNÉRALES D’UTILISATION & D’INTÉGRATION
DE L’ÉCOSYSTÈME RHAZN®

Plateforme : RHAZN®
Document exécutoire à compter du : {{DATE_AUTOMATIQUE}}
Version : CGUI–RHAZN–V1.0

1. DÉFINITIONS
Au sens des présentes Conditions :
RHAZN® : désigne l’écosystème numérique, économique, créatif et technologique opéré sous l’autorité exclusive de RHAZN.
Utilisateur : toute personne physique ou morale disposant d’un compte RHAZN.
Créateur : tout utilisateur publiant ou soumettant un contenu.
Contenu : toute œuvre sous forme de vidéo, audio, image, texte, donnée, ou média numérique.
CADNA : Commission d’Analyse, de Déontologie et de Normalisation des Activités.
RHAZN ADMIN : autorité suprême de gouvernance, de régulation et de décision.
Intégration : admission officielle dans l’écosystème RHAZN.

2. ACCEPTATION OBLIGATOIRE
L’accès, l’inscription, l’utilisation et l’intégration dans l’écosystème RHAZN impliquent l’acceptation pleine, entière, irrévocable et sans réserve des présentes CGUI.
Sans acceptation :
❌ Aucun accès au contenu
❌ Aucune publication
❌ Aucune monétisation
❌ Aucun statut dans RHAZN

3. NATURE DE L’ÉCOSYSTÈME RHAZN
RHAZN est un écosystème :
• Numérique
• Créatif
• Économique
• De monétisation du mérite, du temps et des œuvres
RHAZN n’est ni une banque, ni un établissement financier, et ne garantit aucun revenu fixe.

4. INTÉGRATION & CARACTÈRE MONÉTISABLE DU COMPTE
Tout compte RHAZN est :
✅ Obligatoirement monétisable
✅ Intégré dans le système économique interne
❌ Ne peut être utilisé à titre strictement privé ou gratuit
Toute tentative de contournement du système économique entraîne :
• Suspension immédiate
• Résiliation définitive
• Perte des avantages acquis

5. EXCLUSIVITÉ ABSOLUE DES CONTENUS
⚠️ CLAUSE FONDAMENTALE
Tout Utilisateur reconnaît expressément que :
Tout contenu publié, diffusé, stocké ou exploité sur RHAZN devient exclusivement réservé à l’écosystème RHAZN.
Il est formellement interdit, pour quelque motif que ce soit, y compris personnel, commercial, promotionnel, caritatif ou artistique, de :
• Publier
• Dupliquer
• Rediffuser
• Vendre
• Céder
• Exploiter
• Partager
tout contenu issu de RHAZN sur :
• Une autre plateforme
• Un autre réseau social
• Un site personnel
• Une diffusion privée ou publique extérieure à RHAZN

❌ TOUTE VIOLATION ENTRAÎNE AUTOMATIQUEMENT :
• Radiation définitive du système
• Suppression du compte sans préavis
• Perte irréversible de tous les soldes, avantages et droits
• Poursuites civiles et/ou pénales si nécessaire

6. SOUMISSION DES CONTENUS & CADNA
Tout contenu soumis à RHAZN est obligatoirement examiné par la :
CADNA — Commission d’Analyse, de Déontologie et de Normalisation des Activités
Mission de la CADNA :
• Analyse préalable des contenus
• Contrôle éthique, moral, juridique
• Protection des mineurs
• Protection de l’image et de la philosophie RHAZN
Aucun contenu n’est publié sans validation préalable de la CADNA.
Les décisions de la CADNA :
• Sont exécutoires immédiatement
• Peuvent être confirmées, modifiées ou annulées par RHAZN ADMIN
• Ne constituent pas un droit acquis à publication

7. DÉLAIS DE PUBLICATION
L’Utilisateur reconnaît que la publication :
• N’est jamais immédiate
• Est soumise à un délai d’analyse indicatif de 24 à 72 heures
• Peut être prolongée sans obligation de justification

8. MODÉRATION, SIGNALEMENT & ÉCLAIREURS
RHAZN dispose :
• D’un système de signalement communautaire (Éclaireurs)
• D’un pouvoir de modération souverain
• D’un droit de retrait immédiat de tout contenu
Les décisions de modération sont souveraines, exécutoires et sans appel obligatoire.

9. SANCTIONS GÉNÉRALES
RHAZN peut, sans préavis :
• Avertir
• Restreindre
• Suspendre
• Résilier
• Bannir définitivement tout compte
En cas de :
• Fraude
• Plagiat
• Diffamation
• Contournement du système
• Violation des présentes CGUI
• Atteinte à la philosophie RHAZN

10. DONNÉES, IMAGE & DROITS D’EXPLOITATION
L’Utilisateur autorise RHAZN à :
• Stocker ses données
• Utiliser son image de profil
• Exploiter techniquement ses contenus dans le cadre du fonctionnement interne
Cette autorisation est :
• Mondiale
• Gratuite
• Non exclusive pour l’exploitation technique
• Limitée au périmètre de RHAZN

11. RESPONSABILITÉ DE L’UTILISATEUR
L’Utilisateur est seul responsable :
• Du contenu qu’il soumet
• De la légalité de ses œuvres
• De ses actes sur la plateforme
• Du respect des lois locales et internationales

12. RESPONSABILITÉ LIMITÉE DE RHAZN
RHAZN ne saurait être tenue responsable :
• Des pertes financières indirectes
• Des rejets de contenus
• Des suspensions de comptes
• Des fluctuations de gains
• Des décisions de la CADNA

13. PROPRIÉTÉ DU COMPTE
Tout compte RHAZN est une licence d’accès révocable.
Il demeure la propriété exclusive de RHAZN.

14. CONFIDENTIALITÉ & ARCHIVAGE
Tous les traitements internes, décisions, analyses et rapports :
• Sont confidentiels
• Peuvent être archivés à des fins juridiques

15. MODIFICATION DES CONDITIONS
RHAZN se réserve le droit de modifier à tout moment les présentes CGUI.
Toute modification prend effet dès sa publication.
L’usage continu vaut acceptation tacite.

16. DROIT APPLICABLE & JURIDICTION
Les présentes Conditions sont soumises au droit choisi par RHAZN, indépendamment du pays de résidence de l’Utilisateur.
Tout litige relève de la juridiction exclusive désignée par RHAZN.

17. ACCEPTATION FINALE NUMÉRIQUE
En validant son intégration, l’Utilisateur reconnaît :
☑️ Avoir lu intégralement les présentes Conditions
☑️ Les comprendre
☑️ Les accepter sans réserve
☑️ Reconnaître l’autorité suprême de RHAZN ADMIN
☑️ Accepter l’exclusivité absolue de ses contenus au sein de RHAZN

🏷️ MENTION LÉGALE FINALE
RHAZN® — Écosystème Officiel de Monétisation et d’Exclusivité du Mérite
© RHAZN — Tous droits réservés — {{ANNÉE_AUTOMATIQUE}}
`;

export default function ContractScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // ✅ Vérifier qu’un user est connecté (RLS safe)
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        router.replace("/auth/login");
      } else {
        setChecking(false);
      }
    });
  }, []);

  const handleAccept = () => {
    // ✅ On ne marque PAS le contrat comme accepté ici.
    // La validation juridique finale se fait sur /legal/signature
    router.replace("/legal/signature");
  };

  const handleDecline = async () => {
    // ❌ L’utilisateur refuse → déconnexion + retour login
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <LoaderRhazn />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.full}
    >
      {/* Logo RHAZN */}
      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      {/* Contenu principal */}
      <View style={styles.main}>
        <Text style={styles.heading}>Conditions d’intégration</Text>
        <Text style={styles.subheading}>
          Veuillez lire attentivement le contrat avant de continuer.
        </Text>

        <View style={styles.card}>
          {/* Bandeau "défiler" */}
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>Document juridique RHAZN</Text>
            <Text style={styles.badgeHint}>Faites défiler pour lire tout le contrat</Text>
          </View>

          {/* Contrat scrollable */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.contractText}>{CONTRACT_TEXT}</Text>
          </ScrollView>

          {/* Dégradé bas pour effet Apple */}
          <View style={styles.gradientOverlay} pointerEvents="none" />
        </View>
      </View>

      {/* Zone d’actions flottante premium */}
      <View style={styles.actionsWrapper}>
        <TouchableOpacity
          style={styles.declineButton}
          activeOpacity={0.85}
          onPress={handleDecline}
        >
          <Text style={styles.declineText}>Refuser & quitter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          activeOpacity={0.9}
          onPress={handleAccept}
        >
          <Text style={styles.acceptText}>Accepter & continuer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STYLES — APPLE-LIKE PREMIUM
// ============================================================================
const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapper: {
    position: "absolute",
    top: 42,
    right: 26,
    zIndex: 20,
  },
  logo: {
    width: 46,
    height: 46,
    resizeMode: "contain",
    opacity: 0.95,
  },
  main: {
    flex: 1,
    paddingTop: 96,
    paddingHorizontal: 22,
  },
  heading: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subheading: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 18,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    overflow: "hidden",
  },
  badgeRow: {
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.softGray,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  badgeHint: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  contractText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 20,
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  actionsWrapper: {
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === "android" ? 22 : 30, // au-dessus de la barre native
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  declineButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    marginBottom: 10,
    alignItems: "center",
  },
  declineText: {
    color: COLORS.red,
    fontWeight: "600",
    fontSize: 14,
  },
  acceptButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: COLORS.gold,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 10,
  },
  acceptText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 15,
  },
});
