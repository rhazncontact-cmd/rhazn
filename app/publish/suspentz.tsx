import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useVideoPlayer, VideoView } from "expo-video";
import { supabase } from "../../lib/supabase";

/* 🎨 RHAZN */
const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  card2: "#111111",
  gold: "#D4AF37",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  muted: "rgba(255,255,255,0.72)",
  border: "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.08)",
  blue: "#007AFF",
  danger: "#FF453A",
  ok: "#34C759",
};

const MAX_DURATION_SEC = 125;

/* ================= THÈMES RHAZN ================= */
const RHAZN_THEMES = [
  "Art d’Apprendre",
  "Corps en Équilibre",
  "Force Intérieure",
  "Intelligence du Cœur",
  "Langage du Son",
  "Puissance du Vivant",
  "Discipline du Mouvement",
  "Héritage Familial",
  "Dimension Spirituelle",
  "Lois du Sentiment",

  "Éveil de Soi",
  "Maîtrise de l’Esprit",
  "Chemin de la Foi",
  "Vision de la Réussite",
  "Science de l’Échec",
  "Force de Résilience",
  "Sagesse Appliquée",
  "Loi de la Discipline",
  "Noblesse du Travail",
  "Génie Créatif",

  "L’Esprit d’Innovation",
  "La Pensée Technologique",
  "La Rigueur Scientifique",
  "La Profondeur Philosophique",
  "L’Éthique Supérieure",
  "La Balance de la Justice",
  "L’Architecture de la Paix",
  "La Vérité de la Liberté",
  "Le Poids de la Responsabilité",
  "L’Audace du Courage",

  "L’Énergie de l’Espoir",
  "La Force du Collectif",
  "L’Art de la Tolérance",
  "L’Intelligence Relationnelle",
  "Le Lien Humain",
  "L’Identité Profonde",
  "L’Expression Culturelle",
  "La Mémoire des Traditions",
  "Le Fil du Temps",
  "La Vision de l’Avenir",

  "La Science de la Valeur",
  "L’Économie du Sens",
  "L’Intelligence Financière",
  "L’Esprit d’Entreprendre",
  "L’Excellence Durable",
  "L’Harmonie de Vie",
  "Le Bien-Être Global",
  "La Conscience de Soi",
  "La Recherche de Vérité",
  "La Quête de Sens",
];

const toSeconds = (duration?: number | null) => {
  if (!duration) return 0;
  return duration > 1000 ? Math.round(duration / 1000) : Math.round(duration);
};

const getExt = (uri: string) => {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  return ["mp4", "mov", "m4v", "webm"].includes(ext ?? "") ? (ext as string) : "mp4";
};

const getContentType = (ext: string) => {
  switch (ext) {
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "m4v":
      return "video/x-m4v";
    default:
      return "video/mp4";
  }
};

type Notice = {
  tone: "info" | "danger" | "ok";
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function PublishSuspentz() {
  const router = useRouter();

  /* ---------------- STATE ---------------- */
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [showThemeList, setShowThemeList] = useState(false);
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  // 🔔 ACSET utilisateur (nouvelle logique)
  const [acsetBalance, setAcsetBalance] = useState<number | null>(null);
  const [acsetCost, setAcsetCost] = useState<number>(1); // fallback sécurité
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [isSupreme, setIsSupreme] = useState(false);

  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [playerUri, setPlayerUri] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [permissionOK, setPermissionOK] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const durationSec = useMemo(() => toSeconds(video?.duration), [video]);

  const filteredThemes = useMemo(() => {
    const q = theme.trim().toLowerCase();
    if (!q) return [];
    return RHAZN_THEMES.filter((t) => t.toLowerCase().includes(q)).slice(0, 10);
  }, [theme]);

  /* ---------------- VIDEO PLAYER ---------------- */
  const player = useVideoPlayer(playerUri ? { uri: playerUri } : null, (p) => {
    p.loop = true;
    p.volume = 1;
    p.muted = false;
  });

  const [isPlaying, setIsPlaying] = useState(false);

  const stopPreview = async () => {
    try {
      if (player) await player.pause();
    } catch {}
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if (!playerUri || !player) return;
    try {
      if (!isPlaying) {
        setIsPlaying(true);
        await player.play();
      } else {
        setIsPlaying(false);
        await player.pause();
      }
      Haptics.selectionAsync().catch(() => {});
    } catch {
      setIsPlaying(false);
      notify({
        tone: "danger",
        title: "Lecture impossible",
        message: "Prévisualisation échouée. Essayez une autre vidéo.",
      });
    }
  };

    /* ---------------- FETCH ACSET (SERVER) ---------------- */
const fetchCredits = async () => {
  try {
    setCreditsLoading(true);

    const { data: auth } = await supabase.auth.getUser();
const user = auth?.user;
if (!user) return;

const supreme =
  (user.email || "").toLowerCase() === "meyounbauniklovegodstory@gmail.com";

setIsSupreme(supreme);

if (supreme) {
  setAcsetBalance(Number.MAX_SAFE_INTEGER);
  return;
}

    const { data: w, error: wErr } = await supabase
  .from("wallets")
  .select("acset_balance")
  .eq("user_id", user.id)
  .single();

if (wErr) {
  console.warn("fetchCredits wallets error:", wErr.message);
  setAcsetBalance(0);
} else {
  setAcsetBalance(Number(w?.acset_balance || 0));
}

  } finally {
    setCreditsLoading(false);
  }
};

  /* ---------------- NOTICE ---------------- */
  const notify = (n: Notice) => {
    setNotice(n);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /* ---------------- FETCH SUSPENTZ COST (SERVER) ---------------- */
useEffect(() => {
  setTimeout(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("publication_tariffs")
          .select("acset_cost")
          .eq("code", "SUSPENTZ")
          .eq("active", true)
          .maybeSingle();

        if (error) throw error;

        setAcsetCost(Number(data?.acset_cost || 1));
      } catch (e) {
        console.warn("Fetch SUSPENTZ tariff failed, fallback=1 ACSET", e);
        setAcsetCost(1);
      }
    })();
  }, 0);
}, []);

  /* ---------------- Audio Android FIX ---------------- */
  useEffect(() => {
    if (Platform.OS === "android") {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
      }).catch(() => {});
    }
  }, []);

  /* ---------------- PERMISSIONS ---------------- */
useEffect(() => {
  (async () => {
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (media.status !== "granted") {
      setPermissionOK(false);
      notify({
        tone: "danger",
        title: "Accès galerie requis",
        message: "Autorisez l’accès à la galerie pour publier un Suspentz.",
      });
      return;
    }
    setPermissionOK(true);
  })();
}, []);

/* ---------------- FETCH CREDITS ON SCREEN LOAD ---------------- */
useEffect(() => {
  // ⚡ Ne jamais bloquer le premier paint
  setTimeout(() => {
    fetchCredits();
  }, 0);
}, []);

/* ---------------- AUTO AUTHOR ---------------- */
useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) return;

    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const auto =
        prof?.full_name?.trim() ||
        (user.user_metadata as any)?.full_name?.trim() ||
        prof?.email?.trim() ||
        user.email?.trim() ||
        "Auteur";

      setAuthor((prev) => (prev.trim() ? prev : auto));
    } catch {
      const auto =
        (user.user_metadata as any)?.full_name?.trim() ||
        user.email?.trim() ||
        "Auteur";
      setAuthor((prev) => (prev.trim() ? prev : auto));
    }
  })();
}, []);

  /* ---------------- Android URI safe ---------------- */
  const ensureLocalPlayableUri = async (asset: ImagePicker.ImagePickerAsset) => {
    if (Platform.OS !== "android") return asset.uri;
    const uri = asset.uri ?? "";
    if (uri.startsWith("file://")) return uri;

    try {
      const ext = getExt(uri);
      const dest = `${FileSystem.cacheDirectory}rz_suspentz_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch {
      return asset.uri;
    }
  };

  /* ---------------- PICK VIDEO ---------------- */
  const pickVideo = async () => {
    if (!permissionOK) {
      notify({
        tone: "danger",
        title: "Permission requise",
        message: "Autorisez l’accès à la galerie pour sélectionner une vidéo.",
      });
      return;
    }

    await stopPreview();

    let res: ImagePicker.ImagePickerResult;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        allowsEditing: false,
      });
    } catch {
      return;
    }

    if (res.canceled) return;

    const file = res.assets?.[0];
    if (!file?.uri) return;

    const sec = toSeconds(file.duration);
    if (sec > MAX_DURATION_SEC) {
      notify({
        tone: "danger",
        title: "Durée dépassée",
        message: `Maximum autorisé : ${MAX_DURATION_SEC} secondes.`,
      });
      return;
    }

    const safeUri = await ensureLocalPlayableUri(file);

    setVideo(file);
    setPlayerUri(safeUri);
    setIsPlaying(false);

    Haptics.selectionAsync().catch(() => {});
  };

  /* ---------------- stop preview on unmount ---------------- */
  useEffect(() => {
    return () => {
      stopPreview().catch(() => {});
    };
  }, []);

  /* ---------------- PUBLISH ---------------- */
  const publish = async () => {
  const t = title.trim();
    console.log("🟡 PUBLISH CLICKED", {
    title: title,
    theme: theme,
    author: author,
    hasVideo: !!video,
    durationSec,
    isSupreme,
  });

  const th = theme.trim();
  const au = author.trim();

  if (!t || !th || !au || !video) {
    notify({
      tone: "danger",
      title: "Informations manquantes",
      message: "Titre, Thème, Auteur et Vidéo sont requis.",
      actionLabel: !video ? "Choisir une vidéo" : undefined,
      onAction: !video ? pickVideo : undefined,
    });
    return;
  }

  setUploading(true);

  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    // 👑 SUPREME CHECK
    if (!isSupreme) {
      const available = Number(acsetBalance || 0);
      if (available < acsetCost) {
        notify({
          tone: "danger",
          title: "ACSET insuffisants",
          message:
            `Publication refusée.\n\n` +
            `Requis : ${acsetCost} ACSET\n` +
            `Disponible : ${available} ACSET`,
          actionLabel: "Aller sur Banq",
          onAction: () => router.push("/banq/suspentz"),
        });
        return;
      }
    }

    /* ────────────────
       1️⃣ UPLOAD VIDÉO
    ──────────────── */

    notify({
      tone: "info",
      title: "Upload en cours…",
      message: "Envoi sécurisé de votre vidéo vers RHAZN…",
    });

    const ext = getExt(playerUri || video.uri);
    const contentType = getContentType(ext);
    const path = `${user.id}/${Date.now()}.${ext}`;

    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      router.replace("/auth/login");
      return;
    }

    let uploadStatus: number | null = null;

    if (Platform.OS === "web") {
      const fileBlob = await fetch(playerUri || video.uri).then((r) => r.blob());
      const { error: uploadErr } = await supabase.storage
        .from("suspentz")
        .upload(path, fileBlob, { contentType, upsert: false });

      if (uploadErr) throw new Error(`Upload web échoué: ${uploadErr.message}`);
    } else {
      const uploadRes = await FileSystem.uploadAsync(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/suspentz/${path}`,
        playerUri || video.uri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": contentType,
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
        }
      );

      uploadStatus = uploadRes.status;

      if (![200, 201].includes(uploadRes.status)) {
        throw new Error(`Upload mobile échoué (${uploadRes.status})`);
      }
    }

    const { data: publicData } =
      supabase.storage.from("suspentz").getPublicUrl(path);

    if (!publicData?.publicUrl) {
      throw new Error("URL publique introuvable après upload");
    }

    /* ─────────────────────────────
       2️⃣ RPC FINAL (DB + ACSET)
    ───────────────────────────── */

    const finalDescription =
      `[THÈME] : ${th}\n---\n` + (description.trim() || "");

      console.log("🚀 RPC publish_suspentz_final PAYLOAD", {
  p_title: t,
  p_media_path: publicData.publicUrl,
  p_description: finalDescription,
  p_duration_seconds: durationSec,
  p_cadna_status: isSupreme ? "approved" : "pending",
});


    const { data: rpcData, error: rpcErr } = await supabase.rpc(
  "publish_suspentz_final",
  {
    p_title: t,
    p_media_path: publicData.publicUrl,
    p_description: finalDescription || null,
    p_duration_seconds: durationSec,
    p_cadna_status: isSupreme ? "approved" : "pending",
  }
);

console.log("✅ RPC RESULT", { rpcData, rpcErr });

if (rpcErr) throw rpcErr;


    /* ────────────────
       3️⃣ UI SUCCESS
    ──────────────── */

    await fetchCredits();

    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});

    notify({
      tone: "ok",
      title: "Publication envoyée",
      message: "Votre Suspentz est reçu. Validation CADNA en cours.",
      actionLabel: "OK",
      onAction: () => router.replace("/publish/suspentz"),
    });
  } catch (e: any) {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    ).catch(() => {});

    notify({
      tone: "danger",
      title: "Échec de publication",
      message:
        e?.message ||
        "Erreur réseau lors de l’upload vidéo. Vérifiez votre connexion.",
    });
  } finally {
    setUploading(false);
  }
};

  /* ================= UI — APPLE-LIKE PREMIUM ================= */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* ✅ NOTICE PREMIUM */}
      {notice && (
        <View style={styles.noticeWrap} pointerEvents="auto">
          <View style={styles.notice}>
            <View style={styles.noticeTop}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      notice.tone === "ok"
                        ? COLORS.ok
                        : notice.tone === "danger"
                        ? COLORS.danger
                        : COLORS.blue,
                  },
                ]}
              />
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Pressable onPress={() => setNotice(null)} style={styles.noticeClose}>
                <Ionicons name="close" size={16} color={COLORS.muted} />
              </Pressable>
            </View>

            <Text style={styles.noticeText}>{notice.message}</Text>

            {notice.actionLabel && notice.onAction && (
              <Pressable
                onPress={notice.onAction}
                style={({ pressed }) => [styles.noticeBtn, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.noticeBtnText}>{notice.actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <Animated.ScrollView
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{
    paddingBottom: 28,
    paddingTop: 210,   // 👈 réserve l’espace pour le header flottant
  }}

          scrollEventThrottle={16}
        >
         

          {/* ================= CARD ================= */}
          <View style={styles.card}>
            {/* ================= PREVIEW ================= */}
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <Text style={styles.previewTitle}>Aperçu</Text>
                <View style={styles.durationPill}>
                  <Text style={styles.durationText}>{video ? `${durationSec}s` : "—"}</Text>
                </View>
              </View>

              <View style={styles.previewBox}>
                {playerUri ? (
                  <>
                    <VideoView
                      player={player}
                      style={styles.video}
                      allowsFullscreen={false}
                      allowsPictureInPicture={false}
                      nativeControls={false}
                    />

                    <View style={styles.previewGradientTop} />
                    <View style={styles.previewGradientBottom} />

                    <Pressable
                      onPress={togglePlay}
                      style={({ pressed }) => [styles.playOverlay, pressed && { opacity: 0.92 }]}
                    >
                      <View style={styles.playBtn}>
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={22}
                          color="#000"
                        />
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={pickVideo}
                    style={({ pressed }) => [
                      styles.previewEmpty,
                      pressed && { transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <Ionicons name="videocam-outline" size={22} color={COLORS.gray} />
                    <Text style={styles.previewEmptyTitle}>Choisir une vidéo</Text>
                    <Text style={styles.previewEmptyText}>
                      Prévisualisation instantanée • style Apple-like
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={pickVideo}
                style={({ pressed }) => [
                  styles.pickBtn,
                  pressed && { transform: [{ scale: 0.99 }] },
                ]}
              >
                <Text style={styles.pickText}>{video ? "Changer la vidéo" : "Choisir une vidéo"}</Text>
                <Feather name="upload" size={16} color={COLORS.gold} />
              </Pressable>
            </View>

            {/* ================= FORM ================= */}
            <View style={{ position: "relative", zIndex: 20 }}>
              <TextInput
                placeholder="Titre (obligatoire)"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                maxLength={80}
              />

              <TextInput
                placeholder="Thème (obligatoire)"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
                value={theme}
                onChangeText={(v) => {
                  setTheme(v);
                  setShowThemeList(v.trim().length > 0);
                }}
                onFocus={() => {
                  if (theme.trim().length > 0) setShowThemeList(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowThemeList(false), 150);
                }}
                returnKeyType="done"
              />

              {showThemeList && filteredThemes.length > 0 && (
                <View style={styles.themeDropdown}>
                  {filteredThemes.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        setTheme(t);
                        setShowThemeList(false);
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      style={({ pressed }) => [
                        styles.themeRow,
                        pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
                      ]}
                    >
                      <Text style={styles.themeText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <TextInput
              placeholder="Auteur (obligatoire)"
              placeholderTextColor={COLORS.gray}
              style={styles.input}
              value={author}
              onChangeText={setAuthor}
              returnKeyType="next"
            />

            <TextInput
              placeholder="Description (optionnelle)"
              placeholderTextColor={COLORS.gray}
              style={[styles.input, { height: 94 }]}
              multiline
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />

            {/* ================= CTA ================= */}
            <Pressable
              onPress={publish}
              disabled={uploading}
              style={({ pressed }) => [
                styles.publishBtn,
                uploading && { opacity: 0.72 },
                pressed && !uploading && { transform: [{ scale: 0.99 }] },
              ]}
            >
              {uploading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color="#000" />
                  <Text style={styles.publishText}>Publication…</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.publishText}>
                    Publier • {acsetCost} ACSET
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#000" />
                </View>
              )}
            </Pressable>

            <Text style={styles.footnote}>
              Après {acsetCost} ACSET consommé(s), votre Suspentz est envoyé à{" "}
            <Text style={{ color: COLORS.gold, fontWeight: "900" }}>CADNA</Text> pour validation.

            </Text>
          </View>
        </Animated.ScrollView>
        {/* ================= HEADER (FIXE FLOTTANT) ================= */}
<View style={styles.floatingHeader}>
  <View style={styles.headerRow}>
    {/* ===== LEFT TEXT ===== */}
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>Publier un SUSPENTZ</Text>
      <Text style={styles.subtitle}>
        Vidéo courte • max {MAX_DURATION_SEC}s •{" "}
        <Text style={styles.gold}>{acsetCost} ACSET</Text>
      </Text>
    </View>

    {/* ===== RIGHT STACK: BADGE + LOGO ===== */}
    <View style={styles.rightStack}>
      {/* 🔔 BADGE CRÉDITS */}
      <View style={styles.creditsBadge}>
        {creditsLoading ? (
          <ActivityIndicator size="small" color={COLORS.gold} />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={14} color={COLORS.gold} />
            <Text style={styles.creditsText}>
              {isSupreme ? "∞" : acsetBalance === null ? "—" : acsetBalance}
            </Text>
          </>
        )}
      </View>

      {/* LOGO RHAZN — sous le badge */}
      <View style={styles.logoWrap}>
        <Image
          source={require("../../assets/images/rz-logo.png")}
          style={styles.logo}
        />
      </View>
     </View>
   </View>

  {/* INFO PILLS */}
  <View style={styles.infoPillsRow}>
    <View style={styles.pillInfo}>
      <Ionicons name="time-outline" size={14} color={COLORS.muted} />
      <Text style={styles.pillInfoText}>
        {video ? `${durationSec}s` : "—"}
      </Text>
    </View>

    <View style={styles.pillInfo}>
      <Ionicons
        name="shield-checkmark-outline"
        size={14}
        color={COLORS.muted}
      />
      <Text style={styles.pillInfoText}>CADNA</Text>
    </View>

    <View style={[styles.pillInfo, { borderColor: "rgba(212,175,55,0.28)" }]}>
      <Ionicons name="sparkles-outline" size={14} color={COLORS.gold} />
      <Text style={[styles.pillInfoText, { color: COLORS.gold }]}>
        Premium
      </Text>
    </View>
  </View>
</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- Styles (APPLE-LIKE PREMIUM) ---------------- */
const styles = StyleSheet.create({
  /* ===== HEADER ===== */
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
    floatingHeader: {
    position: "absolute",
    top: 42,                 // 👈 descend le bloc (ajuste 32–56 si besoin)
    left: 0,
    right: 0,

    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,

    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,

    zIndex: 50,              // 👈 au-dessus de tout
    elevation: 12,          // 👈 Android

    // 🌫️ Ombre premium Apple-like
    shadowColor: "#000",
shadowOpacity: 0.25,
shadowRadius: 12,
shadowOffset: { width: 0, height: 6 },
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },

  /* 🔔 BADGE CRÉDITS — ICI EXACTEMENT */
  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  creditsText: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 13,
  },

  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#0B0B0B",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 25, height: 25, resizeMode: "contain" },

  title: { color: COLORS.white, fontSize: 26, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  gold: { color: COLORS.gold, fontWeight: "900" },

  /* ===== INFO PILLS ===== */
  infoPillsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  pillInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  pillInfoText: { color: COLORS.muted, fontWeight: "900", fontSize: 12 },

  /* ===== CARD ===== */
  card: {
    marginTop: 16,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 18,
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#000",
    color: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* ===== PREVIEW ===== */
  previewCard: {
    backgroundColor: "#0B0B0B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 12,
    marginBottom: 14,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  previewTitle: { color: COLORS.white, fontWeight: "900", fontSize: 13 },

  durationPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  durationText: { color: COLORS.muted, fontWeight: "900", fontSize: 12 },

  previewBox: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#000",
    position: "relative",
  },
  video: { width: "100%", height: 250 },

  previewGradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  previewGradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  previewEmpty: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 8,
  },
  previewEmptyTitle: { color: COLORS.gold, fontWeight: "900", fontSize: 15, marginTop: 6 },
  previewEmptyText: { color: COLORS.gray, textAlign: "center", lineHeight: 18, fontSize: 12 },

  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  pickBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickText: { color: COLORS.gold, fontWeight: "900" },

  publishBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  publishText: { color: "#000", fontWeight: "900", fontSize: 16 },

  footnote: {
    color: COLORS.gray,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 12,
    textAlign: "center",
  },

  /* ===== NOTICE ===== */
  noticeWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,

  justifyContent: "center",
  alignItems: "center",

  paddingHorizontal: 22,

  backgroundColor: "rgba(0,0,0,0.45)", // 🌫️ backdrop premium

  zIndex: 5000,
  elevation: 50, // Android au-dessus de tout
},
  notice: {
  backgroundColor: "#0B0B0B",
  borderRadius: 22,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  padding: 18,

  width: "100%",
  maxWidth: 420,

  // 🌫️ Ombre Apple-like
  shadowColor: "#000",
  shadowOpacity: 0.45,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 24,
},
  noticeTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 99 },
  noticeTitle: { color: COLORS.white, fontWeight: "900", fontSize: 14, flex: 1 },
  noticeClose: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  noticeText: { color: COLORS.muted, lineHeight: 18, fontSize: 12.5 },
  noticeBtn: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    paddingVertical: 12,
    alignItems: "center",
  },
  noticeBtnText: { color: "#fff", fontWeight: "900" },

  /* ===== THEME DROPDOWN ===== */
  themeDropdown: {
    position: "absolute",
    top: 58 + 56,
    left: 0,
    right: 0,
    backgroundColor: "#0B0B0B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 999,
  },
  themeRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  themeText: { color: COLORS.white, fontSize: 13 },
});
