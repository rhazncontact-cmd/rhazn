import { Video } from "expo-av"; // ⚡️ API officielle stable
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
// Assure-toi d’avoir installé expo-av :  npm install expo-av

const { width, height } = Dimensions.get("window");

export default function TestVideo() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);

  // 🎬 Animation d’apparition fluide
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <Video
          ref={videoRef}
          source={require("../assets/videos/intro.mp4")} // ✅ Vidéo locale
          style={styles.video}
          resizeMode="COVER"
          shouldPlay
          isLooping
          useNativeControls={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: width,
    height: height,
  },
});
