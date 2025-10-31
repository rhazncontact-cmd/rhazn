import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect } from "react";
import { StatusBar } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    // ✅ Empêcher capture écran
    ScreenCapture.preventScreenCaptureAsync();

    // ✅ Full immersive mode compatible edge-to-edge
    const enableImmersive = async () => {
      try {
        await NavigationBar.setVisibilityAsync("hidden");
      } catch (e) {
        console.log("Immersive nav error:", e);
      }
    };

    enableImmersive();

    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  return (
    <>
      <StatusBar hidden translucent />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          statusBarStyle: "light",
          statusBarColor: "#000",
        }}
      >
        {/* 🚀 Démarrage */}
        <Stack.Screen name="splash" />

        {/* 🎬 Intro sacrée */}
        <Stack.Screen name="welcome" />

        {/* 🔑 Auth */}
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="access" />

        {/* 🧭 Dashboard */}
        <Stack.Screen name="dashboard" />

        {/* 🍇 Intro Flux du Mérite */}
        <Stack.Screen name="flux-intro" />

        {/* 🎥 Flux du Mérite */}
        <Stack.Screen name="flux" />

        {/* 🎵 Player Melodies */}
        <Stack.Screen name="melodies-rhazn" />
      </Stack>
    </>
  );
}
