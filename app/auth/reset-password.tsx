// ======================================================
// RHAZN — RESET PASSWORD (APPLE-LIKE PREMIUM)
// Page ouverte via lien email Supabase (recovery)
// ======================================================

import { useRouter } from "expo-router";
import { Shield } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import * as Haptics from "expo-haptics";
import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

const COLORS = {
  bg: "#000",
  white: "#FFF",
  gray: "#9A9A9A",
  dark: "#121212",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
  hair: "rgba(255,255,255,0.10)",
};

type ToastKind = "error" | "success" | "info";

function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<ToastKind>("info");

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(12)).current;
  const timer = useRef<NodeJS.Timeout | null>(null);

  const show = (k: ToastKind, t: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);

    setKind(k);
    setTitle(t);
    setMsg(m);
    setVisible(true);

    opacity.setValue(0);
    ty.setValue(12);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 12, duration: 160, useNativeDriver: true }),
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const toast = useRzToast();

  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSessionOk(!!data.session);
    })();
  }, []);

  const handleUpdatePassword = async () => {
    if (loading) return;

    if (newPass.length < 6) {
      toast.show("info", "Mot de passe trop court", "Minimum 6 caractères.");
      return;
    }
    if (newPass !== newPass2) {
      toast.show("error", "Non identique", "Les deux mots de passe doivent être identiques.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        toast.show("error", "Impossible", "Lien expiré ou invalide. Refaites “Mot de passe oublié”.");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      toast.show("success", "Succès", "Mot de passe mis à jour. Connexion en cours…");

      // Après update password, on renvoie vers login (ou direct rz-roles si session existe)
      setTimeout(() => router.replace("/auth/login"), 800);
    } catch {
      toast.show("error", "Erreur", "Action impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    >
      {toast.node}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Shield size={22} color={COLORS.gold} />
          </View>
          <Text style={styles.brandTitle}>RHAZN</Text>
          <Text style={styles.brandSub}>Définir un nouveau mot de passe</Text>
        </View>

        <View style={styles.card}>
          {sessionOk === false && (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Lien requis</Text>
              <Text style={styles.noticeText}>
                Ouvrez cette page depuis le lien reçu par email (Mot de passe oublié), puis réessayez.
              </Text>
            </View>
          )}

          <Text style={styles.title}>Nouveau mot de passe</Text>

          <TextInput
            placeholder="Nouveau mot de passe"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
            style={styles.input}
            value={newPass}
            onChangeText={setNewPass}
          />

          <TextInput
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
            style={styles.input}
            value={newPass2}
            onChangeText={setNewPass2}
          />

          <TouchableOpacity
            style={[styles.btn, (loading || sessionOk === false) && styles.btnDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading || sessionOk === false}
            activeOpacity={0.88}
          >
            {loading ? <LoaderRhazn color={COLORS.bg} /> : <Text style={styles.btnText}>Mettre à jour</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/auth/login")} style={{ marginTop: 14 }}>
            <Text style={styles.link}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>RHAZN • Sécurité • Discipline</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },

  brandWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  brandSub: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 6,
    fontWeight: "700",
    fontSize: 12,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    padding: 18,
  },

  notice: {
    backgroundColor: "rgba(255,69,58,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,69,58,0.25)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  noticeTitle: { color: COLORS.white, fontWeight: "900", marginBottom: 4 },
  noticeText: { color: "rgba(255,255,255,0.70)", fontWeight: "700", fontSize: 12, lineHeight: 17 },

  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },

  input: {
    width: "100%",
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
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: "#0A0A0A", fontWeight: "900" },

  link: {
    textAlign: "center",
    color: COLORS.gold,
    fontWeight: "900",
  },

  footerNote: {
    marginTop: 14,
    textAlign: "center",
    color: "rgba(255,255,255,0.42)",
    fontWeight: "800",
    fontSize: 11,
  },

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