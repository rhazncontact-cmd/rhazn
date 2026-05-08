// ─────────────────────────────────────────────────────────────
// RHAZN — REGISTER v2 · Email + Mot de passe + OTP 6 chiffres
//
// ✅ FIX LOADER INFINI :
//    - Suppression du supabase.auth.signOut() post-signUp
//      (déclenchait onAuthStateChange → navigation → démontage
//       → setLoading(false) jamais appelé → spinner bloqué)
//    - Vérifications anti-bot déplacées AVANT setLoading(true)
//    - mountedRef pour éviter setState sur composant démonté
//    - Loader DANS le bouton (pas à la place du bouton)
//    - Cases OTP toujours visibles en étape 2
// ─────────────────────────────────────────────────────────────

import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LoaderRhazn from "../../components/LoaderRhazn";
import { supabase } from "../../lib/supabase";

const C = {
  bg:     "#000000",
  card:   "#0E0E0E",
  white:  "#FFFFFF",
  gray:   "#9A9A9A",
  sub:    "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.09)",
  gold:   "#D4AF37",
  goldBg: "rgba(212,175,55,0.10)",
  goldBd: "rgba(212,175,55,0.28)",
  red:    "#FF453A",
  green:  "#34C759",
};

type ToastKind = "error" | "success" | "info";

function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title,   setTitle]   = useState("");
  const [msg,     setMsg]     = useState("");
  const [kind,    setKind]    = useState<ToastKind>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;
  const timer   = useRef<NodeJS.Timeout | null>(null);

  const show = (k: ToastKind, ti: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setKind(k); setTitle(ti); setMsg(m); setVisible(true);
    opacity.setValue(0); ty.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(ty,      { toValue: 12, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 4000);
  };

  const node = visible ? (
    <Animated.View style={[
      ts.toast, { opacity, transform: [{ translateY: ty }] },
      kind === "error"   && { borderColor: C.red   },
      kind === "success" && { borderColor: C.green  },
      kind === "info"    && { borderColor: C.goldBd },
    ]}>
      <Text style={ts.title}>{title}</Text>
      <Text style={ts.msg}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, node };
}

const ts = StyleSheet.create({
  toast: { position: "absolute", top: 54, left: 16, right: 16, borderWidth: 1, borderRadius: 18, padding: 14, backgroundColor: "rgba(10,10,10,0.96)", zIndex: 9999 },
  title: { color: C.white, fontWeight: "900", fontSize: 14 },
  msg:   { color: "rgba(255,255,255,0.70)", marginTop: 4, fontWeight: "600", fontSize: 13, lineHeight: 18 },
});

const norm       = (e: string) => e.trim().toLowerCase();
const looksEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(e));

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const r0 = useRef<TextInput>(null);
  const r1 = useRef<TextInput>(null);
  const r2 = useRef<TextInput>(null);
  const r3 = useRef<TextInput>(null);
  const r4 = useRef<TextInput>(null);
  const r5 = useRef<TextInput>(null);
  const refs = [r0, r1, r2, r3, r4, r5];

  const digits = value.split("").slice(0, 6);
  while (digits.length < 6) digits.push("");

  const handleKey = (idx: number, key: string) => {
    if (key === "Backspace") {
      const newVal = value.slice(0, Math.max(0, idx === 0 ? 0 : idx - 1));
      onChange(newVal);
      if (idx > 0) refs[idx - 1].current?.focus();
    }
  };

  const handleChange = (idx: number, txt: string) => {
    const clean = txt.replace(/\D/g, "");
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6);
      onChange(pasted);
      refs[Math.min(pasted.length - 1, 5)].current?.focus();
      return;
    }
    const digit = clean.slice(-1);
    if (!digit) { onChange(value.slice(0, idx)); return; }
    const arr = digits.slice();
    arr[idx] = digit;
    const newVal = arr.join("").slice(0, 6);
    onChange(newVal);
    if (idx < 5) refs[idx + 1].current?.focus();
  };

  return (
    <View style={otp.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={refs[i]}
          style={[otp.box, d ? otp.boxFilled : null, disabled ? otp.boxDisabled : null]}
          value={d}
          onChangeText={(txt) => handleChange(i, txt)}
          onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={6}
          selectTextOnFocus
          editable={!disabled}
          textContentType="oneTimeCode"
          autoComplete={i === 0 ? "sms-otp" : "off"}
        />
      ))}
    </View>
  );
}

const otp = StyleSheet.create({
  row:         { flexDirection: "row", gap: 10, justifyContent: "center", marginVertical: 20 },
  box:         { width: 48, height: 58, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#111", color: C.white, fontSize: 24, fontWeight: "900", textAlign: "center" },
  boxFilled:   { borderColor: C.gold, backgroundColor: "rgba(212,175,55,0.08)" },
  boxDisabled: { opacity: 0.5 },
});

export default function RegisterScreen() {
  const router = useRouter();
  const toast  = useRzToast();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<1 | 2>(1);
  const [otpValue, setOtpValue] = useState("");
  const [resendCD, setResendCD] = useState(0);

  const [honeypot] = useState("");
  const startTime  = useRef(Date.now()).current;
  const lockRef    = useRef(false);
  // ✅ Suivre le montage pour éviter setState sur composant démonté
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const canSubmit = useMemo(() =>
    looksEmail(email) && password.length >= 8 && password === confirm,
    [email, password, confirm]
  );

  useEffect(() => {
    if (resendCD <= 0) return;
    const t = setTimeout(() => setResendCD(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCD]);

  // ── Étape 1 ─────────────────────────────────────────────────
  const handleRegister = async () => {
    if (lockRef.current || !canSubmit) return;

    // ✅ Anti-bot AVANT de bloquer (évite le bug loading=true non réinitialisé)
    if (honeypot.length > 0) return;
    if (Date.now() - startTime < 1500) {
      toast.show("error", "Action trop rapide", "Réessayez dans un instant.");
      return;
    }

    lockRef.current = true;
    setLoading(true);

    try {
      const mail = norm(email);

      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { data: { rhazn_registered: true } },
      });

      if (!mountedRef.current) return;

      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          toast.show("info", "Compte existant", "Connectez-vous avec cet email.");
          setTimeout(() => { if (mountedRef.current) router.replace("/auth/login"); }, 2000);
          return;
        }
        toast.show("error", "Erreur inscription", error.message);
        return;
      }

      if (!data?.user) {
        toast.show("error", "Erreur", "Création impossible. Réessayez.");
        return;
      }

      // ✅ SUPPRESSION de supabase.auth.signOut() — c'était la cause du bug
      // Avec "Confirm email" activé dans Supabase, aucune session n'est créée
      // avant vérification OTP, donc signOut() n'est pas nécessaire ET
      // déclenchait onAuthStateChange → navigation forcée → composant démonté
      // → finally ne pouvait plus appeler setLoading(false) sur le bon composant

      toast.show("success", "Code envoyé ✓", `Vérifiez votre boîte ${mail}`);
      setStep(2);
      setResendCD(60);

    } catch {
      if (!mountedRef.current) return;
      toast.show("error", "Erreur réseau", "Vérifiez votre connexion.");
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  // ── Étape 2 ─────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (lockRef.current || otpValue.length !== 6) return;

    lockRef.current = true;
    setLoading(true);

    try {
      const mail     = norm(email);
      const cleanOtp = otpValue.replace(/\D/g, "");

      const { data, error } = await supabase.auth.verifyOtp({
        email: mail,
        token: cleanOtp,
        type:  "signup",
      });

      if (!mountedRef.current) return;

      if (error) {
        toast.show("error", "Code invalide", "Vérifiez le code et réessayez.");
        setOtpValue("");
        return;
      }

      if (!data?.session) {
        toast.show("error", "Erreur session", "Réessayez dans un instant.");
        return;
      }

      // ✅ _layout gère la redirection via onAuthStateChange
      toast.show("success", "Vérifié ✓", "Bienvenue sur RHAZN !");

    } catch {
      if (!mountedRef.current) return;
      toast.show("error", "Erreur système", "Réessayez.");
    } finally {
      lockRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (otpValue.length === 6 && step === 2 && !loading && !lockRef.current) {
      handleVerifyOtp();
    }
  }, [otpValue]);

  const handleResend = async () => {
    if (resendCD > 0 || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: norm(email) });
      if (!mountedRef.current) return;
      if (error) { toast.show("error", "Erreur", "Impossible de renvoyer."); return; }
      toast.show("info", "Code renvoyé", `Vérifiez ${norm(email)}`);
      setResendCD(60);
      setOtpValue("");
    } catch {
      if (!mountedRef.current) return;
      toast.show("error", "Erreur", "Réessayez.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ÉTAPE 2 — OTP
  // ════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <View style={s.full}>
        {toast.node}
        <View style={s.header}>
          <View style={s.logoWrap}>
            <Image source={require("../../assets/images/rhazn-logo.png")} style={s.logo} />
          </View>
          <Text style={s.brand}>RHAZN</Text>
          <Text style={s.brandSub}>Vérification email</Text>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.card}>
              <View style={s.otpIconWrap}>
                <Text style={{ fontSize: 36 }}>📬</Text>
              </View>
              <Text style={s.cardTitle}>Code de vérification</Text>
              <Text style={s.cardSub}>
                Entrez le code à 6 chiffres{"\n"}envoyé à{" "}
                <Text style={{ color: C.gold }}>{norm(email)}</Text>
              </Text>
              <View style={s.sep} />

              {/* ✅ Cases OTP toujours affichées — même pendant le chargement */}
              <OtpInput value={otpValue} onChange={setOtpValue} disabled={loading} />

              {/* Loader sous les cases, pas à leur place */}
              {loading && (
                <View style={{ alignItems: "center", marginBottom: 8 }}>
                  <LoaderRhazn color={C.gold} />
                </View>
              )}

              {/* Bouton Vérifier si 6 chiffres et pas encore en chargement */}
              {otpValue.length === 6 && !loading && (
                <TouchableOpacity style={s.btn} onPress={handleVerifyOtp} activeOpacity={0.88}>
                  <Text style={s.btnTxt}>Vérifier le code →</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCD > 0 || loading}
                style={{ alignItems: "center", marginTop: 16 }}
              >
                <Text style={[s.resendTxt, (resendCD > 0 || loading) && { opacity: 0.4 }]}>
                  {resendCD > 0 ? `Renvoyer dans ${resendCD}s` : "Renvoyer le code →"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setStep(1); setOtpValue(""); setLoading(false); lockRef.current = false; }}
                style={{ alignItems: "center", marginTop: 12 }}
              >
                <Text style={s.changeTxt}>← Changer d'email</Text>
              </TouchableOpacity>
            </View>

            <View style={s.infoBox}>
              <Text style={s.infoTxt}>
                🔐  Code valide <Text style={s.infoGold}>10 minutes</Text>{"\n"}
                📧  Vérifiez vos <Text style={s.infoGold}>spams</Text> si vous ne recevez rien{"\n"}
                ✦   Ne partagez jamais ce code
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Formulaire
  // ════════════════════════════════════════════════════════════
  return (
    <View style={s.full}>
      {toast.node}
      <View style={s.header}>
        <View style={s.logoWrap}>
          <Image source={require("../../assets/images/rhazn-logo.png")} style={s.logo} />
        </View>
        <Text style={s.brand}>RHAZN</Text>
        <Text style={s.brandSub}>Créer un compte · Premium</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextInput value="" style={s.hidden} accessible={false} />
          <View style={s.card}>
            <Text style={s.cardTitle}>Créer un compte</Text>
            <Text style={s.cardSub}>Rejoignez l'écosystème RHAZN</Text>
            <View style={s.sep} />
            <TextInput
              placeholder="Adresse email" placeholderTextColor={C.gray} style={s.input}
              value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
              keyboardType="email-address" textContentType="emailAddress"
            />
            <View style={s.passWrap}>
              <TextInput
                placeholder="Mot de passe (min. 8 caractères)" placeholderTextColor={C.gray}
                secureTextEntry={!showPass} style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={password} onChangeText={setPassword} textContentType="newPassword"
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Text style={{ fontSize: 16 }}>{showPass ? "🙈" : "👁"}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 12 }} />
            <TextInput
              placeholder="Confirmer le mot de passe" placeholderTextColor={C.gray}
              secureTextEntry={!showPass} style={s.input}
              value={confirm} onChangeText={setConfirm} textContentType="newPassword"
            />
            {password.length > 0 && (
              <View style={s.strengthRow}>
                {[...Array(4)].map((_, i) => {
                  const score = (password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
                  const color = score <= 1 ? C.red : score === 2 ? "#FF9500" : score === 3 ? "#FFD60A" : C.green;
                  return <View key={i} style={[s.strengthBar, i < score && { backgroundColor: color }]} />;
                })}
                <Text style={s.strengthLabel}>
                  {["Trop court", "Faible", "Moyen", "Bon", "Fort"][(password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(password) ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0)]}
                </Text>
              </View>
            )}
            {/* ✅ Loader DANS le bouton — le bouton reste toujours visible */}
            <TouchableOpacity
              style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
              onPress={handleRegister}
              disabled={!canSubmit || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <LoaderRhazn color="#0A0A0A" size={20} />
                : <Text style={s.btnTxt}>Créer le compte →</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.loginLink} onPress={() => router.replace("/auth/login")} activeOpacity={0.8}>
              <Text style={s.loginLinkTxt}>Déjà membre ? <Text style={{ color: C.gold }}>Se connecter →</Text></Text>
            </TouchableOpacity>
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoTxt}>
              ✦  Tout email accepté — <Text style={s.infoGold}>vérifié par OTP</Text>{"\n"}
              ✦  Mot de passe <Text style={s.infoGold}>8 caractères minimum</Text>{"\n"}
              ✦  Code de vérification envoyé par email
            </Text>
          </View>
          <Text style={s.footer}>RHAZN · Valeurs morales · Sécurité & discipline</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  full:    { flex: 1, backgroundColor: C.bg },
  hidden:  { height: 0, width: 0, opacity: 0, position: "absolute" },
  scroll:  { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 30 },
  header:   { marginTop: 52, alignItems: "center", gap: 8 },
  logoWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.goldBg, borderWidth: 1.5, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" },
  logo:     { width: 40, height: 32, resizeMode: "contain" },
  brand:    { color: C.white, fontSize: 22, fontWeight: "900", letterSpacing: 3 },
  brandSub: { color: C.sub, fontWeight: "700", fontSize: 12 },
  card:      { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 22, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.30, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  cardTitle: { color: C.white, fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  cardSub:   { color: C.sub, fontSize: 13, fontWeight: "700", marginTop: 4, textAlign: "center", lineHeight: 20 },
  sep:       { height: 1, backgroundColor: C.border, marginVertical: 18 },
  input:     { backgroundColor: "#161616", borderWidth: 1, borderColor: C.border, color: C.white, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 12, fontWeight: "700", fontSize: 14 },
  passWrap:  { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  eyeBtn:    { position: "absolute", right: 14, top: 14, padding: 4 },
  strengthRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, marginTop: 2 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.10)" },
  strengthLabel: { color: C.sub, fontSize: 11, fontWeight: "700", minWidth: 60, textAlign: "right" },
  btn:         { backgroundColor: C.gold, paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 4, shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6, minHeight: 52, justifyContent: "center" },
  btnDisabled: { opacity: 0.40, shadowOpacity: 0 },
  btnTxt:      { color: "#0A0A0A", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },
  loginLink:    { marginTop: 18, alignItems: "center" },
  loginLinkTxt: { color: C.sub, fontWeight: "700", fontSize: 13 },
  infoBox:  { backgroundColor: C.goldBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.goldBd, marginBottom: 20 },
  infoTxt:  { color: "rgba(255,255,255,0.65)", fontWeight: "700", fontSize: 12, lineHeight: 20 },
  infoGold: { color: C.gold, fontWeight: "900" },
  footer:   { textAlign: "center", color: "rgba(255,255,255,0.30)", fontWeight: "700", fontSize: 11, marginBottom: 10 },
  otpIconWrap: { width: 70, height: 70, borderRadius: 22, backgroundColor: C.goldBg, borderWidth: 1.5, borderColor: C.goldBd, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  resendTxt:   { color: C.gold, fontWeight: "800", fontSize: 13 },
  changeTxt:   { color: "rgba(255,255,255,0.40)", fontWeight: "700", fontSize: 12 },
});