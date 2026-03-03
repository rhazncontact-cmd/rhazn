// ======================================================
// RHAZN — LOGIN (APPLE-LIKE PREMIUM • FINAL • NO BIOMETRICS)
// ✅ Login stable + routing contract/signature -> rz-roles
// ✅ Forgot password (Supabase reset email)
// ======================================================

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
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
import * as Network from "expo-network";
import { supabase } from "../../lib/supabase";
import LoaderRhazn from "../components/LoaderRhazn";

/* ====================================================== */
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

/* ======================================================
🍎 TOAST (APPLE-LIKE)
====================================================== */
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

/* ======================================================
SCREEN
====================================================== */
export default function LoginScreen() {
  const router = useRouter();
  const toast = useRzToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const normEmail = (e: string) => e.trim().toLowerCase();
  const canSubmit = useMemo(() => {
    const mail = normEmail(email);
    return mail.length >= 5 && password.length >= 1;
  }, [email, password]);

  /* ======================================================
  ✅ SESSION GUARD AUTO
  ====================================================== */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user?.id) return;
      await routeUser(session.user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======================================================
  ROUTING OFFICIEL RHAZN
  ====================================================== */
  const routeUser = async (uid: string) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("contract_accepted_at, signature_accepted_at")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      toast.show("error", "Erreur", "Impossible de charger votre profil.");
      return;
    }

    if (!profile) {
      await supabase.auth.signOut();
      toast.show(
        "info",
        "Pas encore membre",
        "Créez un compte RHAZN pour continuer."
      );
      return;
    }

    if (!profile.contract_accepted_at) {
      router.replace("/legal/contract");
      return;
    }

    if (!profile.signature_accepted_at) {
      router.replace("/legal/signature");
      return;
    }

    router.replace("/rz-roles");
  };

  /* ======================================================
  LOGIN
  ====================================================== */
  const handleLogin = async () => {
    if (loading) return;
    if (!canSubmit) {
      toast.show("info", "Champs requis", "Entrez votre email et mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        toast.show("error", "Problème de connexion", "Vérifiez votre Internet.");
        return;
      }

      const mail = normEmail(email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: mail,
        password,
      });

      if (error || !data?.user?.id) {
        // Message intelligent + action claire
        toast.show(
          "error",
          "Email ou mot de passe incorrect",
          "Vérifiez vos identifiants, puis recommencez. Si vous n’êtes pas membre, créez un compte."
        );
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      toast.show("success", "Connexion réussie", "Bienvenue dans RHAZN.");

      // routage direct (pas de détour)
      await routeUser(data.user.id);
    } catch (e) {
      toast.show("error", "Erreur", "Connexion impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
  FORGOT PASSWORD (SUPABASE RESET EMAIL)
  ====================================================== */
  const handleForgotPassword = async () => {
    if (sendingReset) return;

    const mail = normEmail(email);
    if (mail.length < 5 || !mail.includes("@")) {
      toast.show("info", "Email requis", "Entrez votre email pour recevoir le lien.");
      return;
    }

    setSendingReset(true);

    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        toast.show("error", "Problème de connexion", "Vérifiez votre Internet.");
        return;
      }

      // IMPORTANT:
      // Lien qui renvoie vers la page RHAZN de reset
      const redirectTo = Linking.createURL("/auth/reset-password");

      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo,
      });

      if (error) {
        toast.show("error", "Impossible d’envoyer", "Réessayez dans un instant.");
        return;
      }

      toast.show(
        "success",
        "Email envoyé",
        "Ouvrez le lien reçu pour définir un nouveau mot de passe."
      );
    } catch {
      toast.show("error", "Erreur", "Envoi impossible pour le moment.");
    } finally {
      setSendingReset(false);
    }
  };

  /* ======================================================
  UI
  ====================================================== */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    >
      {toast.node}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Lock size={22} color={COLORS.gold} />
          </View>
          <Text style={styles.brandTitle}>RHAZN</Text>
          <Text style={styles.brandSub}>Connexion sécurisée • Premium</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor={COLORS.gray}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.gray}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit || loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <LoaderRhazn color={COLORS.bg} />
            ) : (
              <Text style={styles.btnText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.rowLinks}>
            <TouchableOpacity onPress={handleForgotPassword} disabled={sendingReset} activeOpacity={0.8}>
              <Text style={styles.linkSoft}>
                {sendingReset ? "Envoi en cours..." : "Mot de passe oublié ?"}
              </Text>
            </TouchableOpacity>

            <View style={styles.dot} />

            <TouchableOpacity onPress={() => router.push("/auth/register")} activeOpacity={0.8}>
              <Text style={styles.link}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hairline} />

          <Text style={styles.help}>
            Pas encore membre ? Appuyez sur <Text style={styles.helpGold}>Créer un compte</Text>.
            {"\n"}Identifiants incorrects ? Vérifiez votre email et mot de passe, puis recommencez.
          </Text>
        </View>

        <Text style={styles.footerNote}>
          RHAZN • Valeurs morales et saines • Sécurité & discipline
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ====================================================== */
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

  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
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
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: "#0A0A0A",
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  rowLinks: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  link: {
    color: COLORS.gold,
    fontWeight: "900",
  },
  linkSoft: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "800",
  },

  hairline: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 14,
    marginBottom: 12,
  },

  help: {
    color: "rgba(255,255,255,0.70)",
    lineHeight: 18,
    fontWeight: "700",
    fontSize: 12,
  },
  helpGold: {
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