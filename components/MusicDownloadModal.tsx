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
  bg: "#000000",
  card: "#0E0E0E",
  gold: "#D4AF37",
  goldDim: "rgba(212,175,55,0.12)",
  goldBd: "rgba(212,175,55,0.28)",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  muted: "rgba(255,255,255,0.55)",
  border: "rgba(255,255,255,0.12)",
  hairline: "rgba(255,255,255,0.07)",
  ok: "#34C759",
  danger: "#FF453A",
};

const fmtTime = (sec: number) => {
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
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function MusicDownloadModal({
  visible,
  onClose,
}: Props) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  // ─────────────────────────────────────────────
  // AUDIO MODE
  // ─────────────────────────────────────────────

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {});
  }, []);

  // ─────────────────────────────────────────────
  // APP STATE
  // ─────────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state !== "active") {
          stopSound();
        }
      }
    );

    return () => sub.remove();
  }, []);

  // ─────────────────────────────────────────────
  // MODAL OPEN
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      loadTracks();
    } else {
      stopSound();
    }
  }, [visible]);

  // ─────────────────────────────────────────────
  // STOP SOUND
  // ─────────────────────────────────────────────

  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
      }
    } catch {}

    soundRef.current = null;
    setPlayingId(null);
  };

  // ─────────────────────────────────────────────
  // LOAD TRACKS
  // ─────────────────────────────────────────────

  const loadTracks = async () => {
  try {
    setLoading(true);

    console.log("🎵 Chargement catalogue RHAZN...");

    // ✅ TEST SESSION
    const { data: sessionData } =
      await supabase.auth.getSession();

    console.log(
      "🔐 SESSION USER =",
      sessionData?.session?.user?.email
    );

    // ✅ REQUETE
    const { data, error } = await supabase
      .from("music_tracks")
      .select("*")
      .order("created_at", { ascending: false });

    // ✅ LOG ERREUR
    if (error) {
      console.log("❌ ERREUR SUPABASE =", error);

      setTracks([]);
      return;
    }

    // ✅ LOG DATA BRUTE
    console.log("🔥 DATA BRUTE =", data);

    // ✅ SECURITE
    const cleaned = (data ?? []).map((t) => ({
      ...t,
      file_url: t?.file_url || "",
    }));

    // ✅ LOG CLEANED
    console.log("🔥 CLEANED =", cleaned);

    // ✅ TOTAL
    console.log("🔥 TOTAL =", cleaned.length);

    // ✅ TEST PREMIER ITEM
    if (cleaned.length > 0) {
      console.log(
        "🎵 PREMIER TRACK =",
        cleaned[0]
      );

      console.log(
        "🎵 URL =",
        cleaned[0]?.file_url
      );
    }

    // ✅ SET TRACKS
    setTracks(cleaned);

    console.log("✅ TRACKS ENVOYÉES AU STATE");
  } catch (e) {
    console.log("❌ EXCEPTION TRACKS =", e);

    setTracks([]);
  } finally {
    setLoading(false);

    console.log("🏁 FIN LOAD TRACKS");
  }
};

  // ─────────────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────────────

  const togglePreview = async (track: MusicTrack) => {
    try {
      if (playingId === track.id) {
        await stopSound();
        return;
      }

      await stopSound();

      Haptics.selectionAsync().catch(() => {});

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.file_url },
        {
          shouldPlay: true,
          volume: 1,
        }
      );

      soundRef.current = sound;

      setPlayingId(track.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (
          status.isLoaded &&
          status.didJustFinish
        ) {
          stopSound();
        }
      });
    } catch (e) {
      console.log("❌ Preview error:", e);
      stopSound();
    }
  };

  // ─────────────────────────────────────────────
  // DOWNLOAD
  // ─────────────────────────────────────────────

  const downloadTrack = async (track: MusicTrack) => {
    try {
      Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});

      const safeName = track.title
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 30);

      const path =
        FileSystem.documentDirectory +
        `${safeName}.mp3`;

      const result = await FileSystem.downloadAsync(
        track.file_url,
        path
      );

      console.log("✅ Download OK:", result.uri);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } catch (e) {
      console.log("❌ Download error:", e);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    }
  };

  // ─────────────────────────────────────────────
  // FILTERED
  // ─────────────────────────────────────────────

  const filtered = tracks.filter((t) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      t.title?.toLowerCase().includes(q) ||
      t.artist?.toLowerCase().includes(q) ||
      t.genre?.toLowerCase().includes(q)
    );
  });

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  console.log("🎯 RENDER TRACKS =", tracks.length);
console.log("🎯 FILTERED =", filtered.length);
console.log("🎯 VISIBLE =", visible);

  return (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    statusBarTranslucent
    onRequestClose={onClose}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "flex-end",
      }}
    >
      {/* BACKDROP */}
      <Pressable
        style={{
          ...StyleSheet.absoluteFillObject,
        }}
        onPress={onClose}
      />

      {/* SHEET */}
      <View
        style={{
          flex: 1,
          marginTop: 90,
          backgroundColor: "#000",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
        }}
      >
        {/* HANDLE */}
        <View
          style={{
            width: 42,
            height: 5,
            borderRadius: 99,
            backgroundColor: "rgba(255,255,255,0.20)",
            alignSelf: "center",
            marginTop: 10,
            marginBottom: 18,
          }}
        />

        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 18,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontSize: 19,
              fontWeight: "900",
            }}
          >
            Musiques RHAZN
          </Text>

          <Pressable onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color="#FFF"
            />
          </Pressable>
        </View>

        {/* SEARCH */}
        <View
          style={{
            marginHorizontal: 18,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#111",
            borderRadius: 14,
            paddingHorizontal: 14,
            height: 50,
          }}
        >
          <Ionicons
            name="search"
            size={16}
            color="#999"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Recherche..."
            placeholderTextColor="#777"
            style={{
              flex: 1,
              marginLeft: 10,
              color: "#FFF",
              fontWeight: "600",
            }}
          />
        </View>

        {/* CONTENT */}
        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator color="#D4AF37" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={{
              flex: 1,
            }}
            contentContainerStyle={{
              paddingHorizontal: 18,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View
                style={{
                  paddingTop: 120,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={42}
                  color="#666"
                />

                <Text
                  style={{
                    color: "#888",
                    marginTop: 14,
                    fontWeight: "700",
                  }}
                >
                  Catalogue de musiques RHAZN
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isPlaying =
                playingId === item.id;

              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#0E0E0E",
                    borderRadius: 18,
                    padding: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor:
                      "rgba(255,255,255,0.08)",
                  }}
                >
                  {/* PLAY */}
                  <Pressable
                    onPress={() =>
                      togglePreview(item)
                    }
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: isPlaying
                        ? "#D4AF37"
                        : "rgba(212,175,55,0.12)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={
                        isPlaying
                          ? "pause"
                          : "play"
                      }
                      size={18}
                      color={
                        isPlaying
                          ? "#000"
                          : "#D4AF37"
                      }
                    />
                  </Pressable>

                  {/* TEXT */}
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "#FFF",
                        fontWeight: "800",
                        fontSize: 14,
                      }}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={{
                        color: "#888",
                        marginTop: 4,
                        fontSize: 11,
                      }}
                    >
                      {item.artist}
                    </Text>
                  </View>

                  {/* DOWNLOAD */}
                  <Pressable
                    onPress={() =>
                      downloadTrack(item)
                    }
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor:
                        "rgba(212,175,55,0.12)",
                    }}
                  >
                    <Ionicons
                      name="cloud-download"
                      size={18}
                      color="#D4AF37"
                    />
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

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheet: {
    height: "86%",
    backgroundColor: C.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  handle: {
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginBottom: 18,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    color: C.white,
    fontWeight: "900",
    fontSize: 30,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 18,
    height: 52,
  },

  searchInput: {
    flex: 1,
    color: C.white,
    fontSize: 15,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  emptyTxt: {
    color: C.gray,
    fontWeight: "700",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },

  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBd,
    alignItems: "center",
    justifyContent: "center",
  },

  trackTitle: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
  },

  meta: {
    color: C.gray,
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
  },

  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.goldBd,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },

  downloadTxt: {
    color: C.gold,
    fontWeight: "800",
    fontSize: 11,
  },
});