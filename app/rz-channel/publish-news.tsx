/**
 * /app/rz-channel/publish-news.tsx
 * Page Supreme-only — publier Texte / Image(s) / Vidéo(s)
 *
 * ✅ Texte   : 1 500 mots maximum + compteur live
 * ✅ Images  : jusqu'à 25 images par publication (galerie + upload en lot)
 * ✅ Vidéos  : jusqu'à 10 vidéos par publication (liste + upload en lot)
 *
 * Stockage : les URLs sont sérialisées en JSON dans image_url / video_url
 * pour ne pas nécessiter de modification du schéma DB.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// ── Constants ───────────────────────────────────────────────────
const SUPREME_EMAIL  = "meyounbauniklovegodstory@gmail.com";
const SUPABASE_URL   = "https://mxxlchaygarszkygmylo.supabase.co";
const BUCKET_IMG     = "channel-news";
const BUCKET_VID     = "channel-news-videos";
const MAX_IMAGES     = 25;
const MAX_VIDEOS     = 10;
const MAX_WORDS_TEXT = 1500;

// ── Palette ─────────────────────────────────────────────────────
const C = {
  bg:          "#000000",
  card:        "#0E0E0E",
  surface:     "#111111",
  surface2:    "#161616",
  border:      "rgba(255,255,255,0.08)",
  text:        "#FFFFFF",
  sub:         "#AEAEB2",
  muted:       "rgba(255,255,255,0.30)",
  gold:        "#D4AF37",
  goldLight:   "rgba(212,175,55,0.12)",
  goldBorder:  "rgba(212,175,55,0.30)",
  green:       "#30D158",
  greenLight:  "rgba(48,209,88,0.12)",
  greenBorder: "rgba(48,209,88,0.30)",
  red:         "#FF453A",
  redLight:    "rgba(255,69,58,0.12)",
  blue:        "#0A84FF",
  blueLight:   "rgba(10,132,255,0.12)",
  blueBorder:  "rgba(10,132,255,0.30)",
  input:       "#1C1C1E",
  orange:      "#FF9F0A",
};

type MediaType = "text" | "image" | "video";

interface MediaFile {
  uri:  string;
  name: string;
  type: string;
}

// ── Helpers haptic ───────────────────────────────────────────────
async function hapticLight() {
  try { const H = await import("expo-haptics"); await H.impactAsync(H.ImpactFeedbackStyle.Medium); } catch {}
}
async function hapticSuccess() {
  try { const H = await import("expo-haptics"); await H.notificationAsync(H.NotificationFeedbackType.Success); } catch {}
}

// ── Compteur de mots ─────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Picker multiple images ────────────────────────────────────────
async function pickImagesAsync(existing: number): Promise<MediaFile[]> {
  try {
    const IP = await import("expo-image-picker");
    const { status } = await IP.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission refusée"); return []; }

    const remaining = MAX_IMAGES - existing;
    if (remaining <= 0) { Alert.alert("Limite atteinte", `Maximum ${MAX_IMAGES} images par publication.`); return []; }

    const r = await IP.launchImageLibraryAsync({
      mediaTypes:      IP.MediaTypeOptions.Images,
      quality:         0.85,
      allowsMultipleSelection: true,
      selectionLimit:  remaining,
    });
    if (r.canceled || !r.assets) return [];
    return r.assets.slice(0, remaining).map((a) => {
      const ext = (a.uri.split(".").pop() ?? "jpg").toLowerCase();
      return { uri: a.uri, name: `news_img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`, type: `image/${ext}` };
    });
  } catch (e) { console.warn("pickImages:", e); return []; }
}

// ── Picker multiple vidéos (une à la fois — iOS/Android limite) ──
async function pickVideoAsync(): Promise<MediaFile | null> {
  try {
    const IP = await import("expo-image-picker");
    const { status } = await IP.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission refusée"); return null; }
    const r = await IP.launchImageLibraryAsync({
      mediaTypes:       IP.MediaTypeOptions.Videos,
      quality:          0.8,
      videoMaxDuration: 180,
    });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    const ext = (a.uri.split(".").pop() ?? "mp4").toLowerCase();
    return { uri: a.uri, name: `news_vid_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`, type: `video/${ext}` };
  } catch (e) { console.warn("pickVideo:", e); return null; }
}

// ── Upload XHR ────────────────────────────────────────────────────
async function uploadFileXHR(
  uri: string, name: string, mimeType: string, bucket: string,
  onProgress?: (pct: number) => void,
): Promise<string | null> {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) return null;
    const blob: Blob = await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest(); xhr.open("GET", uri); xhr.responseType = "blob";
      xhr.onload = () => res(xhr.response); xhr.onerror = () => rej(new Error("read fail")); xhr.send();
    });
    onProgress?.(30);
    const path = `news/${name}`;
    const status: number = await new Promise((res, rej) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("Content-Type", mimeType);
      xhr.setRequestHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGxjaGF5Z2Fyc3preWdteWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1OTc3NjQsImV4cCI6MjA1NjE3Mzc2NH0.Fmn2ul5ESMX-DqrNxpjaRGOqCMgFGJMFPqgNExAbHEk");
      xhr.setRequestHeader("x-upsert", "true");
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(30 + Math.floor((e.loaded / e.total) * 60)); };
      xhr.onload = () => res(xhr.status); xhr.onerror = () => rej(new Error("upload fail")); xhr.send(blob);
    });
    onProgress?.(100);
    if (status !== 200 && status !== 201) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  } catch (e) { console.warn("uploadFileXHR:", e); return null; }
}

// ── Mini player vidéo preview ─────────────────────────────────────
function MiniVideoPlayer({ uri, index, onRemove }: {
  uri: string; index: number; onRemove: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause?.(); } catch {} }, []);
  return (
    <View style={mv.wrap}>
      <Pressable style={mv.preview} onPress={() => {
        if (playing) { try { player.pause?.(); } catch {} setPlaying(false); }
        else         { try { player.play?.();  } catch {} setPlaying(true);  }
      }}>
        <VideoView player={player} style={mv.vid} contentFit="cover" nativeControls={false} />
        <View style={[mv.overlay, playing && { opacity: 0 }]}>
          <Ionicons name={playing ? "pause" : "play"} size={18} color="#FFF" />
        </View>
        <View style={mv.indexBadge}>
          <Text style={mv.indexTxt}>{index + 1}</Text>
        </View>
      </Pressable>
      <TouchableOpacity style={mv.removeBtn} onPress={onRemove} activeOpacity={0.8}>
        <Ionicons name="close-circle" size={22} color={C.red} />
      </TouchableOpacity>
    </View>
  );
}

const mv = StyleSheet.create({
  wrap:       { position: "relative", marginBottom: 10 },
  preview:    { borderRadius: 12, overflow: "hidden", height: 130, position: "relative", backgroundColor: "#000" },
  vid:        { width: "100%", height: 130 },
  overlay:    { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  indexBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  indexTxt:   { color: "#FFF", fontWeight: "900", fontSize: 11 },
  removeBtn:  { position: "absolute", top: 6, right: 6 },
});

// ─────────────────────────────────────────────────────────────
// ✅ COMPTEUR DE MOTS — barre de progression
// ─────────────────────────────────────────────────────────────
function WordCountBar({ text }: { text: string }) {
  const wc  = countWords(text);
  const pct = Math.min(1, wc / MAX_WORDS_TEXT);
  const color =
    pct >= 1    ? C.red    :
    pct >= 0.85 ? C.orange :
    pct >= 0.5  ? C.gold   : C.green;

  return (
    <View style={wc_s.wrap}>
      <View style={wc_s.track}>
        <View style={[wc_s.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[wc_s.count, { color }]}>
        {wc} / {MAX_WORDS_TEXT} mots
        {wc > MAX_WORDS_TEXT ? "  ⚠️ Limite dépassée" : ""}
      </Text>
    </View>
  );
}

const wc_s = StyleSheet.create({
  wrap:  { marginTop: 8, gap: 6 },
  track: { height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 99 },
  count: { fontWeight: "700", fontSize: 12, textAlign: "right" },
});

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PublishNews() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthorized(session?.user?.email === SUPREME_EMAIL);
    });
  }, []);

  const [mediaType,   setMediaType]   = useState<MediaType>("text");
  const [title,       setTitle]       = useState("");
  const [content,     setContent]     = useState("");
  const [isFeatured,  setIsFeatured]  = useState(false);

  // ✅ Images — tableau jusqu'à 25
  const [imageFiles,  setImageFiles]  = useState<MediaFile[]>([]);

  // ✅ Vidéos — tableau jusqu'à 10
  const [videoFiles,  setVideoFiles]  = useState<MediaFile[]>([]);

  const [submitting,  setSubmitting]  = useState(false);
  const [uploadInfo,  setUploadInfo]  = useState<{ current: number; total: number } | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const resetMedia = () => {
    setImageFiles([]); setVideoFiles([]);
  };

  const switchType = (t: MediaType) => {
    setMediaType(t); resetMedia(); setErrorMsg(null);
  };

  // ── Ajouter images ──────────────────────────────────────────
  const handleAddImages = async () => {
    const picked = await pickImagesAsync(imageFiles.length);
    if (picked.length) setImageFiles((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  };

  const removeImage = (idx: number) =>
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Ajouter vidéo ───────────────────────────────────────────
  const handleAddVideo = async () => {
    if (videoFiles.length >= MAX_VIDEOS) {
      Alert.alert("Limite atteinte", `Maximum ${MAX_VIDEOS} vidéos par publication.`);
      return;
    }
    const f = await pickVideoAsync();
    if (f) setVideoFiles((prev) => [...prev, f]);
  };

  const removeVideo = (idx: number) =>
    setVideoFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Publication ─────────────────────────────────────────────
  const handlePublish = async () => {
    setErrorMsg(null); setSuccessMsg(null);

    if (!title.trim())                                    { setErrorMsg("Le titre est requis.");             return; }
    if (!content.trim())                                  { setErrorMsg("Le contenu est requis.");           return; }
    if (countWords(content) > MAX_WORDS_TEXT)             { setErrorMsg(`Maximum ${MAX_WORDS_TEXT} mots.`); return; }
    if (mediaType === "image" && imageFiles.length === 0) { setErrorMsg("Ajoutez au moins une image.");      return; }
    if (mediaType === "video" && videoFiles.length === 0) { setErrorMsg("Ajoutez au moins une vidéo.");      return; }

    await hapticLight();
    setSubmitting(true);

    try {
      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;

      // ── Upload des images ────────────────────────────────────
      if (mediaType === "image" && imageFiles.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          setUploadInfo({ current: i + 1, total: imageFiles.length });
          const f = imageFiles[i];
          const url = await uploadFileXHR(f.uri, f.name, f.type, BUCKET_IMG);
          if (!url) { setErrorMsg(`Erreur upload image ${i + 1}.`); setSubmitting(false); setUploadInfo(null); return; }
          urls.push(url);
        }
        // ✅ Stocker comme JSON array — archive.tsx peut parser les deux formats
        finalImageUrl = JSON.stringify(urls);
        setUploadInfo(null);
      }

      // ── Upload des vidéos ────────────────────────────────────
      if (mediaType === "video" && videoFiles.length > 0) {
        const urls: string[] = [];
        for (let i = 0; i < videoFiles.length; i++) {
          setUploadInfo({ current: i + 1, total: videoFiles.length });
          const f = videoFiles[i];
          const url = await uploadFileXHR(f.uri, f.name, f.type, BUCKET_VID);
          if (!url) { setErrorMsg(`Erreur upload vidéo ${i + 1}.`); setSubmitting(false); setUploadInfo(null); return; }
          urls.push(url);
        }
        finalVideoUrl = JSON.stringify(urls);
        setUploadInfo(null);
      }

      if (isFeatured) {
        await supabase.from("channel_news").update({ is_featured: false }).eq("is_featured", true);
      }

      const { error } = await supabase.from("channel_news").insert({
        title:       title.trim(),
        content:     content.trim(),
        image_url:   finalImageUrl,
        video_url:   finalVideoUrl,
        media_type:  mediaType,
        is_featured: isFeatured,
      });

      if (error) { setErrorMsg(`Erreur : ${error.message}`); setSubmitting(false); return; }

      await hapticSuccess();

      const countLabel =
        mediaType === "image" ? `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}` :
        mediaType === "video" ? `${videoFiles.length} vidéo${videoFiles.length > 1 ? "s" : ""}` :
        `${countWords(content)} mots`;

      setSuccessMsg(`✅ Publication réussie · ${countLabel}`);
      setTitle(""); setContent(""); setIsFeatured(false); resetMedia();
      scrollRef.current?.scrollTo({ y: 0, animated: true });

    } catch (e: any) {
      setErrorMsg(`Erreur inattendue : ${e.message}`);
    }

    setSubmitting(false);
    setUploadInfo(null);
  };

  // ── Guards ──────────────────────────────────────────────────
  if (authorized === null) {
    return (
      <View style={s.screen}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={s.screen}>
        <View style={s.centered}>
          <View style={s.lockIcon}><Ionicons name="lock-closed" size={32} color={C.gold} /></View>
          <Text style={s.lockTitle}>Accès refusé</Text>
          <Text style={s.lockSub}>Réservé à l'administrateur Supreme.</Text>
          <Pressable style={s.lockBack} onPress={() => router.back()}>
            <Text style={s.lockBackTxt}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const wordCount   = countWords(content);
  const wordsLeft   = MAX_WORDS_TEXT - wordCount;
  const overLimit   = wordCount > MAX_WORDS_TEXT;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ══ HEADER ══ */}
      <View style={s.header}>
        <Pressable style={s.headerBack} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
          <Text style={s.headerBackTxt}>Retour</Text>
        </Pressable>
        <Text style={s.headerTitle}>Nouvelle Actualité</Text>
        <View style={s.supremePill}>
          <Ionicons name="star" size={10} color={C.gold} />
          <Text style={s.supremeTxt}>SUPREME</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banners */}
        {!!successMsg && (
          <View style={s.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={C.green} />
            <Text style={s.successTxt}>{successMsg}</Text>
          </View>
        )}
        {!!errorMsg && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={C.red} />
            <Text style={s.errorTxt}>{errorMsg}</Text>
          </View>
        )}

        {/* ══ SÉLECTEUR TYPE ══ */}
        <View style={s.typeRow}>
          {([
            { key: "text",  icon: "text",     label: "Texte",              sublabel: `max ${MAX_WORDS_TEXT} mots` },
            { key: "image", icon: "images",   label: "Images",             sublabel: `max ${MAX_IMAGES} images`   },
            { key: "video", icon: "videocam", label: "Vidéos",             sublabel: `max ${MAX_VIDEOS} vidéos`   },
          ] as const).map((t) => {
            const active = mediaType === t.key;
            return (
              <Pressable key={t.key}
                style={[s.typeBtn, active && s.typeBtnActive]}
                onPress={() => switchType(t.key)}
              >
                <Ionicons name={t.icon as any} size={18} color={active ? "#000" : C.sub} />
                <Text style={[s.typeBtnTxt, active && s.typeBtnTxtActive]}>{t.label}</Text>
                <Text style={[s.typeBtnSub, active && { color: "rgba(0,0,0,0.55)" }]}>{t.sublabel}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ══ FORMULAIRE ══ */}
        <View style={s.card}>

          {/* Titre */}
          <Text style={s.label}>Titre <Text style={s.req}>*</Text></Text>
          <TextInput
            style={s.input} value={title} onChangeText={setTitle}
            placeholder="Ex: Mise à jour RHAZN…"
            placeholderTextColor={C.muted} maxLength={120}
          />
          <Text style={s.counter}>{title.length}/120</Text>

          {/* Contenu / Description */}
          <Text style={[s.label, { marginTop: 20 }]}>
            {mediaType === "text" ? "Contenu" : "Description"}
            {" "}<Text style={s.req}>*</Text>
          </Text>

          <TextInput
            style={[s.input, s.inputMulti, overLimit && s.inputOver]}
            value={content}
            onChangeText={setContent}
            placeholder={
              mediaType === "text"
                ? `Rédigez votre article (max ${MAX_WORDS_TEXT} mots)…`
                : "Décrivez le contenu, donnez du contexte…"
            }
            placeholderTextColor={C.muted}
            multiline
            textAlignVertical="top"
            // ✅ Texte : pas de limite chars dure, on compte les mots
            maxLength={mediaType === "text" ? 12000 : 1200}
          />

          {/* ✅ Compteur de mots pour texte */}
          {mediaType === "text" && (
            <WordCountBar text={content} />
          )}
          {mediaType !== "text" && (
            <Text style={s.counter}>{content.length}/1200</Text>
          )}

          {/* ═══════════════════════
              ✅ SECTION IMAGES
          ═══════════════════════ */}
          {mediaType === "image" && (
            <View style={{ marginTop: 20 }}>
              {/* Header section */}
              <View style={s.mediaSectionHeader}>
                <View>
                  <Text style={s.label}>Images <Text style={s.req}>*</Text></Text>
                  <Text style={s.mediaSectionSub}>
                    {imageFiles.length}/{MAX_IMAGES} sélectionnée{imageFiles.length > 1 ? "s" : ""}
                  </Text>
                </View>
                {imageFiles.length < MAX_IMAGES && (
                  <TouchableOpacity style={s.addMoreBtn} onPress={handleAddImages} activeOpacity={0.8}>
                    <Ionicons name="add" size={16} color="#000" />
                    <Text style={s.addMoreTxt}>Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Grille images */}
              {imageFiles.length > 0 ? (
                <>
                  <View style={s.imgGrid}>
                    {imageFiles.map((f, idx) => (
                      <View key={f.uri} style={s.imgThumbWrap}>
                        <Image source={{ uri: f.uri }} style={s.imgThumb} contentFit="cover" />
                        {/* Badge numéro */}
                        <View style={s.imgIndexBadge}>
                          <Text style={s.imgIndexTxt}>{idx + 1}</Text>
                        </View>
                        {/* Bouton supprimer */}
                        <TouchableOpacity
                          style={s.imgRemoveBtn}
                          onPress={() => removeImage(idx)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle" size={22} color={C.red} />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Case "Ajouter" si < 25 */}
                    {imageFiles.length < MAX_IMAGES && (
                      <TouchableOpacity style={s.imgAddSlot} onPress={handleAddImages} activeOpacity={0.8}>
                        <Ionicons name="add" size={28} color={C.gold} />
                        <Text style={s.imgAddSlotTxt}>{MAX_IMAGES - imageFiles.length} restantes</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Barre progression images */}
                  <View style={s.countBar}>
                    <View style={[s.countFill, { width: `${(imageFiles.length / MAX_IMAGES) * 100}%` as any }]} />
                  </View>
                </>
              ) : (
                <TouchableOpacity style={s.mediaPicker} onPress={handleAddImages} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={36} color={C.gold} />
                  <Text style={s.mediaPickerTxt}>Choisir des images</Text>
                  <Text style={s.mediaPickerSub}>Jusqu'à {MAX_IMAGES} images · JPG, PNG</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ═══════════════════════
              ✅ SECTION VIDÉOS
          ═══════════════════════ */}
          {mediaType === "video" && (
            <View style={{ marginTop: 20 }}>
              {/* Header section */}
              <View style={s.mediaSectionHeader}>
                <View>
                  <Text style={s.label}>Vidéos <Text style={s.req}>*</Text></Text>
                  <Text style={s.mediaSectionSub}>
                    {videoFiles.length}/{MAX_VIDEOS} sélectionnée{videoFiles.length > 1 ? "s" : ""}
                  </Text>
                </View>
                {videoFiles.length < MAX_VIDEOS && (
                  <TouchableOpacity style={[s.addMoreBtn, { backgroundColor: C.blue }]} onPress={handleAddVideo} activeOpacity={0.8}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={[s.addMoreTxt, { color: "#FFF" }]}>Ajouter</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Liste vidéos */}
              {videoFiles.length > 0 ? (
                <>
                  {videoFiles.map((f, idx) => (
                    <MiniVideoPlayer
                      key={f.uri}
                      uri={f.uri}
                      index={idx}
                      onRemove={() => removeVideo(idx)}
                    />
                  ))}

                  {/* Ajouter une autre vidéo */}
                  {videoFiles.length < MAX_VIDEOS && (
                    <TouchableOpacity style={s.videoAddMore} onPress={handleAddVideo} activeOpacity={0.8}>
                      <Ionicons name="add-circle-outline" size={20} color={C.blue} />
                      <Text style={s.videoAddMoreTxt}>
                        Ajouter une vidéo ({videoFiles.length}/{MAX_VIDEOS})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Barre progression vidéos */}
                  <View style={[s.countBar, { backgroundColor: "rgba(10,132,255,0.12)" }]}>
                    <View style={[s.countFill, { width: `${(videoFiles.length / MAX_VIDEOS) * 100}%` as any, backgroundColor: C.blue }]} />
                  </View>
                </>
              ) : (
                <TouchableOpacity style={[s.mediaPicker, { borderColor: C.blueBorder }]} onPress={handleAddVideo} activeOpacity={0.8}>
                  <Ionicons name="videocam-outline" size={36} color={C.blue} />
                  <Text style={[s.mediaPickerTxt, { color: C.blue }]}>Choisir des vidéos</Text>
                  <Text style={s.mediaPickerSub}>Jusqu'à {MAX_VIDEOS} vidéos · MP4, MOV · max 3 min chacune</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Texte seul */}
          {mediaType === "text" && (
            <View style={s.textNote}>
              <Ionicons name="document-text-outline" size={16} color={C.sub} />
              <Text style={s.textNoteTxt}>
                Article de fond — texte pur, affiché dans le lecteur premium RHAZN.
              </Text>
            </View>
          )}

          {/* À la une */}
          <View style={s.featuredRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.featuredLabel}>À la une</Text>
              <Text style={s.featuredSub}>Grande carte en tête de section</Text>
            </View>
            <Switch
              value={isFeatured} onValueChange={setIsFeatured}
              trackColor={{ false: C.surface, true: C.gold }}
              thumbColor="#FFF" ios_backgroundColor={C.surface}
            />
          </View>
          {isFeatured && (
            <View style={s.featuredNote}>
              <Ionicons name="star" size={12} color={C.gold} />
              <Text style={s.featuredNoteTxt}>Remplace la grande carte actuelle</Text>
            </View>
          )}
        </View>

        {/* ══ UPLOAD PROGRESS ══ */}
        {uploadInfo && (
          <View style={s.uploadProgress}>
            <ActivityIndicator color={C.gold} size="small" />
            <Text style={s.uploadProgressTxt}>
              Upload {uploadInfo.current}/{uploadInfo.total}…
            </Text>
          </View>
        )}

        {/* ══ BOUTON PUBLIER ══ */}
        <TouchableOpacity
          style={[s.publishBtn, (submitting || overLimit) && { opacity: 0.55 }]}
          onPress={handlePublish}
          disabled={submitting || overLimit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#000" />
              <Text style={s.publishBtnTxt}>Publier l'actualité</Text>
              {/* Résumé */}
              <Text style={s.publishBtnSub}>
                {mediaType === "image" ? `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}` :
                 mediaType === "video" ? `${videoFiles.length} vidéo${videoFiles.length > 1 ? "s" : ""}` :
                 `${wordCount} mots`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ══ GESTION ══ */}
        <ManageSection />
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION GESTION — liste + suppression
// ─────────────────────────────────────────────────────────────
function ManageSection() {
  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("channel_news")
      .select("id, title, media_type, is_featured, created_at, image_url, video_url")
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Supprimer ?", `"${title}" sera supprimée définitivement.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          const { error } = await supabase.from("channel_news").delete().eq("id", id);
          if (!error) { setItems((p) => p.filter((i) => i.id !== id)); hapticSuccess(); }
          setDeletingId(null);
        },
      },
    ]);
  };

  // Compter le nombre de médias d'un item
  const mediaCount = (item: any): string => {
    if (item.media_type === "image" && item.image_url) {
      try {
        const arr = JSON.parse(item.image_url);
        return Array.isArray(arr) ? `${arr.length} img` : "1 img";
      } catch { return "1 img"; }
    }
    if (item.media_type === "video" && item.video_url) {
      try {
        const arr = JSON.parse(item.video_url);
        return Array.isArray(arr) ? `${arr.length} vid` : "1 vid";
      } catch { return "1 vid"; }
    }
    return "";
  };

  const mediaIcon = (t: string) =>
    t === "video" ? "videocam" as const : t === "image" ? "images" as const : "text" as const;

  return (
    <View style={s.manageBox}>
      <View style={s.manageTitleRow}>
        <Text style={s.manageTitle}>Publiées ({items.length})</Text>
        <Pressable onPress={load} style={{ padding: 6 }}>
          <Ionicons name="refresh" size={16} color={C.gold} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={C.gold} style={{ marginVertical: 20 }} />
      ) : items.length === 0 ? (
        <Text style={s.emptyTxt}>Aucune actualité publiée.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={s.manageItem}>
            <View style={s.manageTypeIcon}>
              <Ionicons name={mediaIcon(item.media_type ?? "text")} size={14} color={C.sub} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              {item.is_featured && (
                <View style={s.featuredPill}>
                  <Ionicons name="star" size={9} color={C.gold} />
                  <Text style={s.featuredPillTxt}>UNE</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.manageItemTitle} numberOfLines={1}>{item.title}</Text>
                {!!mediaCount(item) && (
                  <View style={s.mediaCountPill}>
                    <Text style={s.mediaCountTxt}>{mediaCount(item)}</Text>
                  </View>
                )}
              </View>
              <Text style={s.manageItemDate}>
                {new Date(item.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </Text>
            </View>
            <Pressable style={s.deleteBtn}
              onPress={() => handleDelete(item.id, item.title)}
              disabled={deletingId === item.id}>
              {deletingId === item.id
                ? <ActivityIndicator size="small" color={C.red} />
                : <Ionicons name="trash-outline" size={18} color={C.red} />
              }
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.bg },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40 },

  header:        { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBack:    { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  headerBackTxt: { color: C.text, fontWeight: "700", fontSize: 15 },
  headerTitle:   { color: C.text, fontWeight: "900", fontSize: 17 },
  supremePill:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBorder, maxWidth: 90 },
  supremeTxt:    { color: C.gold, fontWeight: "900", fontSize: 10 },

  successBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenLight, borderRadius: 12, borderWidth: 1, borderColor: C.greenBorder, padding: 14, marginBottom: 16 },
  successTxt:    { color: C.green, fontWeight: "700", fontSize: 14, flex: 1 },
  errorBanner:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,69,58,0.10)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,69,58,0.30)", padding: 14, marginBottom: 16 },
  errorTxt:      { color: C.red, fontWeight: "700", fontSize: 14, flex: 1 },

  // Sélecteur type
  typeRow:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  typeBtnActive:    { backgroundColor: C.gold, borderColor: C.gold },
  typeBtnTxt:       { color: C.sub, fontWeight: "800", fontSize: 12 },
  typeBtnTxtActive: { color: "#000" },
  typeBtnSub:       { color: C.muted, fontWeight: "600", fontSize: 9 },

  card:       { backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
  label:      { color: C.text, fontWeight: "800", fontSize: 14, marginBottom: 8 },
  req:        { color: C.gold },
  counter:    { color: C.muted, fontSize: 11, fontWeight: "600", textAlign: "right", marginTop: 4 },
  input:      { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, color: C.text, fontWeight: "600", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  inputMulti: { minHeight: 160, paddingTop: 12 },
  // ✅ Input rouge si dépassement
  inputOver:  { borderColor: "rgba(255,69,58,0.50)", backgroundColor: "rgba(255,69,58,0.06)" },

  // Section media header
  mediaSectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 },
  mediaSectionSub:    { color: C.muted, fontWeight: "600", fontSize: 11, marginTop: 2 },

  addMoreBtn:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addMoreTxt:  { color: "#000", fontWeight: "900", fontSize: 13 },

  // ✅ Grille images 3 colonnes
  imgGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  imgThumbWrap:   { width: "31%", aspectRatio: 1, position: "relative" },
  imgThumb:       { width: "100%", height: "100%", borderRadius: 10 },
  imgIndexBadge:  { position: "absolute", top: 5, left: 5, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  imgIndexTxt:    { color: "#FFF", fontWeight: "900", fontSize: 10 },
  imgRemoveBtn:   { position: "absolute", top: 3, right: 3 },
  imgAddSlot:     { width: "31%", aspectRatio: 1, borderRadius: 10, borderWidth: 1.5, borderColor: C.goldBorder, borderStyle: "dashed", backgroundColor: C.goldLight, alignItems: "center", justifyContent: "center", gap: 4 },
  imgAddSlotTxt:  { color: C.gold, fontWeight: "700", fontSize: 10, textAlign: "center" },

  // Barre remplissage
  countBar:  { height: 3, backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 99, overflow: "hidden", marginTop: 4 },
  countFill: { height: "100%", backgroundColor: C.gold, borderRadius: 99 },

  // ✅ Vidéo — ajouter plus
  videoAddMore:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.blueLight, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.blueBorder },
  videoAddMoreTxt: { color: C.blue, fontWeight: "800", fontSize: 14 },

  // Picker vide
  mediaPicker:    { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.goldBorder, height: 130, alignItems: "center", justifyContent: "center", gap: 8 },
  mediaPickerTxt: { color: C.gold, fontWeight: "800", fontSize: 14 },
  mediaPickerSub: { color: C.muted, fontWeight: "600", fontSize: 11 },

  // Note texte
  textNote:    { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.surface, borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: C.border },
  textNoteTxt: { color: C.sub, fontWeight: "600", fontSize: 12, flex: 1, lineHeight: 17 },

  // À la une
  featuredRow:     { flexDirection: "row", alignItems: "center", marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: C.border },
  featuredLabel:   { color: C.text, fontWeight: "800", fontSize: 15 },
  featuredSub:     { color: C.sub, fontWeight: "500", fontSize: 12, marginTop: 2 },
  featuredNote:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.goldLight, borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: C.goldBorder },
  featuredNoteTxt: { color: C.gold, fontWeight: "700", fontSize: 12 },

  // Upload progress
  uploadProgress:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.goldLight, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.goldBorder },
  uploadProgressTxt: { color: C.gold, fontWeight: "700", fontSize: 14 },

  // Bouton publier
  publishBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.gold, borderRadius: 16, paddingVertical: 16, marginBottom: 28 },
  publishBtnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
  publishBtnSub: { color: "rgba(0,0,0,0.55)", fontWeight: "700", fontSize: 12 },

  // Gestion
  manageBox:       { backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border },
  manageTitleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  manageTitle:     { color: C.text, fontWeight: "900", fontSize: 16 },
  emptyTxt:        { color: C.muted, fontWeight: "600", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  manageItem:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  manageTypeIcon:  { width: 30, height: 30, borderRadius: 8, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  manageItemTitle: { color: C.text, fontWeight: "700", fontSize: 14, flex: 1 },
  manageItemDate:  { color: C.muted, fontWeight: "600", fontSize: 11 },
  featuredPill:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.goldLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 2, borderWidth: 1, borderColor: C.goldBorder },
  featuredPillTxt: { color: C.gold, fontWeight: "900", fontSize: 9 },
  deleteBtn:       { padding: 8 },
  // ✅ Badge nombre de médias
  mediaCountPill:  { backgroundColor: C.surface2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.border },
  mediaCountTxt:   { color: C.sub, fontWeight: "700", fontSize: 10 },

  lockIcon:    { width: 72, height: 72, borderRadius: 22, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  lockTitle:   { color: C.text, fontWeight: "900", fontSize: 20 },
  lockSub:     { color: C.sub, fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 20 },
  lockBack:    { backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  lockBackTxt: { color: "#000", fontWeight: "900", fontSize: 14 },
});