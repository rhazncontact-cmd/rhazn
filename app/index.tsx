import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function AppIndex() {
  const router = useRouter();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    // ✔ Router EXPO prêt quand on peut tester une navigation
    const timerReady = setTimeout(() => {
      setNavReady(true);
    }, 120);

    return () => clearTimeout(timerReady);
  }, []);

  useEffect(() => {
    if (!navReady) return;

    const timer = setTimeout(() => {
      try {
        router.replace("/splash");
      } catch (e) {
        console.warn("Navigation error (index):", e);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [navReady]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <ActivityIndicator size="large" color="#FFD700" />
    </View>
  );
}

