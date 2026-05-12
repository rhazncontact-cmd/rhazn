/**
 * components/DisclaimerModal.tsx
 * ✅ Modal Apple-like disclaimer avant publication
 * ✅ L'utilisateur doit accepter avant de publier
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  white: "#FFF",
  gray: "#666",
  muted: "rgba(255,255,255,0.60)",
  border: "rgba(255,255,255,0.10)",
  blue: "#007AFF",
  danger: "#FF453A",
  gold: "#D4AF37",
};

type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export default function DisclaimerModal({
  visible,
  onAccept,
  onDecline,
}: Props) {
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
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDecline} />

        <Animated.View
          style={[
            s.container,
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
          {/* Header Icon */}
          <View style={s.iconWrap}>
            <Ionicons
              name="shield-checkmark-outline"
              size={28}
              color={C.gold}
            />
          </View>

          {/* Title */}
          <Text style={s.title}>Conditions de publication</Text>

          {/* Disclaimer Content */}
          <ScrollView
            style={s.content}
            scrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1 */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.bullet} />
                <Text style={s.sectionTitle}>Responsabilité de l'utilisateur</Text>
              </View>
              <Text style={s.sectionText}>
                RHAZN décline toute responsabilité concernant les applications et
                outils utilisés pour réaliser vos montages vidéo. Vous êtes
                seul responsable du choix et de l'utilisation de ces logiciels
                (CapCut, Adobe Premiere, etc.).
              </Text>
            </View>

            {/* Section 2 */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.bullet} />
                <Text style={s.sectionTitle}>Plateforme de partage</Text>
              </View>
              <Text style={s.sectionText}>
                RHAZN est une plateforme permettant aux créateurs de rendre
                publiques leurs œuvres. Nous ne sommes qu'une vitre technique
                facilitant la publication et la distribution de votre contenu.
              </Text>
            </View>

            {/* Section 3 */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.bullet} />
                <Text style={s.sectionTitle}>Propriété intellectuelle</Text>
              </View>
              <Text style={s.sectionText}>
                Vous confirmez que votre création respecte les droits d'auteur,
                les droits à l'image et la propriété intellectuelle. Vous êtes
                responsable de tous les contenus et musiques utilisés.
              </Text>
            </View>

            {/* Section 4 */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <View style={s.bullet} />
                <Text style={s.sectionTitle}>Coût de publication</Text>
              </View>
              <Text style={s.sectionText}>
                Chaque publication consomme des ACSET de votre compte. Cette
                transaction est définitive et non remboursable.
              </Text>
            </View>
          </ScrollView>

          {/* Checkbox Agreement */}
          <View style={s.agreement}>
            <Ionicons name="checkmark-circle" size={18} color={C.gold} />
            <Text style={s.agreementTxt}>
              J'accepte les conditions et je reconnais être le seul responsable
              de mon contenu
            </Text>
          </View>

          {/* Buttons */}
          <View style={s.buttonRow}>
            <Pressable
              onPress={onDecline}
              style={({ pressed }) => [
                s.btnSecondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={s.btnSecondaryTxt}>Annuler</Text>
            </Pressable>

            <Pressable
              onPress={onAccept}
              style={({ pressed }) => [
                s.btnPrimary,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={s.btnPrimaryTxt}>J'accepte et je publie</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
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

  // Header
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

  // Content
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

  // Agreement
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

  // Buttons
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