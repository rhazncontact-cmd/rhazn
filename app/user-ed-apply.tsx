// app/user-ed-apply.tsx

import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 PALETTE APPLE-LIKE */
const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#0A0A0A",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
  danger: "#FF3B30",
};

type NoticeType = "success" | "error" | "info";

/* 🔐 Génération Code ED (unique lisible) */
const generateEdCode = () =>
  `RZ-ED-${Date.now().toString().slice(-6)}-${Math.random()
    .toString(36)
    .substring(2, 5)
    .toUpperCase()}`;

export default function UserEdApply() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);

  /* 🔒 Données verrouillées (profil) */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cityOfBirth, setCityOfBirth] = useState("");

  /* 🔔 Notice UI */
  const [notice, setNotice] = useState<{
    type: NoticeType;
    title: string;
    message: string;
  } | null>(null);

  const noticeAnim = useRef(new Animated.Value(0)).current;

  const showNotice = async (
    type: NoticeType,
    title: string,
    message: string
  ) => {
    setNotice({ type, title, message });

    await Haptics.notificationAsync(
      type === "error"
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Success
    );

    Animated.timing(noticeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const hideNotice = () => {
    Animated.timing(noticeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setNotice(null));
  };

  /* ===================== LOAD PROFILE ===================== */
  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,last_name,email,birth_city")
        .eq("id", auth.user.id)
        .single();

      if (error) {
        await showNotice(
          "error",
          "Profil indisponible",
          "Impossible de charger vos informations."
        );
        return;
      }

      setFirstName(data?.first_name || "");
      setLastName(data?.last_name || "");
      setEmail(data?.email || auth.user.email || "");
      setCityOfBirth(data?.birth_city || "");
      setBooting(false);
    };

    loadProfile();
  }, []);

  /* ===================== SUBMIT ===================== */
  const submitApplication = async () => {
    if (loading) return;

    const net = await Network.getNetworkStateAsync();
    if (!net.isConnected) {
      await showNotice(
        "error",
        "Connexion requise",
        "Une connexion Internet est nécessaire."
      );
      return;
    }

    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error("Session expirée");

      const edCode = generateEdCode();

      /* 🔎 Sécurité : empêcher double demande */
      const { data: existing } = await supabase
        .from("agent_applications")
        .select("id,status")
        .eq("user_uid", auth.user.id)
        .maybeSingle();

      if (existing) {
        await showNotice(
          "info",
          "Demande existante",
          "Une demande ED existe déjà. Vous allez être redirigé."
        );
        router.replace("/agent-contrat");
        return;
      }

      /* ✅ INSERT AVEC CAPTURE D’ERREUR (CRITIQUE) */
      const { error: insertError } = await supabase
        .from("agent_applications")
        .insert({
          user_uid: auth.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          city_of_birth: cityOfBirth,
          ed_code: edCode,
          status: "AWAITING_CONTRACT_SIGNATURE",
        });

      if (insertError) {
        console.error("❌ INSERT ED FAILED:", insertError);
        throw new Error(insertError.message);
      }

      /* 🔔 Notification intelligente */
      await supabase.from("notifications").insert({
        user_uid: auth.user.id,
        title: "Demande ED enregistrée",
        body:
          "Votre demande a été enregistrée. Veuillez lire et signer le contrat pour continuer.",
        type: "SYSTEM",
      });

      await showNotice(
        "success",
        "Étape suivante",
        "Veuillez lire et signer le contrat pour continuer."
      );

      setTimeout(() => {
        router.replace("/agent-contrat");
      }, 900);
    } catch (e: any) {
      await showNotice(
        "error",
        "Erreur",
        e.message || "Impossible de soumettre la demande."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===================== UI ===================== */
  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {notice && (
        <Pressable style={styles.noticeOverlay} onPress={hideNotice}>
          <Animated.View style={[styles.noticeCard, { opacity: noticeAnim }]}>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMsg}>{notice.message}</Text>
          </Animated.View>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Demande d’Accréditation ED</Text>
        <Text style={styles.subtitle}>
          Lecture et signature du contrat obligatoires avant paiement
        </Text>

        <View style={styles.card}>
          <Locked label="Nom" value={lastName} />
          <Locked label="Prénom" value={firstName} />
          <Locked label="Email" value={email} />
          <Locked label="Ville de naissance" value={cityOfBirth} />
        </View>

        <TouchableOpacity
          style={[styles.submit, loading && { opacity: 0.6 }]}
          onPress={submitApplication}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitText}>
              Continuer vers le contrat
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ===================== LOCKED FIELD ===================== */
function Locked({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.lockedRow}>
      <Text style={styles.lockedLabel}>{label}</Text>
      <Text style={styles.lockedValue}>{value} 🔒</Text>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  boot: { flex: 1, justifyContent: "center", alignItems: "center" },

  container: { paddingTop: 70, paddingHorizontal: 22 },

  title: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  subtitle: { color: COLORS.sub, fontSize: 13, marginTop: 6 },

  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  lockedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  lockedLabel: { fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  lockedValue: { fontSize: 14, fontWeight: "800" },

  submit: {
    backgroundColor: COLORS.gold,
    marginTop: 26,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },
  submitText: { fontWeight: "900", fontSize: 16 },

  noticeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 999,
  },
  noticeCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noticeTitle: { fontWeight: "900", fontSize: 15 },
  noticeMsg: { marginTop: 6, fontSize: 13, color: COLORS.sub },
});
