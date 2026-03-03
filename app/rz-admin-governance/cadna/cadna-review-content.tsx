/* ======================================================
🛡️ CADNA REVIEW — ULTRA PREMIUM • RHAZN • FINTECH GRADE
Analyse morale parfaite • Scroll complet • UI propre
Traçabilité complète: qui + date
====================================================== */

import { Video } from "expo-av";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../../lib/supabase";
import AdminGuard from "../../components/AdminGuard";

const GOLD = "#D4AF37";
const RED = "#FF453A";

/* ======================================================
🔥 TOAST
====================================================== */
function useRzToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;

  const show = (message: string) => {
    setMsg(message);
    setVisible(true);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 1400);
  };

  const Toast = () =>
    visible ? (
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY: ty }] }]}>
        <Text style={styles.toastText}>{msg}</Text>
      </Animated.View>
    ) : null;

  return { show, Toast };
}

/* ====================================================== */

export default function CadnaReviewContent() {
  return (
    <AdminGuard>
      <Screen />
    </AdminGuard>
  );
}

/* ====================================================== */

function Screen() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const { show, Toast } = useRzToast();
  const glow = useRef(new Animated.Value(0)).current;

  const params = useLocalSearchParams();
  const contentId = String(params.id ?? params.content_id ?? "");

  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /* ================= LOAD ================= */
  useEffect(() => {
    if (!contentId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("id", contentId)
        .single();

      if (!error && data) setContent(data);
      setLoading(false);
    })();
  }, [contentId]);

  /* ================= GLOW ================= */
  const animateGlow = () => {
    glow.setValue(0);
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  };

  /* ================= ACTION ================= */
  const process = async (status: "approved" | "rejected") => {
    if (!content || busy) return;
    setBusy(true);

    const { data } = await supabase.auth.getSession();
    const uid = data?.session?.user?.id;

    const patch: any = {
      cadna_status: status,
      cadna_reviewed_by: uid,
    };

    if (status === "approved") {
      patch.is_public = true;
      patch.approved_at = new Date().toISOString();
    }

    if (status === "rejected") {
      patch.is_public = false;
      patch.rejected_at = new Date().toISOString();
    }

    await supabase.from("store_products").update(patch).eq("id", content.id);

    await Haptics.notificationAsync(
      status === "approved"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );

    animateGlow();

    show(
      status === "approved"
        ? "✓ PACT approuvé • Excellence validée"
        : "✕ PACT rejeté • Non conforme"
    );

    setBusy(false);

    setTimeout(() => {
      router.replace("/rz-admin-governance/cadna/cadna-dashboard");
    }, 1300);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  /* ================= SI CONTENU INTROUVABLE ================= */
  if (!content) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#999" }}>Contenu introuvable</Text>

        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: GOLD, fontWeight: "800" }}>
            Retour
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.container}>
      <Toast />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 160 }}
      >
        {/* VIDEO SAFE */}
        <View style={styles.videoCard}>
          {content?.media_path ? (
            <Video
              ref={videoRef}
              source={{ uri: content.media_path }}
              style={styles.video}
              resizeMode="contain"
              useNativeControls
              shouldPlay
              isLooping
            />
          ) : (
            <View
              style={[
                styles.video,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Text style={{ color: "#777" }}>
                Aucun média
              </Text>
            </View>
          )}
        </View>

        {/* INFOS */}
        <View style={styles.infoCard}>
          <Text style={styles.label}>Titre</Text>
          <Text style={styles.value}>{content.title || "Sans titre"}</Text>

          <Text style={styles.label}>Auteur</Text>
          <Text style={styles.value}>
            {content.creator_name || "Créateur"}
          </Text>

          <Text style={styles.label}>Description morale</Text>
          <Text style={styles.desc}>
            {content.description || "Aucune description fournie"}
          </Text>

          <Text style={styles.label}>Analyse CADNA</Text>
          <Text style={styles.tip}>
            Examinez : valeurs morales, respect, qualité, impact social.
          </Text>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Animated.View style={[styles.btnWrapper, { shadowOpacity: glow }]}>
          <Pressable
            style={styles.approveBtn}
            disabled={busy}
            onPress={() => process("approved")}
          >
            <Text style={styles.blackText}>Approuver</Text>
          </Pressable>
        </Animated.View>

        <Pressable
          style={styles.rejectBtn}
          disabled={busy}
          onPress={() => process("rejected")}
        >
          <Text style={styles.redText}>Rejeter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ====================================================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  videoCard: {
    marginTop: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 18,
  },

  video: {
    width: "100%",
    height: 420,
    backgroundColor: "#000",
  },

  infoCard: {
    backgroundColor: "#0B0B0B",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  label: {
    color: GOLD,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
  },

  value: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  desc: {
    color: "#DDD",
    marginTop: 6,
    lineHeight: 20,
    fontSize: 14,
  },

  tip: {
    color: "#AAA",
    marginTop: 6,
    fontStyle: "italic",
  },

  footer: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 12,
    width: "100%",
    paddingHorizontal: 18,
  },

  btnWrapper: {
    flex: 1,
    shadowColor: GOLD,
    shadowRadius: 20,
  },

  approveBtn: {
    backgroundColor: GOLD,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: RED,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  blackText: { fontWeight: "900", color: "#000", fontSize: 15 },
  redText: { fontWeight: "900", color: RED, fontSize: 15 },

  toast: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    backgroundColor: "rgba(20,20,20,0.95)",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 20,
    zIndex: 999,
  },

  toastText: {
    color: "#FFF",
    fontWeight: "800",
  },
});
