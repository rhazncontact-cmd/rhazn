// app/user-security-pin.tsx

import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { rzSecure } from "../lib/rzSecure";

/* ================= PALETTE APPLE PREMIUM ================= */

const COLORS = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#111",
  sub: "#6E6E73",
  gold: "#D4AF37",
  border: "#E5E5EA",
};

const PIN_KEY = "RHAZN_USER_PIN";

/* ================= SCREEN ================= */

export default function PinSecurity() {
  const router = useRouter();

  // ✅ on garde les 3 modes (verify sert à exiger ancien PIN)
  const [mode, setMode] = useState<"create" | "verify" | "change">("verify");

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [oldPin, setOldPin] = useState("");

  // ✅ détecter si un PIN existe (pour afficher les bons choix)
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  /* ================= NOTIFICATION ================= */

  const notifAnim = useRef(new Animated.Value(0)).current;
  const [notif, setNotif] = useState<string | null>(null);

  const showNotif = (msg: string, redirect?: string) => {
    setNotif(msg);

    Animated.timing(notifAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setNotif(null);
        if (redirect) router.replace(redirect);
      });
    }, 1600);
  };

  /* ================= SHAKE ================= */

  const shake = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  /* ================= INIT ================= */

  useEffect(() => {
    (async () => {
      const saved = await rzSecure.get(PIN_KEY);

      // ✅ si pas de PIN → créer directement
      if (!saved) {
        setHasPin(false);
        setMode("create");
      } else {
        setHasPin(true);
        // ✅ par défaut on va sur "changer" mais en exigeant ancien pin (verify step)
        setMode("change");
      }
    })();
  }, []);

  const reset = () => {
    setPin("");
    setConfirm("");
    setOldPin("");
  };

  /* ================= HELPERS UI ================= */

  const title = useMemo(() => {
    if (mode === "create") return "Créer un PIN";
    if (mode === "change") return "Changer le PIN";
    return "Vérifier le PIN";
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (mode === "create") return pin.length === 4 && confirm.length === 4;
    if (mode === "change")
      return oldPin.length === 4 && pin.length === 4 && confirm.length === 4;
    return pin.length === 4;
  }, [mode, pin, confirm, oldPin]);

  /* ================= LOGIC ================= */

  const createPin = async () => {
    // ✅ sécurité: si un PIN existe, on refuse de "créer" par dessus
    if (hasPin) {
      triggerShake();
      return showNotif("Un PIN existe déjà. Utilisez “Changer PIN”.");
    }

    if (pin.length !== 4 || pin !== confirm) {
      triggerShake();
      return showNotif("PIN invalide");
    }

    await rzSecure.set(PIN_KEY, pin);
    setHasPin(true);
    reset();

    showNotif("PIN enregistré ✔", "/user-wallet");
  };

  const verifyOldPinForChange = async () => {
    const saved = await rzSecure.get(PIN_KEY);

    if (!saved || oldPin !== saved) {
      triggerShake();
      return showNotif("Ancien PIN incorrect");
    }

    // ✅ ancien PIN OK → on laisse l’utilisateur continuer (rien d’autre à faire)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showNotif("Ancien PIN vérifié ✔");
  };

  const changePin = async () => {
    const saved = await rzSecure.get(PIN_KEY);

    // ✅ exiger ancien pin + nouveau pin + confirm
    if (!saved || oldPin !== saved) {
      triggerShake();
      return showNotif("Ancien PIN incorrect");
    }

    if (pin.length !== 4 || pin !== confirm) {
      triggerShake();
      return showNotif("Nouveau PIN invalide");
    }

    await rzSecure.set(PIN_KEY, pin);
    reset();

    showNotif("PIN modifié ✔", "/user-wallet");
  };

  /* ================= NUMPAD ================= */

  const push = (n: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (mode === "create") {
      if (pin.length < 4) setPin(pin + n);
      else if (confirm.length < 4) setConfirm(confirm + n);
      return;
    }

    if (mode === "change") {
      // ✅ d’abord ancien pin
      if (oldPin.length < 4) setOldPin(oldPin + n);
      else if (pin.length < 4) setPin(pin + n);
      else if (confirm.length < 4) setConfirm(confirm + n);
      return;
    }

    // verify
    if (pin.length < 4) setPin(pin + n);
  };

  const del = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (mode === "create") {
      confirm ? setConfirm(confirm.slice(0, -1)) : setPin(pin.slice(0, -1));
      return;
    }

    if (mode === "change") {
      if (confirm) return setConfirm(confirm.slice(0, -1));
      if (pin) return setPin(pin.slice(0, -1));
      return setOldPin(oldPin.slice(0, -1));
    }

    // verify
    setPin(pin.slice(0, -1));
  };

  /* ================= UI ================= */

    return (
  <ScrollView
    style={styles.screen}
    contentContainerStyle={{ paddingBottom: 60 }}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color={COLORS.gold} />
        </TouchableOpacity>
        <Text style={styles.title}>Sécurité PIN</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* ✅ OPTIONS: Créer / Changer */}
      <View style={styles.switchWrap}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.switchBtn,
            mode === "create" && styles.switchBtnActive,
          ]}
          onPress={() => {
            reset();
            if (hasPin) return showNotif("PIN déjà défini. Utilisez “Changer PIN”.");
            setMode("create");
          }}
        >
          <Text
            style={[
              styles.switchText,
              mode === "create" && styles.switchTextActive,
            ]}
          >
            Créer PIN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.switchBtn,
            mode === "change" && styles.switchBtnActive,
          ]}
          onPress={() => {
            reset();
            if (hasPin === false) return showNotif("Aucun PIN. Utilisez “Créer PIN”.");
            setMode("change");
          }}
        >
          <Text
            style={[
              styles.switchText,
              mode === "change" && styles.switchTextActive,
            ]}
          >
            Changer PIN
          </Text>
        </TouchableOpacity>
      </View>

      {/* CARD */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              {
                translateX: shake.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-8, 8],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>
          {mode === "create"
            ? "Définissez un PIN à 4 chiffres pour protéger votre wallet."
            : "Pour changer votre PIN, l’ancien PIN est obligatoire."}
        </Text>

        {mode === "change" && (
          <PinRow label="Ancien PIN" value={oldPin} />
        )}

        <PinRow label={mode === "create" ? "Nouveau PIN" : "Nouveau PIN"} value={pin} />

        {(mode === "create" || mode === "change") && (
          <PinRow label="Confirmer PIN" value={confirm} />
        )}

        <NumPad onPress={push} onDelete={del} />

        {/* ✅ CTA: create / change */}
        {canSubmit && (
          <Primary
            label={mode === "create" ? "ENREGISTRER" : "MODIFIER"}
            onPress={mode === "create" ? createPin : changePin}
          />
        )}

        {/* ✅ bonus: bouton “vérifier ancien pin” (optionnel visuel premium) */}
        {mode === "change" && oldPin.length === 4 && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.ghost}
            onPress={verifyOldPinForChange}
          >
            <Text style={styles.ghostText}>Vérifier l’ancien PIN</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {notif && (
        <Animated.View style={[styles.notif, { opacity: notifAnim }]}>
          <BlurView intensity={40} tint="light" style={styles.notifBlur}>
            <Text style={styles.notifText}>{notif}</Text>
          </BlurView>
        </Animated.View>
      )}
    </ScrollView>
);
}

/* ================= SUB COMPONENTS ================= */

function PinRow({ label, value }: any) {
  return (
    <View style={styles.pinRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pinBoxes}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, value.length > i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function NumPad({ onPress, onDelete }: any) {
  const rows = [["1","2","3"],["4","5","6"],["7","8","9"]];
  return (
    <View style={styles.pad}>
      {rows.map((r,i)=>(
        <View key={i} style={styles.padRow}>
          {r.map((n)=>(
            <TouchableOpacity
              key={n}
              style={styles.padBtn}
              onPress={() => onPress(n)}
              activeOpacity={0.85}
            >
              <Text style={styles.padText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={styles.padRow}>
        <View style={styles.padGhost}/>
        <TouchableOpacity style={styles.padBtn} onPress={()=>onPress("0")} activeOpacity={0.85}>
          <Text style={styles.padText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.padBtn} onPress={onDelete} activeOpacity={0.85}>
          <Feather name="delete" size={20} color={COLORS.text}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Primary({ label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.primary} onPress={onPress} activeOpacity={0.9}>
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 56 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  title: { color: COLORS.text, fontSize: 20, fontWeight: "800" },

  /* segmented control */
  switchWrap: {
    flexDirection: "row",
    backgroundColor: "#EFEFF4",
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  switchBtnActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  switchText: { color: COLORS.sub, fontWeight: "800" },
  switchTextActive: { color: COLORS.text },

  card: {
    backgroundColor: COLORS.card,
    margin: 20,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },

  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900" },
  cardSub: { color: COLORS.sub, marginTop: 6, marginBottom: 16, fontWeight: "600" },

  pinRow: { marginBottom: 16 },

  label: { color: COLORS.sub, fontSize: 13, fontWeight: "700", marginBottom: 8 },

  pinBoxes: { flexDirection: "row", justifyContent: "center", gap: 14 },

  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.gold },

  pad: { marginTop: 6 },

  padRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 14 },

  padBtn: {
    width: 72,
    height: 72,
    borderRadius: 72,
    backgroundColor: "#EFEFF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  padText: { fontSize: 26, fontWeight: "900", color: COLORS.text },

  padGhost: { width: 72, height: 72 },

  primary: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 14,
  },

  primaryText: { textAlign: "center", fontWeight: "900", fontSize: 16, color: "#000" },

  ghost: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F7F7FA",
  },
  ghostText: { color: COLORS.sub, fontWeight: "900" },

  notif: { position: "absolute", top: 70, alignSelf: "center" },

  notifBlur: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 18 },

  notifText: { color: "#000", fontWeight: "700" },
});
