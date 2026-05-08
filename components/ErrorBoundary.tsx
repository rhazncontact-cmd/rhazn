// components/DuplicateWarningModal.tsx
// ✅ RHAZN — Modal avertissement doublon — version robuste (null-safe)

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

export type DuplicateCheckResult = {
  is_duplicate:  boolean;
  reason?:       string | null;
  match_title?:  string | null;
  match_id?:     string | null;
  confidence?:   number | null;
  message?:      string | null;
};

type Props = {
  visible:    boolean;
  result:     DuplicateCheckResult | null;
  isSupreme:  boolean;
  onCancel:   () => void;
  onForce?:   () => void;
};

const C = {
  bg:      "#0B0B0B",
  card:    "#111111",
  gold:    "#D4AF37",
  danger:  "#FF453A",
  orange:  "#FF9F0A",
  white:   "#FFFFFF",
  muted:   "rgba(255,255,255,0.60)",
  border:  "rgba(255,255,255,0.12)",
  hairline:"rgba(255,255,255,0.07)",
};

function reasonLabel(reason?: string | null): string {
  switch (reason) {
    case "EXACT_HASH":        return "Fichier identique détecté";
    case "DURATION_TITLE":    return "Durée + titre identiques";
    case "TITLE_SIMILARITY":  return "Titre très similaire";
    case "ALREADY_PUBLISHED": return "Déjà publié";
    default:                  return "Contenu potentiellement dupliqué";
  }
}

function reasonColor(reason?: string | null): string {
  switch (reason) {
    case "EXACT_HASH":
    case "DURATION_TITLE":
    case "ALREADY_PUBLISHED": return C.danger;
    default:                  return C.orange;
  }
}

function canForce(reason?: string | null, isSupreme?: boolean): boolean {
  if (!isSupreme) return false;
  return reason === "TITLE_SIMILARITY";
}

export default function DuplicateWarningModal({
  visible, result, onForce, onCancel, isSupreme,
}: Props) {
  // ✅ FIX: utiliser useRef de façon séparée pour éviter le crash
  const animRef = useRef<Animated.Value | null>(null);
  if (!animRef.current) {
    animRef.current = new Animated.Value(0);
  }
  const anim = animRef.current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue:   visible ? 1 : 0,
      damping:   20,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // ✅ Retour null si pas visible — aucun crash possible
  if (!visible) return null;

  const reason     = result?.reason     ?? null;
  const matchTitle = result?.match_title ?? null;
  const message    = result?.message    ?? "Ce contenu semble déjà exister sur la plateforme RHAZN.";
  const color      = reasonColor(reason);
  const label      = reasonLabel(reason);
  const allowForce = canForce(reason, isSupreme);
  const isHard     = reason === "EXACT_HASH" || reason === "ALREADY_PUBLISHED" || reason === "DURATION_TITLE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onCancel} />
      <Animated.View
        style={[
          s.sheet,
          {
            opacity:   anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}
      >
        <View style={[s.iconRing, { borderColor: color, backgroundColor: `${color}18` }]}>
          <Ionicons name={isHard ? "ban-outline" : "warning-outline"} size={32} color={color} />
        </View>

        <Text style={[s.title, { color }]}>{label}</Text>

        {reason && (
          <View style={[s.reasonBadge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
            <Ionicons name="shield-outline" size={11} color={color} />
            <Text style={[s.reasonTxt, { color }]}>{reason}</Text>
          </View>
        )}

        <Text style={s.message}>{message}</Text>

        {matchTitle && (
          <View style={s.matchBox}>
            <Text style={s.matchLabel}>Contenu existant</Text>
            <Text style={s.matchTitle} numberOfLines={2}>{matchTitle}</Text>
          </View>
        )}

        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={14} color={C.muted} />
          <Text style={s.infoTxt}>
            {isHard
              ? "Ce doublon est bloqué par CADNA. La publication est impossible."
              : "Le système CADNA a détecté une similarité. Vérifiez avant de continuer."}
          </Text>
        </View>

        <View style={s.btnRow}>
          <Pressable style={s.cancelBtn} onPress={onCancel}>
            <Ionicons name="close" size={15} color={C.muted} />
            <Text style={s.cancelTxt}>Annuler</Text>
          </Pressable>
          {allowForce && onForce && (
            <Pressable style={s.forceBtn} onPress={onForce}>
              <Ionicons name="flash" size={15} color="#000" />
              <Text style={s.forceTxt}>Publier quand même</Text>
            </Pressable>
          )}
        </View>

        {isSupreme && (
          <View style={s.supremeRow}>
            <Ionicons name="shield-checkmark" size={11} color={C.gold} />
            <Text style={s.supremeTxt}>
              {allowForce
                ? "SUPREME — publication forcée autorisée"
                : "SUPREME — ce doublon ne peut pas être forcé"}
            </Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48,
    alignItems: "center", gap: 12,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 }, elevation: 24,
  },
  iconRing: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", borderWidth: 2, marginBottom: 4 },
  title:    { fontSize: 19, fontWeight: "900", textAlign: "center", letterSpacing: 0.2 },
  reasonBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  reasonTxt:   { fontWeight: "800", fontSize: 11, letterSpacing: 0.4 },
  message:  { color: C.muted, fontSize: 13, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  matchBox: { width: "100%", backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  matchLabel:{ color: C.muted, fontSize: 10, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
  matchTitle:{ color: C.white, fontWeight: "700", fontSize: 13, lineHeight: 18 },
  infoBox:  { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, width: "100%", borderWidth: 1, borderColor: C.hairline },
  infoTxt:  { color: C.muted, fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 17 },
  btnRow:   { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  cancelBtn:{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: C.border },
  cancelTxt:{ color: C.muted, fontWeight: "800", fontSize: 14 },
  forceBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.gold, borderRadius: 16, paddingVertical: 14 },
  forceTxt: { color: "#000", fontWeight: "900", fontSize: 14 },
  supremeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(212,175,55,0.22)" },
  supremeTxt: { color: C.gold, fontWeight: "700", fontSize: 11 },
});