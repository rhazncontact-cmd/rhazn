import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { ReactNode, useEffect } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// ⚠️ Remplace ce booléen par ton vrai contrôle de rôle admin
const isAdmin = true;

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Mode immersif (optionnel, tu peux retirer si tu veux)
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});

    return () => {
      NavigationBar.setVisibilityAsync("visible").catch(() => {});
    };
  }, []);

  // Si pas admin → écran verrouillé
  if (!isAdmin) {
    return (
      <View style={styles.locked}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Text style={styles.lockText}>Accès RZ-ADMIN restreint</Text>
      </View>
    );
  }

  // 👉 Swipe gauche = back UNE SEULE FOIS à la fin du geste
  const swipeBack = Gesture.Pan()
    .onEnd((e) => {
      // translationX < 0 → vers la gauche
      if (e.translationX < -60 && Math.abs(e.translationY) < 30) {
        if (router.canGoBack()) {
          router.back(); // revient exactement où tu étais avant
        }
        // sinon : aucune action (on ne force pas Dashboard)
      }
    })
    .activeOffsetX([-20, 20]) // n’active que si assez horizontal
    .failOffsetY([-10, 10]);   // ignore les gros mouvements verticaux

  return (
    <GestureDetector gesture={swipeBack}>
      <View style={styles.wrapper}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  locked: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  lockText: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "700",
  },
});
