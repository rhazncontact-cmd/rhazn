import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

/* -----------------------------------------
   🔥 IMPORTANT : Plus AUCUNE mélodie locale
   Une liste vide évite toute erreur Expo.
   (L’option n’est pas encore disponible)
----------------------------------------- */
const TRACKS: any[] = [];

export default function MelodiesRHAZN() {
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [progressWidth, setProgressWidth] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isBusyRef = useRef(false);

  /* Double-tap system bar logic */
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
    setTimeout(() => hideNav(), 3000);
  };

  const onDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      navVisible ? hideNav() : showNav();
    }
    lastTap.current = now;
  };

  useEffect(() => {
    hideNav();
  }, []);

  /* AUDIO CONFIGURATION (safe even without tracks) */
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

  /* ---- Play disabled because no tracks exist ---- */
  const playAt = useCallback(async () => {
    return; // ⛔ L’option n’est pas disponible
  }, [unload]);

  const togglePlay = async () => {
    return; // ⛔ Pas de musique
  };

  const onProgressLayout = (e: LayoutChangeEvent) =>
    setProgressWidth(e.nativeEvent.layout.width);

  const handleSeek = async () => {
    return; // ⛔ Pas de musique
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

        {/* Message d'information */}
        <View style={{ paddingTop: 120, paddingHorizontal: 20 }}>
          <Text style={{ color: "#D4AF37", fontSize: 20, fontWeight: "700", marginBottom: 14 }}>
            Option non disponible
          </Text>
          <Text style={{ color: "#ccc", fontSize: 16, lineHeight: 22 }}>
            Les mélodies seront bientôt activées dans RHAZN.  
            Cette section est en préparation et aucune musique locale n’est chargée.
          </Text>
        </View>
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
});
