// ======================================================
// RHAZN — CONTRACT SCREEN FINAL PRODUCTION (UPDATED UX)
// Accept = fin du texte • Refuser = +3 espaces
// Redirect: legal/contract -> legal/signature
// ======================================================

import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

/* ====================================================== */
const COLORS = {
  black: "#000",
  card: "#101010",
  white: "#FFF",
  gray: "#9A9A9A",
  gold: "#D4AF37",
  red: "#C62828",
};

/* ======================================================
TEXT
====================================================== */
const generateContractText = () => {
  const d = String(new Date().getDate()).padStart(2, "0");
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  const y = new Date().getFullYear();

  return CONTRACT_TEXT_TEMPLATE.replace("{{DATE_AUTOMATIQUE}}", `${d}/${m}/${y}`)
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
• Peuvent être archivés pour raisons juridiiques  

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

/* ======================================================
SCREEN
====================================================== */
export default function ContractScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lastScrollTs = useRef(Date.now());
  const lockRef = useRef(false);

  /* NAV */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
  }, []);

  /* ======================================================
  SESSION
  ====================================================== */
  useEffect(() => {
  let mounted = true;

  const checkContract = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/auth/login");
      return;
    }

    const uid = session.user.id;
    setSessionUserId(uid);

    const { data } = await supabase
      .from("profiles")
      .select("contract_accepted_at")
      .eq("id", uid)
      .single();

    if (!mounted) return;

    if (data?.contract_accepted_at) {
      // 🔥 IMPORTANT: push au lieu de replace
      router.push("/legal/signature");
      return;
    }

    setChecking(false);
  };

  checkContract();

  return () => {
    mounted = false;
  };
}, []);


  /* ======================================================
  SCROLL TRACK
  ====================================================== */
  const handleScroll = (e: any) => {
    const now = Date.now();
    if (now - lastScrollTs.current < 40) return;
    lastScrollTs.current = now;

    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent;

    const denom = contentSize.height - layoutMeasurement.height;
    const raw = denom <= 0 ? 100 : (contentOffset.y / denom) * 100;

    const percent = Math.min(100, Math.max(0, Math.round(raw)));

    setProgress(percent);
    if (percent >= 100) setHasReachedEnd(true);
  };

  /* ======================================================
  ACCEPT
  ====================================================== */
  const handleAccept = async () => {
  if (!sessionUserId || lockRef.current) return;

  setErrorMsg(null);
  lockRef.current = true;

  try {
    const { error } = await supabase.rpc("rz_accept_contract", {
      p_user_id: sessionUserId,
    });

    if (error) {
      const fallback = await supabase
        .from("profiles")
        .update({ contract_accepted_at: new Date().toISOString() })
        .eq("id", sessionUserId);

      if (fallback.error) {
        setErrorMsg("Erreur réseau. Réessayez.");
        lockRef.current = false;
        return;
      }
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    // 🔥 IMPORTANT
    await supabase.auth.refreshSession();

    router.replace("/(tabs)");
  } catch {
    setErrorMsg("Erreur inattendue. Réessayez.");
    lockRef.current = false;
  }
};

  /* ======================================================
  DECLINE
  ====================================================== */
  const handleDecline = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    router.replace("/auth/login");
  };

  /* ======================================================
  LOADING
  ====================================================== */
  if (checking) {
    return (
      <View style={styles.loading}>
        <LoaderRhazn />
      </View>
    );
  }

  /* ======================================================
  UI
  ====================================================== */
  return (
    <KeyboardAvoidingView style={styles.full}>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/images/rhazn-logo.png")} style={styles.logo} />
      </View>

      <View style={[styles.progressBar, { height: `${progress}%` }]} />

      <View style={styles.main}>
        <Text style={styles.title}>Conditions d’intégration</Text>

        <View style={styles.card}>
          <ScrollView
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.contractText}>{generateContractText()}</Text>

            {/* ✅ BOUTONS À LA FIN */}
            <TouchableOpacity
              disabled={!hasReachedEnd}
              onPress={handleAccept}
              style={[styles.acceptBtn, { opacity: hasReachedEnd ? 1 : 0.35 }]}
              activeOpacity={0.9}
            >
              <Text style={styles.acceptText}>Continuer vers la signature</Text>
            </TouchableOpacity>

            {/* 3 ESPACES VISUELS */}
            <View style={{ height: 60 }} />

            <TouchableOpacity onPress={handleDecline} activeOpacity={0.9}>
              <Text style={styles.decline}>Refuser & quitter</Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

/* ====================================================== */
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.black },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  logoWrap: { position: "absolute", top: 42, right: 26 },
  logo: { width: 46, height: 46 },

  progressBar: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 4,
    backgroundColor: COLORS.gold,
  },

  main: { flex: 1, paddingTop: 96, paddingHorizontal: 22 },

  title: { color: COLORS.white, fontSize: 26, fontWeight: "800" },

  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    marginTop: 12,
  },

  contractText: { color: COLORS.white, fontSize: 13, lineHeight: 18 },

  acceptBtn: {
    marginTop: 28,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },

  acceptText: { color: "#000", fontWeight: "900" },

  decline: {
    color: COLORS.red,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
  },

  errorText: {
    color: COLORS.red,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "700",
  },
});



