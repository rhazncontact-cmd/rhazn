// app/user-security-pin.tsx
// ─────────────────────────────────────────────────────────────
// RHAZN — PIN Security  •  Apple-like layout
// Numpad fixé en bas, contenu en haut, bouton toujours visible
// ─────────────────────────────────────────────────────────────

import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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

// ── Palette ────────────────────────────────────────────────────
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

const PIN_KEY    = "RHAZN_USER_PIN";
const FOOTER_H   = 95; // hauteur footer RHAZN

// ═══════════════════════════════════════════════════════════════
// PREMIUM ALERT — bottom sheet dark
// ═══════════════════════════════════════════════════════════════
type AlertType = "info" | "success" | "error";
interface AlertConfig { type: AlertType; title: string; message: string; }

function PremiumAlert({ config, visible, onDismiss }: {
  config: AlertConfig | null; visible: boolean; onDismiss: () => void;
}) {
  const slideY  = useRef(new Animated.Value(180)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,   { toValue: 0,   useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(fadeAnim, { toValue: 1,   duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,   { toValue: 180, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!config) return null;

  const accent = config.type === "success" ? C.success : config.type === "error" ? C.danger : C.gold;
  const icon   = config.type === "success" ? "checkmark-circle" : config.type === "error" ? "close-circle" : "information-circle";

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <Animated.View style={[al.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
      </Animated.View>
      <Animated.View style={[al.wrap, { transform: [{ translateY: slideY }], opacity: fadeAnim }]}>
        <View style={al.sheet}>
          <View style={al.handle} />
          <View style={[al.iconRing, { backgroundColor: accent + "18", borderColor: accent + "45" }]}>
            <Ionicons name={icon as any} size={36} color={accent} />
          </View>
          <Text style={al.title}>{config.title}</Text>
          <Text style={al.msg}>{config.message}</Text>
          <View style={al.sep} />
          <TouchableOpacity style={[al.okBtn, { borderColor: accent + "50" }]} onPress={onDismiss} activeOpacity={0.75}>
            <Text style={[al.okTxt, { color: accent }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const al = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.50)" },
  wrap:     { position: "absolute", bottom: 0, left: 0, right: 0 },
  sheet:    { backgroundColor: "#131313", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 44, alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 24 },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  iconRing: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", borderWidth: 1.5, marginBottom: 4 },
  title:    { color: "#FFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  msg:      { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20, paddingHorizontal: 6 },
  sep:      { width: "100%", height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.10)", marginVertical: 4 },
  okBtn:    { width: "100%", paddingVertical: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: 1, marginTop: 2 },
  okTxt:    { fontSize: 17, fontWeight: "900" },
});

// ═══════════════════════════════════════════════════════════════
// DOTS — rangée de 4 points PIN style Apple
// ═══════════════════════════════════════════════════════════════
function PinDots({ value, label }: { value: string; label: string }) {
  const scaleAnims = useRef([0,1,2,3].map(() => new Animated.Value(1))).current;

  // Petite animation pop quand un point se remplit
  useEffect(() => {
    const idx = value.length - 1;
    if (idx < 0 || idx > 3) return;
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.35, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  }, [value.length]);

  return (
    <View style={d.wrap}>
      <Text style={d.label}>{label}</Text>
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
    </View>
  );
}

const d = StyleSheet.create({
  wrap:      { alignItems: "center", marginBottom: 20 },
  label:     { color: C.sub, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 14, textTransform: "uppercase" },
  dots:      { flexDirection: "row", gap: 20 },
  dot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: "#D1D1D6", borderWidth: 1.5, borderColor: C.border },
  dotFilled: { backgroundColor: C.gold, borderColor: C.gold },
});

// ═══════════════════════════════════════════════════════════════
// NUMPAD — Apple minimaliste
// ═══════════════════════════════════════════════════════════════
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
        {/* Cellule vide gauche */}
        <View style={np.empty} />
        <NumKey label="0" onPress={() => onPress("0")} />
        {/* Effacer */}
        <Pressable style={({ pressed }) => [np.delBtn, pressed && np.delPressed]} onPress={onDelete}>
          <Feather name="delete" size={22} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

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
    <Pressable onPress={press} style={np.keyWrap}>
      <Animated.View style={[np.key, { transform: [{ scale }] }]}>
        <Text style={np.keyTxt}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const np = StyleSheet.create({
  pad:      { gap: 12 },
  row:      { flexDirection: "row", justifyContent: "center", gap: 24, alignItems: "center" },
  keyWrap:  {},
  key:      { width: 76, height: 76, borderRadius: 38, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  keyTxt:   { fontSize: 28, fontWeight: "300", color: C.text, letterSpacing: -0.5 },
  empty:    { width: 76, height: 76 },
  delBtn:   { width: 76, height: 76, alignItems: "center", justifyContent: "center" },
  delPressed:{ opacity: 0.5 },
});

// ═══════════════════════════════════════════════════════════════
// SEGMENTED CONTROL
// ═══════════════════════════════════════════════════════════════
function SegControl({ mode, hasPin, onChange }: {
  mode: "create" | "change";
  hasPin: boolean | null;
  onChange: (m: "create" | "change") => void;
}) {
  return (
    <View style={sg.wrap}>
      {(["create","change"] as const).map((m) => (
        <Pressable key={m} style={[sg.btn, mode === m && sg.btnActive]} onPress={() => onChange(m)}>
          <Text style={[sg.txt, mode === m && sg.txtActive]}>
            {m === "create" ? "Créer PIN" : "Changer PIN"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const sg = StyleSheet.create({
  wrap:      { flexDirection: "row", backgroundColor: "#E5E5EA", borderRadius: 14, padding: 3, marginHorizontal: 20, marginBottom: 28 },
  btn:       { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center" },
  btnActive: { backgroundColor: C.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  txt:       { color: C.sub, fontWeight: "700", fontSize: 14 },
  txtActive: { color: C.text, fontWeight: "800" },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN — layout fixe Apple-like
// ═══════════════════════════════════════════════════════════════
export default function PinSecurity() {
  const router = useRouter();

  const [mode,    setMode]    = useState<"create" | "change">("create");
  const [pin,     setPin]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [oldPin,  setOldPin]  = useState("");
  const [hasPin,  setHasPin]  = useState<boolean | null>(null);

  // Étape interne pour "changer" (old → new → confirm)
  const [changeStep, setChangeStep] = useState<"old" | "new" | "confirm">("old");

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig,  setAlertConfig]  = useState<AlertConfig | null>(null);
  const pendingRedirect = useRef<string | null>(null);

  const showAlert = (type: AlertType, title: string, message: string, redirect?: string) => {
    pendingRedirect.current = redirect ?? null;
    setAlertConfig({ type, title, message });
    setAlertVisible(true);
    Haptics.notificationAsync(
      type === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    );
  };
  const dismissAlert = () => {
    setAlertVisible(false);
    if (pendingRedirect.current) {
      const r = pendingRedirect.current;
      pendingRedirect.current = null;
      setTimeout(() => router.replace(r as any), 150);
    }
  };

  // Shake
  const shakeX = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 45, useNativeDriver: true }),
    ]).start();
  };

  // Init
  useEffect(() => {
    (async () => {
      const saved = await rzSecure.get(PIN_KEY);
      if (!saved) { setHasPin(false); setMode("create"); }
      else         { setHasPin(true);  setMode("change"); setChangeStep("old"); }
    })();
  }, []);

  const resetAll = () => {
    setPin(""); setConfirm(""); setOldPin("");
    setChangeStep("old");
  };

  const switchMode = (m: "create" | "change") => {
    resetAll();
    if (m === "create" && hasPin) {
      return showAlert("info", "PIN déjà défini", "Utilisez « Changer PIN » pour modifier votre code.");
    }
    if (m === "change" && hasPin === false) {
      return showAlert("info", "Aucun PIN configuré", "Utilisez « Créer PIN » pour en définir un.");
    }
    setMode(m);
  };

  // ── Ce qui est affiché comme dots actifs selon l'étape ──
  const activeDots = useMemo(() => {
    if (mode === "create") {
      if (pin.length < 4) return { label: "Nouveau PIN",    value: pin };
      return                    { label: "Confirmer PIN",   value: confirm };
    }
    // change
    if (changeStep === "old")     return { label: "Ancien PIN",    value: oldPin };
    if (changeStep === "new")     return { label: "Nouveau PIN",   value: pin };
    return                               { label: "Confirmer PIN", value: confirm };
  }, [mode, changeStep, pin, confirm, oldPin]);

  // ── Titre de l'étape ──
  const stepTitle = useMemo(() => {
    if (mode === "create") {
      return pin.length < 4 ? "Entrez votre nouveau PIN" : "Confirmez votre PIN";
    }
    if (changeStep === "old")  return "Entrez votre PIN actuel";
    if (changeStep === "new")  return "Entrez votre nouveau PIN";
    return "Confirmez votre nouveau PIN";
  }, [mode, changeStep, pin]);

  // ── Bouton principal visible si ──
  const canSubmit = useMemo(() => {
    if (mode === "create") return pin.length === 4 && confirm.length === 4;
    if (changeStep === "old")    return oldPin.length === 4;
    if (changeStep === "new")    return pin.length === 4;
    if (changeStep === "confirm")return pin.length === 4 && confirm.length === 4;
    return false;
  }, [mode, changeStep, pin, confirm, oldPin]);

  // ── Push chiffre ──
  const push = (n: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === "create") {
      if (pin.length < 4)     { setPin(pin + n); return; }
      if (confirm.length < 4) { setConfirm(confirm + n); return; }
      return;
    }
    // mode change
    if (changeStep === "old"     && oldPin.length < 4)  { setOldPin(oldPin + n); return; }
    if (changeStep === "new"     && pin.length < 4)      { setPin(pin + n);       return; }
    if (changeStep === "confirm" && confirm.length < 4)  { setConfirm(confirm + n); return; }
  };

  // ── Delete ──
  const del = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === "create") {
      if (confirm) return setConfirm(confirm.slice(0,-1));
      return setPin(pin.slice(0,-1));
    }
    if (changeStep === "confirm" && confirm) return setConfirm(confirm.slice(0,-1));
    if (changeStep === "new"     && pin)     return setPin(pin.slice(0,-1));
    if (changeStep === "old"     && oldPin)  return setOldPin(oldPin.slice(0,-1));
  };

  // ── Action principale ──
  const handleSubmit = async () => {
    // CREATE
    if (mode === "create") {
      if (pin !== confirm) {
        triggerShake();
        setConfirm("");
        return showAlert("error", "PIN invalide", "Les deux codes ne correspondent pas. Recommencez la confirmation.");
      }
      await rzSecure.set(PIN_KEY, pin);
      setHasPin(true);
      resetAll();
      showAlert("success", "PIN enregistré ✓", "Votre wallet est maintenant protégé.", "/user-wallet");
      return;
    }

    // CHANGE — étape old
    if (changeStep === "old") {
      const saved = await rzSecure.get(PIN_KEY);
      if (!saved || oldPin !== saved) {
        triggerShake(); setOldPin("");
        return showAlert("error", "PIN incorrect", "L'ancien code PIN saisi est invalide.");
      }
      setChangeStep("new");
      return;
    }

    // CHANGE — étape new
    if (changeStep === "new") {
      setChangeStep("confirm");
      return;
    }

    // CHANGE — étape confirm
    if (changeStep === "confirm") {
      if (pin !== confirm) {
        triggerShake(); setConfirm("");
        return showAlert("error", "PIN invalide", "Les deux nouveaux codes ne correspondent pas.");
      }
      await rzSecure.set(PIN_KEY, pin);
      resetAll();
      showAlert("success", "PIN modifié ✓", "Votre code PIN a été mis à jour avec succès.", "/user-wallet");
    }
  };

  // ── Label bouton ──
  const btnLabel = useMemo(() => {
    if (mode === "create") return "Enregistrer";
    if (changeStep === "old")     return "Vérifier";
    if (changeStep === "new")     return "Continuer";
    return "Confirmer";
  }, [mode, changeStep]);

  return (
    <>
      <SafeAreaView style={s.safe}>

        {/* ══ HEADER ══ */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color={C.gold} />
          </Pressable>
          <Text style={s.headerTitle}>Sécurité PIN</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ══ SEGMENTED CONTROL ══ */}
        <SegControl mode={mode} hasPin={hasPin} onChange={switchMode} />

        {/* ══ ZONE DOTS — au centre ══ */}
        <View style={s.dotsZone}>

          {/* Sous-titre étape */}
          <Text style={s.stepTitle}>{stepTitle}</Text>

          {/* Indicateur étapes si mode change */}
          {mode === "change" && (
            <View style={s.stepsRow}>
              {(["old","new","confirm"] as const).map((st, i) => (
                <View key={st} style={[
                  s.stepDot,
                  changeStep === st && s.stepDotActive,
                  (changeStep === "new" && i === 0) || (changeStep === "confirm" && i <= 1)
                    ? s.stepDotDone : null,
                ]} />
              ))}
            </View>
          )}

          {/* Dots animés */}
          <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
            <PinDots value={activeDots.value} label={activeDots.label} />
          </Animated.View>

        </View>

        {/* ══ NUMPAD + BOUTON — fixe en bas ══ */}
        <View style={[s.bottom, { paddingBottom: FOOTER_H + 16 }]}>

          <NumPad onPress={push} onDelete={del} />

          {/* Bouton principal — toujours visible, opacity si pas prêt */}
          <Pressable
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            onPress={canSubmit ? handleSubmit : undefined}
          >
            <Text style={[s.submitTxt, !canSubmit && s.submitTxtDisabled]}>
              {btnLabel}
            </Text>
          </Pressable>

        </View>

      </SafeAreaView>

      <PremiumAlert config={alertConfig} visible={alertVisible} onDismiss={dismissAlert} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitle:{ color: C.text, fontSize: 17, fontWeight: "900", letterSpacing: 0.2 },

  // Dots zone
  dotsZone: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  stepTitle: { color: C.text, fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 28, letterSpacing: 0.2 },

  // Steps indicator
  stepsRow:     { flexDirection: "row", gap: 8, marginBottom: 24 },
  stepDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  stepDotActive:{ backgroundColor: C.gold, width: 22 },
  stepDotDone:  { backgroundColor: C.success },

  // Bottom zone — numpad + bouton
  bottom: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: C.bg,
    gap: 20,
  },

  // Bouton submit
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
});