// app/admin/upload-music.tsx
// ✅ RHAZN SUPREME — Upload pistes musicales pour le catalogue Suspentz
// ✅ Sélection multiple (max 10 d'un coup)
// ✅ Durée max par piste : 10min 10sec (610s)
// ✅ Taille max par fichier : 10 MB
// ✅ Bucket : muisc (nom réel dans Supabase)

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

const SUPREME_EMAIL  = "meyounbauniklovegodstory@gmail.com";
const MAX_TRACKS     = 10;
const MAX_DURATION_S = 610;   // 10 min 10 sec
const MAX_FILE_MB    = 10;    // 10 Mo max
const BUCKET_NAME = "muisc"; // ⚠️ nom réel du bucket Supabase

const C = {
  bg:      "#000000",
  card:    "#0E0E0E",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.28)",
  white:   "#FFFFFF",
  gray:    "#9A9A9A",
  muted:   "rgba(255,255,255,0.55)",
  border:  "rgba(255,255,255,0.12)",
  hairline:"rgba(255,255,255,0.07)",
  danger:  "#FF453A",
  ok:      "#34C759",
  blue:    "#007AFF",
  orange:  "#FF9F0A",
};

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

type Track = {
  id:           string;
  title:        string;
  artist:       string;
  duration_sec: number;
  file_path:    string;
  file_url:     string;
  genre:        string | null;
  is_active:    boolean;
  created_at:   string;
};

type PendingFile = {
  uri:      string;
  name:     string;
  dur:      number;
  sizeMb:   number;
  status:   "pending" | "uploading" | "done" | "error" | "skipped";
  errorMsg?: string;
};

export default function UploadMusic() {
  const router = useRouter();

  const [authorized,  setAuthorized]  = useState<boolean | null>(null);
  const [tracks,      setTracks]      = useState<Track[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [pending,     setPending]     = useState<PendingFile[]>([]);

  const soundRef  = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // ── Guard Supreme ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user || data.user.email?.toLowerCase() !== SUPREME_EMAIL) {
        router.replace("/banq/suspentz" as any);
        return;
      }
      setAuthorized(true);
    })();
  }, []);

  // ── Charger les tracks ───────────────────────────────────
  const loadTracks = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const { data } = await supabase
      .from("music_tracks")
      .select("*")
      .order("created_at", { ascending: false });
    setTracks((data ?? []) as Track[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { if (authorized) loadTracks(); }, [authorized]);

  // ── Sélection multiple ───────────────────────────────────
  const pickFiles = async () => {
    const slots = MAX_TRACKS - tracks.length;
    if (slots <= 0) {
      Alert.alert("Catalogue plein", `Supprimez une piste pour en ajouter une nouvelle.`);
      return;
    }

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
        multiple: true,          // ✅ sélection multiple
      });
      if (res.canceled || !res.assets?.length) return;

      const selected = res.assets.slice(0, slots); // jamais plus que les slots dispo
      const newPending: PendingFile[] = [];

      for (const asset of selected) {
        const uri  = asset.uri;
        const name = asset.name ?? uri.split("/").pop() ?? "track";

        // Taille
        let sizeMb = 0;
        try {
          const info = await FileSystem.getInfoAsync(uri, { size: true });
          sizeMb = ((info as any).size ?? 0) / (1024 * 1024);
        } catch {}

        // Durée
        let dur = 0;
        try {
          const { sound, status } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
          dur = Math.round(((status as any)?.durationMillis ?? 0) / 1000);
          await sound.unloadAsync();
        } catch {}

        // Validation
        let status: PendingFile["status"] = "pending";
        let errorMsg: string | undefined;

        if (sizeMb > MAX_FILE_MB) {
          status   = "skipped";
          errorMsg = `Trop lourd (${sizeMb.toFixed(1)} Mo > ${MAX_FILE_MB} Mo)`;
        } else if (dur > MAX_DURATION_S) {
          status   = "skipped";
          errorMsg = `Trop long (${fmtTime(dur)} > ${fmtTime(MAX_DURATION_S)})`;
        }

        newPending.push({ uri, name, dur, sizeMb, status, errorMsg });
      }

      setPending(newPending);
      Haptics.selectionAsync().catch(() => {});
    } catch {
      Alert.alert("Erreur", "Impossible d'accéder aux fichiers audio.");
    }
  };

  // ── Upload tous les fichiers pending ─────────────────────
  const uploadAll = async () => {
    const toUpload = pending.filter(f => f.status === "pending");
    if (!toUpload.length) {
      Alert.alert("Aucun fichier", "Aucun fichier valide à uploader.");
      return;
    }

    setUploading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user    = auth?.user;
    const session = (await supabase.auth.getSession()).data.session;
    if (!user || !session?.access_token) { setUploading(false); return; }

    let doneCount  = 0;
    let errorCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const file = pending[i];
      if (file.status !== "pending") continue;

      // Statut → uploading
      setPending(prev => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f));

      try {
        const ext  = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
        const path = `${user.id}/${Date.now()}_${i}.${ext}`;

        const uploadRes = await FileSystem.uploadAsync(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${path}`,
          file.uri,
          {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              "Content-Type": `audio/${ext === "mp3" ? "mpeg" : ext}`,
              Authorization:  `Bearer ${session.access_token}`,
              apikey:          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            },
          }
        );

        if (![200, 201].includes(uploadRes.status)) {
          throw new Error(`HTTP ${uploadRes.status}`);
        }

        const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        if (!pub?.publicUrl) throw new Error("URL publique introuvable");

        // Titre = nom du fichier sans extension
        const titleClean = file.name.replace(/\.[^.]+$/, "").trim() || "Piste RHAZN";

        const { error: dbErr } = await supabase.from("music_tracks").insert({
          title:        titleClean,
          artist:       "RHAZN",
          duration_sec: file.dur,
          file_path:    path,
          file_url:     pub.publicUrl,
          genre:        null,
          uploaded_by:  user.id,
        });
        if (dbErr) throw dbErr;

        setPending(prev => prev.map((f, idx) => idx === i ? { ...f, status: "done" } : f));
        doneCount++;
      } catch (e: any) {
        const msg = e?.message ?? "Erreur inconnue";
        setPending(prev => prev.map((f, idx) => idx === i ? { ...f, status: "error", errorMsg: msg } : f));
        errorCount++;
      }
    }

    setUploading(false);
    await loadTracks(true);
    Haptics.notificationAsync(
      errorCount === 0
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});

    Alert.alert(
      errorCount === 0 ? "✅ Upload terminé" : "Upload partiel",
      `${doneCount} piste${doneCount > 1 ? "s" : ""} ajoutée${doneCount > 1 ? "s" : ""} au catalogue.` +
      (errorCount > 0 ? `\n${errorCount} échec${errorCount > 1 ? "s" : ""}.` : "")
    );

    // Nettoyer les fichiers done
    setPending(prev => prev.filter(f => f.status !== "done"));
  };

  // ── Preview ──────────────────────────────────────────────
  const togglePreview = async (track: Track) => {
    try {
      if (playingId === track.id) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: track.file_url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(track.id);
      setTimeout(async () => {
        try { await sound.stopAsync(); await sound.unloadAsync(); } catch {}
        setPlayingId(null);
        soundRef.current = null;
      }, 30000);
    } catch {
      Alert.alert("Erreur", "Impossible de lire cette piste.");
    }
  };

  const toggleActive = async (track: Track) => {
    await supabase.from("music_tracks").update({ is_active: !track.is_active }).eq("id", track.id);
    await loadTracks(true);
  };

  const deleteTrack = (track: Track) => {
    Alert.alert(
      "Supprimer cette piste ?",
      `"${track.title}" sera retiré du catalogue.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer", style: "destructive",
          onPress: async () => {
            await supabase.storage.from(BUCKET_NAME).remove([track.file_path ?? ""]).catch(() => {});
            await supabase.from("music_tracks").delete().eq("id", track.id);
            await loadTracks(true);
          },
        },
      ]
    );
  };

  if (!authorized) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }

  const limitReached   = tracks.length >= MAX_TRACKS;
  const slots          = MAX_TRACKS - tracks.length;
  const pendingValid   = pending.filter(f => f.status === "pending").length;
  const pendingSkipped = pending.filter(f => f.status === "skipped").length;

  return (
    <SafeAreaView style={s.screen}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.white} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Catalogue Musique</Text>
          <Text style={s.headerSub}>{tracks.length}/{MAX_TRACKS} pistes • SUPREME</Text>
        </View>
        <View style={s.supremeBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#000" />
          <Text style={s.supremeTxt}>SUPREME</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Carte Upload ── */}
        <View style={s.uploadCard}>
          <View style={s.uploadCardHeader}>
            <View style={s.uploadIconWrap}>
              <Ionicons name="cloud-upload" size={18} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.uploadCardTitle}>Ajouter des pistes</Text>
              <Text style={s.uploadCardSub}>
                Max {MAX_FILE_MB} Mo · Max {fmtTime(MAX_DURATION_S)} par piste
              </Text>
            </View>
            <View style={[s.counterPill, limitReached && s.counterPillFull]}>
              <Text style={[s.counterTxt, limitReached && { color: C.danger }]}>
                {tracks.length}/{MAX_TRACKS}
              </Text>
            </View>
          </View>

          {/* Barre progression catalogue */}
          <View style={s.progressBg}>
            <View style={[
              s.progressFill,
              { width: `${(tracks.length / MAX_TRACKS) * 100}%` as any },
              limitReached && { backgroundColor: C.danger },
            ]} />
          </View>

          {/* Info compression */}
          <View style={s.compressionTip}>
            <Ionicons name="information-circle-outline" size={13} color={C.blue} />
            <Text style={s.compressionTxt}>
              Pour alléger vos fichiers, utilisez{" "}
              <Text style={{ fontWeight: "900" }}>MP3 128 kbps</Text> avant d'importer.
              7 Mo → ~2 Mo avec une compression en ligne (ex: mp3smaller.com).
            </Text>
          </View>

          {!limitReached ? (
            <>
              {/* Bouton sélectionner */}
              <Pressable onPress={pickFiles} style={s.pickBtn}>
                <Ionicons name="musical-notes" size={20} color={C.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={s.pickBtnTxt}>Sélectionner jusqu'à {slots} piste{slots > 1 ? "s" : ""}</Text>
                  <Text style={s.pickBtnSub}>MP3, AAC, WAV, OGG…</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.gray} />
              </Pressable>

              {/* Liste fichiers sélectionnés */}
              {pending.length > 0 && (
                <View style={s.pendingList}>
                  <Text style={s.pendingTitle}>
                    {pendingValid} fichier{pendingValid > 1 ? "s" : ""} prêt{pendingValid > 1 ? "s" : ""}
                    {pendingSkipped > 0 ? ` · ${pendingSkipped} ignoré${pendingSkipped > 1 ? "s" : ""}` : ""}
                  </Text>

                  {pending.map((file, i) => {
                    const iconName =
                      file.status === "done"      ? "checkmark-circle" :
                      file.status === "error"     ? "close-circle"     :
                      file.status === "skipped"   ? "ban-outline"      :
                      file.status === "uploading" ? "sync-outline"     :
                      "musical-note";
                    const iconColor =
                      file.status === "done"      ? C.ok     :
                      file.status === "error"     ? C.danger :
                      file.status === "skipped"   ? C.orange :
                      file.status === "uploading" ? C.blue   :
                      C.gold;

                    return (
                      <View key={i} style={[
                        s.pendingItem,
                        file.status === "skipped" && { opacity: 0.55 },
                        file.status === "error"   && { borderColor: "rgba(255,69,58,0.30)" },
                        file.status === "done"    && { borderColor: "rgba(52,199,89,0.30)" },
                      ]}>
                        <Ionicons name={iconName as any} size={16} color={iconColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.pendingName} numberOfLines={1}>{file.name}</Text>
                          <Text style={s.pendingMeta}>
                            {fmtTime(file.dur)} · {file.sizeMb.toFixed(1)} Mo
                            {file.errorMsg ? ` · ⚠️ ${file.errorMsg}` : ""}
                          </Text>
                        </View>
                        {file.status === "pending" && (
                          <Pressable onPress={() => setPending(prev => prev.filter((_, idx) => idx !== i))}>
                            <Ionicons name="close" size={16} color={C.gray} />
                          </Pressable>
                        )}
                      </View>
                    );
                  })}

                  {/* Bouton upload */}
                  {pendingValid > 0 && (
                    <Pressable
                      onPress={uploadAll}
                      disabled={uploading}
                      style={[s.uploadAllBtn, uploading && { opacity: 0.6 }]}
                    >
                      {uploading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <ActivityIndicator color="#000" size="small" />
                          <Text style={s.uploadAllTxt}>Upload en cours…</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="cloud-upload" size={18} color="#000" />
                          <Text style={s.uploadAllTxt}>
                            Uploader {pendingValid} piste{pendingValid > 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={s.limitBanner}>
              <Ionicons name="ban-outline" size={16} color={C.danger} />
              <Text style={s.limitBannerTxt}>
                Catalogue plein ({MAX_TRACKS}/{MAX_TRACKS}). Supprimez une piste pour en ajouter.
              </Text>
            </View>
          )}
        </View>

        {/* ── Catalogue ── */}
        <View style={s.catalogHeader}>
          <Text style={s.catalogTitle}>CATALOGUE ({tracks.length}/{MAX_TRACKS})</Text>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 30, gap: 12 }}>
            <ActivityIndicator color={C.gold} />
            <Text style={{ color: C.gray, fontWeight: "700" }}>Chargement…</Text>
          </View>
        ) : tracks.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 30, gap: 10 }}>
            <Ionicons name="musical-notes-outline" size={40} color={C.gray} />
            <Text style={{ color: C.gray, fontWeight: "700" }}>Aucune piste dans le catalogue</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>Sélectionnez des fichiers audio ci-dessus</Text>
          </View>
        ) : (
          tracks.map((item, index) => (
            <View key={item.id} style={[s.trackCard, !item.is_active && s.trackCardInactive]}>
              <View style={s.trackNum}>
                <Text style={s.trackNumTxt}>{index + 1}</Text>
              </View>
              <View style={s.trackLeft}>
                <Pressable onPress={() => togglePreview(item)} style={[s.playBtn, playingId === item.id && s.playBtnActive]}>
                  <Ionicons name={playingId === item.id ? "pause" : "play"} size={16} color={playingId === item.id ? "#000" : C.gold} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={s.trackTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.trackMeta}>
                    {item.artist} · {fmtTime(item.duration_sec)}{item.genre ? ` · ${item.genre}` : ""}
                  </Text>
                </View>
              </View>
              <View style={s.trackActions}>
                <Pressable
                  onPress={() => toggleActive(item)}
                  style={[s.actionBtn, { backgroundColor: item.is_active ? "rgba(52,199,89,0.15)" : "rgba(255,255,255,0.05)" }]}
                >
                  <Ionicons name={item.is_active ? "eye" : "eye-off"} size={14} color={item.is_active ? C.ok : C.gray} />
                </Pressable>
                <Pressable onPress={() => deleteTrack(item)} style={[s.actionBtn, { backgroundColor: "rgba(255,69,58,0.10)" }]}>
                  <Ionicons name="trash-outline" size={14} color={C.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.hairline },
  backBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  headerTitle:{ color: C.white, fontWeight: "900", fontSize: 18 },
  headerSub:  { color: C.gray,  fontWeight: "600", fontSize: 11, marginTop: 2 },
  supremeBadge:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  supremeTxt: { color: "#000", fontWeight: "900", fontSize: 11 },

  uploadCard:       { margin: 16, backgroundColor: C.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  uploadCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  uploadIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" },
  uploadCardTitle:  { color: C.white, fontWeight: "900", fontSize: 15 },
  uploadCardSub:    { color: C.gray,  fontWeight: "600", fontSize: 11, marginTop: 2 },

  counterPill:    { backgroundColor: C.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.goldBd },
  counterPillFull:{ backgroundColor: "rgba(255,69,58,0.12)", borderColor: "rgba(255,69,58,0.40)" },
  counterTxt:     { color: C.gold, fontWeight: "900", fontSize: 12 },

  progressBg:   { height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99 },
  progressFill: { height: 4, backgroundColor: C.gold, borderRadius: 99 },

  compressionTip: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(0,122,255,0.08)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(0,122,255,0.20)" },
  compressionTxt: { color: "rgba(0,122,255,0.85)", fontSize: 11, fontWeight: "600", flex: 1, lineHeight: 16 },

  pickBtn:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.goldDim, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.goldBd },
  pickBtnTxt: { color: C.gold, fontWeight: "800", fontSize: 13 },
  pickBtnSub: { color: C.gray, fontWeight: "600", fontSize: 11, marginTop: 2 },

  pendingList:  { gap: 8 },
  pendingTitle: { color: C.gray, fontWeight: "800", fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  pendingItem:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.hairline },
  pendingName:  { color: C.white, fontWeight: "700", fontSize: 12 },
  pendingMeta:  { color: C.gray,  fontWeight: "600", fontSize: 10, marginTop: 2 },

  uploadAllBtn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  uploadAllTxt: { color: "#000", fontWeight: "900", fontSize: 15 },

  limitBanner:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,69,58,0.10)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,69,58,0.30)" },
  limitBannerTxt: { color: C.danger, fontWeight: "700", fontSize: 13, flex: 1, lineHeight: 18 },

  catalogHeader: { paddingHorizontal: 18, marginBottom: 8, marginTop: 4 },
  catalogTitle:  { color: C.gray, fontWeight: "800", fontSize: 11, letterSpacing: 1 },

  trackCard:         { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border, gap: 10 },
  trackCardInactive: { opacity: 0.45 },
  trackNum:          { width: 20, alignItems: "center" },
  trackNumTxt:       { color: C.gray, fontWeight: "800", fontSize: 12 },
  trackLeft:         { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  playBtn:           { width: 38, height: 38, borderRadius: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, alignItems: "center", justifyContent: "center" },
  playBtnActive:     { backgroundColor: C.gold, borderColor: C.gold },
  trackTitle:        { color: C.white, fontWeight: "800", fontSize: 13 },
  trackMeta:         { color: C.gray,  fontWeight: "600", fontSize: 11, marginTop: 2 },
  trackActions:      { flexDirection: "row", gap: 8 },
  actionBtn:         { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
});