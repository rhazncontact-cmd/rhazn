/**
 * components/VideoRhazn.tsx
 * ✅ Cache hors ligne automatique (50 dernières vidéos)
 * ✅ Preview 4 secondes au tap avant ouverture fullscreen
 * ✅ Thumbnail auto depuis première frame
 * ✅ Badge "Hors ligne" sur vidéos cachées
 * ✅ Barre de progression téléchargement
 */

import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const { width: SW } = Dimensions.get("window");
const MAX_CACHED    = 50;
const PREVIEW_SECS  = 4;
const CACHE_DIR     = FileSystem.cacheDirectory + "rhazn_videos/";

const C = {
  bg:       "#000000",
  card:     "#0E0E0E",
  gold:     "#D4AF37",
  goldDim:  "rgba(212,175,55,0.12)",
  goldBd:   "rgba(212,175,55,0.28)",
  teal:     "#5AC8FA",
  tealDim:  "rgba(90,200,250,0.12)",
  tealBd:   "rgba(90,200,250,0.28)",
  white:    "#FFFFFF",
  gray:     "#9A9A9A",
  muted:    "rgba(255,255,255,0.55)",
  border:   "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.07)",
  ok:       "#34C759",
  danger:   "#FF453A",
};

export type VideoTrack = {
  id:            string;
  title:         string;
  description:   string | null;
  file_url:      string;
  thumbnail_url: string | null;
  duration_sec:  number;
  genre:         string | null;
  author:        string | null;
  is_active:     boolean;
  created_at:    string;
};

type CacheStatus = "idle" | "downloading" | "cached" | "error";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function fmtDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function getCachePath(id: string): string {
  return CACHE_DIR + `${id}.mp4`;
}

async function initCacheDir() {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  } catch {}
}

async function isVideoCached(id: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(getCachePath(id));
    return info.exists && (info.size || 0) > 10_000;
  } catch { return false; }
}

async function getCacheSize(): Promise<string> {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let total = 0;
    for (const f of files) {
      try {
        const info = await FileSystem.getInfoAsync(CACHE_DIR + f);
        if (info.size) total += info.size;
      } catch {}
    }
    const mb    = (total / 1024 / 1024).toFixed(1);
    const count = files.filter(f => f.endsWith(".mp4")).length;
    return `${count} vidéo${count !== 1 ? "s" : ""} • ${mb} MB`;
  } catch { return "0 MB"; }
}

// ─────────────────────────────────────────────────────────────
// THUMBNAIL — première frame via VideoView pausée
// ─────────────────────────────────────────────────────────────
function ThumbnailFrame({ uri, style }: { uri: string; style: any }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted       = true;
    p.loop        = false;
    p.currentTime = 0;
  });
  useEffect(() => {
    try { player.pause?.(); } catch {}
    return () => { try { player.pause?.(); } catch {} };
  }, []);
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={false} />;
}

// ─────────────────────────────────────────────────────────────
// PREVIEW PLAYER — 4 secondes puis stop
// ─────────────────────────────────────────────────────────────
function PreviewPlayer({ uri, onExpired, onOpenFull }: {
  uri: string; onExpired: () => void; onOpenFull: () => void;
}) {
  const [remaining, setRemaining] = useState(PREVIEW_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const player = useVideoPlayer(uri, (p) => { p.muted = false; p.loop = false; p.play(); });

  useEffect(() => {
    timerRef.current = setInterval(() => {
  setRemaining(r => {
    if (r <= 1) {
      clearInterval(timerRef.current!);
      try { player.pause?.(); } catch {}
      setTimeout(() => onExpired(), 0);
      return 0;
    }
    return r - 1;
  });
}, 1000);
    return () => { clearInterval(timerRef.current!); try { player.pause?.(); } catch {} };
  }, []);

  return (
    <View style={pp.wrap}>
      <VideoView player={player} style={pp.video} contentFit="cover" nativeControls={false} />
      <View style={pp.overlay}>
        <View style={pp.countdownBadge}>
          <Text style={pp.countdownTxt}>{remaining}s</Text>
        </View>
        <Pressable style={pp.fullBtn} onPress={onOpenFull}>
          <Ionicons name="expand" size={16} color="#000" />
          <Text style={pp.fullBtnTxt}>Voir en entier</Text>
        </Pressable>
      </View>
    </View>
  );
}

const pp = StyleSheet.create({
  wrap:          { width: "100%", aspectRatio: 16 / 9, position: "relative", backgroundColor: "#000", borderRadius: 20, overflow: "hidden", shadowColor: "#5AC8FA", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  video:         { width: "100%", height: "100%" },
  overlay:       { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 14, background: "transparent" },
  countdownBadge:{ alignSelf: "flex-end", backgroundColor: "rgba(0,0,0,0.82)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(90,200,250,0.40)", flexDirection: "row", alignItems: "center", gap: 5 },
  countdownTxt:  { color: "#5AC8FA", fontWeight: "900", fontSize: 12, letterSpacing: 0.3 },
  fullBtn:       { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", backgroundColor: "#D4AF37", borderRadius: 16, paddingHorizontal: 22, paddingVertical: 13, marginBottom: 10, shadowColor: "#D4AF37", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fullBtnTxt:    { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 0.2 },
});

// ─────────────────────────────────────────────────────────────
// FULLSCREEN PLAYER
// ─────────────────────────────────────────────────────────────
function FullscreenPlayer({ track, localUri, onClose }: {
  track: VideoTrack; localUri: string; onClose: () => void;
}) {
  const player = useVideoPlayer(localUri, (p) => { p.loop = false; p.play(); });
  useEffect(() => { return () => { try { player.pause?.(); } catch {} }; }, []);

  return (
    <View style={fp.sheet}>
      <View style={fp.handle} />
      <View style={fp.videoWrap}>
        <VideoView player={player} style={fp.video} contentFit="contain" nativeControls />
      </View>
      <View style={fp.infoWrap}>
        <Text style={fp.title} numberOfLines={2}>{track.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          {track.genre && <View style={fp.genreBadge}><Text style={fp.genreTxt}>{track.genre}</Text></View>}
          {track.author && <Text style={fp.author}>{track.author}</Text>}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.55)" />
            <Text style={fp.duration}>{fmtDuration(track.duration_sec)}</Text>
          </View>
        </View>
        {track.description ? <Text style={fp.desc} numberOfLines={3}>{track.description}</Text> : null}
      </View>
      <Pressable style={fp.closeBtn} onPress={onClose}>
        <Text style={fp.closeTxt}>Fermer</Text>
      </Pressable>
    </View>
  );
}

const fp = StyleSheet.create({
  sheet:     { backgroundColor: "#0E0E0E", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingBottom: 36 },
  handle:    { width: 42, height: 5, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.20)", alignSelf: "center", marginTop: 10, marginBottom: 14 },
  videoWrap: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  video:     { width: "100%", height: "100%" },
  infoWrap:  { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title:     { color: "#FFF", fontSize: 17, fontWeight: "900", lineHeight: 22 },
  genreBadge:{ backgroundColor: "rgba(90,200,250,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(90,200,250,0.28)" },
  genreTxt:  { color: "#5AC8FA", fontWeight: "800", fontSize: 10 },
  author:    { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "600" },
  duration:  { color: "#9A9A9A", fontSize: 11, fontWeight: "600" },
  desc:      { color: "rgba(255,255,255,0.52)", fontSize: 12, lineHeight: 18, marginTop: 10, fontWeight: "600" },
  closeBtn:  { marginHorizontal: 18, marginTop: 8, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  closeTxt:  { color: "#FFF", fontSize: 15, fontWeight: "700" },
});

// ─────────────────────────────────────────────────────────────
// VIDEO CARD
// ─────────────────────────────────────────────────────────────
function VideoCard({ item, cacheStatus, downloadProgress, localUri, onPreview, onOpenFull }: {
  item: VideoTrack; cacheStatus: CacheStatus; downloadProgress: number;
  localUri: string | null; onPreview: () => void; onOpenFull: () => void;
}) {
  const isCached      = cacheStatus === "cached";
  const isDownloading = cacheStatus === "downloading";
  const playUri       = localUri ?? item.file_url;

  return (
    <View style={[vc.card, isCached && vc.cardCached]}>
      {isDownloading && (
        <View style={vc.progressBar}>
          <View style={[vc.progressFill, { width: `${Math.min(100, downloadProgress)}%` as any }]} />
        </View>
      )}
      <Pressable style={vc.thumbWrap} onPress={onPreview}>
        <ThumbnailFrame uri={playUri} style={vc.thumb} />
        <View style={vc.playOverlay}>
          <View style={vc.playBtn}><Ionicons name="play" size={20} color="#FFF" /></View>
          <Text style={vc.previewHint}>Preview {PREVIEW_SECS}s</Text>
        </View>
        {isCached && (
          <View style={vc.offlineBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#34C759" />
            <Text style={vc.offlineTxt}>Hors ligne</Text>
          </View>
        )}
        {isDownloading && (
          <View style={vc.dlBadge}>
            <ActivityIndicator size={10} color="#5AC8FA" />
            <Text style={vc.dlTxt}>{Math.round(downloadProgress)}%</Text>
          </View>
        )}
        <View style={vc.durationBadge}>
          <Text style={vc.durationTxt}>{fmtDuration(item.duration_sec)}</Text>
        </View>
      </Pressable>
      <View style={vc.info}>
        <View style={{ flex: 1 }}>
          <Text style={vc.title} numberOfLines={2}>{item.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {item.genre && <View style={vc.genreBadge}><Text style={vc.genreTxt}>{item.genre}</Text></View>}
            {item.author && <Text style={vc.author} numberOfLines={1}>{item.author}</Text>}
          </View>
          <Text style={vc.date}>{fmtDate(item.created_at)}</Text>
        </View>
        <Pressable style={vc.fullBtn} onPress={onOpenFull}>
          <Ionicons name="expand" size={14} color="#5AC8FA" />
          <Text style={vc.fullBtnTxt}>Voir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  card:          { backgroundColor: "#0E0E0E", borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  cardCached:    { borderColor: "rgba(52,199,89,0.35)" },
  progressBar:   { height: 3, backgroundColor: "rgba(255,255,255,0.12)" },
  progressFill:  { height: "100%", backgroundColor: "#5AC8FA" },
  thumbWrap:     { width: "100%", aspectRatio: 16 / 9, position: "relative", backgroundColor: "#000" },
  thumb:         { width: "100%", height: "100%" },
  playOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.30)", gap: 8 },
  playBtn:       { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(0,0,0,0.60)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  previewHint:   { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700", backgroundColor: "rgba(0,0,0,0.50)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  offlineBadge:  { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,199,89,0.18)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(52,199,89,0.35)" },
  offlineTxt:    { color: "#34C759", fontSize: 10, fontWeight: "700" },
  dlBadge:       { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(90,200,250,0.18)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(90,200,250,0.28)" },
  dlTxt:         { color: "#5AC8FA", fontSize: 10, fontWeight: "700" },
  durationBadge: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.70)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  durationTxt:   { color: "#FFF", fontSize: 10, fontWeight: "700" },
  info:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  title:         { color: "#FFF", fontWeight: "800", fontSize: 13, lineHeight: 17 },
  genreBadge:    { backgroundColor: "rgba(90,200,250,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(90,200,250,0.28)" },
  genreTxt:      { color: "#5AC8FA", fontWeight: "800", fontSize: 9 },
  author:        { color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "600" },
  date:          { color: "#9A9A9A", fontSize: 10, marginTop: 3, fontWeight: "500" },
  fullBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(90,200,250,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(90,200,250,0.28)" },
  fullBtnTxt:    { color: "#5AC8FA", fontWeight: "800", fontSize: 11 },
});

// ─────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────
export default function VideoRhazn({ visible, onClose }: Props) {
  const [videos,           setVideos]           = useState<VideoTrack[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [search,           setSearch]           = useState("");
  const [cacheStatuses,    setCacheStatuses]    = useState<Record<string, CacheStatus>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [localUris,        setLocalUris]        = useState<Record<string, string>>({});
  const [cacheSize,        setCacheSize]        = useState("0 MB");
  const [previewTrack,     setPreviewTrack]     = useState<VideoTrack | null>(null);
  const [showPreview,      setShowPreview]      = useState(false);
  const [fullscreenTrack,  setFullscreenTrack]  = useState<VideoTrack | null>(null);
  const [showFullscreen,   setShowFullscreen]   = useState(false);
  const downloadingRef = useRef<Set<string>>(new Set());

  useEffect(() => { initCacheDir(); }, []);

  useEffect(() => {
    if (visible) { loadVideos(); }
    else {
      setShowPreview(false); setShowFullscreen(false);
      setPreviewTrack(null); setFullscreenTrack(null);
    }
  }, [visible]);

  const updateCacheSize = async () => setCacheSize(await getCacheSize());

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("video_tracks").select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(MAX_CACHED);
      if (error || !data) { setVideos([]); return; }
      const tracks = data as VideoTrack[];
      setVideos(tracks);
      const statuses: Record<string, CacheStatus> = {};
      const uris:     Record<string, string>       = {};
      await Promise.all(tracks.map(async (t) => {
        const cached = await isVideoCached(t.id);
        if (cached) { statuses[t.id] = "cached"; uris[t.id] = getCachePath(t.id); }
        else { statuses[t.id] = "idle"; }
      }));
      setCacheStatuses(statuses);
      setLocalUris(uris);
      updateCacheSize();
      autoDownloadAll(tracks, statuses);
    } catch { setVideos([]); }
    finally { setLoading(false); }
  };

  const autoDownloadAll = useCallback(async (
    tracks: VideoTrack[], currentStatuses: Record<string, CacheStatus>
  ) => {
    for (const track of tracks) {
      if (currentStatuses[track.id] === "cached") continue;
      if (downloadingRef.current.has(track.id)) continue;
      await new Promise(r => setTimeout(r, 400));
      downloadVideo(track);
    }
  }, []);

  const downloadVideo = useCallback(async (track: VideoTrack) => {
    if (downloadingRef.current.has(track.id)) return;
    downloadingRef.current.add(track.id);
    setCacheStatuses(prev => ({ ...prev, [track.id]: "downloading" }));
    setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));
    try {
      const destPath = getCachePath(track.id);
      const existing = await FileSystem.getInfoAsync(destPath);
      if (existing.exists && (existing.size || 0) > 10_000) {
        setCacheStatuses(prev => ({ ...prev, [track.id]: "cached" }));
        setLocalUris(prev => ({ ...prev, [track.id]: destPath }));
        downloadingRef.current.delete(track.id);
        updateCacheSize(); return;
      }
      const dl = FileSystem.createDownloadResumable(
        track.file_url, destPath, {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            const pct = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100;
            setDownloadProgress(prev => ({ ...prev, [track.id]: Math.round(pct) }));
          }
        }
      );
      const result = await dl.downloadAsync();
      if (!result?.uri) throw new Error("Échec");
      const info = await FileSystem.getInfoAsync(destPath);
      if (!info.exists || (info.size || 0) < 10_000) throw new Error("Fichier invalide");
      setCacheStatuses(prev => ({ ...prev, [track.id]: "cached" }));
      setLocalUris(prev => ({ ...prev, [track.id]: destPath }));
      updateCacheSize();
    } catch {
      setCacheStatuses(prev => ({ ...prev, [track.id]: "error" }));
    } finally {
      downloadingRef.current.delete(track.id);
      setDownloadProgress(prev => { const c = { ...prev }; delete c[track.id]; return c; });
    }
  }, []);

  const handlePreview = useCallback((track: VideoTrack) => {
    Haptics.selectionAsync().catch(() => {});
    setPreviewTrack(track); setShowPreview(true);
  }, []);

  const handleOpenFull = useCallback((track: VideoTrack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowPreview(false); setFullscreenTrack(track); setShowFullscreen(true);
  }, []);

  const filtered = videos.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return v.title?.toLowerCase().includes(q) || v.author?.toLowerCase().includes(q) || v.genre?.toLowerCase().includes(q);
  });

  const cachedCount = Object.values(cacheStatuses).filter(s => s === "cached").length;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {showFullscreen && fullscreenTrack ? (
          <FullscreenPlayer
            track={fullscreenTrack}
            localUri={localUris[fullscreenTrack.id] ?? fullscreenTrack.file_url}
            onClose={() => { setShowFullscreen(false); setFullscreenTrack(null); }}
          />
        ) : showPreview && previewTrack ? (
          <View style={{ backgroundColor: "#0A0A0A", borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderTopColor: "rgba(90,200,250,0.20)", padding: 22, paddingBottom: 40 }}>
  <View style={{ width: 42, height: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 20 }} />
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: "#5AC8FA" }} />
    <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 17, flex: 1, letterSpacing: -0.3 }} numberOfLines={1}>{previewTrack.title}</Text>
    <View style={{ backgroundColor: "rgba(90,200,250,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(90,200,250,0.28)" }}>
      <Text style={{ color: "#5AC8FA", fontSize: 10, fontWeight: "800" }}>PREVIEW</Text>
    </View>
  </View>
            <PreviewPlayer
              uri={localUris[previewTrack.id] ?? previewTrack.file_url}
              onExpired={() => setShowPreview(false)}
              onOpenFull={() => handleOpenFull(previewTrack)}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
  <Pressable style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" }} onPress={() => setShowPreview(false)}>
    <Text style={{ color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 14 }}>Annuler</Text>
  </Pressable>
  <Pressable style={{ flex: 2, height: 52, borderRadius: 16, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, shadowColor: "#D4AF37", shadowOpacity: 0.40, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }} onPress={() => handleOpenFull(previewTrack)}>
    <Ionicons name="play-circle" size={18} color="#000" />
    <Text style={{ color: "#000", fontWeight: "900", fontSize: 15 }}>Regarder maintenant</Text>
  </Pressable>
</View>
          </View>
        ) : (
          <View style={{ flex: 1, marginTop: 90, backgroundColor: "#000", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" }}>
            <View style={{ width: 42, height: 5, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.20)", alignSelf: "center", marginTop: 10, marginBottom: 18 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, marginBottom: 8 }}>
              <View>
                <Text style={{ color: "#FFF", fontSize: 19, fontWeight: "900", marginBottom: 3 }}>Vidéos RHAZN</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>{videos.length} vidéo{videos.length !== 1 ? "s" : ""}</Text>
                  {cachedCount > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,199,89,0.12)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Ionicons name="cloud-done" size={10} color="#34C759" />
                      <Text style={{ color: "#34C759", fontSize: 10, fontWeight: "700" }}>{cachedCount} hors ligne</Text>
                    </View>
                  )}
                  <Text style={{ color: "#9A9A9A", fontSize: 10 }}>{cacheSize}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0E0E0E", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
                <Ionicons name="close" size={20} color="#FFF" />
              </Pressable>
            </View>
            <View style={{ marginHorizontal: 18, marginBottom: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
              <Ionicons name="search" size={15} color="#777" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher..." placeholderTextColor="#666" style={{ flex: 1, marginLeft: 10, color: "#FFF", fontWeight: "600", fontSize: 13 }} />
              {search.length > 0 && <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color="#666" /></Pressable>}
            </View>
            {loading ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
                <ActivityIndicator color="#5AC8FA" size="large" />
                <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "600", fontSize: 13 }}>Chargement...</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={{ paddingTop: 80, alignItems: "center", gap: 12 }}>
                    <View style={{ width: 68, height: 68, borderRadius: 20, backgroundColor: "rgba(90,200,250,0.12)", borderWidth: 1, borderColor: "rgba(90,200,250,0.28)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="videocam-outline" size={28} color="#5AC8FA" />
                    </View>
                    <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 15 }}>{search ? "Aucun résultat" : "Aucune vidéo"}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "600", fontSize: 12, textAlign: "center", paddingHorizontal: 40 }}>
                      {search ? `Aucune vidéo pour "${search}"` : "Les vidéos RHAZN apparaîtront ici."}
                    </Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <VideoCard
                    item={item}
                    cacheStatus={cacheStatuses[item.id] ?? "idle"}
                    downloadProgress={downloadProgress[item.id] ?? 0}
                    localUri={localUris[item.id] ?? null}
                    onPreview={() => handlePreview(item)}
                    onOpenFull={() => handleOpenFull(item)}
                  />
                )}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}