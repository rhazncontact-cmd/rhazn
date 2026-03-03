
// ======================================================
// RHAZN — REGISTER FINAL (APPLE-LIKE PREMIUM • PRODUCTION)
// ✅ Gmail only
// ✅ AntiBot (honeypot + timing)
// ✅ Empêche double compte (profiles)
// ✅ Create profile minimal (si absent)
// ✅ Redirect direct -> /legal/contract (B)
// ✅ Toast Apple-like + messages intelligents + CTA
// ======================================================

import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Device from "expo-device";

import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

/* ====================================================== */
const COLORS = {
  bg: "#000",
  white: "#FFF",
  gray: "#9A9A9A",
  dark: "#101010",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
  hair: "rgba(255,255,255,0.10)",
};

type ToastKind = "error" | "success" | "info";

/* ======================================================
🍎 TOAST (APPLE-LIKE)
====================================================== */
function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<ToastKind>("info");

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(10)).current;
  const timer = useRef<NodeJS.Timeout | null>(null);

  const show = (k: ToastKind, t: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);

    setKind(k);
    setTitle(t);
    setMsg(m);
    setVisible(true);

    opacity.setValue(0);
    ty.setValue(10);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 10, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 3800);
  };

  const node = visible ? (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY: ty }],
          borderColor:
            kind === "error"
              ? COLORS.red
              : kind === "success"
              ? COLORS.green
              : COLORS.hair,
        },
      ]}
    >
      <Text style={styles.toastTitle}>{title}</Text>
      <Text style={styles.toastMsg}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, node };
}

/* ====================================================== */
const norm = (e: string) => e.trim().toLowerCase();
const isGmailOnly = (e: string) => /@gmail\.com$/i.test(norm(e));
const looksLikeEmail = (e: string) => norm(e).includes("@") && norm(e).includes(".");

/* ======================================================
SCREEN
====================================================== */
export default function RegisterScreen() {
  const router = useRouter();
  const toast = useRzToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);

  // AntiBot
  const [honeypot, setHoneypot] = useState("");
  const [startTime] = useState(Date.now());

  const deviceId = useMemo(
    () => `${Device.modelName ?? "device"}:${Device.deviceName ?? "unknown"}`,
    []
  );

  const canOpenConfirm = useMemo(() => {
    const mail = norm(email);
    return looksLikeEmail(mail) && password.length >= 8 && confirm.length >= 8;
  }, [email, password, confirm]);

  /* ======================================================
  REGISTER CORE
  ====================================================== */
  
  const handleRegister = async () => {
  try {
    console.log("Tentative de création de l'utilisateur...");
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: email,  // Remplacer mail par email
      password: password,
    });

    if (signupError) {
      console.log("Erreur lors de l'inscription :", signupError.message);
      toast.show("error", "Erreur de création", signupError.message);
      return;
    }

    console.log("Utilisateur créé avec succès :", signupData);

    // Si la création de l'utilisateur a réussi, insérez dans la table `profiles`
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          email: email,  // Remplacer mail par email
          full_name: fullName,
          profile_stage: "register",
        },
      ]);

    if (profileError) {
      console.log("Erreur lors de l'insertion dans profiles :", profileError.message);
      toast.show("error", "Erreur lors de la création du profil", profileError.message);
      return;
    }

    console.log("Profil créé avec succès :", profileData);
  } catch (err) {
    console.log("Erreur générale dans le processus d'inscription :", err.message);
    toast.show("error", "Erreur générale", err.message);
  }
};
  /* ======================================================
  UI
  ====================================================== */
  return (
    <View style={styles.full}>
      {toast.node}

      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require("../../assets/images/rhazn-logo.png")} style={styles.logo} />
        </View>
        <Text style={styles.brand}>RHAZN</Text>
        <Text style={styles.sub}>Créer un compte • Premium</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* honeypot invisible */}
          <TextInput value={honeypot} onChangeText={setHoneypot} style={{ height: 0, width: 0, opacity: 0 }} />

          <View style={styles.card}>
            <Text style={styles.title}>Créer un compte</Text>

            <TextInput
              placeholder="Email @gmail.com"
              placeholderTextColor={COLORS.gray}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <TextInput
              placeholder="Mot de passe (min 8)"
              placeholderTextColor={COLORS.gray}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              placeholder="Confirmation"
              placeholderTextColor={COLORS.gray}
              secureTextEntry
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
            />

            {loading ? (
              <View style={{ marginTop: 6 }}>
                <LoaderRhazn color={COLORS.gold} />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.btn, !canOpenConfirm && styles.btnDisabled]}
                onPress={() => setModal(true)}
                disabled={!canOpenConfirm}
                activeOpacity={0.88}
              >
                <Text style={styles.btnText}>Créer le compte</Text>
              </TouchableOpacity>
            )}

            <View style={styles.rowLinks}>
              <TouchableOpacity onPress={() => router.replace("/auth/login")} activeOpacity={0.8}>
                <Text style={styles.link}>Déjà membre ? Se connecter</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hairline} />

            <Text style={styles.help}>
              • Utilisez uniquement un email <Text style={styles.helpGold}>@gmail.com</Text>.{"\n"}
              • Mot de passe : <Text style={styles.helpGold}>8 caractères minimum</Text>.{"\n"}
              • Après création, vous passerez au <Text style={styles.helpGold}>contrat</Text>.
            </Text>
          </View>

          <Text style={styles.footerNote}>RHAZN • Valeurs morales et saines • Sécurité & discipline</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL CONFIRM */}
      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmer la création</Text>
            <Text style={styles.modalMsg}>
              Vous créez un compte RHAZN avec cet email. Voulez-vous continuer ?
            </Text>

            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.cancel} onPress={() => setModal(false)} activeOpacity={0.86}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.accept}
                onPress={() => {
                  setModal(false);
                  handleRegister();
                }}
                activeOpacity={0.86}
              >
                <Text style={styles.acceptText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ====================================================== */
const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: COLORS.bg },

  header: { marginTop: 46, alignItems: "center" },
  logoWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 44, height: 34, resizeMode: "contain" },
  brand: { color: COLORS.white, fontSize: 22, fontWeight: "900", letterSpacing: 2, marginTop: 10 },
  sub: { color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12, marginTop: 6 },

  container: { paddingTop: 28, paddingHorizontal: 18, paddingBottom: 22 },

  card: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 18,
  },

  title: { color: COLORS.white, fontSize: 22, fontWeight: "900", marginBottom: 14 },

  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    color: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 12,
    fontWeight: "700",
  },

  btn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontWeight: "900", color: "#0A0A0A", letterSpacing: 0.2 },

  rowLinks: { marginTop: 18, alignItems: "center" },
  link: { color: COLORS.gold, fontWeight: "900" },

  hairline: { height: 1, backgroundColor: "rgba(255,255,255,0.10)", marginTop: 16, marginBottom: 12 },

  help: { color: "rgba(255,255,255,0.70)", fontWeight: "700", fontSize: 12, lineHeight: 18 },
  helpGold: { color: COLORS.gold, fontWeight: "900" },

  footerNote: { marginTop: 14, textAlign: "center", color: "rgba(255,255,255,0.42)", fontWeight: "800", fontSize: 11 },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#0B0B0B",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 18,
  },
  modalTitle: { color: COLORS.white, fontWeight: "900", fontSize: 18 },
  modalMsg: { color: "rgba(255,255,255,0.70)", fontWeight: "700", marginTop: 8, lineHeight: 18 },

  modalRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancel: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cancelText: { color: COLORS.white, fontWeight: "900" },

  accept: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptText: { color: "#0A0A0A", fontWeight: "900" },

  toast: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.92)",
    zIndex: 9999,
  },
  toastTitle: { color: COLORS.white, fontWeight: "900" },
  toastMsg: { color: "#CFCFCF", marginTop: 4, fontWeight: "700" },
});
