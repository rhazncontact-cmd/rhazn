import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as NavigationBar from "expo-navigation-bar"; // ✅ ajouté
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

const TRACKS = [
  { title: "Dark Waltz", file: require("../assets/tracks/01-grand-dark-waltz.mp3") },
  { title: "Evening", file: require("../assets/tracks/02-evening.mp3") },
  { title: "One Moment", file: require("../assets/tracks/03-zen-moment.mp3") },
  { title: "Stick", file: require("../assets/tracks/04-stick.mp3") },
  { title: "Latin Dance", file: require("../assets/tracks/05-latin-dance.mp3") },
  { title: "Beach", file: require("../assets/tracks/06-beach.mp3") },
  { title: "Samba", file: require("../assets/tracks/22-samba.mp3") },
  { title: "Romantic", file: require("../assets/tracks/24-romantic.mp3") },
  { title: "Villa-penthouse", file: require("../assets/tracks/20-villa-penthouse.mp3") },
  { title: "Emotional-drums", file: require("../assets/tracks/16-emotional-drums.mp3") },
];

export default function MelodiesRHAZN() {
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [progressWidth, setProgressWidth] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isBusyRef = useRef(false);

  /* ✅ Double-tap system bar logic */
  const lastTap = useRef<number>(0);
  const [navVisible, setNavVisible] = useState(false);

  const hideNav = async () => {
    await NavigationBar.setVisibilityAsync("hidden");
    await NavigationBar.setBehaviorAsync("overlay-swipe");
    setNavVisible(false);
  };

  const showNav = async () => {
    await NavigationBar.setVisibilityAsync("visible");
    setNavVisible(true);
    setTimeout(() => hideNav(), 3000); // auto-hide after 3s
  };

  const onDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      navVisible ? hideNav() : showNav();
    }
    lastTap.current = now;
  };

  useEffect(() => {
    hideNav(); // ✅ hide nav bar on load
  }, []);

  /* AUDIO CONFIGURATION */
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    });
    return () => unload();
  }, []);

  const unload = useCallback(async () => {
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const playAt = useCallback(
    async (i: number) => {
      if (isBusyRef.current) return;
      isBusyRef.current = true;

      try {
        await unload();

        const s = new Audio.Sound();
        await s.loadAsync(TRACKS[i].file, { shouldPlay: true });

        soundRef.current = s;
        setIndex(i);
        setPlaying(true);

        s.setOnPlaybackStatusUpdate((st) => {
          if (!st.isLoaded) return;
          setPosition(st.positionMillis ?? 0);
          setDuration(st.durationMillis ?? 1);
          setPlaying(st.isPlaying ?? false);
        });
      } catch (e) {
        console.log("Audio error:", e);
      }

      isBusyRef.current = false;
    },
    [unload]
  );

  const togglePlay = async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;

    try {
      if (!soundRef.current) return;
      const st = await soundRef.current.getStatusAsync();
      if (!st.isLoaded) return;

      if (st.isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setPlaying(true);
      }
    } finally {
      isBusyRef.current = false;
    }
  };

  const onProgressLayout = (e: LayoutChangeEvent) =>
    setProgressWidth(e.nativeEvent.layout.width);

  const handleSeek = async (evt: any) => {
    if (!soundRef.current) return;
    const x = evt.nativeEvent.locationX;
    const ratio = x / progressWidth;
    await soundRef.current.setPositionAsync(ratio * duration);
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const progress = duration ? position / duration : 0;

  return (
    <TouchableWithoutFeedback onPress={onDoubleTap}>  
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" hidden={true} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color="#D4AF37" />
          </TouchableOpacity>

          <Text style={styles.title}>Mélodies — RHAZN</Text>

          <TouchableOpacity onPress={() => router.push("/")} style={styles.iconBtn}>
            <Ionicons name="home" size={24} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={TRACKS}
          keyExtractor={(_, i) => `${i}`}
          contentContainerStyle={{ paddingTop: 90, paddingBottom: 150 }}
          renderItem={({ item, index: i }) => {
            const active = index === i && isPlaying;
            return (
              <TouchableOpacity onPress={() => playAt(i)} style={[styles.trackItem, active && styles.trackActive]}>
                <TouchableOpacity onPress={() => playAt(i)} style={[styles.playBtn, active && styles.playBtnActive]}>
                  <Ionicons name={active ? "pause" : "play"} size={20} color="#000" />
                </TouchableOpacity>

                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle}>
                    {(i + 1).toString().padStart(2, "0")} · {item.title}
                  </Text>
                  <Text style={styles.trackMeta}>Format : MP3 · 105s max · Qualité Studio</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {index !== null && (
          <View style={styles.playerBar}>
            <TouchableOpacity onPress={togglePlay} style={styles.bigBtn}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#000" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.nowTitle}>{(index + 1).toString().padStart(2, "0")} · {TRACKS[index].title}</Text>
              <Text style={styles.nowTime}>{fmt(position)} / {fmt(duration)}</Text>

              <TouchableOpacity onPress={handleSeek}>
                <View style={styles.progressContainer} onLayout={onProgressLayout}>
                  <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => playAt((index + 1) % TRACKS.length)} style={styles.nextBtn}>
              <Ionicons name="play-skip-forward" size={20} color="#D4AF37" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute", top: 0, left: 0, right: 0,
    paddingTop: 40, paddingHorizontal: 20, paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.94)",
    borderBottomWidth: 1, borderColor: "rgba(212,175,55,0.18)",
    zIndex: 50, flexDirection: "row", justifyContent: "space-between", alignItems: "center"
  },
  iconBtn: { width: 42, height: 42, justifyContent: "center", alignItems: "center" },
  title: { color: "#D4AF37", fontSize: 18, fontWeight: "700" },
  trackItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(26,26,26,0.6)"
  },
  trackActive: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderLeftWidth: 3,
    borderLeftColor: "#D4AF37"
  },
  playBtn: {
    width: 50, height: 50, borderRadius: 50,
    backgroundColor: "#D4AF37",
    justifyContent: "center", alignItems: "center"
  },
  playBtnActive: { shadowColor: "#D4AF37", shadowOpacity: 0.9, shadowRadius: 10 },
  trackInfo: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  trackMeta: { fontSize: 13, color: "#888" },
  playerBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, flexDirection: "row", gap: 14, alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.96)",
    borderTopWidth: 1, borderTopColor: "rgba(212,175,55,0.18)"
  },
  bigBtn: {
    width: 58, height: 58, borderRadius: 58,
    backgroundColor: "#D4AF37",
    justifyContent: "center", alignItems: "center"
  },
  nextBtn: {
    width: 48, height: 48, borderRadius: 48,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.5)",
    justifyContent: "center", alignItems: "center"
  },
  nowTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  nowTime: { color: "#D4AF37", fontSize: 13, marginBottom: 6 },
  progressContainer: { height: 4, backgroundColor: "#222", borderRadius: 2 },
  progressBar: { height: "100%", backgroundColor: "#D4AF37", borderRadius: 2 }
});
