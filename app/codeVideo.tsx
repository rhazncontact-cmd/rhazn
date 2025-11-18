import { Video } from "expo-av";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Image, PanResponder, StyleSheet, Text, View } from "react-native";

export default function CodeVideo() {
  const { code, video } = useLocalSearchParams();
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  /* ✅ Masquer barre de navigation Android (full immersive) */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(()=>{});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(()=>{}); 
  }, []);

  /* ✅ Swipe left → Back only */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy), // lateral only
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < -50) router.back(); // swipe left
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => {}
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      
      {/* ✅ Logo top-right → Dashboard */}
      <Image
        source={require("../assets/images/rhazn-logo.png")}
        style={styles.logo}
        onTouchEnd={()=>router.push("/dashboard")}
      />

      {/* ✅ Code label top-left */}
      <Text style={styles.codeLabel}>CODE-{code}</Text>

      {/* ✅ FULLSCREEN VIDEO */}
      <Video
        ref={videoRef}
        source={{ uri: String(video) }}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
        isLooping
      />
    </View>
  );
}

/* ✅ Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000"
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "absolute"
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 99
  },
  codeLabel: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 99,
    opacity: 0.9
  }
});
