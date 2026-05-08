/**
 * app/components/PinVerifyModal.tsx
 * ─────────────────────────────────────────────────────────────
 * Modal de vérification PIN — même design exact que "Créer PIN"
 *
 * Usage :
 *   import PinVerifyModal from "../components/PinVerifyModal";
 *
 *   <PinVerifyModal
 *     visible={showPin}
 *     onSuccess={() => setShowPin(false)}
 *     onCancel={() => setShowPin(false)}
 *   />
 * ─────────────────────────────────────────────────────────────
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { rzSecure } from "../lib/rzSecure";

const PIN_KEY = "RHAZN_USER_PIN";
const FOOTER_H = 95;

// ── Palette identique à user-security-pin ──────────────────────
const C = {
  bg:      "#F2F2F7",
  card:    "#FFFFFF",
  text:    "#0A0A0A",
  sub:     "#6E6E73",
  muted:   "#AEAEB2",
  border:  "#E5E5EA",
  gold:    "#D4AF37",
  goldBg:  "rgba(212,175,55,0.10)",
  goldBd:  "rgba(212,175,55,0.30)",
  danger:  "#FF453A",
  success: "#30D158",
};

// ─────────────────────────────────────────────────────────────
// DOTS — identiques à user-security-pin
// ─────────────────────────────────────────────────────────────
function PinDots({ value }: { value: string }) {
  const scaleAnims = useRef([0,1,2,3].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const idx = value.length - 1;
    if (idx < 0 || idx > 3) return;
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.35, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  }, [value.length]);

  return (
    <View style={d.dots}>
      {[0,1,2,3].map((i) => (
        <Animated.View
          key={i}
          style={[
            d.dot,
            value.length > i && d.dotFilled,
            { transform: [{ scale: scaleAnims[i] }] },
          ]}
        />
      ))}
    </View>
  );
}

const d = StyleSheet.create({
  dots:      { flexDirection: "row", gap: 20 },
  dot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: "#D1D1D6", borderWidth: 1.5, borderColor: C.border },
  dotFilled: { backgroundColor: C.gold, borderColor: C.gold },
});

// ─────────────────────────────────────────────────────────────
// NUMPAD — identique à user-security-pin
// ─────────────────────────────────────────────────────────────
function NumKey({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable onPress={press}>
      <Animated.View style={[np.key, { transform: [{ scale }] }]}>
        <Text style={np.keyTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function NumPad({ onPress, onDelete }: { onPress: (n: string) => void; onDelete: () => void }) {
  const rows = [["1","2","3"],["4","5","6"],["7","8","9"]];
  return (
    <View style={np.pad}>
      {rows.map((row, ri) => (
        <View key={ri} style={np.row}>
          {row.map((n) => <NumKey key={n} label={n} onPress={() => onPress(n)} />)}
        </View>
      ))}
      <View style={np.row}>
        <View style={np.empty} />
        <NumKey label="0" onPress={() => onPress("0")} />
        <Pressable style={({ pressed }) => [np.delBtn, pressed && { opacity: 0.5 }]} onPress={onDelete}>
          <Feather name="delete" size={22} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

const np = StyleSheet.create({
  pad:    { gap: 12 },
  row:    { flexDirection: "row", justifyContent: "center", gap: 24, alignItems: "center" },
  key:    { width: 76, height: 76, borderRadius: 38, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  keyTxt: { fontSize: 28, fontWeight: "300", color: C.text, letterSpacing: -0.5 },
  empty:  { width: 76, height: 76 },
  delBtn: { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
});

// ─────────────────────────────────────────────────────────────
// ALERTE PIN — bottom sheet dark
// ─────────────────────────────────────────────────────────────
function PinAlert({ visible, title, message, onDismiss }: {
  visible: boolean; title: string; message: string; onDismiss: () => void;
}) {
  const slideY   = useRef(new Animated.Value(180)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,   { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,   { toValue: 180, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[al.backdrop, { opacity: fadeAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
      <Animated.View style={[al.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={al.handle} />
        <View style={[al.iconRing, { backgroundColor: C.danger + "18", borderColor: C.danger + "45" }]}>
          <Ionicons name="close-circle" size={36} color={C.danger} />
        </View>
        <Text style={al.title}>{title}</Text>
        <Text style={al.msg}>{message}</Text>
        <View style={al.sep} />
        <TouchableOpacity style={[al.okBtn, { borderColor: C.danger + "50" }]} onPress={onDismiss} activeOpacity={0.75}>
          <Text style={[al.okTxt, { color: C.danger }]}>Réessayer</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const al = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.50)", justifyContent: "flex-end", zIndex: 100 },
  sheet:    { backgroundColor: "#131313", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 44, alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 24 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  iconRing: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", borderWidth: 1.5, marginBottom: 4 },
  title:    { color: "#FFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  msg:      { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20, paddingHorizontal: 6 },
  sep:      { width: "100%", height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.10)", marginVertical: 4 },
  okBtn:    { width: "100%", paddingVertical: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: 1, marginTop: 2 },
  okTxt:    { fontSize: 17, fontWeight: "900" },
});

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  onSuccess: () => void;
  onCancel:  () => void;
  // Optionnel : texte du lien "gérer mon PIN"
  showManageLink?: boolean;
}

export default function PinVerifyModal({ visible, onSuccess, onCancel, showManageLink = true }: Props) {
  const router    = useRouter();
  const [pin,     setPin]     = useState("");
  const [tries,   setTries]   = useState(0);
  const [alertV,  setAlertV]  = useState(false);
  const [alertMsg,setAlertMsg]= useState("");
  const [hasPin,  setHasPin]  = useState<boolean | null>(null);

  // Shake sur erreur
  const shakeX = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 45, useNativeDriver: true }),
    ]).start();
  };

  // Reset à chaque ouverture
  // 🔐 Reset sécurisé à chaque ouverture
useEffect(() => {
  if (visible) {
    setPin("");
    setTries(0);
    setHasPin(null); // 🔥 reset immédiat pour éviter bypass

    // 🔄 vérification PIN async (après reset)
    rzSecure.get(PIN_KEY).then((v) => {
      setHasPin(!!v);
    });
  }
}, [visible]);

  // Push chiffre — vérifie auto quand 4 chiffres saisis
  const push = async (n: string) => {
    if (pin.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin + n;
    setPin(next);
    if (next.length === 4) {
      // Petite pause pour voir le 4e point se remplir
      setTimeout(() => verifyPin(next), 200);
    }
  };

  const del = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
  };

  const verifyPin = async (attempt: string) => {
  const saved = await rzSecure.get(PIN_KEY);

  console.log("🔐 PIN attempt:", attempt, "| saved:", saved ? "***" : "NULL");

  // 🔒 SI PAS DE PIN → REFUSER (sécurité)
  if (!saved) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setAlertMsg("Aucun PIN configuré. Veuillez en créer un.");
    setAlertV(true);
    setPin("");
    return;
  }

  if (attempt === saved) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPin("");
    onSuccess();
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    triggerShake();
    setPin("");

    const newTries = tries + 1;
    setTries(newTries);

    if (newTries >= 5) {
      setAlertMsg("Trop de tentatives incorrectes. Vérifiez votre PIN.");
    } else {
      setAlertMsg(`PIN incorrect. ${5 - newTries} tentative(s) restante(s).`);
    }

    setAlertV(true);
  }
};

  // Si pas de PIN configuré → succès direct (pas de blocage)
  
  const canSubmit = pin.length === 4;

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <SafeAreaView style={s.safe}>

        {/* ══ HEADER ══ */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={onCancel}>
            <Feather name="x" size={20} color={C.gold} />
          </Pressable>
          <Text style={s.headerTitle}>Sécurité PIN</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ══ ZONE CENTRALE — titre + badge + dots ══ */}
        <View style={s.dotsZone}>

          {/* Badge RHAZN */}
          <View style={s.badge}>
            <View style={s.badgeIcon}>
              <Ionicons name="lock-closed" size={18} color={C.gold} />
            </View>
            <Text style={s.badgeTxt}>PIN RHAZN</Text>
          </View>

          {/* Titre */}
          <Text style={s.stepTitle}>Entrez votre PIN sécurisé</Text>

          {/* Sous-titre tentatives */}
          {tries > 0 && (
            <Text style={s.triesTxt}>
              {5 - tries} tentative{5 - tries > 1 ? "s" : ""} restante{5 - tries > 1 ? "s" : ""}
            </Text>
          )}

          {/* Dots animés */}
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <PinDots value={pin} />
          </Animated.View>

        </View>

        {/* ══ NUMPAD + BOUTON — identique Créer PIN ══ */}
        <View style={[s.bottom, { paddingBottom: FOOTER_H + 16 }]}>

          <NumPad onPress={push} onDelete={del} />

          {/* Bouton Valider */}
          <Pressable
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={canSubmit ? () => verifyPin(pin) : undefined}
          >
            <Text style={[s.submitTxt, !canSubmit && s.submitTxtDisabled]}>
              Valider
            </Text>
          </Pressable>

          {/* Lien gérer mon PIN */}
          {showManageLink && (
            <Pressable
              style={s.manageLink}
              onPress={() => { onCancel(); router.push("/user-security-pin" as any); }}
            >
              <Text style={s.manageLinkTxt}>Gérer mon PIN</Text>
            </Pressable>
          )}

        </View>

        {/* Alerte erreur PIN */}
        <PinAlert
          visible={alertV}
          title="PIN incorrect"
          message={alertMsg}
          onDismiss={() => setAlertV(false)}
        />

      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES — copie exacte de user-security-pin
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitle:{ color: C.text, fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },

  // Zone centrale
  dotsZone:  { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 0 },

  // Badge RHAZN
  badge:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.goldBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.goldBd, marginBottom: 20 },
  badgeIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.goldBg, alignItems: "center", justifyContent: "center" },
  badgeTxt:  { color: C.gold, fontWeight: "900", fontSize: 14, letterSpacing: 1 },

  // Titre
  stepTitle: { color: C.text, fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8, letterSpacing: 0.2 },
  triesTxt:  { color: C.danger, fontSize: 12, fontWeight: "700", marginBottom: 16 },

  // Bottom zone — identique à user-security-pin
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: C.bg,
    gap: 16,
  },

  // Bouton submit — identique à user-security-pin
  submitBtn: {
    backgroundColor: C.gold,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitTxt:         { color: "#000",  fontWeight: "900", fontSize: 16, letterSpacing: 0.3 },
  submitTxtDisabled: { color: C.muted, fontWeight: "700" },

  // Lien gérer
  manageLink:    { alignItems: "center", paddingVertical: 4 },
  manageLinkTxt: { color: C.sub, fontWeight: "700", fontSize: 13 },
});