// ======================================================
// RHAZN — CONTRACT SCREEN PRODUCTION
// ✅ handleScroll défini (était manquant → crash)
// ✅ Bouton Accepter activé uniquement en fin de lecture
// ✅ Barre de progression latérale dorée
// ✅ Redirect → legal/signature après acceptation
// ======================================================

import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import LoaderRhazn from "../../components/LoaderRhazn";
import { supabase } from "../../lib/supabase";

/* ====================================================== */
const COLORS = {
  black: "#000",
  card:  "#101010",
  white: "#FFF",
  gray:  "#9A9A9A",
  gold:  "#D4AF37",
  red:   "#C62828",
};

/* ======================================================
TEXT
====================================================== */
const generateContractText = () => {
  const d = String(new Date().getDate()).padStart(2, "0");
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  const y = new Date().getFullYear();
  return CONTRACT_TEXT_TEMPLATE
    .replace("{{DATE_AUTOMATIQUE}}", `${d}/${m}/${y}`)
    .replace("{{ANNÉE_AUTOMATIQUE}}", `${y}`);
};

const CONTRACT_TEXT_TEMPLATE = `📜 CONDITIONS GÉNÉRALES D'UTILISATION & D'INTÉGRATION
DE L'ÉCOSYSTÈME RHAZN®

Plateforme : RHAZN®
Document exécutoire à compter du : {{DATE_AUTOMATIQUE}}
Version : CGUI–RHAZN–V1.0

══════════════════════════════════════
🎖️ 1. DÉFINITIONS
══════════════════════════════════════
Au sens des présentes Conditions :

• **RHAZN®** : écosystème numérique, créatif, économique et technologique sous gouvernance exclusive RHAZN.
• **Utilisateur** : toute personne physique ou morale disposant d'un compte RHAZN.
• **Créateur** : utilisateur publiant ou soumettant un contenu.
• **Contenu** : toute œuvre numérique (vidéo, image, audio, texte, données).
• **CADNA** : Commission d'Analyse, de Déontologie et de Normalisation des Activités.
• **RHAZN ADMIN** : autorité suprême de régulation et de décision.
• **Intégration** : admission officielle dans l'écosystème RHAZN.

══════════════════════════════════════
🛡️ 2. ACCEPTATION OBLIGATOIRE
══════════════════════════════════════
L'accès et l'utilisation de RHAZN impliquent l'acceptation totale et irrévocable des présentes CGUI.

Sans acceptation :
❌ Aucun accès  
❌ Aucune publication  
❌ Aucune monétisation  
❌ Aucun statut  

══════════════════════════════════════
🌐 3. NATURE DE L'ÉCOSYSTÈME RHAZN
══════════════════════════════════════
RHAZN est un écosystème :
• Numérique  
• Créatif  
• Économique  
• Basé sur la monétisation du mérite, du temps et des œuvres  

RHAZN n'est pas une banque et ne garantit aucun revenu fixe.

══════════════════════════════════════
💰 4. INTÉGRATION & MONÉTISATION
══════════════════════════════════════
Tout compte RHAZN est :
✔️ Monétisable  
✔️ Intégré dans l'économie interne  
❌ Impossible à utiliser "en privé" ou hors système  

Toute tentative de contournement entraîne :
• Suspension immédiate  
• Résiliation définitive  
• Perte des avantages  

══════════════════════════════════════
🔒 5. EXCLUSIVITÉ ABSOLUE DES CONTENUS
══════════════════════════════════════
⚠️ **Clause fondamentale**

Tout contenu publié sur RHAZN devient **exclusif** à l'écosystème.

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
• N'est jamais immédiate  
• Peut nécessiter 24–72h  
• Peut être prolongée sans justification  

══════════════════════════════════════
🛡️ 8. MODÉRATION, SIGNALEMENT & ÉCLAIREURS
══════════════════════════════════════
RHAZN dispose :
• D'un système de signalement communautaire  
• D'un pouvoir de retrait immédiat  
• D'un contrôle souverain du contenu  

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
📂 10. DONNÉES & DROITS D'EXPLOITATION
══════════════════════════════════════
L'utilisateur autorise RHAZN à :
• Stocker ses données  
• Exploiter techniquement ses contenus  
• Utiliser son image de profil dans le cadre interne  

Autorisation :
• Mondiale  
• Gratuite  
• Non exclusive  
• Limitée au périmètre RHAZN  

══════════════════════════════════════
⚖️ 11. RESPONSABILITÉ DE L'UTILISATEUR
══════════════════════════════════════
L'utilisateur est seul responsable :
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
La poursuite d'utilisation vaut acceptation automatique.

══════════════════════════════════════
⚖️ 16. DROIT APPLICABLE & JURIDICTION
══════════════════════════════════════
Les Conditions sont soumises au droit choisi par RHAZN.  
Toute contestation relève de la juridiction exclusive définie par RHAZN.

══════════════════════════════════════
🖋️ 17. ACCEPTATION FINALE NUMÉRIQUE
══════════════════════════════════════
En poursuivant, l'utilisateur confirme :
✔️ Avoir lu les Conditions  
✔️ Les comprendre  
✔️ Les accepter sans réserve  
✔️ Reconnaître l'autorité suprême de RHAZN ADMIN  
✔️ Accepter l'exclusivité totale de ses contenus  

══════════════════════════════════════
🏷️ MENTION LÉGALE FINALE
RHAZN® — Écosystème Officiel de Monétisation et d'Exclusivité du Mérite  
© RHAZN — Tous droits réservés — {{ANNÉE_AUTOMATIQUE}}
`;

/* ======================================================
SCREEN
====================================================== */
export default function ContractScreen() {
  const router = useRouter();

  const [checking,       setChecking]       = useState(true);
  const [sessionUserId,  setSessionUserId]  = useState<string | null>(null);
  const [progress,       setProgress]       = useState(0);
  const [hasReachedEnd,  setHasReachedEnd]  = useState(false);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);

  const lockRef = useRef(false);

  /* ── Nav bar visible ── */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
  }, []);

  /* ── Session + vérification contrat ── */
  useEffect(() => {
    let mounted = true;

    const checkContract = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) { router.replace("/auth/login"); return; }

      const uid = session.user.id;
      setSessionUserId(uid);

      const { data } = await supabase
        .from("profiles")
        .select("contract_accepted_at")
        .eq("id", uid)
        .maybeSingle();

      if (!mounted) return;

      // Contrat déjà accepté → signature
      if (data?.contract_accepted_at) {
        router.replace("/legal/signature");
        return;
      }

      setChecking(false);
    };

    checkContract();
    return () => { mounted = false; };
  }, []);

  /* ═══════════════════════════════════════════════════
     ✅ handleScroll — suivi de progression de lecture
     Calcule le pourcentage défilé et détecte la fin
  ═══════════════════════════════════════════════════ */
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;

    // Hauteur totale du contenu - hauteur visible
    const scrollable = contentSize.height - layoutMeasurement.height;

    if (scrollable <= 0) {
      // Contenu plus court que le viewport → déjà à la fin
      setProgress(100);
      setHasReachedEnd(true);
      return;
    }

    // Pourcentage défilé (0 → 100)
    const pct = Math.min(100, Math.round((contentOffset.y / scrollable) * 100));
    setProgress(pct);

    // Fin = 95% ou plus (marge pour les arrondis natifs)
    if (pct >= 95) {
      setHasReachedEnd(true);
    }
  };

  /* ── Accepter ── */
  const handleAccept = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setErrorMsg(null);

    try {
      // ── Récupérer l'UID frais depuis la session actuelle ──
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;

      console.log("handleAccept uid:", uid, "sessionUserId:", sessionUserId);

      if (!uid) {
        setErrorMsg("Session expirée. Reconnectez-vous.");
        lockRef.current = false;
        return;
      }

      // ── RPC SECURITY DEFINER — bypass total RLS ──
      const { error: rpcErr } = await supabase.rpc("rz_accept_contract", {
        p_user_id: uid,
      });
      console.log("RPC result:", rpcErr ?? "OK");

      if (rpcErr) {
        console.warn("RPC error:", rpcErr.message, rpcErr.code);
        setErrorMsg(`Erreur RPC: ${rpcErr.message}`);
        lockRef.current = false;
        return;
      }

      // ✅ RPC OK → on fait confiance, pas besoin de re-lire (RLS peut bloquer le SELECT)
      await new Promise(r => setTimeout(r, 300));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/legal/signature");

    } catch {
      setErrorMsg("Erreur inattendue. Réessayez.");
      lockRef.current = false;
    }
  };

  /* ── Refuser ── */
  const handleDecline = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    router.replace("/auth/login");
  };

  /* ── Loading ── */
  if (checking) {
    return (
      <View style={s.loading}>
        <LoaderRhazn />
      </View>
    );
  }

  /* ── UI ── */
  return (
    <KeyboardAvoidingView style={s.full}>

      {/* Logo */}
      <View style={s.logoWrap}>
        <Image source={require("../../assets/images/rhazn-logo.png")} style={s.logo} />
      </View>

      {/* Barre de progression dorée verticale */}
      <View style={[s.progressBar, { height: `${progress}%` as any }]} />

      <View style={s.main}>
        <Text style={s.title}>Conditions d'intégration</Text>

        {/* Indicateur lecture */}
        <View style={s.readRow}>
          <View style={[s.readDot, hasReachedEnd && s.readDotDone]} />
          <Text style={[s.readTxt, hasReachedEnd && { color: COLORS.gold }]}>
            {hasReachedEnd ? "✓ Lu jusqu'au bout" : "Lisez jusqu'à la fin pour accepter"}
          </Text>
        </View>

        <View style={s.card}>
          <ScrollView
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.contractText}>{generateContractText()}</Text>

            {/* Bouton Accepter — affiché en bas du contrat */}
            <TouchableOpacity
              disabled={!hasReachedEnd}
              onPress={handleAccept}
              style={[s.acceptBtn, !hasReachedEnd && { opacity: 0.35 }]}
              activeOpacity={0.9}
            >
              <Text style={s.acceptTxt}>
                {hasReachedEnd ? "Continuer vers la signature →" : "Lisez jusqu'à la fin…"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />

            <TouchableOpacity onPress={handleDecline} activeOpacity={0.9}>
              <Text style={s.declineTxt}>Refuser & quitter</Text>
            </TouchableOpacity>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>

        {errorMsg && <Text style={s.errorTxt}>{errorMsg}</Text>}
      </View>

    </KeyboardAvoidingView>
  );
}

/* ====================================================== */
const s = StyleSheet.create({
  full:    { flex: 1, backgroundColor: COLORS.black },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.black },

  logoWrap: { position: "absolute", top: 42, right: 26, zIndex: 10 },
  logo:     { width: 46, height: 46 },

  progressBar: {
    position: "absolute",
    right: 0, top: 0,
    width: 4,
    backgroundColor: COLORS.gold,
    zIndex: 5,
  },

  main: { flex: 1, paddingTop: 96, paddingHorizontal: 22 },

  title: { color: COLORS.white, fontSize: 26, fontWeight: "800", marginBottom: 10 },

  // Indicateur de lecture
  readRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  readDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  readDotDone:{ backgroundColor: COLORS.gold },
  readTxt:    { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "700" },

  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
  },

  contractText: { color: COLORS.white, fontSize: 13, lineHeight: 20 },

  acceptBtn: {
    marginTop: 28,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: COLORS.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  acceptTxt: { color: "#000", fontWeight: "900", fontSize: 15 },

  declineTxt: { color: COLORS.red, textAlign: "center", fontSize: 14, fontWeight: "700" },

  errorTxt: { color: COLORS.red, textAlign: "center", marginTop: 10, fontWeight: "700" },
});