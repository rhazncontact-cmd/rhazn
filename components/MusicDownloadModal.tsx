import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { supabase } from "../lib/supabase";

const { width } = Dimensions.get("window");

const APP_SCHEME     = "rhazn";
const APP_PACKAGE    = "com.rhzn.dev";
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;
const APP_STORE_URL  = "https://apps.apple.com/app/rhazn/id6740219839";

const C = {
  bg:       "#000000",
  card:     "#0E0E0E",
  gold:     "#D4AF37",
  goldDim:  "rgba(212,175,55,0.12)",
  goldBd:   "rgba(212,175,55,0.28)",
  white:    "#FFFFFF",
  gray:     "#9A9A9A",
  muted:    "rgba(255,255,255,0.55)",
  border:   "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.07)",
  ok:       "#34C759",
  danger:   "#FF453A",
};

const fmtTime = (sec: number) => {
  if (isNaN(sec) || !isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  duration_sec: number;
  file_url: string;
  genre: string | null;
  is_downloadable?: boolean;
  is_active?: boolean;
  cover_url?: string | null;
  isCached?: boolean;
  isDownloaded?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

const buildShareMessage = (track: MusicTrack): string => {
  const deepLink = `${APP_SCHEME}://track/${track.id}`;
  const storeUrl = Platform.OS === "android" ? PLAY_STORE_URL : APP_STORE_URL;
  return (
    `🎵 Écoute "${track.title}" par ${track.artist} sur RHAZN\n\n` +
    `▶️ Ouvrir dans RHAZN : ${deepLink}\n\n` +
    `📱 Télécharger RHAZN : ${storeUrl}`
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎵 CACHE MANAGER
// ═══════════════════════════════════════════════════════════════
class CacheManager {
  private static readonly CACHE_DIR   = FileSystem.cacheDirectory + "rhazn_offline/";
  private static readonly HISTORY_KEY = "@rhazn_cache_history";
  private static readonly MAX_CACHED  = 50;

  static async init() {
    try {
      const info = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!info.exists) await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
    } catch {}
  }

  static getCachePath(trackId: string): string {
    return this.CACHE_DIR + `${trackId}.mp3`;
  }

  static async isCached(trackId: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(this.getCachePath(trackId));
      return info.exists && (info.size || 0) > 1000;
    } catch { return false; }
  }

  static async addToHistory(trackId: string) {
    try {
      const history    = await this.getHistory();
      const filtered   = history.filter(id => id !== trackId);
      const newHistory = [trackId, ...filtered].slice(0, this.MAX_CACHED);
      await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(newHistory));
      await this.cleanupOldCache(newHistory);
    } catch {}
  }

  static async getHistory(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(this.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  static async cleanupOldCache(currentHistory: string[]) {
    try {
      const files      = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      const historySet = new Set(currentHistory);
      for (const file of files) {
        if (file.endsWith(".mp3") && !historySet.has(file.replace(".mp3", ""))) {
          await FileSystem.deleteAsync(this.CACHE_DIR + file).catch(() => {});
        }
      }
    } catch {}
  }

  static async getCacheSize(): Promise<string> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      let total = 0;
      for (const file of files) {
        try { const info = await FileSystem.getInfoAsync(this.CACHE_DIR + file); if (info.size) total += info.size; } catch {}
      }
      const mb    = (total / 1024 / 1024).toFixed(1);
      const count = files.filter(f => f.endsWith(".mp3")).length;
      return `${count} morceaux • ${mb}MB`;
    } catch { return "0 MB"; }
  }

  static async clearAll() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      for (const file of files) await FileSystem.deleteAsync(this.CACHE_DIR + file).catch(() => {});
      await AsyncStorage.removeItem(this.HISTORY_KEY);
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════
// 💾 DOWNLOAD MANAGER
// ✅ FIX : utilise Sharing.shareAsync() sur les deux plateformes
//    → aucune permission MediaLibrary requise
//    → fonctionne SANS rebuild
//    → l'utilisateur choisit où sauvegarder (Fichiers, Musique, Drive...)
// ═══════════════════════════════════════════════════════════════
class DownloadManager {
  static async downloadToDevice(
    track: MusicTrack,
    onProgress?: (pct: number) => void
  ): Promise<boolean> {
    // ✅ Vérifier que le partage est disponible sur cet appareil
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
    }

    // Étape 1 : télécharger dans le cache temporaire
    const tmpPath = FileSystem.cacheDirectory + `rhazn_dl_${track.id}.mp3`;
    onProgress?.(5);

    try {
      // Supprimer l'ancien fichier temporaire si existant
      const existing = await FileSystem.getInfoAsync(tmpPath);
      if (existing.exists) await FileSystem.deleteAsync(tmpPath).catch(() => {});

      console.log(`📥 Downloading: ${track.title}`);

      const downloadResumable = FileSystem.createDownloadResumable(
        track.file_url,
        tmpPath,
        {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            const pct = (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 90;
            onProgress?.(Math.round(pct));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error("Téléchargement échoué — aucun fichier reçu.");

      const info = await FileSystem.getInfoAsync(tmpPath);
      if (!info.exists || (info.size || 0) < 1000) {
        throw new Error("Le fichier téléchargé est invalide ou vide.");
      }

      onProgress?.(95);
      console.log(`✅ Downloaded: ${track.title} (${((info.size || 0) / 1024 / 1024).toFixed(2)}MB)`);

      // Étape 2 : ouvrir le share sheet natif
      // ✅ Fonctionne sur Android ET iOS sans aucune permission supplémentaire
      // L'utilisateur peut choisir : Bluetooth, Fichiers, WhatsApp, Drive, etc.
      await Sharing.shareAsync(tmpPath, {
        mimeType:    "audio/mpeg",
        dialogTitle: `Sauvegarder "${track.title}"`,
        UTI:         "public.mp3",
      });

      onProgress?.(100);

      // Nettoyer le fichier temporaire après partage
      await FileSystem.deleteAsync(tmpPath).catch(() => {});
      console.log(`✅ Shared/Saved: ${track.title}`);
      return true;

    } catch (e: any) {
      // Nettoyer en cas d'erreur
      await FileSystem.deleteAsync(tmpPath).catch(() => {});
      throw e;
    }
  }

  static async isDownloaded(_trackTitle: string): Promise<boolean> {
    // ✅ Sans MediaLibrary, on ne peut pas vérifier si déjà téléchargé
    // On retourne false — le badge "Téléchargé" est géré par l'état local
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎵 PREMIUM AUDIO PLAYER
// ═══════════════════════════════════════════════════════════════
const PremiumAudioPlayer = ({
  track, soundRef, isPlaying, onTogglePlay, onClose,
}: {
  track: MusicTrack;
  soundRef: React.MutableRefObject<Audio.Sound | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}) => {
  const [playback, setPlayback]   = useState({ position: 0, duration: 0, isPlaying: false });
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    const update = async () => {
      if (!soundRef.current || !isPlaying || isDragging) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPlayback({
            position:  (status.positionMillis || 0) / 1000,
            duration:  (status.durationMillis || 0) / 1000,
            isPlaying: status.isPlaying || false,
          });
        }
      } catch {}
    };
    if (isPlaying && !isDragging) intervalRef.current = setInterval(update, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, isDragging, soundRef]);

  const handleSeek = async (value: number) => {
    if (!soundRef.current) return;
    try { await soundRef.current.setPositionAsync(value * 1000); setPlayback(p => ({ ...p, position: value })); } catch {}
  };

  const skipForward  = async () => { await handleSeek(Math.min(playback.position + 10, playback.duration)); Haptics.selectionAsync().catch(() => {}); };
  const skipBackward = async () => { await handleSeek(Math.max(playback.position - 10, 0)); Haptics.selectionAsync().catch(() => {}); };
  const progress = playback.duration > 0 ? playback.position / playback.duration : 0;

  return (
    <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 24, paddingHorizontal: 18, paddingBottom: 32 }}>
      <View style={{ position: "relative", marginBottom: 32 }}>
        <View style={{ width: width - 36, height: width - 36, borderRadius: 24, backgroundColor: "rgba(212,175,55,0.08)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.goldBd }}>
          <Ionicons name="musical-notes" size={80} color={C.gold} />
        </View>
        {track.isCached && (
          <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: C.ok, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color={C.bg} />
            <Text style={{ color: C.bg, fontSize: 11, fontWeight: "700" }}>Hors ligne</Text>
          </View>
        )}
      </View>
      <View style={{ marginBottom: 28 }}>
        <Text style={{ color: C.white, fontSize: 22, fontWeight: "900", marginBottom: 6 }} numberOfLines={2}>{track.title}</Text>
        <Text style={{ color: C.gray, fontSize: 15, fontWeight: "600" }}>{track.artist}</Text>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Pressable
          onPressIn={() => setIsDragging(true)}
          onPressOut={() => setIsDragging(false)}
          onPress={(e) => { const ratio = e.nativeEvent.locationX / (width - 36); handleSeek(ratio * playback.duration); }}
        >
          <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: "hidden" }}>
            <View style={{ height: "100%", backgroundColor: C.gold, width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
          </View>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 28 }}>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>{fmtTime(playback.position)}</Text>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>{fmtTime(playback.duration)}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Pressable onPress={skipBackward} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 14, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="play-back" size={20} color={C.gold} />
        </Pressable>
        <Pressable onPress={onTogglePlay} style={({ pressed }) => ({ width: 68, height: 68, borderRadius: 18, backgroundColor: isPlaying ? C.gold : C.goldDim, borderWidth: 1, borderColor: C.goldBd, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={isPlaying ? C.bg : C.gold} />
        </Pressable>
        <Pressable onPress={skipForward} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 14, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.7 : 1 })}>
          <Ionicons name="play-forward" size={20} color={C.gold} />
        </Pressable>
      </View>
      <Pressable onPress={onClose} style={({ pressed }) => ({ height: 54, borderRadius: 16, backgroundColor: C.border, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: C.white, fontSize: 16, fontWeight: "700" }}>Fermer</Text>
      </Pressable>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🎵 MAIN MODAL
// ═══════════════════════════════════════════════════════════════
export default function MusicDownloadModal({ visible, onClose }: Props) {
  const [tracks,             setTracks]             = useState<MusicTrack[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [search,             setSearch]             = useState("");
  const [playingId,          setPlayingId]          = useState<string | null>(null);
  const [showPlayer,         setShowPlayer]         = useState(false);
  const [isPlaying,          setIsPlaying]          = useState(false);
  const [cacheSize,          setCacheSize]          = useState("0 MB");
  const [loadingTrackId,     setLoadingTrackId]     = useState<string | null>(null);
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);
  const [downloadProgress,   setDownloadProgress]   = useState<{ [id: string]: number }>({});
  const [downloadStatus,     setDownloadStatus]     = useState<{ [id: string]: "downloading" | "success" | "error" | null }>({});
  const [showMenu,           setShowMenu]           = useState(false);
  const [selectedTrack,      setSelectedTrack]      = useState<MusicTrack | null>(null);
  const [loadingMessage,     setLoadingMessage]     = useState<string | null>(null);

  const soundRef        = useRef<Audio.Sound | null>(null);
  const loadingAudioRef = useRef(false);

  useEffect(() => { CacheManager.init(); updateCacheSize(); }, []);
  const updateCacheSize = async () => { setCacheSize(await CacheManager.getCacheSize()); };

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true }).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active") stopSound();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) loadTracks();
    else { stopSound(); setShowPlayer(false); }
  }, [visible]);

  const destroySound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    } catch {}
  };

  const stopSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.pauseAsync();
          await soundRef.current.setPositionAsync(0);
        }
      }
    } catch {}
    setPlayingId(null);
    setIsPlaying(false);
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("music_tracks").select("*").order("created_at", { ascending: false });
      if (error) { setTracks([]); return; }
      const history    = await CacheManager.getHistory();
      const historySet = new Set(history);
      const withStatus = (data ?? []).map(t => ({
        ...t,
        file_url:     t?.file_url || "",
        isCached:     historySet.has(t.id),
        isDownloaded: false, // géré par état local uniquement
      }));
      setTracks(withStatus);
    } catch { setTracks([]); }
    finally { setLoading(false); }
  };

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); }
        else { await soundRef.current.playAsync(); setIsPlaying(true); }
      }
    } catch {}
  }, []);

  const togglePreview = async (track: MusicTrack) => {
    if (loadingAudioRef.current) return;
    loadingAudioRef.current = true;
    setLoadingMessage(`⏳ Chargement: ${track.title}`);

    try {
      if (playingId === track.id) {
        await togglePlayPause();
        loadingAudioRef.current = false;
        setLoadingMessage(null);
        return;
      }

      await destroySound();
      Haptics.selectionAsync().catch(() => {});
      setLoadingTrackId(track.id);

      const playUri  = CacheManager.getCachePath(track.id);
      const fileInfo = await FileSystem.getInfoAsync(playUri);

      if (!fileInfo.exists) {
        console.log(`📥 Caching for playback: ${track.title}`);
        await FileSystem.downloadAsync(track.file_url, playUri);
        const info = await FileSystem.getInfoAsync(playUri);
        if (!info.exists || (info.size || 0) < 1000) {
          setLoadingMessage(`❌ Impossible de charger: ${track.title}`);
          loadingAudioRef.current = false;
          setLoadingTrackId(null);
          return;
        }
        await CacheManager.addToHistory(track.id);
        updateCacheSize();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: playUri },
        { shouldPlay: true, volume: 1, progressUpdateIntervalMillis: 500 }
      );
      soundRef.current = sound;

      setPlayingId(track.id);
      setIsPlaying(true);
      setShowPlayer(true);
      setLoadingMessage(`▶ Lecture: ${track.title}`);

      // Marquer comme caché dans la liste
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, isCached: true } : t));

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) { stopSound(); setShowPlayer(false); setLoadingMessage(null); }
      });

    } catch (e) {
      console.log("❌ Play error:", e);
      setLoadingMessage(`❌ Erreur lecture`);
      stopSound();
      setShowPlayer(false);
    } finally {
      setLoadingTrackId(null);
      loadingAudioRef.current = false;
      setTimeout(() => setLoadingMessage(null), 2000);
    }
  };

  // ✅ FIX : téléchargement via Sharing.shareAsync() — aucune permission requise
  const downloadTrack = async (track: MusicTrack) => {
    if (!track.is_downloadable || downloadingTrackId) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setDownloadingTrackId(track.id);
      setDownloadProgress(prev => ({ ...prev, [track.id]: 0 }));
      setDownloadStatus(prev   => ({ ...prev, [track.id]: "downloading" }));

      await DownloadManager.downloadToDevice(track, (pct) => {
        setDownloadProgress(prev => ({ ...prev, [track.id]: pct }));
      });

      setDownloadStatus(prev => ({ ...prev, [track.id]: "success" }));
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, isDownloaded: true } : t));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    } catch (e: any) {
      console.log("❌ Download error:", e?.message);
      // Si l'utilisateur a annulé le share sheet → ne pas afficher d'erreur
      const isCancelled = e?.message?.toLowerCase().includes("cancel") ||
                          e?.message?.toLowerCase().includes("user") ||
                          e?.code === "ERR_SHARING_CANCELLED";
      if (!isCancelled) {
        setDownloadStatus(prev => ({ ...prev, [track.id]: "error" }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        Alert.alert("Erreur", e?.message ?? "Téléchargement échoué.", [{ text: "OK" }]);
      } else {
        // Annulé proprement
        setDownloadStatus(prev => ({ ...prev, [track.id]: null }));
      }
    } finally {
      setDownloadingTrackId(null);
      setTimeout(() => {
        setDownloadProgress(prev => { const c = { ...prev }; delete c[track.id]; return c; });
        setDownloadStatus(prev   => { const c = { ...prev }; delete c[track.id]; return c; });
      }, 3000);
    }
  };

  const shareTrack = async (track: MusicTrack) => {
    try {
      Haptics.selectionAsync().catch(() => {});
      await Share.share({ title: track.title, message: buildShareMessage(track) });
    } catch {}
  };

  const filtered = tracks.filter(t => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q) || t.genre?.toLowerCase().includes(q);
  });

  const currentTrack = tracks.find(t => t.id === playingId);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        {/* Toast chargement */}
        {loadingMessage && (
          <View style={{ paddingTop: 44, paddingBottom: 10, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999 }}>
            <Text style={{ color: C.gold, fontWeight: "700", fontSize: 13 }}>{loadingMessage}</Text>
          </View>
        )}

        {!showPlayer ? (
          <View style={{ flex: 1, marginTop: 90, backgroundColor: "#000", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={{ width: 42, height: 5, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.20)", alignSelf: "center", marginTop: 10, marginBottom: 18 }} />

            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, marginBottom: 12 }}>
              <View>
                <Text style={{ color: "#FFF", fontSize: 19, fontWeight: "900", marginBottom: 4 }}>Musiques RHAZN</Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>📱 {cacheSize}</Text>
              </View>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color="#FFF" />
              </Pressable>
            </View>

            {/* Recherche */}
            <View style={{ marginHorizontal: 18, marginBottom: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, paddingHorizontal: 14, height: 50 }}>
              <Ionicons name="search" size={16} color="#999" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Recherche..." placeholderTextColor="#777" style={{ flex: 1, marginLeft: 10, color: "#FFF", fontWeight: "600" }} />
            </View>

            {loading ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator color={C.gold} size="large" />
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={{ paddingTop: 120, alignItems: "center" }}>
                    <Ionicons name="musical-notes-outline" size={42} color="#666" />
                    <Text style={{ color: "#888", marginTop: 14, fontWeight: "700" }}>Catalogue RHAZN</Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const isTrackPlaying = playingId === item.id && isPlaying;
                  const isLoading      = loadingTrackId === item.id;
                  const isDownloading  = downloadingTrackId === item.id;
                  const progress       = downloadProgress[item.id] || 0;
                  const status         = downloadStatus[item.id];

                  return (
                    <View style={{ backgroundColor: C.card, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
                      {/* Barre progression */}
                      {status === "downloading" && (
                        <View style={{ height: 3, backgroundColor: C.border }}>
                          <View style={{ height: "100%", width: `${Math.min(100, progress)}%`, backgroundColor: C.gold }} />
                        </View>
                      )}

                      <View style={{ flexDirection: "row", alignItems: "center", padding: 12 }}>
                        {/* Play */}
                        <Pressable
                          onPress={() => togglePreview(item)}
                          disabled={isDownloading}
                          style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: isTrackPlaying ? C.gold : C.goldDim, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: C.goldBd, opacity: isDownloading ? 0.5 : 1 }}
                        >
                          {isLoading
                            ? <ActivityIndicator size={18} color={C.gold} />
                            : <Ionicons name={isTrackPlaying ? "pause" : "play"} size={18} color={isTrackPlaying ? C.bg : C.gold} />
                          }
                        </Pressable>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: status ? 6 : 0 }}>
                            <Text numberOfLines={1} style={{ color: C.white, fontWeight: "800", fontSize: 14, flex: 1 }}>{item.title}</Text>

                            {item.isCached && !status && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(52,199,89,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Ionicons name="checkmark-circle" size={12} color={C.ok} />
                                <Text style={{ color: C.ok, fontSize: 10, fontWeight: "700" }}>Hors ligne</Text>
                              </View>
                            )}
                            {item.isDownloaded && !status && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(212,175,55,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Ionicons name="download" size={12} color={C.gold} />
                                <Text style={{ color: C.gold, fontSize: 10, fontWeight: "700" }}>Téléchargé</Text>
                              </View>
                            )}
                          </View>

                          {/* Statut téléchargement */}
                          {status && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              {status === "downloading" && (
                                <><Ionicons name="cloud-download" size={12} color={C.gold} /><Text style={{ color: C.gold, fontSize: 11, fontWeight: "600" }}>{Math.round(progress)}%...</Text></>
                              )}
                              {status === "success" && (
                                <><Ionicons name="checkmark-circle" size={12} color={C.ok} /><Text style={{ color: C.ok, fontSize: 11, fontWeight: "600" }}>Sauvegardé ✓</Text></>
                              )}
                              {status === "error" && (
                                <><Ionicons name="close-circle" size={12} color={C.danger} /><Text style={{ color: C.danger, fontSize: 11, fontWeight: "600" }}>Erreur</Text></>
                              )}
                            </View>
                          )}

                          <Text style={{ color: C.gray, marginTop: 4, fontSize: 11 }}>{item.artist}</Text>
                        </View>

                        {/* Bouton menu ou verrou */}
                        {item.is_downloadable ? (
                          <Pressable
                            onPress={() => { setSelectedTrack(item); setShowMenu(true); }}
                            style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBd, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.7 : 1 })}
                          >
                            <Ionicons name="ellipsis-vertical" size={18} color={C.gold} />
                          </Pressable>
                        ) : (
                          <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <Ionicons name="lock-closed" size={18} color={C.muted} />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        ) : currentTrack ? (
          <PremiumAudioPlayer
            track={currentTrack}
            soundRef={soundRef}
            isPlaying={isPlaying}
            onTogglePlay={togglePlayPause}
            onClose={() => { stopSound(); setShowPlayer(false); }}
          />
        ) : null}
      </View>

      {/* Menu contextuel */}
      {showMenu && selectedTrack && (
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => setShowMenu(false)}
        >
          <View style={{ position: "absolute", bottom: 120, right: 24, backgroundColor: "#111", borderRadius: 22, padding: 12, borderWidth: 1, borderColor: C.border, width: 230 }}>

            {/* Télécharger */}
            <Pressable
              onPress={() => { setShowMenu(false); if (selectedTrack) downloadTrack(selectedTrack); }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
            >
              <Ionicons name="cloud-download" size={18} color={C.gold} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: C.white, fontWeight: "700" }}>Télécharger</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Sauvegarder sur l'appareil</Text>
              </View>
            </Pressable>

            <View style={{ height: 1, backgroundColor: C.border }} />

            {/* Partager */}
            <Pressable
              onPress={() => { setShowMenu(false); if (selectedTrack) shareTrack(selectedTrack); }}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
            >
              <Ionicons name="share-social" size={18} color={C.gold} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: C.white, fontWeight: "700" }}>Partager</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>Ouvre l'app ou le store</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet:    { height: "86%", backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 12 },
  handle:   { width: 42, height: 5, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.20)", alignSelf: "center", marginBottom: 18 },
  header:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title:    { color: C.white, fontWeight: "900", fontSize: 30 },
  closeBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
});