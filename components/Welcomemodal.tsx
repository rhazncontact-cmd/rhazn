/**
 * components/WelcomeModal.tsx
 * ✅ Modal Apple-like de bienvenue à l'ouverture de l'écran publish
 * ✅ Propose de télécharger la musique RHAZN officielle
 * ✅ Bouton Fermer/Ignorer
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const C = {
  bg: "#0A0A0A",
  white: "#FFF",
  gray: "#666",
  muted: "rgba(255,255,255,0.60)",
  border: "rgba(255,255,255,0.10)",
  blue: "#007AFF",
  gold: "#D4AF37",
  goldDim: "rgba(212,175,55,0.14)",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onDownloadMusic: () => void;
};

export default function WelcomeModal({
  visible,
  onClose,
  onDownloadMusic,
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
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

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
            <View style={s.iconBg}>
              <Ionicons
                name="musical-notes"
                size={32}
                color={C.gold}
              />
            </View>
          </View>

          {/* Title */}
          <Text style={s.title}>Bienvenue sur Suspentz</Text>

          {/* Subtitle */}
          <Text style={s.subtitle}>
            Créez et partagez vos vidéos avec les musiques exclusives RHAZN
          </Text>

          {/* Content */}
          <View style={s.content}>
            <View style={s.contentItem}>
              <View style={s.contentItemNumber}>
                <Text style={s.contentItemNumberTxt}>1</Text>
              </View>
              <View>
                <Text style={s.contentItemTitle}>Téléchargez la musique</Text>
                <Text style={s.contentItemSub}>
                  Accédez au catalogue RHAZN officiel
                </Text>
              </View>
            </View>

            <View style={s.contentItem}>
              <View style={s.contentItemNumber}>
                <Text style={s.contentItemNumberTxt}>2</Text>
              </View>
              <View>
                <Text style={s.contentItemTitle}>Montez votre vidéo</Text>
                <Text style={s.contentItemSub}>
                  Utilisez CapCut ou votre app préférée
                </Text>
              </View>
            </View>

            <View style={s.contentItem}>
              <View style={s.contentItemNumber}>
                <Text style={s.contentItemNumberTxt}>3</Text>
              </View>
              <View>
                <Text style={s.contentItemTitle}>Publiez avec RHAZN</Text>
                <Text style={s.contentItemSub}>
                  Partagez votre création avec le monde
                </Text>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={s.buttonCol}>
            <Pressable
              onPress={() => {
                onDownloadMusic();
                onClose();
              }}
              style={({ pressed }) => [
                s.btnPrimary,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="download-outline" size={18} color="#000" />
              <Text style={s.btnPrimaryTxt}>Télécharger la musique RHAZN</Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                s.btnSecondary,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={s.btnSecondaryTxt}>Fermer</Text>
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
    maxWidth: 360,
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

  // Content
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

  // Buttons
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