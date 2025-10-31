import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const { height } = Dimensions.get("window");

// ✅ Base locale de vidéos
const videoDB = {
  1: require("../assets/videos/pact9.mp4"),
  2: require("../assets/videos/pact10.mp4"),
  3: require("../assets/videos/pact11.mp4"),
  4: require("../assets/videos/pact12.mp4"),
};

export default function PactScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const videoUri = videoDB[id] || videoDB[1];

  const videoRef = useRef(null);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [qobCount, setQobCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [qobActive, setQobActive] = useState(false);

  useEffect(() => {
    let timer = null;

    if (videoRef.current) {
      videoRef.current.playAsync?.().catch(() => {});
    }

    timer = setInterval(() => setTimeElapsed((prev) => prev + 1), 1000);

    return () => timer && clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeElapsed >= 10 && !qobActive) {
      setQobActive(true);
      setQobCount((prev) => prev + 1);
    }

    if (timeElapsed >= 125) {
      setIsPlaying(false);
      videoRef.current?.stopAsync?.();
    }
  }, [timeElapsed]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
      />

      {qobActive && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.qobContainer}>
          <Text style={styles.qobText}>+1 QOB ✨</Text>
        </Animated.View>
      )}

      <View style={styles.bottomSection}>
        <Text style={styles.timerText}>
          {isPlaying ? `${125 - timeElapsed}s restantes` : "✅ Terminé"}
        </Text>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => router.back()}
        >
          <Text style={styles.exitText}>Quitter le PACT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { width: "100%", height: height },
  qobContainer: {
    position: "absolute",
    top: 80,
    right: 20,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    padding: 12,
    borderRadius: 10,
  },
  qobText: { color: "#FFD700", fontSize: 18, fontWeight: "bold" },
  bottomSection: {
    position: "absolute", bottom: 50, width: "100%", alignItems: "center",
  },
  timerText: { color: "#aaa", fontSize: 16, marginBottom: 8 },
  exitButton: {
    backgroundColor: "#FFD700", paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20,
  },
  exitText: { color: "#000", fontWeight: "bold", fontSize: 16 },
});
