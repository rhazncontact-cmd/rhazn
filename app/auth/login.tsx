// ─────────────────────────────────────────────────────────────
// RHAZN — LOGIN
// ✅ Connexion → banq/suspentz direct (sans détour)
// ✅ Mot de passe oublié → email de réinitialisation
// Apple-like Premium • Smart Alerts • Bottom Sheet
// ─────────────────────────────────────────────────────────────

import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { Lock, Mail, Wifi, WifiOff } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LoaderRhazn from "../../components/LoaderRhazn";
import { supabase } from "../../lib/supabase";

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  card:         "#0E0E0E",
  surface:      "#161616",
  white:        "#FFFFFF",
  muted:        "rgba(255,255,255,0.55)",
  sub:          "rgba(255,255,255,0.35)",
  border:       "rgba(255,255,255,0.09)",
  gold:         "#D4AF37",
  goldDim:      "rgba(212,175,55,0.12)",
  goldBorder:   "rgba(212,175,55,0.30)",
  danger:       "#FF453A",
  dangerDim:    "rgba(255,69,58,0.12)",
  dangerBorder: "rgba(255,69,58,0.35)",
  green:        "#34C759",
  greenDim:     "rgba(52,199,89,0.12)",
  greenBorder:  "rgba(52,199,89,0.35)",
  orange:       "#FF9F0A",
  orangeDim:    "rgba(255,159,10,0.12)",
  orangeBorder: "rgba(255,159,10,0.35)",
  blue:         "#0A84FF",
  blueDim:      "rgba(10,132,255,0.12)",
  blueBorder:   "rgba(10,132,255,0.35)",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type AlertType = "error" | "success" | "warning" | "info" | "noAccount" | "noInternet";
type AlertAction = { label: string; onPress: () => void; primary?: boolean; };
type AlertPayload = { type: AlertType; icon: React.ReactNode; title: string; message: string; actions: AlertAction[]; };

// ─────────────────────────────────────────────────────────────
// PREMIUM ALERT — Apple bottom-sheet
// ─────────────────────────────────────────────────────────────
function PremiumAlert({ payload, visible, onDismiss }: {
  payload: AlertPayload | null; visible: boolean; onDismiss: () => void;
}) {
  const slideY    = useRef(new Animated.Value(400)).current;
  const backdropO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,    { toValue: 0,   damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(backdropO, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropO, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!payload) return null;

  const accent =
    payload.type === "error"      ? C.danger  :
    payload.type === "success"    ? C.green   :
    payload.type === "warning"    ? C.orange  :
    payload.type === "noAccount"  ? C.gold    :
    payload.type === "noInternet" ? C.orange  :
    C.blue;

  const accentDim =
    payload.type === "error"      ? C.dangerDim  :
    payload.type === "success"    ? C.greenDim   :
    payload.type === "warning"    ? C.orangeDim  :
    payload.type === "noAccount"  ? C.goldDim    :
    payload.type === "noInternet" ? C.orangeDim  :
    C.blueDim;

  const accentBd =
    payload.type === "error"      ? C.dangerBorder  :
    payload.type === "success"    ? C.greenBorder   :
    payload.type === "warning"    ? C.orangeBorder  :
    payload.type === "noAccount"  ? C.goldBorder    :
    payload.type === "noInternet" ? C.orangeBorder  :
    C.blueBorder;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, al.overlay, { opacity: backdropO }]}
      pointerEvents={visible ? "auto" : "none"}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Animated.View style={[al.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={al.handle} />
        <View style={[al.iconRing, { backgroundColor: accentDim, borderColor: accentBd }]}>
          {payload.icon}
        </View>
        <Text style={al.title}>{payload.title}</Text>
        <Text style={al.msg}>{payload.message}</Text>
        <View style={al.divider} />
        <View style={al.actions}>
          {payload.actions.map((a, i) => (
            <TouchableOpacity key={i}
              style={[al.actionBtn,
                a.primary  && { backgroundColor: accent },
                !a.primary && { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
              ]}
              onPress={() => { onDismiss(); a.onPress(); }}
              activeOpacity={0.82}
            >
              <Text style={[al.actionTxt,
                a.primary  && { color: (payload.type === "noAccount" || payload.type === "warning") ? "#000" : "#FFF" },
                !a.primary && { color: C.muted },
              ]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const al = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end", zIndex: 9999 },
  sheet:   { backgroundColor: "#111111", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 44, alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  handle:  { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 14 },
  iconRing:{ width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title:   { color: "#FFF", fontWeight: "900", fontSize: 19, textAlign: "center", letterSpacing: 0.2 },
  msg:     { color: "rgba(255,255,255,0.65)", fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 20 },
  divider: { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 6 },
  actions: { width: "100%", gap: 10 },
  actionBtn: { width: "100%", paddingVertical: 15, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionTxt: { fontWeight: "900", fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────
// HOOK ALERT
// ─────────────────────────────────────────────────────────────
function useAlert() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const show = (p: AlertPayload) => { setPayload(p); setVisible(true); };
  const hide = () => setVisible(false);
  return { show, hide, visible, payload };
}

// ─────────────────────────────────────────────────────────────
// CHAMP DE SAISIE
// ─────────────────────────────────────────────────────────────
function Field({ placeholder, value, onChange, secure, keyboardType, icon }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  secure?: boolean; keyboardType?: any; icon: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fi.wrap, focused && fi.wrapFocused]}>
      <View style={fi.icon}>{icon}</View>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.30)"
        style={fi.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={()  => setFocused(false)}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, height: 54, marginBottom: 12 },
  wrapFocused:{ borderColor: C.goldBorder, backgroundColor: "rgba(212,175,55,0.04)" },
  icon:       { width: 20, alignItems: "center" },
  input:      { flex: 1, color: C.white, fontWeight: "700", fontSize: 15 },
});

// ─────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const alert  = useAlert();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const fadeA  = useRef(new Animated.Value(0)).current;
  const slideA = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeA,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideA, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const norm      = (e: string) => e.trim().toLowerCase();
  const canSubmit = useMemo(() => norm(email).length >= 5 && password.length >= 1, [email, password]);

  // ── Session guard — si déjà connecté → banq direct ──────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        router.replace("/banq/suspentz");
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────
  const handleLogin = async () => {
    if (loading) return;
    if (!canSubmit) {
      alert.show({
        type: "warning", icon: <Mail size={34} color={C.orange} />,
        title: "Champs incomplets",
        message: "Saisissez votre email et votre mot de passe pour continuer.",
        actions: [{ label: "Compris", onPress: () => {}, primary: true }],
      });
      return;
    }

    setLoading(true);
    try {
      // Vérifier la connexion réseau
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        alert.show({
          type: "noInternet", icon: <WifiOff size={34} color={C.orange} />,
          title: "Pas de connexion",
          message: "Activez le Wi-Fi ou vos données mobiles, puis réessayez.",
          actions: [{ label: "Réessayer", onPress: handleLogin, primary: true }, { label: "Annuler", onPress: () => {} }],
        });
        setLoading(false); return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: norm(email), password,
      });

      if (error || !data?.user?.id) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const isInvalid = error?.message?.toLowerCase().includes("invalid") ||
                          error?.message?.toLowerCase().includes("credentials") ||
                          error?.status === 400;

        if (isInvalid) {
          alert.show({
            type: "error", icon: <Lock size={34} color={C.danger} />,
            title: "Identifiants incorrects",
            message: "Email ou mot de passe invalide. Vérifiez et réessayez, ou réinitialisez votre mot de passe.",
            actions: [
              { label: "Mot de passe oublié ?", onPress: handleForgotPassword, primary: true },
              { label: "Créer un compte",        onPress: () => router.push("/auth/register") },
            ],
          });
        } else {
          alert.show({
            type: "error", icon: <Lock size={34} color={C.danger} />,
            title: "Connexion impossible",
            message: "Une erreur est survenue. Vérifiez votre connexion et réessayez.",
            actions: [{ label: "Réessayer", onPress: handleLogin, primary: true }, { label: "Annuler", onPress: () => {} }],
          });
        }
        return;
      }

      // ✅ Connexion réussie → banq/suspentz direct, sans détour
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/banq/suspentz");

    } catch {
      alert.show({
        type: "error", icon: <Wifi size={34} color={C.danger} />,
        title: "Erreur inattendue",
        message: "Vérifiez votre connexion et relancez l'application si le problème persiste.",
        actions: [{ label: "Réessayer", onPress: handleLogin, primary: true }, { label: "Annuler", onPress: () => {} }],
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Mot de passe oublié ────────────────────────────────────
  const handleForgotPassword = async () => {
    if (sendingReset) return;
    const mail = norm(email);

    // Email requis
    if (mail.length < 5 || !mail.includes("@")) {
      alert.show({
        type: "info", icon: <Mail size={34} color={C.blue} />,
        title: "Email requis",
        message: "Saisissez d'abord votre adresse email dans le champ ci-dessus, puis réessayez.",
        actions: [{ label: "Compris", onPress: () => {}, primary: true }],
      });
      return;
    }

    setSendingReset(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected) {
        alert.show({
          type: "noInternet", icon: <WifiOff size={34} color={C.orange} />,
          title: "Pas de connexion",
          message: "Impossible d'envoyer l'email. Vérifiez votre connexion.",
          actions: [{ label: "Réessayer", onPress: handleForgotPassword, primary: true }, { label: "Annuler", onPress: () => {} }],
        });
        return;
      }

      // ✅ Lien de reset qui redirige vers l'écran de reset dans l'app
      // ✅ Deep link vers l'app — fonctionne sans site web
      // ✅ Linking.createURL génère automatiquement la bonne URL
      // Dev Expo Go : exp://192.168.1.200:8081/--/auth/reset-password
      // Production  : rhazn://auth/reset-password
      // ✅ Pointer vers la page callback qui traite le token
     const redirectTo = "https://rhazn-reset.netlify.app";
      console.log("📧 resetPassword → redirectTo:", redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo });

      if (error) {
        alert.show({
          type: "error", icon: <Mail size={34} color={C.danger} />,
          title: "Envoi impossible",
          message: "Vérifiez que l'adresse email est correcte et réessayez.",
          actions: [{ label: "Réessayer", onPress: handleForgotPassword, primary: true }],
        });
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert.show({
        type: "success", icon: <Mail size={34} color={C.green} />,
        title: "Email envoyé ✓",
        message: `Un lien de réinitialisation a été envoyé à :\n${mail}\n\nVérifiez votre boîte de réception et vos spams.`,
        actions: [{ label: "Parfait, merci", onPress: () => {}, primary: true }],
      });

    } catch {
      alert.show({
        type: "error", icon: <Mail size={34} color={C.danger} />,
        title: "Erreur d'envoi",
        message: "Une erreur inattendue s'est produite. Réessayez dans un moment.",
        actions: [{ label: "Fermer", onPress: () => {} }],
      });
    } finally {
      setSendingReset(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={sc.kav}>
      <PremiumAlert payload={alert.payload} visible={alert.visible} onDismiss={alert.hide} />

      <ScrollView contentContainerStyle={sc.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeA, transform: [{ translateY: slideA }] }}>

          {/* Brand */}
          <View style={sc.brand}>
            <View style={sc.brandRing}>
              <Lock size={24} color={C.gold} />
            </View>
            <Text style={sc.brandName}>RHAZN</Text>
            <Text style={sc.brandSub}>Connexion sécurisée · Premium</Text>
          </View>

          {/* Card */}
          <View style={sc.card}>
            <Text style={sc.cardTitle}>Connexion</Text>
            <Text style={sc.cardSub}>Accédez à votre espace RHAZN</Text>
            <View style={sc.sep} />

            <Field placeholder="Adresse email" value={email} onChange={setEmail}
              keyboardType="email-address" icon={<Mail size={16} color="rgba(255,255,255,0.40)" />} />
            <Field placeholder="Mot de passe" value={password} onChange={setPassword}
              secure icon={<Lock size={16} color="rgba(255,255,255,0.40)" />} />

            {/* Bouton connexion */}
            <TouchableOpacity
              style={[sc.btn, (!canSubmit || loading) && sc.btnOff]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <LoaderRhazn color="#0A0A0A" />
                : <Text style={sc.btnTxt}>Se connecter</Text>
              }
            </TouchableOpacity>

            {/* Liens */}
            <View style={sc.links}>
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={sendingReset}
                activeOpacity={0.8}
              >
                <Text style={sc.linkSoft}>
                  {sendingReset ? "Envoi en cours…" : "Mot de passe oublié ?"}
                </Text>
              </TouchableOpacity>
              <View style={sc.dot} />
              <TouchableOpacity onPress={() => router.push("/auth/register")} activeOpacity={0.8}>
                <Text style={sc.linkGold}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bannière nouveau membre */}
          <Pressable style={sc.newBanner} onPress={() => router.push("/auth/register")}>
            <View style={{ flex: 1 }}>
              <Text style={sc.newTitle}>Nouveau sur RHAZN ?</Text>
              <Text style={sc.newSub}>Rejoignez l'écosystème premium</Text>
            </View>
            <View style={sc.newArrow}>
              <Text style={{ color: C.gold, fontWeight: "900", fontSize: 18 }}>→</Text>
            </View>
          </Pressable>

          <Text style={sc.footer}>RHAZN · Valeurs morales · Sécurité & discipline</Text>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const sc = StyleSheet.create({
  kav:    { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 22, paddingBottom: 40 },

  brand:     { alignItems: "center", marginBottom: 28 },
  brandRing: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center", marginBottom: 14, shadowColor: C.gold, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  brandName: { color: C.white, fontSize: 24, fontWeight: "900", letterSpacing: 3 },
  brandSub:  { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 6, letterSpacing: 0.3 },

  card:      { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 22, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardTitle: { color: C.white, fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  cardSub:   { color: C.muted, fontWeight: "700", fontSize: 13, marginTop: 4 },
  sep:       { height: 1, backgroundColor: C.border, marginVertical: 18 },

  btn:    { width: "100%", backgroundColor: C.gold, paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 4, shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  btnOff: { opacity: 0.50, shadowOpacity: 0 },
  btnTxt: { color: "#0A0A0A", fontWeight: "900", fontSize: 15, letterSpacing: 0.4 },

  links:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 },
  dot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.20)" },
  linkSoft: { color: C.muted, fontWeight: "800", fontSize: 13 },
  linkGold: { color: C.gold,  fontWeight: "900", fontSize: 13 },

  newBanner:{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: C.gold, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  newTitle: { color: C.white, fontWeight: "900", fontSize: 14 },
  newSub:   { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 3 },
  newArrow: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },

  footer: { textAlign: "center", color: "rgba(255,255,255,0.30)", fontWeight: "800", fontSize: 11, letterSpacing: 0.2 },
});