/**
 * /app/broadcast/publish-broadcast.tsx
 * ──────────────────────────────────────────────────────────────
 * Page Supreme — 3 onglets :
 *   PONCTUEL     → Keynote / Annonce unique
 *   HEBDOMADAIRE → Chaque vendredi (ou autre jour)
 *   QUOTIDIEN    → Chaque jour à 8h00 avec vidéo par jour
 *
 * ══ SQL Supabase ════════════════════════════════════════════════
 *
 * -- Si la table app_broadcasts existe déjà, ajouter les colonnes :
 * ALTER TABLE app_broadcasts
 *   ADD COLUMN IF NOT EXISTS broadcast_type  text
 *     CHECK (broadcast_type IN ('ponctuel','hebdomadaire','quotidien'))
 *     DEFAULT 'ponctuel',
 *   ADD COLUMN IF NOT EXISTS recur_day       int,
 *   ADD COLUMN IF NOT EXISTS recur_time      time,
 *   ADD COLUMN IF NOT EXISTS recur_alert_min int DEFAULT 60,
 *   ADD COLUMN IF NOT EXISTS daily_time      time,
 *   ADD COLUMN IF NOT EXISTS daily_alert_min int DEFAULT 30;
 *
 * -- Sinon créer la table complète :
 * CREATE TABLE IF NOT EXISTS app_broadcasts (
 *   id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   broadcast_type   text CHECK (broadcast_type IN ('ponctuel','hebdomadaire','quotidien')) DEFAULT 'ponctuel',
 *   title            text NOT NULL,
 *   message          text NOT NULL,
 *   media_type       text CHECK (media_type IN ('text','image','video')) DEFAULT 'text',
 *   media_url        text,
 *   signed_by        text NOT NULL DEFAULT 'RHAZN',
 *   signed_role      text CHECK (signed_role IN ('CVSO','CTO','SUPREME')) DEFAULT 'SUPREME',
 *   -- PONCTUEL
 *   alert_at         timestamptz,
 *   scheduled_at     timestamptz,
 *   -- HEBDOMADAIRE
 *   recur_day        int,
 *   recur_time       time,
 *   recur_alert_min  int DEFAULT 60,
 *   -- QUOTIDIEN
 *   daily_time       time,
 *   daily_alert_min  int DEFAULT 30,
 *   -- État
 *   is_active        boolean NOT NULL DEFAULT false,
 *   is_dismissed     boolean NOT NULL DEFAULT false,
 *   created_at       timestamptz NOT NULL DEFAULT now()
 * );
 * ALTER TABLE app_broadcasts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "read_all" ON app_broadcasts FOR SELECT USING (true);
 * CREATE POLICY "supreme_write" ON app_broadcasts FOR ALL TO authenticated
 *   USING ((SELECT email FROM auth.users WHERE id = auth.uid())='meyounbauniklovegodstory@gmail.com')
 *   WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid())='meyounbauniklovegodstory@gmail.com');
 *
 * -- Table vidéos quotidiennes (7 par broadcast)
 * CREATE TABLE IF NOT EXISTS app_daily_videos (
 *   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   broadcast_id uuid REFERENCES app_broadcasts(id) ON DELETE CASCADE,
 *   day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
 *   video_url    text NOT NULL,
 *   title        text,
 *   created_at   timestamptz DEFAULT now(),
 *   UNIQUE(broadcast_id, day_of_week)
 * );
 * ALTER TABLE app_daily_videos ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "read_all"      ON app_daily_videos FOR SELECT USING (true);
 * CREATE POLICY "supreme_write" ON app_daily_videos FOR ALL TO authenticated
 *   USING ((SELECT email FROM auth.users WHERE id = auth.uid())='meyounbauniklovegodstory@gmail.com')
 *   WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid())='meyounbauniklovegodstory@gmail.com');
 *
 * -- Buckets Storage publics :
 *   "broadcast-images"   "broadcast-videos"   "broadcast-daily-videos"
 * ═════════════════════════════════════════════════════════════════
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// ── Constants ──────────────────────────────────────────────────
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";
const SUPABASE_URL  = "https://mxxlchaygarszkygmylo.supabase.co";
const BUCKET_IMG    = "broadcast-images";
const BUCKET_VID    = "broadcast-videos";
const BUCKET_DAILY  = "broadcast-daily-videos";

// ── Palette ────────────────────────────────────────────────────
const C = {
  bg:         "#000000",
  card:       "#0E0E0E",
  surface:    "#111111",
  border:     "rgba(255,255,255,0.08)",
  text:       "#FFFFFF",
  sub:        "#AEAEB2",
  muted:      "rgba(255,255,255,0.30)",
  gold:       "#D4AF37",
  goldLight:  "rgba(212,175,55,0.12)",
  goldBorder: "rgba(212,175,55,0.30)",
  green:      "#30D158",
  greenLight: "rgba(48,209,88,0.12)",
  greenBorder:"rgba(48,209,88,0.30)",
  red:        "#FF453A",
  redLight:   "rgba(255,69,58,0.12)",
  redBorder:  "rgba(255,69,58,0.30)",
  blue:       "#0A84FF",
  blueLight:  "rgba(10,132,255,0.12)",
  blueBorder: "rgba(10,132,255,0.30)",
  input:      "#1C1C1E",
};

type BroadcastType = "ponctuel" | "hebdomadaire" | "quotidien";
type MediaType     = "text" | "image" | "video";
type SignedRole    = "CVSO" | "CTO" | "SUPREME";

const TAB_COLORS: Record<BroadcastType, string> = {
  ponctuel:     C.gold,
  hebdomadaire: C.blue,
  quotidien:    C.green,
};

const DAYS_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const DAYS_SHORT = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmtDT(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "DD/MM/YYYY HH:MM" Haïti (UTC-5) → ISO UTC
function parseHaitiDT(s: string): string | null {
  try {
    const [datePart, timePart] = s.trim().split(" ");
    const [day, month, year]   = datePart.split("/").map(Number);
    const [h, m]               = (timePart ?? "00:00").split(":").map(Number);
    if ([day,month,year,h,m].some(isNaN)) return null;
    return new Date(Date.UTC(year, month - 1, day, h + 5, m)).toISOString();
  } catch { return null; }
}

// ── Petit player vidéo preview ──────────────────────────────────
function VideoPreview({ uri }: { uri: string }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  useEffect(() => () => { try { player.pause?.(); } catch {} }, []);
  return (
    <Pressable style={vp.wrap} onPress={() => {
      if (playing) { try { player.pause?.(); } catch {} setPlaying(false); }
      else         { try { player.play?.();  } catch {} setPlaying(true);  }
    }}>
      <VideoView player={player} style={vp.vid} contentFit="cover" nativeControls={false} />
      <View style={[vp.overlay, playing && { opacity: 0 }]}>
        <View style={vp.btn}><Ionicons name={playing ? "pause" : "play"} size={22} color="#FFF" /></View>
      </View>
    </Pressable>
  );
}
const vp = StyleSheet.create({
  wrap:    { borderRadius: 12, overflow: "hidden", height: 150, position: "relative" },
  vid:     { width: "100%", height: 150 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.30)" },
  btn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
});

// ── Upload helper ───────────────────────────────────────────────
async function uploadFile(
  uri: string, name: string, type: string, bucket: string
): Promise<string | null> {
  try {
    const res  = await fetch(uri);
    const blob = await res.blob();
    const path = `broadcast/${name}`;
    const { error } = await supabase.storage.from(bucket)
      .upload(path, blob, { contentType: type, upsert: true });
    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  } catch (e: any) { console.warn("❌ upload:", e.message); return null; }
}

// ── Champs communs (titre, message, signataire) ─────────────────
function CommonFields({
  title, setTitle, message, setMessage,
  signedBy, setSignedBy, signedRole, setSignedRole,
}: any) {
  const roleColors: Record<SignedRole, string> = { CVSO: C.blue, CTO: C.green, SUPREME: C.gold };
  return (
    <>
      <Text style={s.label}>Titre <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle}
        placeholder="Ex: Assemblée générale RHAZN" placeholderTextColor={C.muted} maxLength={80} />
      <Text style={s.counter}>{title.length}/80</Text>

      <Text style={[s.label, { marginTop: 16 }]}>Message <Text style={s.req}>*</Text></Text>
      <TextInput style={[s.input, s.inputMulti]} value={message} onChangeText={setMessage}
        placeholder="Contenu du broadcast…" placeholderTextColor={C.muted}
        multiline textAlignVertical="top" maxLength={800} />
      <Text style={s.counter}>{message.length}/800</Text>

      <Text style={[s.label, { marginTop: 16 }]}>Signé par <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={signedBy} onChangeText={setSignedBy}
        placeholder="Ex: Jean-Paul PIERRE" placeholderTextColor={C.muted} maxLength={50} />

      <Text style={[s.label, { marginTop: 14 }]}>Fonction</Text>
      <View style={s.roleRow}>
        {(["CVSO","CTO","SUPREME"] as SignedRole[]).map((r) => {
          const active = signedRole === r;
          return (
            <Pressable key={r}
              style={[s.roleBtn, active && { backgroundColor: roleColors[r], borderColor: roleColors[r] }]}
              onPress={() => setSignedRole(r)}>
              <Text style={[s.roleBtnTxt, active && { color: "#000" }]}>{r}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// FORMULAIRE PONCTUEL
// ─────────────────────────────────────────────────────────────
function FormPonctuel({ onCreated }: { onCreated: () => void }) {
  const [title,      setTitle]      = useState("");
  const [message,    setMessage]    = useState("");
  const [signedBy,   setSignedBy]   = useState("");
  const [signedRole, setSignedRole] = useState<SignedRole>("SUPREME");
  const [mediaType,  setMediaType]  = useState<MediaType>("text");
  const [imageUri,   setImageUri]   = useState<string | null>(null);
  const [imageFile,  setImageFile]  = useState<any>(null);
  const [videoUri,   setVideoUri]   = useState<string | null>(null);
  const [videoFile,  setVideoFile]  = useState<any>(null);
  const [alertAt,    setAlertAt]    = useState("");
  const [schedAt,    setSchedAt]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const pickImg = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [16,9] });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; const ext = (a.uri.split(".").pop()??"jpg").toLowerCase(); setImageUri(a.uri); setImageFile({ uri: a.uri, name: `ponc_img_${Date.now()}.${ext}`, type: `image/${ext}` }); }
  };
  const pickVid = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8, videoMaxDuration: 300 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; const ext = (a.uri.split(".").pop()??"mp4").toLowerCase(); setVideoUri(a.uri); setVideoFile({ uri: a.uri, name: `ponc_vid_${Date.now()}.${ext}`, type: `video/${ext}` }); }
  };

  const handleCreate = async () => {
    setError(null);
    if (!title.trim())    { setError("Titre requis.");     return; }
    if (!message.trim())  { setError("Message requis.");   return; }
    if (!signedBy.trim()) { setError("Signataire requis."); return; }
    const alertISO = parseHaitiDT(alertAt);
    const schedISO = parseHaitiDT(schedAt);
    if (!alertISO) { setError("Date alerte invalide (JJ/MM/AAAA HH:MM)."); return; }
    if (!schedISO) { setError("Date événement invalide (JJ/MM/AAAA HH:MM)."); return; }
    if (new Date(schedISO) <= new Date(alertISO)) { setError("L'événement doit être après l'alerte."); return; }

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaType === "image" && imageFile) { mediaUrl = await uploadFile(imageFile.uri, imageFile.name, imageFile.type, BUCKET_IMG); if (!mediaUrl) { setError("Erreur upload image."); setSubmitting(false); return; } }
      if (mediaType === "video" && videoFile) { mediaUrl = await uploadFile(videoFile.uri, videoFile.name, videoFile.type, BUCKET_VID); if (!mediaUrl) { setError("Erreur upload vidéo."); setSubmitting(false); return; } }

      const { error: e } = await supabase.from("app_broadcasts").insert({
        broadcast_type: "ponctuel", title: title.trim(), message: message.trim(),
        media_type: mediaType, media_url: mediaUrl,
        signed_by: signedBy.trim(), signed_role: signedRole,
        alert_at: alertISO, scheduled_at: schedISO,
        is_active: false, is_dismissed: false,
      });
      if (e) { setError(e.message); setSubmitting(false); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated();
    } catch { setError("Erreur inattendue."); }
    setSubmitting(false);
  };

  return (
    <View style={s.card}>
      {error && <View style={s.errorBanner}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={s.errorTxt}>{error}</Text></View>}

      {/* Infos */}
      <View style={s.typeInfoBox}>
        <Ionicons name="radio" size={14} color={C.gold} />
        <Text style={s.typeInfoTxt}>Événement unique — date et heure précises</Text>
      </View>

      <CommonFields title={title} setTitle={setTitle} message={message} setMessage={setMessage}
        signedBy={signedBy} setSignedBy={setSignedBy} signedRole={signedRole} setSignedRole={setSignedRole} />

      {/* Média */}
      <Text style={[s.label, { marginTop: 16 }]}>Média</Text>
      <View style={s.typeRow}>
        {(["text","image","video"] as MediaType[]).map((t) => {
          const icons: any = { text:"text", image:"image", video:"videocam" };
          const labels: any = { text:"Texte", image:"Image", video:"Vidéo" };
          const active = mediaType === t;
          return (
            <Pressable key={t} style={[s.typeBtn, active && { backgroundColor: C.gold, borderColor: C.gold }]}
              onPress={() => { setMediaType(t); setImageUri(null); setImageFile(null); setVideoUri(null); setVideoFile(null); }}>
              <Ionicons name={icons[t]} size={14} color={active ? "#000" : C.sub} />
              <Text style={[s.typeBtnTxt, active && { color:"#000" }]}>{labels[t]}</Text>
            </Pressable>
          );
        })}
      </View>
      {mediaType === "image" && (
        imageUri
          ? <View style={{ marginTop: 10 }}><Image source={{ uri: imageUri }} style={{ height: 130, borderRadius: 12 }} contentFit="cover" /><Pressable onPress={() => { setImageUri(null); setImageFile(null); }} style={{ flexDirection:"row", alignItems:"center", gap:5, marginTop:8 }}><Ionicons name="trash-outline" size={13} color={C.red} /><Text style={{ color:C.red, fontSize:12, fontWeight:"700" }}>Retirer</Text></Pressable></View>
          : <Pressable style={[s.mediaPicker, { marginTop: 10 }]} onPress={pickImg}><Ionicons name="image-outline" size={24} color={C.gold} /><Text style={s.mediaPickerTxt}>Choisir une image</Text></Pressable>
      )}
      {mediaType === "video" && (
        videoUri
          ? <View style={{ marginTop: 10 }}><VideoPreview uri={videoUri} /><Pressable onPress={() => { setVideoUri(null); setVideoFile(null); }} style={{ flexDirection:"row", alignItems:"center", gap:5, marginTop:8 }}><Ionicons name="trash-outline" size={13} color={C.red} /><Text style={{ color:C.red, fontSize:12, fontWeight:"700" }}>Retirer</Text></Pressable></View>
          : <Pressable style={[s.mediaPicker, { marginTop: 10, borderColor: C.blueBorder }]} onPress={pickVid}><Ionicons name="videocam-outline" size={24} color={C.blue} /><Text style={[s.mediaPickerTxt, { color:C.blue }]}>Choisir une vidéo</Text></Pressable>
      )}

      {/* Dates */}
      <Text style={[s.label, { marginTop: 18 }]}>⚠️ Heure du bandeau (alerte) <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={alertAt} onChangeText={setAlertAt} placeholder="JJ/MM/AAAA HH:MM" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" />
      <Text style={s.dateHint}>Heure locale Haïti (UTC-5)</Text>

      <Text style={[s.label, { marginTop: 14 }]}>🔴 Heure de l'événement (overlay) <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={schedAt} onChangeText={setSchedAt} placeholder="JJ/MM/AAAA HH:MM" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" />
      <Text style={s.dateHint}>Heure locale Haïti (UTC-5)</Text>

      <Pressable style={[s.createBtn, { backgroundColor: C.gold }, submitting && { opacity: 0.5 }]}
        onPress={handleCreate} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#000" size="small" />
          : <><Ionicons name="radio" size={16} color="#000" /><Text style={s.createBtnTxt}>Créer le broadcast</Text></>}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FORMULAIRE HEBDOMADAIRE
// ─────────────────────────────────────────────────────────────
function FormHebdomadaire({ onCreated }: { onCreated: () => void }) {
  const [title,       setTitle]       = useState("Assemblée hebdomadaire RHAZN");
  const [message,     setMessage]     = useState("");
  const [signedBy,    setSignedBy]    = useState("");
  const [signedRole,  setSignedRole]  = useState<SignedRole>("SUPREME");
  const [mediaType,   setMediaType]   = useState<MediaType>("text");
  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [imageFile,   setImageFile]   = useState<any>(null);
  const [videoUri,    setVideoUri]    = useState<string | null>(null);
  const [videoFile,   setVideoFile]   = useState<any>(null);
  const [recurDay,    setRecurDay]    = useState(5); // vendredi
  const [recurTime,   setRecurTime]   = useState("20:00");
  const [alertMin,    setAlertMin]    = useState("60");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const pickImg = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [16,9] });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; const ext = (a.uri.split(".").pop()??"jpg").toLowerCase(); setImageUri(a.uri); setImageFile({ uri: a.uri, name: `hebdo_img_${Date.now()}.${ext}`, type: `image/${ext}` }); }
  };
  const pickVid = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8, videoMaxDuration: 300 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; const ext = (a.uri.split(".").pop()??"mp4").toLowerCase(); setVideoUri(a.uri); setVideoFile({ uri: a.uri, name: `hebdo_vid_${Date.now()}.${ext}`, type: `video/${ext}` }); }
  };

  const handleCreate = async () => {
    setError(null);
    if (!title.trim())    { setError("Titre requis.");     return; }
    if (!message.trim())  { setError("Message requis.");   return; }
    if (!signedBy.trim()) { setError("Signataire requis."); return; }
    if (!recurTime.match(/^\d{2}:\d{2}$/)) { setError("Heure invalide (HH:MM)."); return; }

    setSubmitting(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaType === "image" && imageFile) { mediaUrl = await uploadFile(imageFile.uri, imageFile.name, imageFile.type, BUCKET_IMG); if (!mediaUrl) { setError("Erreur upload."); setSubmitting(false); return; } }
      if (mediaType === "video" && videoFile) { mediaUrl = await uploadFile(videoFile.uri, videoFile.name, videoFile.type, BUCKET_VID); if (!mediaUrl) { setError("Erreur upload."); setSubmitting(false); return; } }

      const { error: e } = await supabase.from("app_broadcasts").insert({
        broadcast_type: "hebdomadaire", title: title.trim(), message: message.trim(),
        media_type: mediaType, media_url: mediaUrl,
        signed_by: signedBy.trim(), signed_role: signedRole,
        recur_day: recurDay, recur_time: `${recurTime}:00`,
        recur_alert_min: parseInt(alertMin) || 60,
        is_active: false, is_dismissed: false,
      });
      if (e) { setError(e.message); setSubmitting(false); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated();
    } catch { setError("Erreur inattendue."); }
    setSubmitting(false);
  };

  return (
    <View style={s.card}>
      {error && <View style={s.errorBanner}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={s.errorTxt}>{error}</Text></View>}

      <View style={[s.typeInfoBox, { borderColor: C.blueBorder, backgroundColor: C.blueLight }]}>
        <Ionicons name="calendar" size={14} color={C.blue} />
        <Text style={[s.typeInfoTxt, { color: C.blue }]}>Se déclenche chaque semaine — automatiquement</Text>
      </View>

      <CommonFields title={title} setTitle={setTitle} message={message} setMessage={setMessage}
        signedBy={signedBy} setSignedBy={setSignedBy} signedRole={signedRole} setSignedRole={setSignedRole} />

      {/* Média */}
      <Text style={[s.label, { marginTop: 16 }]}>Média</Text>
      <View style={s.typeRow}>
        {(["text","image","video"] as MediaType[]).map((t) => {
          const icons: any = { text:"text", image:"image", video:"videocam" };
          const labels: any = { text:"Texte", image:"Image", video:"Vidéo" };
          const active = mediaType === t;
          return (
            <Pressable key={t} style={[s.typeBtn, active && { backgroundColor: C.blue, borderColor: C.blue }]}
              onPress={() => { setMediaType(t); setImageUri(null); setImageFile(null); setVideoUri(null); setVideoFile(null); }}>
              <Ionicons name={icons[t]} size={14} color={active ? "#FFF" : C.sub} />
              <Text style={[s.typeBtnTxt, active && { color:"#FFF" }]}>{labels[t]}</Text>
            </Pressable>
          );
        })}
      </View>
      {mediaType === "image" && (
        imageUri
          ? <View style={{ marginTop: 10 }}><Image source={{ uri: imageUri }} style={{ height: 130, borderRadius: 12 }} contentFit="cover" /><Pressable onPress={() => { setImageUri(null); setImageFile(null); }} style={{ flexDirection:"row", gap:5, alignItems:"center", marginTop:8 }}><Ionicons name="trash-outline" size={13} color={C.red} /><Text style={{ color:C.red, fontSize:12, fontWeight:"700" }}>Retirer</Text></Pressable></View>
          : <Pressable style={[s.mediaPicker, { marginTop: 10 }]} onPress={pickImg}><Ionicons name="image-outline" size={24} color={C.gold} /><Text style={s.mediaPickerTxt}>Choisir une image</Text></Pressable>
      )}
      {mediaType === "video" && (
        videoUri
          ? <View style={{ marginTop: 10 }}><VideoPreview uri={videoUri} /><Pressable onPress={() => { setVideoUri(null); setVideoFile(null); }} style={{ flexDirection:"row", gap:5, alignItems:"center", marginTop:8 }}><Ionicons name="trash-outline" size={13} color={C.red} /><Text style={{ color:C.red, fontSize:12, fontWeight:"700" }}>Retirer</Text></Pressable></View>
          : <Pressable style={[s.mediaPicker, { marginTop: 10, borderColor: C.blueBorder }]} onPress={pickVid}><Ionicons name="videocam-outline" size={24} color={C.blue} /><Text style={[s.mediaPickerTxt, { color:C.blue }]}>Choisir une vidéo</Text></Pressable>
      )}

      {/* Jour de la semaine */}
      <Text style={[s.label, { marginTop: 18 }]}>Jour de la semaine <Text style={s.req}>*</Text></Text>
      <View style={s.dayRow}>
        {DAYS_SHORT.map((d, i) => (
          <Pressable key={i}
            style={[s.dayBtn, recurDay === i && { backgroundColor: C.blue, borderColor: C.blue }]}
            onPress={() => setRecurDay(i)}>
            <Text style={[s.dayBtnTxt, recurDay === i && { color: "#FFF" }]}>{d}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.dateHint}>Sélectionné : {DAYS_FR[recurDay]}</Text>

      {/* Heure */}
      <Text style={[s.label, { marginTop: 16 }]}>Heure (Haïti UTC-5) <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={recurTime} onChangeText={setRecurTime}
        placeholder="HH:MM — ex: 20:00" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" />

      {/* Alerte */}
      <Text style={[s.label, { marginTop: 14 }]}>⚠️ Bandeau d'alerte (minutes avant)</Text>
      <TextInput style={s.input} value={alertMin} onChangeText={setAlertMin}
        placeholder="Ex: 60 (= 1 heure avant)" placeholderTextColor={C.muted} keyboardType="number-pad" />

      <Pressable style={[s.createBtn, { backgroundColor: C.blue }, submitting && { opacity: 0.5 }]}
        onPress={handleCreate} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFF" size="small" />
          : <><Ionicons name="calendar" size={16} color="#FFF" /><Text style={[s.createBtnTxt, { color:"#FFF" }]}>Programmer le broadcast</Text></>}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FORMULAIRE QUOTIDIEN
// ─────────────────────────────────────────────────────────────
function FormQuotidien({ onCreated }: { onCreated: () => void }) {
  const [title,      setTitle]      = useState("Montée du drapeau RHAZN");
  const [message,    setMessage]    = useState("Chaque jour, RHAZN honore ses valeurs. Ensemble, construisons l'avenir.");
  const [signedBy,   setSignedBy]   = useState("");
  const [signedRole, setSignedRole] = useState<SignedRole>("SUPREME");
  const [dailyTime,  setDailyTime]  = useState("08:00");
  const [alertMin,   setAlertMin]   = useState("15");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // 7 vidéos — une par jour
  const [dayVideos, setDayVideos] = useState<Record<number, { uri: string; name: string; type: string } | null>>({});
  const [broadcastId, setBroadcastId] = useState<string | null>(null); // après création

  const pickDayVideo = async (dow: number) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8, videoMaxDuration: 600 });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      const ext = (a.uri.split(".").pop() ?? "mp4").toLowerCase();
      setDayVideos((prev) => ({ ...prev, [dow]: { uri: a.uri, name: `daily_${dow}_${Date.now()}.${ext}`, type: `video/${ext}` } }));
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (!title.trim())    { setError("Titre requis.");     return; }
    if (!message.trim())  { setError("Message requis.");   return; }
    if (!signedBy.trim()) { setError("Signataire requis."); return; }
    if (!dailyTime.match(/^\d{2}:\d{2}$/)) { setError("Heure invalide (HH:MM)."); return; }

    setSubmitting(true);
    try {
      // 1. Créer le broadcast
      const { data: bc, error: e } = await supabase.from("app_broadcasts").insert({
        broadcast_type: "quotidien", title: title.trim(), message: message.trim(),
        media_type: "video", media_url: null,
        signed_by: signedBy.trim(), signed_role: signedRole,
        daily_time: `${dailyTime}:00`,
        daily_alert_min: parseInt(alertMin) || 15,
        is_active: false, is_dismissed: false,
      }).select("id").single();

      if (e || !bc?.id) { setError(e?.message ?? "Erreur création."); setSubmitting(false); return; }
      const bcId = bc.id;
      setBroadcastId(bcId);

      // 2. Uploader les vidéos disponibles
      for (const [dowStr, file] of Object.entries(dayVideos)) {
        if (!file) continue;
        const dow = parseInt(dowStr);
        const url = await uploadFile(file.uri, file.name, file.type, BUCKET_DAILY);
        if (!url) continue;
        await supabase.from("app_daily_videos").upsert({
          broadcast_id: bcId, day_of_week: dow, video_url: url,
          title: `${DAYS_FR[dow]} — ${title.trim()}`,
        }, { onConflict: "broadcast_id,day_of_week" });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCreated();
    } catch { setError("Erreur inattendue."); }
    setSubmitting(false);
  };

  return (
    <View style={s.card}>
      {error && <View style={s.errorBanner}><Ionicons name="alert-circle" size={16} color={C.red} /><Text style={s.errorTxt}>{error}</Text></View>}

      <View style={[s.typeInfoBox, { borderColor: C.greenBorder, backgroundColor: C.greenLight }]}>
        <Ionicons name="flag" size={14} color={C.green} />
        <Text style={[s.typeInfoTxt, { color: C.green }]}>Se déclenche chaque matin — vidéo différente selon le jour</Text>
      </View>

      <CommonFields title={title} setTitle={setTitle} message={message} setMessage={setMessage}
        signedBy={signedBy} setSignedBy={setSignedBy} signedRole={signedRole} setSignedRole={setSignedRole} />

      {/* Heure */}
      <Text style={[s.label, { marginTop: 18 }]}>Heure quotidienne (Haïti UTC-5) <Text style={s.req}>*</Text></Text>
      <TextInput style={s.input} value={dailyTime} onChangeText={setDailyTime}
        placeholder="HH:MM — ex: 08:00" placeholderTextColor={C.muted} keyboardType="numbers-and-punctuation" />

      <Text style={[s.label, { marginTop: 14 }]}>⚠️ Bandeau d'alerte (minutes avant)</Text>
      <TextInput style={s.input} value={alertMin} onChangeText={setAlertMin}
        placeholder="Ex: 15" placeholderTextColor={C.muted} keyboardType="number-pad" />

      {/* 7 vidéos */}
      <Text style={[s.label, { marginTop: 20 }]}>Vidéos par jour</Text>
      <Text style={s.dateHint}>Assignez une vidéo à chaque jour de la semaine (optionnel à la création)</Text>

      {[0,1,2,3,4,5,6].map((dow) => {
        const file = dayVideos[dow];
        return (
          <View key={dow} style={s.dayVideoRow}>
            <View style={[s.dayVideoLabel, { backgroundColor: dow === 5 ? C.blueLight : C.surface, borderColor: dow === 5 ? C.blueBorder : C.border }]}>
              <Text style={[s.dayVideoLabelTxt, { color: dow === 5 ? C.blue : C.sub }]}>{DAYS_SHORT[dow]}</Text>
            </View>
            {file ? (
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={s.dayVideoName} numberOfLines={1}>{file.name}</Text>
                <Pressable onPress={() => setDayVideos((p) => ({ ...p, [dow]: null }))}>
                  <Ionicons name="close-circle" size={18} color={C.red} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.dayVideoPicker} onPress={() => pickDayVideo(dow)}>
                <Ionicons name="videocam-outline" size={16} color={C.green} />
                <Text style={[s.dayVideoPickerTxt]}>Choisir</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      <Pressable style={[s.createBtn, { backgroundColor: C.green }, submitting && { opacity: 0.5 }]}
        onPress={handleCreate} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFF" size="small" />
          : <><Ionicons name="flag" size={16} color="#FFF" /><Text style={[s.createBtnTxt, { color:"#FFF" }]}>Créer le broadcast quotidien</Text></>}
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION LISTE + ACTIONS
// ─────────────────────────────────────────────────────────────
function BroadcastList({ refresh }: { refresh: number }) {
  const [items,      setItems]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const roleColors: Record<string, string> = { CVSO: C.blue, CTO: C.green, SUPREME: C.gold };
  const typeColor:  Record<string, string> = { ponctuel: C.gold, hebdomadaire: C.blue, quotidien: C.green };
  const typeLabel:  Record<string, string> = { ponctuel: "KEYNOTE", hebdomadaire: "HEBDO", quotidien: "QUOTIDIEN" };
  const typeIcon:   Record<string, any>    = { ponctuel: "radio", hebdomadaire: "calendar", quotidien: "flag" };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_broadcasts").select("*").order("created_at", { ascending: false }).limit(30);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const toggleActive = async (b: any) => {
    if (!b.is_active) await supabase.from("app_broadcasts").update({ is_active: false }).neq("id", b.id);
    await supabase.from("app_broadcasts").update({ is_active: !b.is_active, is_dismissed: false }).eq("id", b.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    load();
  };

  const dismiss = async (id: string) => {
    await supabase.from("app_broadcasts").update({ is_dismissed: true, is_active: false }).eq("id", id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    load();
  };

  const del = (b: any) => Alert.alert("Supprimer ?", `"${b.title}" sera supprimé.`, [
    { text: "Annuler", style: "cancel" },
    { text: "Supprimer", style: "destructive", onPress: async () => {
        setDeletingId(b.id);
        await supabase.from("app_broadcasts").delete().eq("id", b.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        load();
        setDeletingId(null);
      }},
  ]);

  return (
    <View style={s.card}>
      <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
        <Text style={s.sectionTitleTxt}>Tous les broadcasts ({items.length})</Text>
        <Pressable onPress={load} style={{ padding: 6 }}><Ionicons name="refresh" size={16} color={C.gold} /></Pressable>
      </View>

      {loading ? <ActivityIndicator color={C.gold} style={{ marginVertical: 20 }} />
      : items.length === 0 ? <Text style={s.emptyTxt}>Aucun broadcast créé.</Text>
      : items.map((b) => (
        <View key={b.id} style={s.bcItem}>
          <View style={s.bcTop}>
            {/* Type badge */}
            <View style={[s.typeBadge, { borderColor: typeColor[b.broadcast_type] ?? C.gold, backgroundColor: `${typeColor[b.broadcast_type]}15` }]}>
              <Ionicons name={typeIcon[b.broadcast_type] ?? "radio"} size={10} color={typeColor[b.broadcast_type] ?? C.gold} />
              <Text style={[s.typeBadgeTxt, { color: typeColor[b.broadcast_type] ?? C.gold }]}>
                {typeLabel[b.broadcast_type] ?? "?"}
              </Text>
            </View>
            {/* Statut */}
            <View style={[s.statusPill, b.is_dismissed ? s.pillDismissed : b.is_active ? s.pillActive : s.pillInactive]}>
              <View style={[s.statusDot, { backgroundColor: b.is_dismissed ? C.muted : b.is_active ? C.green : "rgba(255,255,255,0.3)" }]} />
              <Text style={[s.statusTxt, { color: b.is_dismissed ? C.muted : b.is_active ? C.green : C.sub }]}>
                {b.is_dismissed ? "FERMÉ" : b.is_active ? "ACTIF" : "INACTIF"}
              </Text>
            </View>
            {/* Rôle signataire */}
            <View style={[s.rolePill, { borderColor: roleColors[b.signed_role] ?? C.gold }]}>
              <Text style={[s.rolePillTxt, { color: roleColors[b.signed_role] ?? C.gold }]}>{b.signed_role}</Text>
            </View>
          </View>

          <Text style={s.bcTitle} numberOfLines={1}>{b.title}</Text>
          <Text style={s.bcSigned}>Signé : {b.signed_by}</Text>

          {/* Infos récurrence */}
          {b.broadcast_type === "ponctuel" && b.scheduled_at && (
            <Text style={s.bcSub}>🔴 {fmtDT(b.scheduled_at)}</Text>
          )}
          {b.broadcast_type === "hebdomadaire" && (
            <Text style={s.bcSub}>🔄 Chaque {DAYS_FR[b.recur_day]} à {(b.recur_time ?? "").substring(0,5)} (Haïti)</Text>
          )}
          {b.broadcast_type === "quotidien" && (
            <Text style={s.bcSub}>☀️ Chaque jour à {(b.daily_time ?? "").substring(0,5)} (Haïti)</Text>
          )}

          {/* Actions */}
          <View style={s.bcActions}>
            {!b.is_dismissed && (
              <Pressable style={[s.actionBtn, b.is_active ? s.actionBtnRed : s.actionBtnGreen]} onPress={() => toggleActive(b)}>
                <Ionicons name={b.is_active ? "pause-circle" : "play-circle"} size={14} color={b.is_active ? C.red : C.green} />
                <Text style={[s.actionBtnTxt, { color: b.is_active ? C.red : C.green }]}>{b.is_active ? "Désactiver" : "Activer"}</Text>
              </Pressable>
            )}
            {b.is_active && !b.is_dismissed && (
              <Pressable style={[s.actionBtn, s.actionBtnOrange]} onPress={() => dismiss(b.id)}>
                <Ionicons name="close-circle" size={14} color={C.gold} />
                <Text style={[s.actionBtnTxt, { color: C.gold }]}>Fermer overlay</Text>
              </Pressable>
            )}
            <Pressable style={[s.actionBtn, s.actionBtnGray]} onPress={() => del(b)} disabled={deletingId === b.id}>
              {deletingId === b.id ? <ActivityIndicator size="small" color={C.muted} /> : <><Ionicons name="trash-outline" size={14} color={C.muted} /><Text style={[s.actionBtnTxt, { color: C.muted }]}>Supprimer</Text></>}
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PublishBroadcast() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab,  setActiveTab]  = useState<BroadcastType>("ponctuel");
  const [listRefresh, setListRefresh] = useState(0);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthorized(session?.user?.email === SUPREME_EMAIL);
    });
  }, []);

  const handleCreated = () => {
    setSuccessMsg("✅ Broadcast créé avec succès !");
    setListRefresh((n) => n + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  if (authorized === null) return <View style={s.screen}><ActivityIndicator color={C.gold} size="large" /></View>;

  if (!authorized) {
    return (
      <View style={s.screen}>
        <View style={s.centered}>
          <View style={s.lockIcon}><Ionicons name="lock-closed" size={32} color={C.gold} /></View>
          <Text style={s.lockTitle}>Accès refusé</Text>
          <Text style={s.lockSub}>Page réservée à l'administrateur Supreme.</Text>
          <Pressable style={s.lockBack} onPress={() => router.back()}>
            <Text style={s.lockBackTxt}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>

      {/* ══ HEADER ══ */}
      <View style={s.header}>
        <Pressable style={s.headerBack} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
          <Text style={s.headerBackTxt}>Retour</Text>
        </Pressable>
        <Text style={s.headerTitle}>Broadcast</Text>
        <View style={s.supremePill}>
          <Ionicons name="radio" size={10} color={C.gold} />
          <Text style={s.supremeTxt}>SUPREME</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {successMsg && (
          <View style={s.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={C.green} />
            <Text style={s.successTxt}>{successMsg}</Text>
          </View>
        )}

        {/* ══ 3 ONGLETS ══ */}
        <View style={s.tabs}>
          {([
            { key: "ponctuel",     label: "KEYNOTE",  icon: "radio",    color: C.gold  },
            { key: "hebdomadaire", label: "HEBDO",    icon: "calendar", color: C.blue  },
            { key: "quotidien",    label: "QUOTIDIEN",icon: "flag",     color: C.green },
          ] as const).map((t) => (
            <Pressable key={t.key}
              style={[s.tab, activeTab === t.key && { borderColor: t.color, backgroundColor: `${t.color}12` }]}
              onPress={() => setActiveTab(t.key)}>
              <Ionicons name={t.icon} size={16} color={activeTab === t.key ? t.color : C.muted} />
              <Text style={[s.tabTxt, activeTab === t.key && { color: t.color }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Description de l'onglet actif */}
        <Text style={s.tabDesc}>
          {activeTab === "ponctuel"     && "Événement unique à une date précise. Supreme active manuellement."}
          {activeTab === "hebdomadaire" && "Se répète chaque semaine le même jour. Activer une fois pour toujours."}
          {activeTab === "quotidien"    && "Se déclenche chaque matin à 8h00. Chaque jour a sa propre vidéo."}
        </Text>

        {/* ══ FORMULAIRE ACTIF ══ */}
        <View style={s.sectionTitleRow}>
          <Ionicons name="add-circle" size={15} color={C.gold} />
          <Text style={s.sectionTitleTxt}>Nouveau broadcast</Text>
        </View>

        {activeTab === "ponctuel"     && <FormPonctuel     onCreated={handleCreated} />}
        {activeTab === "hebdomadaire" && <FormHebdomadaire onCreated={handleCreated} />}
        {activeTab === "quotidien"    && <FormQuotidien    onCreated={handleCreated} />}

        {/* ══ LISTE TOUS LES BROADCASTS ══ */}
        <View style={[s.sectionTitleRow, { marginTop: 8 }]}>
          <Ionicons name="list" size={15} color={C.gold} />
          <Text style={s.sectionTitleTxt}>Gestion</Text>
        </View>
        <BroadcastList refresh={listRefresh} />

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },
  centered:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  scrollContent:{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40 },

  header:       { flexDirection: "row", alignItems: "center", paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBack:   { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  headerBackTxt:{ color: C.text, fontWeight: "700", fontSize: 15 },
  headerTitle:  { color: C.text, fontWeight: "900", fontSize: 17 },
  supremePill:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, backgroundColor: C.goldLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.goldBorder, maxWidth: 95 },
  supremeTxt:   { color: C.gold, fontWeight: "900", fontSize: 10 },

  successBanner:{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenLight, borderRadius: 12, borderWidth: 1, borderColor: C.greenBorder, padding: 14, marginBottom: 16 },
  successTxt:   { color: C.green, fontWeight: "700", fontSize: 13, flex: 1 },
  errorBanner:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.redLight, borderRadius: 10, borderWidth: 1, borderColor: C.redBorder, padding: 12, marginBottom: 14 },
  errorTxt:     { color: C.red, fontWeight: "700", fontSize: 12, flex: 1 },

  // Onglets
  tabs:    { flexDirection: "row", gap: 8, marginBottom: 10 },
  tab:     { flex: 1, alignItems: "center", gap: 5, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  tabTxt:  { color: C.muted, fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  tabDesc: { color: C.sub, fontWeight: "600", fontSize: 12, lineHeight: 17, marginBottom: 16, paddingHorizontal: 2 },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitleTxt: { color: C.text, fontWeight: "900", fontSize: 14 },

  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20 },

  typeInfoBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.goldLight, borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: C.goldBorder },
  typeInfoTxt: { color: C.gold, fontWeight: "700", fontSize: 12, flex: 1 },

  label:    { color: C.text, fontWeight: "800", fontSize: 13, marginBottom: 7 },
  req:      { color: C.gold },
  counter:  { color: C.muted, fontSize: 11, fontWeight: "600", textAlign: "right", marginTop: 3 },
  input:    { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.border, color: C.text, fontWeight: "600", fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  inputMulti:{ minHeight: 100, paddingTop: 12 },
  dateHint: { color: C.muted, fontSize: 10, fontWeight: "600", marginTop: 3 },

  typeRow:         { flexDirection: "row", gap: 8 },
  typeBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
  typeBtnTxt:      { color: C.sub, fontWeight: "800", fontSize: 11 },

  mediaPicker:   { backgroundColor: C.input, borderRadius: 12, borderWidth: 1, borderColor: C.goldBorder, height: 90, alignItems: "center", justifyContent: "center", gap: 6 },
  mediaPickerTxt:{ color: C.gold, fontWeight: "800", fontSize: 13 },

  roleRow:     { flexDirection: "row", gap: 8 },
  roleBtn:     { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  roleBtnTxt:  { color: C.sub, fontWeight: "900", fontSize: 11, letterSpacing: 0.5 },

  // Jours semaine
  dayRow:    { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayBtn:    { flex: 1, minWidth: 40, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  dayBtnTxt: { color: C.sub, fontWeight: "900", fontSize: 10 },

  // Vidéos quotidiennes
  dayVideoRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  dayVideoLabel:    { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dayVideoLabelTxt: { fontWeight: "900", fontSize: 10 },
  dayVideoPicker:   { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, borderColor: C.greenBorder, backgroundColor: C.greenLight, paddingHorizontal: 12, paddingVertical: 9 },
  dayVideoPickerTxt:{ color: C.green, fontWeight: "800", fontSize: 12 },
  dayVideoName:     { flex: 1, color: C.sub, fontWeight: "600", fontSize: 11 },

  createBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 20 },
  createBtnTxt: { fontWeight: "900", fontSize: 14, color: "#000" },

  // Liste
  emptyTxt:   { color: C.muted, fontWeight: "600", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  bcItem:     { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  bcTop:      { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" },
  typeBadge:  { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeTxt:{ fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  pillActive:    { backgroundColor: C.greenLight, borderColor: C.greenBorder },
  pillInactive:  { backgroundColor: C.surface,    borderColor: C.border },
  pillDismissed: { backgroundColor: C.surface,    borderColor: C.border },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusTxt:  { fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  rolePill:   { borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  rolePillTxt:{ fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  bcTitle:    { color: C.text,  fontWeight: "800", fontSize: 14, marginBottom: 3 },
  bcSub:      { color: C.sub,   fontWeight: "600", fontSize: 11, marginBottom: 2 },
  bcSigned:   { color: C.muted, fontWeight: "600", fontSize: 11, marginBottom: 8 },
  bcActions:  { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1 },
  actionBtnGreen: { backgroundColor: C.greenLight, borderColor: C.greenBorder },
  actionBtnRed:   { backgroundColor: C.redLight,   borderColor: C.redBorder },
  actionBtnOrange:{ backgroundColor: C.goldLight,  borderColor: C.goldBorder },
  actionBtnGray:  { backgroundColor: C.surface,    borderColor: C.border },
  actionBtnTxt:   { fontWeight: "800", fontSize: 11 },

  lockIcon:   { width: 72, height: 72, borderRadius: 22, backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  lockTitle:  { color: C.text, fontWeight: "900", fontSize: 20 },
  lockSub:    { color: C.sub, fontWeight: "600", fontSize: 14, textAlign: "center", lineHeight: 20 },
  lockBack:   { backgroundColor: C.gold, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  lockBackTxt:{ color: "#000", fontWeight: "900", fontSize: 14 },
});