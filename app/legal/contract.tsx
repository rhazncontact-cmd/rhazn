import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
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
  green: "#00C853",
};

// =========================
// 📜 TEXTE DU CONTRAT
// =========================
const generateContractText = () => {
  const today = new Date();
  const d = String(today.getDate()).padStart(2, "0");
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const y = today.getFullYear();

  return CONTRACT_TEXT_TEMPLATE
    .replace("{{DATE_AUTOMATIQUE}}", `${d}/${m}/${y}`)
    .replace("{{ANNÉE_AUTOMATIQUE}}", `${y}`);
};

// =========================
// 📌 TEMPLATE DU CONTRAT
// =========================
const CONTRACT_TEXT_TEMPLATE = `📜 CONDITIONS GÉNÉRALES D’UTILISATION & D’INTÉGRATION
DE L’ÉCOSYSTÈME RHAZN®

Plateforme : RHAZN®
Document exécutoire à compter du : {{DATE_AUTOMATIQUE}}
Version : CGUI–RHAZN–V1.0

══════════════════════════════════════
🎖️ 1. DÉFINITIONS
══════════════════════════════════════
Au sens des présentes Conditions :

• **RHAZN®** : écosystème numérique, créatif, économique et technologique sous gouvernance exclusive RHAZN.
• **Utilisateur** : toute personne physique ou morale disposant d’un compte RHAZN.
• **Créateur** : utilisateur publiant ou soumettant un contenu.
• **Contenu** : toute œuvre numérique (vidéo, image, audio, texte, données).
• **CADNA** : Commission d’Analyse, de Déontologie et de Normalisation des Activités.
• **RHAZN ADMIN** : autorité suprême de régulation et de décision.
• **Intégration** : admission officielle dans l’écosystème RHAZN.

══════════════════════════════════════
🛡️ 2. ACCEPTATION OBLIGATOIRE
══════════════════════════════════════
L’accès et l’utilisation de RHAZN impliquent l’acceptation totale et irrévocable des présentes CGUI.

Sans acceptation :
❌ Aucun accès  
❌ Aucune publication  
❌ Aucune monétisation  
❌ Aucun statut  

══════════════════════════════════════
🌐 3. NATURE DE L’ÉCOSYSTÈME RHAZN
══════════════════════════════════════
RHAZN est un écosystème :
• Numérique  
• Créatif  
• Économique  
• Basé sur la monétisation du mérite, du temps et des œuvres  

RHAZN n’est pas une banque et ne garantit aucun revenu fixe.

══════════════════════════════════════
💰 4. INTÉGRATION & MONÉTISATION
══════════════════════════════════════
Tout compte RHAZN est :
✔️ Monétisable  
✔️ Intégré dans l’économie interne  
❌ Impossible à utiliser “en privé” ou hors système  

Toute tentative de contournement entraîne :
• Suspension immédiate  
• Résiliation définitive  
• Perte des avantages  

══════════════════════════════════════
🔒 5. EXCLUSIVITÉ ABSOLUE DES CONTENUS
══════════════════════════════════════
⚠️ **Clause fondamentale**

Tout contenu publié sur RHAZN devient **exclusif** à l’écosystème.

Il est strictement interdit de :
Publier, copier, vendre, céder, partager ou exploiter le contenu **en dehors de RHAZN**.

Toute violation entraîne automatiquement :
❌ Radiation définitive  
❌ Suppression du compte sans préavis  
❌ Perte totale des soldes et droits  
❌ Poursuites civiles et/ou pénales  

══════════════════════════════════════
🏛️ 6. SOUMISSION DES CONTENUS & CADNA
══════════════════════════════════════
Toute œuvre envoyée est analysée par **la CADNA**.

Sa mission :
• Analyse éthique et morale  
• Conformité juridique  
• Protection des mineurs  
• Protection de la philosophie RHAZN  

Aucune publication sans validation CADNA.  
Les décisions sont exécutoires immédiatement.

══════════════════════════════════════
⏳ 7. DÉLAIS DE PUBLICATION
══════════════════════════════════════
La publication :
• N’est jamais immédiate  
• Peut nécessiter 24–72h  
• Peut être prolongée sans justification  

══════════════════════════════════════
🛡️ 8. MODÉRATION, SIGNALEMENT & ÉCLAIREURS
══════════════════════════════════════
RHAZN dispose :
• D’un système de signalement communautaire  
• D’un pouvoir de retrait immédiat  
• D’un contrôle souverain du contenu  

Les décisions sont exécutoires et sans appel.

══════════════════════════════════════
⚠️ 9. SANCTIONS GÉNÉRALES
══════════════════════════════════════
RHAZN peut, sans préavis :
• Avertir  
• Restreindre  
• Suspendre  
• Résilier  
• Bannir définitivement  

Pour :
• Fraude  
• Plagiat  
• Diffamation  
• Violation des CGUI  
• Atteinte à la philosophie RHAZN  

══════════════════════════════════════
📂 10. DONNÉES & DROITS D’EXPLOITATION
══════════════════════════════════════
L’utilisateur autorise RHAZN à :
• Stocker ses données  
• Exploiter techniquement ses contenus  
• Utiliser son image de profil dans le cadre interne  

Autorisation :
• Mondiale  
• Gratuite  
• Non exclusive  
• Limitée au périmètre RHAZN  

══════════════════════════════════════
⚖️ 11. RESPONSABILITÉ DE L’UTILISATEUR
══════════════════════════════════════
L’utilisateur est seul responsable :
• De la légalité de ses œuvres  
• Des droits associés  
• Du respect des lois nationales et internationales  

══════════════════════════════════════
🛑 12. RESPONSABILITÉ LIMITÉE DE RHAZN
══════════════════════════════════════
RHAZN décline toute responsabilité pour :
• Pertes financières indirectes  
• Rejets de contenus  
• Suspensions de comptes  
• Fluctuations de gains  

══════════════════════════════════════
🔐 13. PROPRIÉTÉ DU COMPTE
══════════════════════════════════════
Le compte utilisateur reste une **licence révocable**.  
Sa propriété demeure exclusivement celle de RHAZN.

══════════════════════════════════════
📁 14. CONFIDENTIALITÉ & ARCHIVAGE
══════════════════════════════════════
Les analyses, décisions, rapports et traitements internes :
• Restent confidentiels  
• Peuvent être archivés pour raisons juridiques  

══════════════════════════════════════
🛠️ 15. MODIFICATION DES CONDITIONS
══════════════════════════════════════
RHAZN peut modifier les CGUI à tout moment.  
La poursuite d’utilisation vaut acceptation automatique.

══════════════════════════════════════
⚖️ 16. DROIT APPLICABLE & JURIDICTION
══════════════════════════════════════
Les Conditions sont soumises au droit choisi par RHAZN.  
Toute contestation relève de la juridiction exclusive définie par RHAZN.

══════════════════════════════════════
🖋️ 17. ACCEPTATION FINALE NUMÉRIQUE
══════════════════════════════════════
En poursuivant, l’utilisateur confirme :
✔️ Avoir lu les Conditions  
✔️ Les comprendre  
✔️ Les accepter sans réserve  
✔️ Reconnaître l’autorité suprême de RHAZN ADMIN  
✔️ Accepter l’exclusivité totale de ses contenus  

══════════════════════════════════════
🏷️ MENTION LÉGALE FINALE
RHAZN® — Écosystème Officiel de Monétisation et d’Exclusivité du Mérite  
© RHAZN — Tous droits réservés — {{ANNÉE_AUTOMATIQUE}}
`;

export default function ContractScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // ====== PROGRESS STATES ======
  const [progress, setProgress] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const scrollRef = useRef(null);
  const lastScrollTs = useRef(Date.now());

  // ====== ANDROID NAVBAR CONTROL ======
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  const handleScreenTap = () => {
    setTapCount((prev) => {
      const newValue = prev + 1;
      if (newValue >= 5) {
        NavigationBar.setVisibilityAsync("visible");
        return 0;
      }
      return newValue;
    });
  };

  const hideNavOnScroll = () => {
    NavigationBar.setVisibilityAsync("hidden");
  };

  // SESSION CHECK
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) router.replace("/auth/login");
      else setChecking(false);
    });
  }, []);

  // HANDLE ACCEPT
  const handleAccept = async () => {
    const { data: session } = await supabase.auth.getUser();
    if (!session?.user) return;

    await supabase
      .from("users")
      .update({ contract_accepted: true })
      .eq("uid", session.user.id);

    router.replace("/legal/signature");
  };

  const handleDecline = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  // SCROLL PROGRESS
  const handleScroll = (e) => {
    hideNavOnScroll();

    const now = Date.now();
    if (now - lastScrollTs.current < 80) return;
    lastScrollTs.current = now;

    const { contentSize, layoutMeasurement, contentOffset } =
      e.nativeEvent;

    const percent = Math.min(
      100,
      Math.round((contentOffset.y / (contentSize.height - layoutMeasurement.height)) * 100)
    );

    setProgress(percent);

    if (percent >= 100 && !hasReachedEnd) {
      setHasReachedEnd(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingScreen}>
        <LoaderRhazn />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleScreenTap}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.full}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </View>

        <View style={[styles.progressBar, { height: `${progress}%` }]} />

        <View style={styles.main}>
          <Text style={styles.heading}>Conditions d’intégration</Text>
          <Text style={styles.subheading}>
            Faites défiler pour lire le contrat ({progress}%)
          </Text>

          <View style={styles.card}>
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.contractText}>{generateContractText()}</Text>

              {hasReachedEnd && (
                <Text style={styles.endMessage}>
                  🎉 Vous avez lu tout le contrat. Merci de votre engagement envers RHAZN.
                </Text>
              )}

              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  { opacity: hasReachedEnd ? 1 : 0.3 },
                ]}
                disabled={!hasReachedEnd}
                onPress={handleAccept}
                activeOpacity={0.9}
              >
                <Text style={styles.acceptText}>Accepter & continuer</Text>
              </TouchableOpacity>

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.gradientOverlay} pointerEvents="none" />
          </View>
        </View>

        <View style={styles.actionsWrapper}>
          <TouchableOpacity
            style={styles.declineButton}
            activeOpacity={0.85}
            onPress={handleDecline}
          >
            <Text style={styles.declineText}>Refuser & quitter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ============================================================================
// STYLES — VERSION PREMIUM RHAZN
// ============================================================================
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.black },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },

  logoWrapper: {
    position: "absolute",
    top: 42,
    right: 26,
    zIndex: 50,
  },
  logo: { width: 46, height: 46, resizeMode: "contain", opacity: 0.95 },

  progressBar: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 4,
    backgroundColor: COLORS.gold,
    zIndex: 40,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 4,
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
  },
  subheading: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 18,
  },

  // ⭐ CARTE RÉDUITE POUR LIBÉRER LE BOUTON REFUSER
  card: {
    flex: 0.86, // ← Ajustement premium : la carte ne touche plus le bouton
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    overflow: "hidden",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 40 },

  contractText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 20,
  },

  endMessage: {
    color: COLORS.green,
    fontSize: 13,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "600",
  },

  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  actionsWrapper: {
    width: "100%",
    paddingHorizontal: 22,
    paddingBottom: 20,
    paddingTop: 4,
    backgroundColor: "transparent",
  },

  declineButton: {
    position: "absolute",
    bottom: 32, // ← BOUTON REMONTÉ
    left: 22,
    right: 22,
    borderRadius: 999,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.red,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    zIndex: 200,
  },

  declineText: {
    color: COLORS.red,
    fontWeight: "600",
    fontSize: 15,
  },

  acceptButton: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  acceptText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 15,
  },
});
