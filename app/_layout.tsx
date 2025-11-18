import * as NavigationBar from "expo-navigation-bar";
import { Slot, usePathname } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { useEffect } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Providers
import { UserProvider } from "../context/UserContext";
import { WalletProvider } from "../context/WalletContext";

import LayoutWithFooter from "./providers/LayoutWithFooter";

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();

    // NavigationBar stable — désactive le swipe Android natif
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});

    return () => ScreenCapture.allowScreenCaptureAsync();
  }, []);

  const noFooterPages = [
    "/", "/index", "/splash", "/welcome",
    "/auth/login", "/auth/register", "/flux-intro"
  ];

  const showFooter = !noFooterPages.includes(pathname);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <WalletProvider>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

          <View style={{ flex: 1 }}>
            {showFooter ? (
              <LayoutWithFooter>
                <Slot />
              </LayoutWithFooter>
            ) : (
              <Slot />
            )}
          </View>

        </WalletProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
