import * as NavigationBar from "expo-navigation-bar";
import { Slot, usePathname, useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// 🔥 Providers RHAZN
import { UserProvider, useUser } from "../context/UserContext";
import { WalletProvider } from "../context/WalletContext";

// Footer global
import LayoutWithFooter from "./providers/LayoutWithFooter";

// ===================================================
// 🔥 Sous-composant qui gère :
// - Footer
// - ScreenCapture
// - Navbar Android
// - Protection TAN < 50
// ===================================================
function LayoutInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser(); // ← récupère TAN, id, rôle, etc.

  // ============================================
  // 📸 Autoriser capture d'écran (pour éviter crash Android)
  // ============================================
  useEffect(() => {
    ScreenCapture.allowScreenCaptureAsync().catch(() => {});
  }, []);

  // ============================================
  // 🍏 Barre Navigation Android → toujours visible
  // ============================================
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  // ============================================
  // 🔒 PROTECTION : si TAN < 50 → redirection obligatoire
  // ============================================
  useEffect(() => {
    if (!user) return;

    const isHome = pathname === "/" || pathname === "/index";

    if (user.tan < 50 && isHome) {
      router.replace("/agent-buy-acset");
    }
  }, [user, pathname, router]);

  // ============================================
  // 📌 Pages où le footer doit disparaître
  // ============================================
  const noFooterPages = [
    "/",
    "/index",
    "/splash",
    "/welcome",
    "/auth/login",
    "/auth/register",
    "/flux-intro",
  ];

  const showFooter = !noFooterPages.includes(pathname);

  // ============================================
  // 🎨 UI
  // ============================================
  return (
    <View style={{ flex: 1 }}>
      {showFooter ? (
        <LayoutWithFooter>
          <Slot />
        </LayoutWithFooter>
      ) : (
        <Slot />
      )}
    </View>
  );
}

// ===================================================
// 🔥 RootLayout — version officielle et complète
// ===================================================
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <WalletProvider>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle="light-content"
          />
          <LayoutInner />
        </WalletProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
