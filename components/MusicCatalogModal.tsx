/**
 * components/MusicDownloadModal.tsx
 * ✅ RHAZN — Télécharger les musiques exclusives
 * ✅ Télécharge les MP3 sur le téléphone (Documents)
 * ✅ Aperçu audio + état du téléchargement
 * ✅ Recherche par titre/artiste/genre
 * ✅ Charge les musiques depuis Supabase
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const C = {
  bg:      "#000000",
  card:    "#0E0E0E",
  card2:   "#111111",
  gold:    "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd:  "rgba(212,175,55,0.28)",
  white:   "#FFFFFF",
  gray:    "#9A9A9A",
  muted:   "rgba(255,255,255,0.55)",
  border:  "rgba(255,255,255,0.12)",
  hairline:"rgba(255,255,255,0.07)",
  ok:      "#34C759",
};

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export type MusicTrack = {
  id:           string;
  title:        string;
  artist:       string;
  duration_sec: number;
  file_url:     string;
  genre:        string | null;
};

type DownloadState = {
  [trackId: string]: {
    status: "idle" | "downloading" | "done" | "error";
    progress: number;
    error?: string;
  };
};

type Props = {
  visible:  boolean;
  onClose:  () => void;
};

export default function MusicDownloadModal({ visible, onClose }: Props) {
  const [tracks,       setTracks]       = useState<MusicTrack[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [playingId,    setPlayingId]    = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>({});

  const soundRef     = useRef<Audio.Sound | null>(null);
  const autoStopRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Configurer le mode audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  // ✅ Charger les musiques quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      loadTracks();
    } else {
      killSound();
    }
  }, [visible]);

  // ✅ Stop au changement d'AppState
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        killSound();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => {
      sub.remove();
    };
  }, []);

  // ✅ Cleanup à la démo
  useEffect(() => {
    return () => {
      killSound();
    };
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("id, title, artist, duration_sec, file_url, genre")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erreur chargement catalogue:", error);
        setTracks([]);
      } else {
        setTracks((data ?? []) as MusicTrack[]);
      }
    } catch (e) {
      console.error("❌ Erreur chargement catalogue:", e);
      setTracks([]);
    }
    setLoading(false);
  };

  const killSound = () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    const s = soundRef.current;
    soundRef.current = null;
    setPlayingId(null);
    if (s) {
      s.stopAsync().catch(() => {});
      s.unloadAsync().catch(() => {});
    }
  };

  const togglePreview = async (track: MusicTrack) => {
    if (playingId === track.id) {
      killSound();
      return;
    }

    killSound();

    try {
      Haptics.selectionAsync().catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.file_url },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        null,
        true
      );

      if (soundRef.current !== null) {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;
      setPlayingId(track.id);

      // ✅ Auto-stop après 30 secondes
      autoStopRef.current = setTimeout(() => {
        if (soundRef.current === sound) killSound();
      }, 30_000);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (soundRef.current === sound) killSound();
        }
      });

    } catch (e) {
      console.warn("❌ Erreur preview:", e);
      killSound();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // ✅ TÉLÉCHARGER LA MUSIQUE
  const downloadMusic = async (track: MusicTrack) => {
    try {
      setDownloadState((prev) => ({
        ...prev,
        [track.id]: { status: "downloading", progress: 0 },
      }));

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // ✅ Créer le chemin de destination
      const docDir = FileSystem.documentDirectory ?? "";
      const fileName = `${track.title.replace(/[^a-z0-9]/gi, "_")}_${track.id.slice(0, 8)}.mp3`;
      const filePath = `${docDir}${fileName}`;

      // ✅ Télécharger le fichier
      const downloadResult = await FileSystem.downloadAsync(
        track.file_url,
        filePath,
        {
          progressCallback: (progress) => {
            const percent = Math.round(
              (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100
            );
            setDownloadState((prev) => ({
              ...prev,
              [track.id]: { status: "downloading", progress: percent },
            }));
          },
        }
      );

      if (downloadResult.status === 200) {
        console.log("✅ Musique téléchargée:", fileName);
        setDownloadState((prev) => ({
          ...prev,
          [track.id]: { status: "done", progress: 100 },
        }));

        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});

        // ✅ Auto-reset après 3 secondes
        setTimeout(() => {
          setDownloadState((prev) => ({
            ...prev,
            [track.id]: { status: "idle", progress: 0 },
          }));
        }, 3000);

      } else {
        throw new Error("Erreur téléchargement");
      }

    } catch (error: any) {
      console.error("❌ Erreur téléchargement:", error);
      setDownloadState((prev) => ({
        ...prev,
        [track.id]: {
          status: "error",
          progress: 0,
          error: error.message || "Erreur inconnue",
        },
      }));

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      setTimeout(() => {
        setDownloadState((prev) => ({
          ...prev,
          [track.id]: { status: "idle", progress: 0 },
        }));
      }, 3000);
    }
  };

  const filtered = tracks.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.genre ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={m.overlay}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={m.sheet}>

          {/* Handle */}
          <View style={m.handle} />

          {/* Header */}
          <View style={m.header}>
            <View style={m.headerLeft}>
              <View style={m.iconWrap}>
                <Ionicons name="download" size={18} color={C.gold} />
              </View>
              <View>
                <Text style={m.headerTitle}>Musiques RHAZN</Text>
                <Text style={m.headerSub}>
                  {filtered.length} piste{filtered.length > 1 ? "s" : ""} exclusive{filtered.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                m.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={18} color={C.muted} />
            </Pressable>
          </View>

          {/* Recherche */}
          <View style={m.searchWrap}>
            <Ionicons name="search-outline" size={15} color={C.gray} />
            <TextInput
              placeholder="Rechercher titre, artiste, genre…"
              placeholderTextColor={C.gray}
              style={m.searchInput}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={15} color={C.gray} />
              </Pressable>
            )}
          </View>

          {/* Liste */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator color={C.gold} size="large" />
              <Text style={{ color: C.gray, fontWeight: "700" }}>
                Chargement du catalogue…
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                paddingHorizontal: 40,
              }}
            >
              <View style={m.emptyIcon}>
                <Ionicons
                  name="musical-notes-outline"
                  size={32}
                  color={C.gold}
                />
              </View>
              <Text style={{ color: C.white, fontWeight: "900", fontSize: 16 }}>
                {search ? "Aucun résultat" : "Catalogue vide"}
              </Text>
              <Text
                style={{
                  color: C.muted,
                  fontWeight: "600",
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 19,
                }}
              >
                {search
                  ? `Aucune piste ne correspond à "${search}"`
                  : "L'administrateur RHAZN n'a pas encore ajouté de pistes musicales."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(t) => t.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const state = downloadState[item.id] ?? {
                  status: "idle",
                  progress: 0,
                };
                const isPlaying = playingId === item.id;
                const isDownloading = state.status === "downloading";
                const isDone = state.status === "done";
                const isError = state.status === "error";

                return (
                  <View style={m.trackCard}>

                    {/* Bouton preview */}
                    <Pressable
                      onPress={() => togglePreview(item)}
                      disabled={isDownloading}
                      style={({ pressed }) => [
                        m.previewBtn,
                        isPlaying && m.previewBtnActive,
                        pressed && !isDownloading && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={16}
                        color={isPlaying ? "#000" : C.gold}
                      />
                    </Pressable>

                    {/* Infos */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={m.trackTitle}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <Text style={m.trackMeta}>
                        {item.artist}
                        {item.genre ? ` · ${item.genre}` : ""}
                        {item.duration_sec > 0
                          ? ` · ${fmtTime(item.duration_sec)}`
                          : ""}
                      </Text>

                      {isPlaying && (
                        <View style={m.waveRow}>
                          {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                            <View
                              key={i}
                              style={[
                                m.waveLine,
                                { height: h * 3 },
                              ]}
                            />
                          ))}
                          <Text style={m.playingTxt}>
                            Écoute en cours…
                          </Text>
                        </View>
                      )}

                      {isDownloading && (
                        <View style={m.progressBar}>
                          <View
                            style={[
                              m.progressFill,
                              { width: `${state.progress}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>

                    {/* Bouton télécharger */}
                    <Pressable
                      disabled={isDownloading}
                      onPress={() => downloadMusic(item)}
                      style={({ pressed }) => [
                        m.downloadBtn,
                        isDone && m.downloadBtnDone,
                        isError && m.downloadBtnError,
                        pressed && !isDownloading && { opacity: 0.8 },
                      ]}
                    >
                      {isDownloading ? (
                        <ActivityIndicator color={C.gold} size={14} />
                      ) : isDone ? (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={C.ok}
                          />
                          <Text style={m.downloadBtnTxtDone}>
                            Fait
                          </Text>
                        </>
                      ) : isError ? (
                        <>
                          <Ionicons
                            name="alert-circle"
                            size={14}
                            color="#FF3B30"
                          />
                          <Text style={m.downloadBtnTxtError}>
                            Erreur
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-download"
                            size={14}
                            color={C.gold}
                          />
                          <Text style={m.downloadBtnTxt}>
                            Télécharger
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 0,
    height: "85%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginBottom: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBd,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.white,
    fontWeight: "900",
    fontSize: 17,
  },
  headerSub: {
    color: C.gray,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: C.white,
    fontSize: 14,
    fontWeight: "600",
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBd,
    alignItems: "center",
    justifyContent: "center",
  },

  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0E0E0E",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  previewBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBd,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  previewBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  trackTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
    flex: 1,
  },
  trackMeta: {
    color: C.gray,
    fontWeight: "600",
    fontSize: 11,
    marginTop: 3,
  },

  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 5,
  },
  waveLine: {
    width: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  playingTxt: {
    color: C.gold,
    fontWeight: "700",
    fontSize: 10,
    marginLeft: 4,
  },

  progressBar: {
    height: 4,
    backgroundColor: "rgba(212,175,55,0.2)",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.gold,
    borderRadius: 2,
  },

  downloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.12)",
    borderWidth: 1,
    borderColor: C.goldBd,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  downloadBtnDone: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderColor: "rgba(52,199,89,0.28)",
  },
  downloadBtnError: {
    backgroundColor: "rgba(255,59,48,0.12)",
    borderColor: "rgba(255,59,48,0.28)",
  },
  downloadBtnTxt: {
    color: C.gold,
    fontWeight: "900",
    fontSize: 11,
  },
  downloadBtnTxtDone: {
    color: C.ok,
    fontWeight: "900",
    fontSize: 11,
  },
  downloadBtnTxtError: {
    color: "#FF3B30",
    fontWeight: "900",
    fontSize: 11,
  },
});