/**
 * components/MusicDownloadModal.tsx
 * ✅ Modal pour télécharger les musiques RHAZN
 * ✅ Affiche le catalogue de musiques
 * ✅ Télécharge les MP3 avec statut (idle/downloading/done/error)
 * ✅ Prévisualisation audio (play/pause)
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  gold: "#D4AF37",
  white: "#FFF",
  gray: "#666",
  muted: "rgba(255,255,255,0.60)",
  border: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.06)",
  blue: "#007AFF",
  ok: "#34C759",
  danger: "#FF453A",
  goldDim: "rgba(212,175,55,0.14)",
};

// ─────────────────────────────────────────────────────────────────
// MOCK DATA - Remplacez par vos vraies données!
// ─────────────────────────────────────────────────────────────────
const RHAZN_MUSIC_CATALOG = [
  {
    id: "rhazn_001",
    title: "Haitian Dreams",
    artist: "RHAZN Collective",
    duration: 180,
    bpm: 95,
    genre: "Afrobeat",
    audioUrl:
      "https://example.com/music/haitian-dreams.mp3",
  },
  {
    id: "rhazn_002",
    title: "Rhythm of the Soul",
    artist: "RHAZN Collective",
    duration: 200,
    bpm: 120,
    genre: "Hip-Hop",
    audioUrl:
      "https://example.com/music/rhythm-of-the-soul.mp3",
  },
  {
    id: "rhazn_003",
    title: "Island Vibes",
    artist: "RHAZN Collective",
    duration: 160,
    bpm: 110,
    genre: "Reggae",
    audioUrl:
      "https://example.com/music/island-vibes.mp3",
  },
  {
    id: "rhazn_004",
    title: "Legacy of Ancestors",
    artist: "RHAZN Collective",
    duration: 220,
    bpm: 85,
    genre: "World",
    audioUrl:
      "https://example.com/music/legacy-of-ancestors.mp3",
  },
  {
    id: "rhazn_005",
    title: "Urban Pulse",
    artist: "RHAZN Collective",
    duration: 190,
    bpm: 130,
    genre: "Trap",
    audioUrl:
      "https://example.com/music/urban-pulse.mp3",
  },
];

type DownloadState = "idle" | "downloading" | "done" | "error";
type TrackDownloadStatus = {
  [key: string]: {
    state: DownloadState;
    progress: number;
    error?: string;
  };
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MusicDownloadModal({ visible, onClose }: Props) {
  const [downloadStatus, setDownloadStatus] = useState<TrackDownloadStatus>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Nettoyer le son à la fermeture
  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  // ── Download Music ────────────────────────────────────────────
  const downloadMusic = async (track: (typeof RHAZN_MUSIC_CATALOG)[0]) => {
    try {
      setDownloadStatus((prev) => ({
        ...prev,
        [track.id]: { state: "downloading", progress: 0 },
      }));

      // ✅ Vérifier les permissions
      const perms = await FileSystem.getInfoAsync(
        FileSystem.documentDirectory
      );
      if (!perms.exists) {
        throw new Error("DocumentDirectory not available");
      }

      // ✅ Construire le chemin de destination
      const fileName = `${track.id}_${track.title.replace(/\s+/g, "_")}.mp3`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // ✅ Télécharger le fichier
      const downloadResult = await FileSystem.downloadAsync(
        track.audioUrl,
        fileUri,
        {
          progressInterval: 100,
          progressCallback: (progress) => {
            const percent =
              progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
            setDownloadStatus((prev) => ({
              ...prev,
              [track.id]: { state: "downloading", progress: percent },
            }));
          },
        }
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed: ${downloadResult.status}`);
      }

      // ✅ Marquer comme réussi
      setDownloadStatus((prev) => ({
        ...prev,
        [track.id]: { state: "done", progress: 1 },
      }));

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      // Auto-reset après 3 secondes
      setTimeout(() => {
        setDownloadStatus((prev) => {
          const updated = { ...prev };
          delete updated[track.id];
          return updated;
        });
      }, 3000);
    } catch (error: any) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      setDownloadStatus((prev) => ({
        ...prev,
        [track.id]: {
          state: "error",
          progress: 0,
          error: error?.message || "Erreur inconnue",
        },
      }));
    }
  };

  // ── Preview Audio ─────────────────────────────────────────────
  const playPreview = async (track: (typeof RHAZN_MUSIC_CATALOG)[0]) => {
    try {
      // Si une autre musique joue, l'arrêter
      if (playingId && playingId !== track.id && sound) {
        await sound.stopAsync();
        setPlayingId(null);
      }

      if (playingId === track.id) {
        // Arrêter la lecture actuelle
        await sound?.stopAsync();
        setPlayingId(null);
        return;
      }

      // Lancer la preview
      Haptics.selectionAsync().catch(() => {});
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true, volume: 1 },
        null
      );
      setSound(newSound);
      setPlayingId(track.id);

      // Arrêter automatiquement après la durée
      setTimeout(() => {
        newSound.stopAsync().catch(() => {});
        setPlayingId(null);
      }, Math.min(track.duration, 30) * 1000); // Max 30s preview
    } catch (error) {
      console.warn("Preview error:", error);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    }
  };

  // ── Render Track ──────────────────────────────────────────────
  const renderTrack = ({ item: track }: { item: (typeof RHAZN_MUSIC_CATALOG)[0] }) => {
    const status = downloadStatus[track.id];
    const isDownloading = status?.state === "downloading";
    const isDone = status?.state === "done";
    const isError = status?.state === "error";
    const isPlaying = playingId === track.id;

    return (
      <View style={s.trackCard}>
        {/* Left: Info */}
        <View style={s.trackLeft}>
          <View style={s.trackTitle}>
            <Text style={s.trackTitleTxt} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={s.trackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>

          <View style={s.trackMeta}>
            <View style={s.metaItem}>
              <Ionicons name="musical-note" size={11} color={C.gold} />
              <Text style={s.metaTxt}>{track.bpm} BPM</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="time" size={11} color={C.gray} />
              <Text style={s.metaTxt}>
                {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
              </Text>
            </View>
            <View style={[s.metaItem, { backgroundColor: C.goldDim }]}>
              <Text style={s.metaTxt}>{track.genre}</Text>
            </View>
          </View>
        </View>

        {/* Right: Actions */}
        <View style={s.trackRight}>
          {/* Preview Button */}
          <Pressable
            onPress={() => playPreview(track)}
            disabled={isDownloading}
            style={({ pressed }) => [
              s.actionBtn,
              s.previewBtn,
              isPlaying && s.previewBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={14}
              color={isPlaying ? C.gold : C.muted}
            />
          </Pressable>

          {/* Download / Status */}
          {!isDone && !isError && (
            <Pressable
              onPress={() => downloadMusic(track)}
              disabled={isDownloading}
              style={({ pressed }) => [
                s.actionBtn,
                s.downloadBtn,
                isDownloading && { opacity: 0.7 },
                pressed && !isDownloading && { transform: [{ scale: 0.95 }] },
              ]}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <Ionicons name="download" size={14} color={C.gold} />
              )}
            </Pressable>
          )}

          {isDone && (
            <View style={[s.actionBtn, s.doneBtn]}>
              <Ionicons name="checkmark-circle" size={14} color={C.ok} />
            </View>
          )}

          {isError && (
            <Pressable
              onPress={() => downloadMusic(track)}
              style={[s.actionBtn, s.errorBtn]}
            >
              <Ionicons name="alert-circle" size={14} color={C.danger} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Musiques RHAZN</Text>
            <Text style={s.headerSub}>
              Catalogue officiel · {RHAZN_MUSIC_CATALOG.length} morceaux
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              s.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={24} color={C.white} />
          </Pressable>
        </View>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={14} color={C.blue} />
          <Text style={s.infoTxt}>
            Les musiques téléchargées sont sauvegardées dans votre téléphone.
            Utilisez-les dans CapCut, Adobe Premiere ou votre app préférée.
          </Text>
        </View>

        {/* Tracks List */}
        <FlatList
          data={RHAZN_MUSIC_CATALOG}
          keyExtractor={(item) => item.id}
          renderItem={renderTrack}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        />

        {/* Footer Button */}
        <View style={s.footer}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              s.footerBtn,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={s.footerBtnTxt}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },

  headerTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },

  headerSub: {
    color: C.muted,
    fontSize: 11,
  },

  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    backgroundColor: "rgba(0,122,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.25)",
  },

  infoTxt: {
    color: C.blue,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    flex: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    paddingBottom: 120,
  },

  // Track Card
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.hairline,
  },

  trackLeft: {
    flex: 1,
    gap: 8,
  },

  trackTitle: {
    gap: 2,
  },

  trackTitleTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: "900",
  },

  trackArtist: {
    color: C.muted,
    fontSize: 11,
  },

  trackMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  metaTxt: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
  },

  trackRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  // Action Buttons
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  previewBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: C.border,
  },

  previewBtnActive: {
    backgroundColor: C.goldDim,
    borderColor: "rgba(212,175,55,0.35)",
  },

  downloadBtn: {
    backgroundColor: C.goldDim,
    borderColor: "rgba(212,175,55,0.35)",
  },

  doneBtn: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderColor: "rgba(52,199,89,0.35)",
  },

  errorBtn: {
    backgroundColor: "rgba(255,69,58,0.12)",
    borderColor: "rgba(255,69,58,0.35)",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },

  footerBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  footerBtnTxt: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
  },
});