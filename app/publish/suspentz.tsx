/**
 * app/publish/suspentz.tsx — RHAZN Suspentz Publisher v7 FINAL FIXED
 * ✅ Nouvelle approche: Galerie → Formulaire → Publier
 * ✅ Pas d'éditeur audio, pas de FFmpeg, pas de fusion
 * ✅ L'utilisateur fait le montage dans CapCut + télécharge la musique RHAZN
 * ✅ Publication directe à Supabase
 * ✅ WelcomeModal au chargement
 * ✅ DisclaimerModal avant publication
 * ✅ MusicDownloadModal pour télécharger les musiques
 */

import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { uploadAsync } from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MusicDownloadModal from "../../components/MusicDownloadModal";
import {
  DuplicateCheckResult,
  useContentDuplicateCheck,
} from "../../hooks/useContentDuplicateCheck";
import { useDraft } from "../../hooks/useDraft";
import { cleanOldFinals } from "../../lib/draftService";
import { supabase } from "../../lib/supabase";


// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const MAX_DURATION_SEC = 125;
const FOOTER_H = 95;

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  gold: "#D4AF37",
  white: "#FFF",
  gray: "#666",
  muted: "rgba(255,255,255,0.60)",
  border: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.06)",
  blue: "#007AFF",
  danger: "#FF453A",
  ok: "#34C759",
  goldDim: "rgba(212,175,55,0.14)",
};

export const RHAZN_THEMES = [
  "Art & Cultures","Génie Créatif","Expression Culturelle","Héritage des Traditions",
  "Mémoire des Peuples","Langage du Son","L'Âme de la Musique","Vision Photographique",
  "L'Art du Cinéma","Poésie & Mots","Littérature Vivante","La Scène & le Spectacle",
  "Danse & Mouvement","Architecture du Beau","Mode & Identité","Amour",
  "Intelligence Relationnelle","Le Lien Humain","Héritage Familial","Motivation",
  "Force Intérieure","Éveil de Soi","Confiance en Soi","Dimension Spirituelle",
  "Chemin de la Foi","Sagesse Appliquée","Paix Intérieure","Santé & Vitalité",
  "Corps en Équilibre","Haïti & Mémoire","La Dignité Noire","Racines & Diaspora",
  "L'Esprit d'Innovation","Intelligence Financière","Justice & Équité",
  "Puissance du Vivant","Nature & Connexion","Écologie Consciente",
];

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type Notice = {
  tone: "info" | "danger" | "ok";
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};
type Step = "home" | "form";

// ─────────────────────────────────────────────────────────────────
// WELCOME MODAL (Apple-like)
// ─────────────────────────────────────────────────────────────────
function WelcomeModal({
  visible,
  onClose,
  onDownloadMusic,
}: {
  visible: boolean;
  onClose: () => void;
  onDownloadMusic: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      damping: 18,
      stiffness: 100,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={wm.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            wm.container,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={wm.iconWrap}>
            <View style={wm.iconBg}>
              <Ionicons name="musical-notes" size={32} color={C.gold} />
            </View>
          </View>

          <Text style={wm.title}>Bienvenue sur Suspentz</Text>
          <Text style={wm.subtitle}>
            Créez et partagez vos vidéos avec les musiques exclusives RHAZN
          </Text>

          <View style={wm.content}>
            <View style={wm.contentItem}>
              <View style={wm.contentItemNumber}>
                <Text style={wm.contentItemNumberTxt}>1</Text>
              </View>
              <View>
                <Text style={wm.contentItemTitle}>Téléchargez la musique</Text>
                <Text style={wm.contentItemSub}>
                  Accédez au catalogue RHAZN officiel
                </Text>
              </View>
            </View>

            <View style={wm.contentItem}>
              <View style={wm.contentItemNumber}>
                <Text style={wm.contentItemNumberTxt}>2</Text>
              </View>
              <View>
                <Text style={wm.contentItemTitle}>Montez votre vidéo</Text>
                <Text style={wm.contentItemSub}>
                  Utilisez CapCut ou votre app préférée
                </Text>
              </View>
            </View>

            <View style={wm.contentItem}>
              <View style={wm.contentItemNumber}>
                <Text style={wm.contentItemNumberTxt}>3</Text>
              </View>
              <View>
                <Text style={wm.contentItemTitle}>Publiez avec RHAZN</Text>
                <Text style={wm.contentItemSub}>
                  Partagez votre création avec le monde
                </Text>
              </View>
            </View>
          </View>

          <View style={wm.buttonCol}>
            <Pressable
              onPress={() => {
                onDownloadMusic();
                onClose();
              }}
              style={({ pressed }) => [
                wm.btnPrimary,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="download-outline" size={18} color="#000" />
              <Text style={wm.btnPrimaryTxt}>Télécharger la musique RHAZN</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                wm.btnSecondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={wm.btnSecondaryTxt}>Fermer</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#111",
    borderRadius: 28,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconWrap: {
    paddingTop: 28,
    alignItems: "center",
    marginBottom: 14,
  },
  iconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.goldDim,
    borderWidth: 1.5,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: C.white,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  content: {
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 14,
  },
  contentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  contentItemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  contentItemNumberTxt: {
    color: C.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  contentItemTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  contentItemSub: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  buttonCol: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.gold,
  },
  btnPrimaryTxt: {
    color: "#000",
    fontSize: 14,
    fontWeight: "900",
  },
  btnSecondary: {
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryTxt: {
    color: C.muted,
    fontSize: 14,
    fontWeight: "800",
  },
});

// ─────────────────────────────────────────────────────────────────
// DISCLAIMER MODAL (Apple-like)
// ─────────────────────────────────────────────────────────────────
function DisclaimerModal({
  visible,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      damping: 18,
      stiffness: 100,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDecline}
    >
      <View style={dm.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDecline} />

        <Animated.View
          style={[
            dm.container,
            {
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={dm.iconWrap}>
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color={C.gold}
            />
          </View>

          <Text style={dm.title}>Conditions de publication</Text>

          <ScrollView
            style={dm.content}
            scrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={dm.section}>
              <View style={dm.sectionHeader}>
                <View style={dm.bullet} />
                <Text style={dm.sectionTitle}>
                  Responsabilité de l'utilisateur
                </Text>
              </View>
              <Text style={dm.sectionText}>
                RHAZN décline toute responsabilité concernant les applications
                et outils utilisés pour réaliser vos montages vidéo. Vous êtes
                seul responsable du choix et de l'utilisation de ces logiciels
                (CapCut, Adobe Premiere, etc.).
              </Text>
            </View>

            <View style={dm.section}>
              <View style={dm.sectionHeader}>
                <View style={dm.bullet} />
                <Text style={dm.sectionTitle}>Plateforme de partage</Text>
              </View>
              <Text style={dm.sectionText}>
                RHAZN est une plateforme permettant aux créateurs de rendre
                publiques leurs œuvres. Nous ne sommes qu'une vitre technique
                facilitant la publication et la distribution de votre contenu.
              </Text>
            </View>

            <View style={dm.section}>
              <View style={dm.sectionHeader}>
                <View style={dm.bullet} />
                <Text style={dm.sectionTitle}>Propriété intellectuelle</Text>
              </View>
              <Text style={dm.sectionText}>
                Vous confirmez que votre création respecte les droits d'auteur,
                les droits à l'image et la propriété intellectuelle. Vous êtes
                responsable de tous les contenus et musiques utilisés.
              </Text>
            </View>

            <View style={dm.section}>
              <View style={dm.sectionHeader}>
                <View style={dm.bullet} />
                <Text style={dm.sectionTitle}>Coût de publication</Text>
              </View>
              <Text style={dm.sectionText}>
                Chaque publication consomme des ACSET de votre compte. Cette
                transaction est définitive et non remboursable.
              </Text>
            </View>
          </ScrollView>

          <View style={dm.agreement}>
            <Ionicons name="checkmark-circle" size={18} color={C.gold} />
            <Text style={dm.agreementTxt}>
              J'accepte les conditions et je reconnais être le seul responsable
              de mon contenu
            </Text>
          </View>

          <View style={dm.buttonRow}>
            <Pressable
              onPress={onDecline}
              style={({ pressed }) => [
                dm.btnSecondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={dm.btnSecondaryTxt}>Annuler</Text>
            </Pressable>

            <Pressable
              onPress={onAccept}
              style={({ pressed }) => [
                dm.btnPrimary,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={dm.btnPrimaryTxt}>J'accepte et je publie</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#111",
    borderRadius: 28,
    width: "100%",
    maxWidth: 380,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconWrap: {
    paddingTop: 28,
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: C.white,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  content: {
    maxHeight: 280,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 14,
  },
  agreement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(212,175,55,0.06)",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.20)",
  },
  agreementTxt: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryTxt: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryTxt: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
});


// ─────────────────────────────────────────────────────────────────
// DUPLICATE MODAL
// ─────────────────────────────────────────────────────────────────
function DuplicateModal({
  visible,
  result,
  isSupreme,
  onCancel,
  onForce,
}: {
  visible: boolean;
  result: DuplicateCheckResult | null;
  isSupreme: boolean;
  onCancel: () => void;
  onForce?: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      damping: 20,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  if (!visible) return null;

  const isHard = ["EXACT_HASH", "ALREADY_PUBLISHED", "DURATION_TITLE"].includes(
    result?.reason ?? ""
  );
  const canForce = isSupreme && result?.reason === "TITLE_SIMILARITY";
  const col = isHard ? C.danger : "#FF9F0A";
  const label = ({
    EXACT_HASH: "Fichier identique",
    DURATION_TITLE: "Durée + titre identiques",
    TITLE_SIMILARITY: "Titre très similaire",
    ALREADY_PUBLISHED: "Déjà publié",
  } as any)[result?.reason ?? ""] ?? "Doublon";

  return (
    <View style={dup.ov}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <Animated.View
        style={[
          dup.sh,
          {
            opacity: anim,
            transform: [
              {
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.93, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[dup.ring, { borderColor: col, backgroundColor: `${col}18` }]}>
          <Ionicons
            name={isHard ? "ban-outline" : "warning-outline"}
            size={28}
            color={col}
          />
        </View>
        <Text style={[dup.title, { color: col }]}>{label}</Text>
        <Text style={dup.msg}>
          {result?.message ?? "Ce contenu semble déjà exister."}
        </Text>
        <View style={dup.row}>
          <Pressable style={dup.cancel} onPress={onCancel}>
            <Text style={dup.cancelTxt}>Annuler</Text>
          </Pressable>
          {canForce && onForce && (
            <Pressable style={dup.force} onPress={onForce}>
              <Text style={dup.forceTxt}>Publier quand même</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const dup = StyleSheet.create({
  ov: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 9000,
    justifyContent: "flex-end",
  },
  sh: {
    backgroundColor: "#111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: "900", textAlign: "center" },
  msg: { color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  cancel: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelTxt: { color: C.muted, fontWeight: "800", fontSize: 13 },
  force: {
    flex: 1,
    alignItems: "center",
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 13,
  },
  forceTxt: { color: "#000", fontWeight: "900", fontSize: 13 },
});

// ─────────────────────────────────────────────────────────────────
// RECOVERY BANNER
// ─────────────────────────────────────────────────────────────────
function RecoveryBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: "#0D0D0D",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(212,175,55,0.30)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.gold, fontWeight: "900", fontSize: 13 }}>
          📝 Brouillon récupéré
        </Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>
          Voulez-vous reprendre votre création ?
        </Text>
      </View>
      <Pressable
        onPress={onDecline}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.07)",
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Text style={{ color: C.muted, fontWeight: "700", fontSize: 12 }}>
          Ignorer
        </Text>
      </Pressable>
      <Pressable
        onPress={onAccept}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 10,
          backgroundColor: C.gold,
        }}
      >
        <Text style={{ color: "#000", fontWeight: "900", fontSize: 12 }}>
          Reprendre
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function PublishSuspentz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Navigation ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("home");

  // ── Draft (état centralisé) ─────────────────────────────────
  const {
    draft,
    hasRecovery,
    updateDraft,
    acceptRecovery,
    declineRecovery,
    discardDraft,
  } = useDraft();

  // Alias lisibles
  const videoUri = draft.videoUri;
  const durationSec = draft.durationSec;
  const title = draft.title;
  const theme = draft.theme;
  const author = draft.author;
  const description = draft.description;

  // ── States locaux (UI only) ─────────────────────────────────
  const [showWelcome, setShowWelcome] = useState(true); // ✅ Welcome au chargement
  const [showMusicDownload, setShowMusicDownload] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false); // ✅ Disclaimer avant publication
  const [showThemes, setShowThemes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [acsetBalance, setAcsetBalance] = useState<number | null>(null);
  const [acsetCost, setAcsetCost] = useState(1);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [isSupreme, setIsSupreme] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [showDupModal, setShowDupModal] = useState(false);

  const { checkDuplicate, registerContentHash, checking: checkingDup } =
    useContentDuplicateCheck();

  const filteredThemes = useMemo(() => {
    const q = theme.trim().toLowerCase();
    if (!q) return [];
    return RHAZN_THEMES.filter((t) =>
      t.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [theme]);

  const notify = (n: Notice) => {
    setNotice(n);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // ── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    cleanOldFinals().catch(() => {});
  }, []);

  // Sauvegarder quand l'app passe en arrière-plan
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        // Auto-save
      }
    });
    return () => sub.remove();
  }, []);

  // Sync step dans le draft
  useEffect(() => {
    updateDraft({ step });
  }, [step]);

  // ── Init user + credits ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setCreditsLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) return;
        const supreme =
          (user.email || "").toLowerCase() ===
          "meyounbauniklovegodstory@gmail.com";
        setIsSupreme(supreme);
        if (supreme) {
          setAcsetBalance(Number.MAX_SAFE_INTEGER);
          return;
        }
        const { data: w } = await supabase
          .from("wallets")
          .select("acset_balance")
          .eq("user_id", user.id)
          .single();
        setAcsetBalance(Number(w?.acset_balance || 0));
      } finally {
        setCreditsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const name =
        prof?.full_name?.trim() ||
        (user.user_metadata as any)?.full_name?.trim() ||
        user.email?.trim() ||
        "Auteur";
      if (!draft.author.trim()) updateDraft({ author: name });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("publication_tariffs")
        .select("acset_cost")
        .eq("code", "SUSPENTZ")
        .eq("active", true)
        .maybeSingle();
      setAcsetCost(Number(data?.acset_cost || 1));
    })();
  }, []);

  // ── Gallery picker ────────────────────────────────────────
  const pickGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        notify({
          tone: "danger",
          title: "Accès galerie requis",
          message: "Autorisez l'accès dans les réglages.",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos" as any,
        quality: 1,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const dur = asset.duration
        ? Math.round(
            asset.duration > 1000
              ? asset.duration / 1000
              : asset.duration
          )
        : 0;

      if (dur > MAX_DURATION_SEC) {
        notify({
          tone: "danger",
          title: "Vidéo trop longue",
          message: `Maximum ${MAX_DURATION_SEC}s. Votre vidéo fait ${dur}s.`,
        });
        return;
      }

      let uri = asset.uri;
      if (Platform.OS === "android" && !uri.startsWith("file://")) {
        try {
          const dest = `${FileSystem.cacheDirectory}rz_pick_${Date.now()}.mp4`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uri = dest;
        } catch {}
      }

      updateDraft({ videoUri: uri, durationSec: dur });
      setStep("form");
      Haptics.selectionAsync().catch(() => {});
    } catch (e) {
      console.warn("pickGallery:", e);
    }
  };

  // ── Publish ────────────────────────────────────────────────
  const handlePublishClick = () => {
    const t = title.trim(),
      th = theme.trim(),
      au = author.trim();
    if (!t || !th || !au || !videoUri) {
      notify({
        tone: "danger",
        title: "Informations manquantes",
        message: "Titre, Thème et Auteur sont requis.",
      });
      return;
    }

    // ✅ Afficher le disclaimer avant de publier
    setShowDisclaimer(true);
  };

  const publish = async () => {
    const t = title.trim(),
      th = theme.trim(),
      au = author.trim();

    // ✅ CADNA check
    notify({
      tone: "info",
      title: "Vérification CADNA…",
      message: "Contrôle des droits d'auteur…",
    });
    const dup = await checkDuplicate({
      title: t,
      fileUri: videoUri,
      durationSeconds: durationSec,
      contentType: "SUSPENTZ",
    });
    if (dup.is_duplicate) {
      setNotice(null);
      setDupResult(dup);
      setShowDupModal(true);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      return;
    }

    setNotice(null);
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      if (!isSupreme && (acsetBalance ?? 0) < acsetCost) {
        notify({
          tone: "danger",
          title: "ACSET insuffisants",
          message: `Requis: ${acsetCost} — Disponible: ${acsetBalance ?? 0}`,
        });
        return;
      }

      notify({
        tone: "info",
        title: "Upload en cours…",
        message: "Envoi sécurisé…",
      });

      const ext =
        videoUri.split(".").pop()?.toLowerCase() === "mov" ? "mov" : "mp4";
      const contentType =
        ext === "mov" ? "video/quicktime" : "video/mp4";
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        router.replace("/auth/login");
        return;
      }

      const signRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sign-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ext, contentType }),
        }
      );
      if (!signRes.ok) throw new Error(`URL signée (${signRes.status})`);
      const { signedUrl, path: signedPath } = JSON.parse(
        await signRes.text()
      );

      // ✅ UPLOAD FIXÉ v3 — Utiliser le legacy API d'Expo (uploadAsync recommandé)
      const up = await uploadAsync(signedUrl, videoUri, {
        httpMethod: "PUT",
        headers: { "Content-Type": contentType },
      });

      if (!up || up.status !== 200) {
        throw new Error(`Upload failed (${up?.status})`);
      }

      const { data: pub } = supabase.storage
        .from("suspentz")
        .getPublicUrl(signedPath);
      if (!pub?.publicUrl) throw new Error("URL publique introuvable");

      const desc = `[THÈME]: ${th}\n---\n${description.trim()}`;

      const { data: rpcData, error: rpcErr } =
        await supabase.rpc("publish_suspentz_final", {
          p_title: t,
          p_media_path: pub.publicUrl,
          p_description: desc || null,
          p_duration_seconds: durationSec,
          p_cadna_status: isSupreme ? "approved" : "pending",
        });
      if (rpcErr) throw rpcErr;

      const contentId =
        typeof rpcData === "string" ? rpcData : rpcData?.id;
      if (contentId) {
        await registerContentHash(contentId, {
          title: t,
          fileUri: videoUri,
          durationSeconds: durationSec,
          contentType: "SUSPENTZ",
        });
      }

      // ✅ Effacer le draft
      await discardDraft();

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      notify({
        tone: "ok",
        title: "Suspentz publié ✅",
        message: "Validation CADNA en cours.",
        actionLabel: "Voir le feed",
        onAction: () => router.replace("/banq/suspentz"),
      });
    } catch (e: any) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      notify({
        tone: "danger",
        title: "Échec",
        message: e?.message || "Erreur réseau.",
      });
    } finally {
      setUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* ✅ MODALS */}
      <WelcomeModal
        visible={showWelcome}
        onClose={() => setShowWelcome(false)}
        onDownloadMusic={() => {
          setShowWelcome(false);
          setShowMusicDownload(true);
        }}
      />

      <DisclaimerModal
        visible={showDisclaimer}
        onAccept={() => {
          setShowDisclaimer(false);
          publish();
        }}
        onDecline={() => setShowDisclaimer(false)}
      />

      <MusicDownloadModal
        visible={showMusicDownload}
        onClose={() => setShowMusicDownload(false)}
      />

      <DuplicateModal
        visible={showDupModal}
        result={dupResult}
        isSupreme={isSupreme}
        onCancel={() => {
          setShowDupModal(false);
          setDupResult(null);
        }}
        onForce={async () => {
          if (dupResult?.reason === "TITLE_SIMILARITY") {
            setShowDupModal(false);
            setDupResult(null);
            await publish();
          }
        }}
      />

      {/* ✅ Recovery banner */}
      {hasRecovery && (
        <RecoveryBanner
          onAccept={async () => {
            await acceptRecovery();
            setStep((draft.step as Step) || "home");
          }}
          onDecline={declineRecovery}
        />
      )}

      {/* Notice overlay */}
      {notice && (
        <View style={st.noticeWrap} pointerEvents="auto">
          <View style={st.notice}>
            <View style={st.noticeTop}>
              <View
                style={[
                  st.dot,
                  {
                    backgroundColor:
                      notice.tone === "ok"
                        ? C.ok
                        : notice.tone === "danger"
                          ? C.danger
                          : C.blue,
                  },
                ]}
              />
              <Text style={st.noticeTitle}>{notice.title}</Text>
              <Pressable
                onPress={() => setNotice(null)}
                style={st.noticeClose}
              >
                <Ionicons name="close" size={16} color={C.muted} />
              </Pressable>
            </View>
            <Text style={st.noticeText}>{notice.message}</Text>
            {notice.actionLabel && notice.onAction && (
              <Pressable onPress={notice.onAction} style={st.noticeBtn}>
                <Text style={st.noticeBtnTxt}>{notice.actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Publier</Text>
          <Text style={st.headerSub}>
            Suspentz · max {MAX_DURATION_SEC}s ·{" "}
            <Text style={{ color: C.gold, fontWeight: "900" }}>
              {acsetCost} ACSET
            </Text>
          </Text>
        </View>
        <View style={st.creditsBadge}>
          {creditsLoading ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={13} color={C.gold} />
              <Text style={st.creditsVal}>
                {isSupreme ? "∞" : acsetBalance ?? "—"}
              </Text>
              <Text style={st.creditsLbl}>ACSET</Text>
            </>
          )}
        </View>
      </View>

      {/* Step pills */}
      <View style={st.stepRow}>
        {(["home", "form"] as Step[]).map((sv, i) => {
          const active = step === sv;
          const done = step === "form" && i < 1;
          return (
            <View key={sv} style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  st.stepPill,
                  active && st.stepPillActive,
                  done && st.stepPillDone,
                ]}
              >
                <Ionicons
                  name={
                    (i === 0 ? "images-outline" : "checkmark-outline") as any
                  }
                  size={11}
                  color={active ? "#000" : done ? C.ok : C.gray}
                />
                <Text
                  style={[
                    st.stepTxt,
                    active && { color: "#000" },
                    done && { color: C.ok },
                  ]}
                >
                  {["Vidéo", "Détails"][i]}
                </Text>
              </View>
              {i < 1 && (
                <View style={[st.stepLine, done && { backgroundColor: C.ok }]} />
              )}
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: FOOTER_H + 30,
          }}
        >
          {/* HOME STEP */}
          {step === "home" && (
            <View style={{ gap: 16 }}>
              <Text style={st.sectionTitle}>Importer votre vidéo</Text>
              <TouchableOpacity
                style={st.galleryBtn}
                onPress={pickGallery}
                activeOpacity={0.85}
              >
                <View style={st.galleryIcon}>
                  <Ionicons name="images" size={30} color={C.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.galleryBtnTitle}>
                    Choisir depuis la galerie
                  </Text>
                  <Text style={st.galleryBtnSub}>
                    MP4 · MOV · max {MAX_DURATION_SEC}s
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.gray} />
              </TouchableOpacity>

              <View style={st.divider} />
              <Text style={st.sectionTitle}>Musiques RHAZN Exclusives</Text>

              <Pressable
                onPress={() => setShowMusicDownload(true)}
                style={st.downloadMusicBtn}
              >
                <View style={st.downloadMusicIcon}>
                  <Ionicons name="download" size={18} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.downloadMusicTitle}>
                    Télécharger les musiques RHAZN
                  </Text>
                  <Text style={st.downloadMusicSub}>
                    Utilisez-les dans CapCut ou votre app préférée
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.gray} />
              </Pressable>

              <View style={st.infoBox}>
                <Ionicons name="information-circle" size={14} color={C.blue} />
                <Text style={st.infoBoxTxt}>
                  Montez votre vidéo dans CapCut, Adobe Premiere ou votre app
                  préférée avec une musique RHAZN téléchargée
                </Text>
              </View>

              {videoUri && (
                <TouchableOpacity
                  style={st.continueBtn}
                  onPress={() => setStep("form")}
                  activeOpacity={0.85}
                >
                  <Text style={st.continueTxt}>Continuer vers les détails</Text>
                  <Ionicons name="arrow-forward" size={16} color="#000" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* FORM STEP */}
          {step === "form" && (
            <View style={{ gap: 14 }}>
              <Pressable
                onPress={() => setStep("home")}
                style={st.backBtn}
              >
                <Ionicons name="chevron-back" size={16} color={C.gold} />
                <Text style={st.backBtnTxt}>Changer la vidéo</Text>
              </Pressable>

              {/* Résumé vidéo */}
              <View style={st.summaryCard}>
                <View style={st.summaryRow}>
                  <Ionicons name="videocam" size={12} color={C.muted} />
                  <Text style={st.summaryVal}>{durationSec}s</Text>
                </View>
              </View>

              {/* Formulaire */}
              <View style={{ position: "relative", zIndex: 20 }}>
                <TextInput
                  placeholder="Titre (obligatoire)"
                  placeholderTextColor={C.gray}
                  style={st.input}
                  value={title}
                  onChangeText={(v) => updateDraft({ title: v })}
                  maxLength={80}
                  returnKeyType="next"
                />
                <TextInput
                  placeholder="Thème (obligatoire)"
                  placeholderTextColor={C.gray}
                  style={st.input}
                  value={theme}
                  onChangeText={(v) => {
                    updateDraft({ theme: v });
                    setShowThemes(v.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (theme.trim()) setShowThemes(true);
                  }}
                  onBlur={() => setTimeout(() => setShowThemes(false), 150)}
                  returnKeyType="done"
                />
                {showThemes && filteredThemes.length > 0 && (
                  <View style={st.themeDropdown}>
                    {filteredThemes.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => {
                          updateDraft({ theme: t });
                          setShowThemes(false);
                          Haptics.selectionAsync().catch(() => {});
                        }}
                        style={({ pressed }) => [
                          st.themeRow,
                          pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
                        ]}
                      >
                        <Text style={st.themeTxt}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <TextInput
                placeholder="Auteur (obligatoire)"
                placeholderTextColor={C.gray}
                style={st.input}
                value={author}
                onChangeText={(v) => updateDraft({ author: v })}
                returnKeyType="next"
              />
              <TextInput
                placeholder="Description (optionnelle)"
                placeholderTextColor={C.gray}
                style={[st.input, { height: 80 }]}
                multiline
                value={description}
                onChangeText={(v) => updateDraft({ description: v })}
                textAlignVertical="top"
              />

              {checkingDup && (
                <View style={st.checkRow}>
                  <ActivityIndicator size="small" color={C.gold} />
                  <Text style={st.checkTxt}>Vérification CADNA…</Text>
                </View>
              )}

              {/* Bouton Publier */}
              <Pressable
                onPress={handlePublishClick}
                disabled={uploading || checkingDup}
                style={({ pressed }) => [
                  st.publishBtn,
                  (uploading || checkingDup) && { opacity: 0.72 },
                  pressed && !uploading && { transform: [{ scale: 0.99 }] },
                ]}
              >
                {uploading || checkingDup ? (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                  >
                    <ActivityIndicator color="#000" />
                    <Text style={st.publishTxt}>
                      {uploading ? "Publication…" : "Vérification…"}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={18}
                      color="#000"
                    />
                    <Text style={st.publishTxt}>
                      Publier · {acsetCost} ACSET
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#000" />
                  </View>
                )}
              </Pressable>

              <Text style={st.footnote}>
                Après {acsetCost} ACSET, votre Suspentz est envoyé à{" "}
                <Text style={{ color: C.gold, fontWeight: "900" }}>CADNA</Text>{" "}
                pour validation.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerTitle: { color: C.white, fontSize: 22, fontWeight: "900" },
  headerSub: { color: C.gray, fontSize: 11, marginTop: 2 },
  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: C.goldDim,
  },
  creditsVal: { color: C.gold, fontWeight: "900", fontSize: 14 },
  creditsLbl: { color: "rgba(212,175,55,0.60)", fontWeight: "800", fontSize: 9 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: C.hairline,
  },
  stepPillActive: { backgroundColor: C.gold, borderColor: C.gold },
  stepPillDone: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderColor: "rgba(52,199,89,0.40)",
  },
  stepTxt: { color: C.gray, fontSize: 11, fontWeight: "800" },
  stepLine: {
    width: 14,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginHorizontal: 2,
  },
  sectionTitle: { color: C.white, fontWeight: "900", fontSize: 14 },
  divider: { height: 1, backgroundColor: C.hairline },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.30)",
  },
  galleryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(0,122,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(0,122,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBtnTitle: { color: C.white, fontWeight: "900", fontSize: 14 },
  galleryBtnSub: { color: C.gray, fontSize: 11, marginTop: 2 },
  downloadMusicBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.30)",
  },
  downloadMusicIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.goldDim,
    borderWidth: 1.5,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadMusicTitle: { color: C.white, fontWeight: "900", fontSize: 14 },
  downloadMusicSub: { color: C.gray, fontSize: 11, marginTop: 2 },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,122,255,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.25)",
  },
  infoBoxTxt: { color: C.blue, fontSize: 12, fontWeight: "600", flex: 1 },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  continueTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backBtnTxt: { color: C.gold, fontWeight: "700", fontSize: 13 },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryVal: { color: C.muted, fontSize: 11, fontWeight: "600" },
  input: {
    backgroundColor: "#111",
    color: C.white,
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 14,
  },
  themeDropdown: {
    position: "absolute",
    top: 109,
    left: 0,
    right: 0,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 200,
    overflow: "hidden",
    zIndex: 999,
  },
  themeRow: { paddingVertical: 11, paddingHorizontal: 13 },
  themeTxt: { color: C.white, fontSize: 13 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.25)",
  },
  checkTxt: { color: C.gold, fontWeight: "700", fontSize: 12 },
  publishBtn: {
    backgroundColor: C.gold,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  publishTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
  footnote: {
    color: C.gray,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  noticeWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 5000,
  },
  notice: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 18,
    width: "100%",
    maxWidth: 420,
  },
  noticeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 99 },
  noticeTitle: { color: C.white, fontWeight: "900", fontSize: 14, flex: 1 },
  noticeClose: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  noticeText: { color: C.muted, lineHeight: 18, fontSize: 12.5 },
  noticeBtn: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: C.blue,
    paddingVertical: 12,
    alignItems: "center",
  },
  noticeBtnTxt: { color: "#fff", fontWeight: "900" },
});