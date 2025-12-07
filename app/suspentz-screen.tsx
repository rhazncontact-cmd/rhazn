// app/suspentz-screen.tsx
// 🔥 VERSION CLOUD — SUSPENTZ STREAMING

import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const { height } = Dimensions.get("window");

export default function SuspentzScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);

  const videoRef = useRef(null);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [qobCount, setQobCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [qobActive, setQobActive] = useState(false);

  // 🔥 Charger la vidéo depuis Supabase
  useEffect(() => {
    const loadVideo = async () => {
      const { data, error } = await supabase
        .from("suspentz")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.log("VIDEO NOT FOUND", error);
        router.back();
        return;
      }

      setVideoUrl(data.video_url);
      setLoading(false);
    };

    loadVideo();
  }, [id]);

  // Lance la vidéo + timer
  useEffect(() => {
    if (loading) return;

    if (videoRef.current) {
      videoRef.current.playAsync?.().catch(() => {});
    }

    const timer = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);

    return () => clearInterval(timer);
  }, [loading]);

  // QOB + Stop vidéo
  useEffect(() => {
    if (timeElapsed >= 10 && !qobActive) {
      setQobActive(true);
      setQobCount(prev => prev + 1);
    }

    if (timeElapsed >= 125) {
      setIsPlaying(false);
      videoRef.current?.stopAsync?.();
    }
  }, [timeElapsed]);

  if (loading || !videoUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: "#aaa", marginTop: 10 }}>Chargement du SUSPENTZ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}   // 🔥 CLOUD STREAMING
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
          <Text style={styles.exitText}>Quitter le SUSPENTZ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent:"center", alignItems:"center" },
  video: { width: "100%", height: height, position:"absolute" },
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
