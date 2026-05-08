// app/user-send-tan.tsx
// ✅ Alertes Apple-like pour TOUS les états de transaction RHAZN
// ✅ Pré-remplissage depuis banq/suspentz (bouton "Donner TAN")

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const COLORS = {
  bg:    "#000000",
  card:  "#0F0F0F",
  card2: "#111111",
  stroke:"#1C1C1E",
  white: "#FFFFFF",
  gray:  "#8E8E93",
  soft:  "rgba(255,255,255,0.08)",
  gold:  "#D4AF37",
  red:   "#FF3B30",
  green: "#00C853",
  orange:"#FF9F0A",
};

const TRANSFER_MIN_TAN         = 100;
const TRANSFER_MAX_TAN_PER_DAY = 2_500;
const TAN_TRANSFER_FEE_PERCENT = 2;

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

// ═══════════════════════════════════════════════════════════════
// ALERTE UNIVERSELLE APPLE-LIKE
// ═══════════════════════════════════════════════════════════════
type AlertKind = "success" | "error" | "warning" | "monetization" | "info";
interface AlertPayload {
  kind: AlertKind; title: string; message: string; detail?: string; onClose?: () => void;
}

function TxAlert({ payload, visible, onDismiss }: {
  payload: AlertPayload | null; visible: boolean; onDismiss: () => void;
}) {
  const slideY    = useRef(new Animated.Value(500)).current;
  const backdropO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,    { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
        Animated.timing(backdropO, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,    { toValue: 500, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(backdropO, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!payload) return null;

  const accent =
    payload.kind === "success"      ? COLORS.green  :
    payload.kind === "error"        ? COLORS.red     :
    payload.kind === "warning"      ? COLORS.orange  :
    payload.kind === "monetization" ? COLORS.red     :
    COLORS.gold;

  const iconName =
    payload.kind === "success"      ? "checkmark-circle" :
    payload.kind === "error"        ? "close-circle"     :
    payload.kind === "warning"      ? "warning"          :
    payload.kind === "monetization" ? "lock-closed"      :
    "information-circle";

  const handleClose = () => { onDismiss(); payload.onClose?.(); };

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleClose}>
      <Animated.View style={[al.backdrop, { opacity: backdropO }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[al.sheetWrap, { transform: [{ translateY: slideY }] }]}>
        <View style={al.sheet}>
          <View style={al.handle} />
          <View style={[al.iconRing, { backgroundColor: accent + "18", borderColor: accent + "40" }]}>
            <Ionicons name={iconName as any} size={40} color={accent} />
          </View>
          <Text style={al.title}>{payload.title}</Text>
          <Text style={al.msg}>{payload.message}</Text>
          {payload.detail && (
            <View style={[al.detailBox, { backgroundColor: accent + "14", borderColor: accent + "35" }]}>
              <Text style={[al.detailTxt, { color: accent }]}>{payload.detail}</Text>
            </View>
          )}
          <View style={al.sep} />
          <TouchableOpacity style={[al.closeBtn, { borderColor: accent + "45" }]} onPress={handleClose} activeOpacity={0.82}>
            <Text style={[al.closeTxt, { color: accent }]}>
              {payload.kind === "success" ? "Parfait ✓" : "Compris"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const al = StyleSheet.create({
  backdrop:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  sheetWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
  sheet:     { backgroundColor: "#131313", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 52, alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.09)", shadowColor: "#000", shadowOpacity: 0.60, shadowRadius: 40, shadowOffset: { width: 0, height: -8 }, elevation: 32 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 14 },
  iconRing:  { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:     { color: "#FFFFFF", fontWeight: "900", fontSize: 21, textAlign: "center", letterSpacing: 0.2 },
  msg:       { color: "rgba(255,255,255,0.60)", fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 21, paddingHorizontal: 4 },
  detailBox: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  detailTxt: { fontWeight: "900", fontSize: 15, textAlign: "center", letterSpacing: 0.3 },
  sep:       { width: "100%", height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.09)", marginVertical: 4 },
  closeBtn:  { width: "100%", paddingVertical: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", borderWidth: 1, marginTop: 4 },
  closeTxt:  { fontWeight: "900", fontSize: 16 },
});

// ═══════════════════════════════════════════════════════════════
// SCREEN
// ═══════════════════════════════════════════════════════════════
export default function UserSendTanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ✅ Params de pré-remplissage depuis banq/suspentz "Donner TAN"
  const { prefillQuery, prefillUid, prefillName } = useLocalSearchParams<{
    prefillQuery?: string;
    prefillUid?:   string;
    prefillName?:  string;
  }>();

  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [fromUid,     setFromUid]     = useState<string | null>(null);
  const [isMonetized, setIsMonetized] = useState<boolean | null>(null);
  const [query,       setQuery]       = useState(prefillQuery ?? "");
  const [suggestions, setSuggestions] = useState<
    { id: string; user_code: string | null; email: string | null; phone: string | null }[]
  >([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(prefillUid ?? null);
  const [searching,   setSearching]   = useState(false);
  const [amountStr,   setAmountStr]   = useState("");
  const [todayUsed,   setTodayUsed]   = useState<number>(0);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertPayload, setAlertPayload] = useState<AlertPayload | null>(null);

  const showAlert = (payload: AlertPayload) => {
    setAlertPayload(payload); setAlertVisible(true);
  };

  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id ?? null;
        if (!uid) { router.replace("/auth/login"); return; }
        if (!mounted) return;
        setFromUid(uid);

        const { data: prof } = await supabase
          .from("profiles")
          .select("is_monetized, role, full_name, avatar_url, email, phone, nif, profession, birth_date, sex, birth_city, birth_country, premier_souvenir")
          .eq("id", uid).single();

        const role = (prof?.role ?? "").toLowerCase();
        const requiredFields = [
          prof?.full_name, prof?.email, prof?.phone, prof?.nif, prof?.profession,
          prof?.birth_date, prof?.sex, prof?.birth_city, prof?.birth_country, prof?.premier_souvenir,
        ];
        const profileComplete = requiredFields.every(v => v !== null && v !== undefined && String(v).trim() !== "");
        const hasPhoto = !!(prof?.avatar_url?.trim());

        const monetized = !!(
          (profileComplete && hasPhoto) || prof?.is_monetized ||
          role === "supreme" || role === "agent" || role === "admin" || role === "cadna" || role === "cada"
        );
        if (mounted) setIsMonetized(monetized);

        const start = new Date(); start.setHours(0, 0, 0, 0);
        const { data: transfers } = await supabase
          .from("tan_transfers").select("amount_tan, fee_tan, created_at")
          .gte("created_at", start.toISOString()).eq("from_uid", uid);

        const used = (transfers ?? []).reduce(
          (s, r: any) => s + Number(r?.amount_tan ?? 0) + Number(r?.fee_tan ?? 0), 0
        ) ?? 0;
        if (mounted) setTodayUsed(used);
      } catch {
        showAlert({ kind: "error", title: "Erreur de chargement", message: "Impossible de charger vos données.\nVérifiez votre connexion Internet." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  // ✅ Si pré-remplissage depuis suspentz — pas de recherche automatique
  useEffect(() => {
    if (prefillUid && prefillQuery) {
      setSelectedUid(prefillUid);
      setQuery(prefillQuery);
      setSuggestions([]);
      return;
    }
    if (sending) return;
    let active = true, timer: any;
    const run = async () => {
      const q = query.trim().toLowerCase();
      if (q.length < 2 || selectedUid) { setSuggestions([]); setSearching(false); return; }
      setSearching(true);
      const { data, error } = await supabase.rpc("search_transfer_recipients_v2", { p_q: q });
      if (!active) return;
      setSuggestions(!error && data ? data : []);
      setSearching(false);
    };
    timer = setTimeout(run, 180);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [query, sending, prefillUid, selectedUid]);

  const amount    = useMemo(() => { const n = Number(amountStr.replace(/\D+/g,"")); return Number.isFinite(n) ? n : 0; }, [amountStr]);
  const fee       = useMemo(() => amount ? Math.ceil((amount * TAN_TRANSFER_FEE_PERCENT) / 100) : 0, [amount]);
  const total     = useMemo(() => amount + fee, [amount, fee]);
  const remaining = useMemo(() => Math.max(0, TRANSFER_MAX_TAN_PER_DAY - todayUsed), [todayUsed]);

  const canSubmit = useMemo(() =>
    !sending && !!fromUid && !!selectedUid && !!amount && amount > 0 &&
    amount >= TRANSFER_MIN_TAN && total > 0 && isMonetized === true,
    [sending, fromUid, selectedUid, amount, total, isMonetized]
  );

  const refreshTodayUsed = async () => {
    if (!fromUid) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data: transfers } = await supabase
      .from("tan_transfers").select("amount_tan, fee_tan, created_at")
      .gte("created_at", start.toISOString()).eq("from_uid", fromUid);
    const used = (transfers ?? []).reduce(
      (s, r: any) => s + Number(r?.amount_tan ?? 0) + Number(r?.fee_tan ?? 0), 0
    ) ?? 0;
    setTodayUsed(used);
  };

  const onSubmit = async () => {
    if (!isMonetized) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert({ kind: "monetization", title: "Compte non monétisé", message: "Pour envoyer du TAN, votre profil doit être entièrement rempli avec une photo de profil.", detail: "Paramètres → Mon profil → Compléter tous les champs + ajouter une photo" });
      return;
    }
    if (!selectedUid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showAlert({ kind: "warning", title: "Destinataire manquant", message: "Recherchez et sélectionnez un destinataire dans la liste avant de confirmer le transfert." });
      return;
    }
    if (!amount || amount < TRANSFER_MIN_TAN) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showAlert({ kind: "warning", title: "Montant invalide", message: "Saisissez un montant valide pour continuer.", detail: `Minimum requis : ${fmt(TRANSFER_MIN_TAN)} TAN` });
      return;
    }
    if (total > remaining) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert({ kind: "error", title: "Plafond journalier dépassé", message: "Vous ne pouvez plus envoyer autant aujourd'hui.", detail: `Restant disponible : ${fmt(remaining)} TAN` });
      return;
    }

    setSuggestions([]); setSearching(false);
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const { data, error } = await supabase.rpc("user_send_tan", { p_to_uid: selectedUid, p_amount_tan: Number(amount) });

      if (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        const errMsg = (error.message ?? "").toLowerCase();
        if (errMsg.includes("not_monetized") || errMsg.includes("monetization") || errMsg.includes("monetisé") || errMsg.includes("monetized") || errMsg.includes("profile_incomplete") || errMsg.includes("recipient_not_monetized")) {
          showAlert({ kind: "monetization", title: "Compte non monétisé", message: "Le destinataire n'a pas encore activé sa monétisation.\nSon profil doit être complet pour recevoir des TAN.", detail: "Paramètres → Mon profil → Compléter" });
        } else if (errMsg.includes("insufficient") || errMsg.includes("balance") || errMsg.includes("solde")) {
          showAlert({ kind: "error", title: "Solde TAN insuffisant", message: "Votre solde TAN ne couvre pas ce transfert.\nRechargez via un Agent RHAZN.", detail: `Total requis : ${fmt(total)} TAN` });
        } else if (errMsg.includes("limit") || errMsg.includes("plafond") || errMsg.includes("daily")) {
          showAlert({ kind: "warning", title: "Limite journalière atteinte", message: "Vous avez atteint votre plafond de transfert pour aujourd'hui.\nRevenez demain pour continuer.", detail: `Plafond : ${fmt(TRANSFER_MAX_TAN_PER_DAY)} TAN / jour` });
        } else {
          showAlert({ kind: "error", title: "Transfert échoué", message: "Une erreur est survenue lors du transfert.\nVérifiez votre connexion et réessayez.", detail: error.message ?? "Erreur inconnue" });
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshTodayUsed();
      showAlert({
        kind: "success", title: "Transfert réussi !",
        message: `Vous avez offert ${fmt(amount)} TAN à ${prefillName ?? "ce créateur"} ⚡\nIl a été crédité immédiatement.`,
        detail: `${fmt(amount)} TAN envoyés · ${fmt(fee)} TAN de frais`,
        onClose: () => { setAmountStr(""); setQuery(""); setSelectedUid(null); setSuggestions([]); },
      });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert({ kind: "error", title: "Erreur inattendue", message: "Une erreur réseau inattendue s'est produite.\nVérifiez votre connexion et réessayez." });
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="chevron-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {/* ✅ Titre adapté si venu depuis suspentz */}
          <Text style={styles.title}>
            {prefillName ? `Soutenir ${prefillName}` : "Envoyer TAN"}
          </Text>
          <Text style={styles.subtitle}>
            {prefillName ? `Donnez du TAN à ce créateur ⚡` : "Transfert sécurisé · RHAZN"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/wallet-utilisateur" as any)} style={styles.headerBtn}>
          <MaterialIcons name="account-balance-wallet" size={22} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 260 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ✅ BANNIÈRE CRÉATEUR si pré-remplissage */}
            {prefillName && selectedUid && (
              <View style={styles.creatorBanner}>
                <Ionicons name="flash" size={18} color={COLORS.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorBannerTitle}>Soutenir ce créateur</Text>
                  <Text style={styles.creatorBannerSub}>{prefillName} · Destinataire confirmé ✓</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedUid(null); setQuery(""); }} style={styles.changeBtn}>
                  <Text style={styles.changeBtnTxt}>Changer</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* BANNIÈRE NON MONÉTISÉ */}
            {isMonetized === false && (
              <View style={styles.notMonetizedBanner}>
                <Ionicons name="lock-closed" size={16} color={COLORS.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notMonetizedTitle}>Compte non monétisé</Text>
                  <Text style={styles.notMonetizedSub}>Remplissez tous les champs de votre profil et ajoutez une photo pour envoyer du TAN.</Text>
                </View>
              </View>
            )}

            {/* CARD INPUTS */}
            <View style={styles.card}>
              {/* Destinataire — masqué si pré-rempli et confirmé */}
              {!selectedUid && (
                <>
                  <Text style={styles.cardTitle}>Destinataire</Text>
                  <View style={styles.inputRow}>
                    <MaterialIcons name="person-outline" size={18} color={COLORS.gray} />
                    <TextInput
                      value={query}
                      onChangeText={(t) => { setQuery(t); setSelectedUid(null); }}
                      placeholder="Code RHAZN, email ou téléphone"
                      placeholderTextColor={COLORS.gray}
                      autoCapitalize="none" autoCorrect={false}
                      style={styles.input} editable={!sending}
                    />
                  </View>
                  {query.trim().length >= 2 && (
                    <View style={styles.suggestionsBox}>
                      {searching && <Text style={styles.suggestionMuted}>Recherche...</Text>}
                      {!searching && suggestions.length === 0 && <Text style={styles.suggestionMuted}>Aucun utilisateur trouvé</Text>}
                      {!searching && suggestions.map((u) => (
                        <TouchableOpacity key={u.id} style={styles.suggestionRow}
                          onPress={() => { setQuery(u.user_code ?? u.email ?? u.phone ?? "Utilisateur"); setSelectedUid(u.id); setSuggestions([]); Haptics.selectionAsync().catch(() => {}); }}>
                          <Ionicons name="person-circle-outline" size={18} color={COLORS.gold} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestionMain}>{u.user_code ?? "—"}</Text>
                            <Text style={styles.suggestionSub}>{u.email ?? u.phone ?? "—"}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={styles.divider} />
                </>
              )}

              <Text style={[styles.cardTitle, { marginTop: selectedUid ? 0 : 12 }]}>Montant</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="payments" size={18} color={COLORS.gold} />
                <TextInput
                  value={amountStr}
                  onChangeText={(t) => setAmountStr(t.replace(/\D+/g, ""))}
                  placeholder="Montant TAN"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric"
                  style={styles.input} editable={!sending}
                />
              </View>

              <View style={styles.previewBox}>
                <RowLine label="Frais admin"  value={`${fmt(fee)} TAN`}   accent={fee > 0 ? COLORS.gold : COLORS.gray} />
                <RowLine label="Total débité" value={`${fmt(total)} TAN`} accent={COLORS.white} />
              </View>
            </View>

            {/* CARD LIMITS */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Limites</Text>
              <View style={styles.limitsGrid}>
                <LimitPill label="Minimum"             value={`${fmt(TRANSFER_MIN_TAN)} TAN`}         icon="trending-up"    />
                <LimitPill label="Plafond / jour"      value={`${fmt(TRANSFER_MAX_TAN_PER_DAY)} TAN`} icon="calendar-today" />
                <LimitPill label="Utilisé aujourd'hui" value={`${fmt(todayUsed)} TAN`}                icon="history"        />
                <LimitPill label="Restant"             value={`${fmt(remaining)} TAN`}                icon="savings"        />
              </View>
              <Text style={styles.miniNote}>
                Le plafond est calculé sur{" "}
                <Text style={{ color: COLORS.white }}>montant + frais (2 %)</Text>.
              </Text>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.cta, !canSubmit && { opacity: 0.45 }, sending && { opacity: 0.65 }]}
              onPress={onSubmit} disabled={!canSubmit || sending}
            >
              {sending
                ? <ActivityIndicator color="#000" />
                : <>
                    <Ionicons name="flash" size={18} color="#000" />
                    <Text style={styles.ctaText}>
                      {prefillName ? `Donner ${amount > 0 ? fmt(amount) + " TAN" : "du TAN"} à ${prefillName}` : "Confirmer le transfert"}
                    </Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/user-history" as any)} disabled={sending}>
              <Ionicons name="time-outline" size={18} color={COLORS.gray} />
              <Text style={styles.secondaryText}>Voir l'historique</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <TxAlert payload={alertPayload} visible={alertVisible} onDismiss={() => setAlertVisible(false)} />
    </View>
  );
}

function RowLine({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: accent ?? COLORS.white }]}>{value}</Text>
    </View>
  );
}

function LimitPill({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <View style={styles.pill}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialIcons name={icon} size={16} color={COLORS.gold} />
        <Text style={styles.pillLabel}>{label}</Text>
      </View>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.bg },
  header:              { paddingTop: 64, paddingHorizontal: 14, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  headerBtn:           { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.stroke, alignItems: "center", justifyContent: "center" },
  title:               { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  subtitle:            { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  center:              { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText:         { color: COLORS.gray, fontSize: 12 },
  card:                { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.stroke, padding: 16, marginBottom: 14 },
  cardTitle:           { color: COLORS.white, fontSize: 13, fontWeight: "900", marginBottom: 10, letterSpacing: 0.2 },
  inputRow:            { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0B0B0B", borderRadius: 16, borderWidth: 1, borderColor: COLORS.stroke, paddingHorizontal: 12, paddingVertical: 12 },
  input:               { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: "700" },
  divider:             { height: 1, backgroundColor: COLORS.stroke, opacity: 0.8, marginVertical: 14 },
  suggestionsBox:      { marginTop: 10, backgroundColor: COLORS.card2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.stroke, overflow: "hidden" },
  suggestionRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.soft },
  suggestionMain:      { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  suggestionSub:       { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  suggestionMuted:     { color: COLORS.gray, fontSize: 12, padding: 12, textAlign: "center" },
  previewBox:          { marginTop: 14, backgroundColor: COLORS.card2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.soft, padding: 12 },
  rowLine:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  rowLabel:            { color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  rowValue:            { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  limitsGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill:                { width: "48%", backgroundColor: "#0B0B0B", borderRadius: 18, borderWidth: 1, borderColor: COLORS.stroke, padding: 12 },
  pillLabel:           { color: COLORS.gray, fontSize: 11, fontWeight: "700" },
  pillValue:           { color: COLORS.white, fontSize: 13, fontWeight: "900", marginTop: 8 },
  miniNote:            { marginTop: 12, color: COLORS.gray, fontSize: 11, lineHeight: 16 },
  cta:                 { height: 54, borderRadius: 18, backgroundColor: COLORS.gold, borderWidth: 1, borderColor: "rgba(212,175,55,0.45)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 6 },
  ctaText:             { color: "#000", fontSize: 14, fontWeight: "900" },
  secondaryBtn:        { height: 52, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.stroke, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 30 },
  secondaryText:       { color: COLORS.gray, fontSize: 13, fontWeight: "800" },
  notMonetizedBanner:  { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "rgba(255,159,10,0.10)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,159,10,0.30)", padding: 14, marginBottom: 14 },
  notMonetizedTitle:   { color: COLORS.orange, fontWeight: "900", fontSize: 13 },
  notMonetizedSub:     { color: "rgba(255,159,10,0.75)", fontWeight: "600", fontSize: 12, marginTop: 2, lineHeight: 17 },
  // ✅ Bannière créateur pré-rempli
  creatorBanner:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(212,175,55,0.10)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", padding: 14, marginBottom: 14 },
  creatorBannerTitle:  { color: COLORS.gold, fontWeight: "900", fontSize: 13 },
  creatorBannerSub:    { color: "rgba(212,175,55,0.75)", fontWeight: "600", fontSize: 12, marginTop: 2 },
  changeBtn:           { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  changeBtnTxt:        { color: COLORS.gray, fontWeight: "800", fontSize: 12 },
});