// components/DuplicateWarningModal.tsx
// ✅ Modal d'avertissement doublon — bloque l'upload si détecté

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DuplicateCheckResult } from "../hooks/useContentDuplicateCheck";

const C = {
  gold:   "#D4AF37",
  danger: "#FF3B30",
  warn:   "#FF9F0A",
};

type Props = {
  visible:  boolean;
  result:   DuplicateCheckResult | null;
  onForce?: () => void;
  onCancel: () => void;
  isSupreme?: boolean;
};

export default function DuplicateWarningModal({ visible, result, onForce, onCancel, isSupreme }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible || !result?.is_duplicate) return null;

  const isSimilar = result.reason === "TITLE_SIMILARITY";
  const accent    = isSimilar ? C.warn : C.danger;
  const icon      = isSimilar ? "warning" : "copy";

  const reasonMap: Record<string, string> = {
    EXACT_HASH:            "Fichier identique",
    METADATA_FINGERPRINT:  "Re-encodage détecté",
    TITLE_SIMILARITY:      "Titre trop similaire",
  };

  return (
    <Animated.View style={[s.overlay, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0,1], outputRange: [0.88,1] }) }] }]}>
      <View style={s.card}>

        <View style={[s.iconRing, { backgroundColor: accent + "18", borderColor: accent + "40" }]}>
          <Ionicons name={icon as any} size={36} color={accent} />
        </View>

        <Text style={s.title}>Contenu dupliqué détecté</Text>

        <View style={[s.reasonBadge, { backgroundColor: accent + "14", borderColor: accent + "35" }]}>
          <Ionicons name="shield-checkmark" size={13} color={accent} />
          <Text style={[s.reasonTxt, { color: accent }]}>
            {reasonMap[result.reason ?? ""] ?? result.reason}
          </Text>
          {result.similarity > 0 && (
            <Text style={[s.simTxt, { color: accent }]}>
              · {Math.round(result.similarity * 100)}% similaire
            </Text>
          )}
        </View>

        {result.existing_title && (
          <View style={s.existingBox}>
            <Text style={s.existingLabel}>Contenu existant :</Text>
            <Text style={s.existingTitle} numberOfLines={2}>
              "{result.existing_title}"
            </Text>
          </View>
        )}

        <Text style={s.message}>
          {isSimilar
            ? "Ce titre est très similaire à un contenu déjà publié sur RHAZN. Modifiez le titre ou vérifiez que ce contenu n'existe pas déjà."
            : "Ce fichier a déjà été publié sur RHAZN. La republication du même contenu est interdite pour protéger les droits d'auteur."
          }
        </Text>

        <View style={s.rulePill}>
          <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={s.ruleTxt}>Politique RHAZN — Protection des droits d'auteur</Text>
        </View>

        <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={16} color="#000" />
          <Text style={s.cancelTxt}>Modifier le contenu</Text>
        </TouchableOpacity>

        {isSupreme && isSimilar && onForce && (
          <TouchableOpacity style={s.forceBtn} onPress={onForce} activeOpacity={0.75}>
            <Ionicons name="flash" size={13} color={C.warn} />
            <Text style={s.forceTxt}>Publier quand même (Supreme)</Text>
          </TouchableOpacity>
        )}

      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay:      { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: 24 },
  card:         { backgroundColor: "#0D0D0D", borderRadius: 28, padding: 26, width: "100%", alignItems: "center", gap: 14, borderWidth: 1.5, borderColor: "rgba(255,59,48,0.25)", shadowColor: "#FF3B30", shadowOpacity: 0.20, shadowRadius: 30, elevation: 20 },
  iconRing:     { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:        { color: "#FFFFFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  reasonBadge:  { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  reasonTxt:    { fontWeight: "900", fontSize: 13 },
  simTxt:       { fontWeight: "700", fontSize: 12 },
  existingBox:  { width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", gap: 4 },
  existingLabel:{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "700" },
  existingTitle:{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  message:      { color: "rgba(255,255,255,0.60)", fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  rulePill:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  ruleTxt:      { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "700" },
  cancelBtn:    { width: "100%", backgroundColor: "#D4AF37", borderRadius: 18, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  cancelTxt:    { color: "#000", fontSize: 15, fontWeight: "900" },
  forceBtn:     { paddingVertical: 6 },
  forceTxt:     { color: C.warn, fontSize: 12, fontWeight: "700" },
});