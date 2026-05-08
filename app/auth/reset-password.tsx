// app/auth/reset-password.tsx
// ✅ FIX 1 — Animation démarrée correctement
// ✅ FIX 2 — Écoute URL initiale ET événements URL (app déjà ouverte)
// ✅ FIX 3 — Gère PKCE (?code=) ET Implicit (#access_token=) flow Supabase
// ✅ RHAZN — Reset Password · Apple-like Premium

import * as Haptics from "expo-haptics";
import { useURL } from "expo-linking";
import { useRouter } from "expo-router";
import { Lock, Shield } from "lucide-react-native";
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
  View
} from "react-native";
import LoaderRhazn from "../../components/LoaderRhazn";
import { supabase } from "../../lib/supabase";

// ─── Palette ────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  card:         "#0E0E0E",
  surface:      "#161616",
  white:        "#FFFFFF",
  muted:        "rgba(255,255,255,0.55)",
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
  blue:         "#0A84FF",
  blueDim:      "rgba(10,132,255,0.12)",
  blueBorder:   "rgba(10,132,255,0.35)",
  orange:       "#FF9F0A",
  orangeDim:    "rgba(255,159,10,0.12)",
  orangeBorder: "rgba(255,159,10,0.35)",
};

// ─── Toast ──────────────────────────────────────────────────
type ToastKind = "error" | "success" | "info" | "warning";

function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title,   setTitle]   = useState("");
  const [msg,     setMsg]     = useState("");
  const [kind,    setKind]    = useState<ToastKind>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(-16)).current;
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (k: ToastKind, t: string, m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setKind(k); setTitle(t); setMsg(m); setVisible(true);
    opacity.setValue(0); ty.setValue(-16);
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.spring(ty,      { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(ty,      { toValue: -16, duration: 220, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 3800);
  };

  const accent =
    kind === "error"   ? C.danger :
    kind === "success" ? C.green  :
    kind === "warning" ? C.orange :
    C.blue;

  const iconName =
    kind === "error"   ? "✗" :
    kind === "success" ? "✓" :
    kind === "warning" ? "⚠" : "ℹ";

  const node = visible ? (
    <Animated.View style={[ts.toast, { opacity, transform: [{ translateY: ty }], borderColor: accent + "55" }]}>
      <View style={[ts.toastDot, { backgroundColor: accent }]}>
        <Text style={{ color: "#000", fontSize: 11, fontWeight: "900" }}>{iconName}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.toastTitle}>{title}</Text>
        {!!msg && <Text style={ts.toastMsg}>{msg}</Text>}
      </View>
    </Animated.View>
  ) : null;

  return { show, node };
}

// ─── Champ ──────────────────────────────────────────────────
function Field({ placeholder, value, onChange, secure }: {
  placeholder: string; value: string;
  onChange: (v: string) => void; secure?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fi.wrap, focused && fi.wrapFocused]}>
      <Lock size={16} color={focused ? C.gold : "rgba(255,255,255,0.35)"} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        style={fi.input}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={secure}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ─── Force mot de passe ─────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const len   = password.length;
  const score = len >= 12 ? 3 : len >= 8 ? 2 : len >= 6 ? 1 : 0;
  const colors = ["", C.danger, C.orange, C.green];
  const labels = ["", "Faible", "Moyen", "Fort"];
  return (
    <View style={ps.wrap}>
      {[1,2,3].map(i => (
        <View key={i} style={[ps.bar, { backgroundColor: i <= score ? colors[score] : "rgba(255,255,255,0.10)" }]} />
      ))}
      <Text style={[ps.label, { color: colors[score] }]}>{labels[score]}</Text>
    </View>
  );
}

// ─── Helper : traiter une URL de reset ─────────────────────
async function processResetUrl(url: string): Promise<boolean> {
  try {
    console.log("🔗 processResetUrl:", url);

    // ── Extraire les paramètres depuis # ou ? ───────────────
    // Format Expo Go : exp://IP:PORT/--/auth/reset-password#access_token=xxx
    // Format prod    : rhazn://auth/reset-password#access_token=xxx
    // Format PKCE    : rhazn://auth/reset-password?code=xxx

    // Parser la partie après -- (Expo Go wrapping)
    let cleanUrl = url;
    if (url.includes("/--/")) {
      cleanUrl = "https://x.com/" + url.split("/--/")[1];
    }

    const hashPart  = cleanUrl.includes("#") ? cleanUrl.split("#")[1]  : "";
    const queryPart = cleanUrl.includes("?") ? cleanUrl.split("?")[1].split("#")[0] : "";
    const allParams = hashPart || queryPart;

    console.log("🔍 hashPart:", hashPart?.slice(0, 60));
    console.log("🔍 queryPart:", queryPart?.slice(0, 60));

    const p = new URLSearchParams(allParams);
    const accessToken  = p.get("access_token");
    const refreshToken = p.get("refresh_token") ?? "";
    const type         = p.get("type");
    const code         = p.get("code");

    console.log("🔍 type:", type, "| code:", code?.slice(0,10), "| at:", accessToken?.slice(0,20));

    // ── CAS 1 : PKCE flow → ?code=xxx ───────────────────────
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) {
        console.log("❌ exchangeCodeForSession error:", error.message);
        return false;
      }
      console.log("✅ PKCE session créée:", data.session?.user?.id);
      return !!data.session;
    }

    // ── CAS 2 : Implicit flow → #access_token=xxx&type=recovery
    if (accessToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.log("❌ setSession error:", error.message);
        return false;
      }
      console.log("✅ Implicit session créée:", data.session?.user?.id);
      return !!data.session;
    }

    console.log("⚠️ Aucun token trouvé dans l'URL");
    return false;
  } catch (e) {
    console.log("❌ processResetUrl exception:", e);
    return false;
  }
}

// ─── Screen ─────────────────────────────────────────────────
export default function ResetPasswordScreen() {
  const router = useRouter();
  const toast  = useRzToast();

  const [newPass,       setNewPass]       = useState("");
  const [newPass2,      setNewPass2]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [done,          setDone]          = useState(false);
  const [sessionReady,  setSessionReady]  = useState(false);
  const [initDone,      setInitDone]      = useState(false);

  const fadeA  = useRef(new Animated.Value(0)).current;
  const slideA = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeA,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideA, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ✅ useURL — hook expo-linking le plus fiable
  // Gère automatiquement cold start ET app déjà ouverte
  const url = useURL();

  useEffect(() => {
    if (!url) return;
    console.log("🔗 useURL reçu:", url);

    const isResetUrl =
      url.includes("access_token=") ||
      url.includes("type=recovery")  ||
      url.includes("code=");

    if (!isResetUrl) {
      setInitDone(true);
      return;
    }

    processResetUrl(url).then(ok => {
      console.log("🔑 processResetUrl ok:", ok);
      if (ok) {
        setSessionReady(true);
      } else {
        // Vérifier si session déjà active malgré tout
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) setSessionReady(true);
        });
      }
      setInitDone(true);
    });
  }, [url]);

  // Timeout — si aucune URL dans 4s, marquer initDone
  useEffect(() => {
    const t = setTimeout(() => setInitDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // onAuthStateChange — filet de sécurité final
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔑 Auth event:", event, "| uid:", session?.user?.id ?? "null");
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionReady(true);
        setInitDone(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Mettre à jour le mot de passe ───────────────────────────
  const handleUpdate = async () => {
    if (loading || done) return;

    if (newPass.length < 6) {
      toast.show("warning", "Mot de passe trop court", "Minimum 6 caractères requis.");
      return;
    }
    if (newPass !== newPass2) {
      toast.show("error", "Non identiques", "Les deux mots de passe ne correspondent pas.");
      return;
    }

    // Vérifier la session juste avant
    const { data: sess } = await supabase.auth.getSession();
    console.log("🔑 Session avant updateUser:", sess?.session?.user?.id ?? "NULL ❌");

    if (!sess?.session) {
      toast.show("error", "Session expirée", "Cliquez à nouveau sur le lien dans votre email.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });

      if (error) {
        console.log("❌ updateUser error:", error.message);
        toast.show("error", "Erreur", error.message || "Impossible de mettre à jour. Réessayez.");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      toast.show("success", "Mot de passe mis à jour ✓", "Redirection en cours…");
      setTimeout(() => router.replace("/banq/suspentz"), 1800);

    } catch {
      toast.show("error", "Erreur", "Action impossible pour le moment. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={sc.kav}>
      {toast.node}

      <ScrollView contentContainerStyle={sc.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeA, transform: [{ translateY: slideA }] }}>

          {/* ── Brand ── */}
          <View style={sc.brand}>
            <View style={sc.brandRing}>
              <Shield size={24} color={C.gold} />
            </View>
            <Text style={sc.brandName}>RHAZN</Text>
            <Text style={sc.brandSub}>Réinitialisation · Sécurité</Text>
          </View>

          {/* ── Statut session ── */}
          {initDone && !sessionReady && (
            <View style={sc.noSessionBanner}>
              <View style={sc.noSessionIcon}>
                <Lock size={20} color={C.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sc.noSessionTitle}>Lien expiré ou invalide</Text>
                <Text style={sc.noSessionSub}>
                  Ce lien n'est valable qu'une seule fois.{"\n"}
                  Retournez à la connexion et demandez un nouveau lien.
                </Text>
              </View>
            </View>
          )}

          {initDone && sessionReady && (
            <View style={sc.sessionOkBanner}>
              <View style={sc.sessionOkIcon}>
                <Text style={{ fontSize: 16 }}>✓</Text>
              </View>
              <Text style={sc.sessionOkTxt}>Identité vérifiée — Choisissez votre nouveau mot de passe</Text>
            </View>
          )}

          {/* ── Card principale ── */}
          <View style={sc.card}>
            {done && (
              <View style={sc.successOverlay}>
                <View style={sc.successCircle}>
                  <Text style={{ fontSize: 36 }}>✓</Text>
                </View>
                <Text style={sc.successTitle}>Mot de passe mis à jour !</Text>
                <Text style={sc.successSub}>Redirection vers RHAZN…</Text>
              </View>
            )}

            <Text style={sc.cardTitle}>Nouveau mot de passe</Text>
            <Text style={sc.cardSub}>Choisissez un mot de passe sécurisé pour votre compte</Text>
            <View style={sc.sep} />

            <Field
              placeholder="Nouveau mot de passe"
              value={newPass}
              onChange={setNewPass}
              secure
            />
            <PasswordStrength password={newPass} />
            <View style={{ height: 10 }} />

            <Field
              placeholder="Confirmer le mot de passe"
              value={newPass2}
              onChange={setNewPass2}
              secure
            />

            {newPass2.length > 0 && (
              <View style={sc.matchRow}>
                <View style={[sc.matchDot, { backgroundColor: newPass === newPass2 ? C.green : C.danger }]} />
                <Text style={[sc.matchTxt, { color: newPass === newPass2 ? C.green : C.danger }]}>
                  {newPass === newPass2 ? "Les mots de passe correspondent ✓" : "Ne correspondent pas"}
                </Text>
              </View>
            )}

            <View style={{ height: 8 }} />

            <TouchableOpacity
              style={[sc.btn, (loading || done) && sc.btnOff]}
              onPress={handleUpdate}
              disabled={loading || done}
              activeOpacity={0.85}
            >
              {loading
                ? <LoaderRhazn color="#0A0A0A" />
                : <Text style={sc.btnTxt}>Mettre à jour le mot de passe</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/auth/login")}
              style={{ marginTop: 14, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={sc.linkBack}>← Retour à la connexion</Text>
            </TouchableOpacity>
          </View>

          {/* ── Règles ── */}
          <View style={sc.rulesCard}>
            <Text style={sc.rulesTitle}>Conseils pour un mot de passe sécurisé :</Text>
            {[
              "Au moins 8 caractères",
              "Mélangez lettres, chiffres et symboles",
              "Évitez les mots courants ou dates de naissance",
            ].map((r, i) => (
              <View key={i} style={sc.ruleRow}>
                <View style={sc.ruleDot} />
                <Text style={sc.ruleText}>{r}</Text>
              </View>
            ))}
          </View>

          <Text style={sc.footer}>RHAZN · Sécurité · Discipline · Excellence</Text>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const sc = StyleSheet.create({
  kav:    { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 22, paddingBottom: 48 },

  brand:     { alignItems: "center", marginBottom: 28 },
  brandRing: { width: 60, height: 60, borderRadius: 20, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center", marginBottom: 14, shadowColor: C.gold, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  brandName: { color: C.white, fontSize: 24, fontWeight: "900", letterSpacing: 3 },
  brandSub:  { color: C.muted, fontWeight: "700", fontSize: 12, marginTop: 6, letterSpacing: 0.3 },

  noSessionBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.dangerDim, borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 18, padding: 16, marginBottom: 16 },
  noSessionIcon:   { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  noSessionTitle:  { color: C.white, fontWeight: "900", fontSize: 14, marginBottom: 3 },
  noSessionSub:    { color: C.muted, fontSize: 12, fontWeight: "600", lineHeight: 17 },

  sessionOkBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenDim, borderWidth: 1, borderColor: C.greenBorder, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  sessionOkIcon:   { width: 28, height: 28, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  sessionOkTxt:    { flex: 1, color: C.green, fontWeight: "700", fontSize: 12, lineHeight: 17 },

  card:          { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 26, padding: 22, marginBottom: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  cardTitle:     { color: C.white, fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  cardSub:       { color: C.muted, fontWeight: "600", fontSize: 13, marginTop: 5, lineHeight: 18 },
  sep:           { height: 1, backgroundColor: C.border, marginVertical: 18 },

  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: C.card, borderRadius: 26, zIndex: 10, alignItems: "center", justifyContent: "center", gap: 14 },
  successCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenDim, borderWidth: 1.5, borderColor: C.greenBorder, alignItems: "center", justifyContent: "center" },
  successTitle:   { color: C.white, fontWeight: "900", fontSize: 18 },
  successSub:     { color: C.muted, fontSize: 13, fontWeight: "600" },

  matchRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 },
  matchDot: { width: 7, height: 7, borderRadius: 4 },
  matchTxt: { fontSize: 12, fontWeight: "700" },

  btn:    { width: "100%", backgroundColor: C.gold, paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8, shadowColor: C.gold, shadowOpacity: 0.30, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  btnOff: { opacity: 0.45, shadowOpacity: 0 },
  btnTxt: { color: "#0A0A0A", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },

  linkBack: { color: C.muted, fontWeight: "800", fontSize: 13 },

  rulesCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16, marginBottom: 20, gap: 8 },
  rulesTitle:{ color: C.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  ruleRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBorder },
  ruleText:  { color: "rgba(255,255,255,0.60)", fontSize: 12, fontWeight: "600" },

  footer: { textAlign: "center", color: "rgba(255,255,255,0.28)", fontWeight: "800", fontSize: 11, letterSpacing: 0.2 },
});

const fi = StyleSheet.create({
  wrap:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 16, height: 54, marginBottom: 4 },
  wrapFocused:{ borderColor: C.goldBorder, backgroundColor: "rgba(212,175,55,0.04)" },
  input:      { flex: 1, color: C.white, fontWeight: "700", fontSize: 15 },
});

const ps = StyleSheet.create({
  wrap:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, marginBottom: 2 },
  bar:   { flex: 1, height: 4, borderRadius: 99 },
  label: { fontSize: 11, fontWeight: "800", minWidth: 36, textAlign: "right" },
});

const ts = StyleSheet.create({
  toast:     { position: "absolute", top: Platform.OS === "ios" ? 56 : 28, left: 16, right: 16, zIndex: 9999, backgroundColor: "#111", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
  toastDot:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toastTitle:{ color: C.white, fontWeight: "900", fontSize: 14 },
  toastMsg:  { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 2 },
});