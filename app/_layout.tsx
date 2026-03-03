// ======================================================
// RHAZN ROOT LAYOUT — FINAL STABLE AUTH SAFE
// Corrige blocage login + navigation + session restore
// ======================================================

import * as NavigationBar from "expo-navigation-bar";
import * as ScreenCapture from "expo-screen-capture";

import { Slot, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { supabase } from "../lib/supabase";

import { UserProvider, useUser } from "../context/UserContext";
import { WalletProvider } from "../context/WalletContext";

import Constants from "expo-constants";
import ProfileNudgeProvider from "./components/ProfileNudgeProvider";
import LayoutWithFooter from "./providers/LayoutWithFooter";

/* ===================================================
   🔥 LAYOUT INTERNE
=================================================== */
function LayoutInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  /* =========================
     MOUNT
  ========================== */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* =========================
     DEBUG SUPABASE
  ========================== */
  useEffect(() => {
    console.log("🧪 SUPABASE URL =", process.env.EXPO_PUBLIC_SUPABASE_URL);
  }, []);

  /* =========================
     SESSION + AUTH LISTENER
  ========================== */
  useEffect(() => {
    if (!mounted) return;

    let alive = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      setHasSession(!!data.session);
      setAuthReady(true);
    };

    init();

    // =====================================================
// AUTH LISTENER STABLE (ANTI LOGOUT FANTÔME)
// =====================================================
const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
  console.log("AUTH EVENT 👉", event);

  if (event === "SIGNED_IN" && session?.user?.id) {
    console.log("SESSION RESTORED");
    setHasSession(true);
    setAuthReady(true);
    return;
  }

  if (event === "TOKEN_REFRESHED" && session?.user?.id) {
    setHasSession(true);
    setAuthReady(true);
    return;
  }

  // ⚠️ IMPORTANT : ignorer SIGNED_OUT fantôme au démarrage
  if (event === "SIGNED_OUT") {
    setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        console.log("FALSE SIGNED_OUT IGNORED");
        return;
      }

      console.log("REAL SIGNED_OUT");
      setHasSession(false);
      router.replace("/auth/login");
    }, 500);
  }
});

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [mounted]);

  /* =========================
     REDIRECTION AUTH SAFE
  ========================== */
  useEffect(() => {
    if (!authReady) return;

    const isAuthPage =
      pathname.startsWith("/auth") ||
      pathname === "/" ||
      pathname === "/index" ||
      pathname === "/welcome" ||
      pathname === "/splash";

    // ❌ pas connecté → login
    if (!hasSession && !isAuthPage) {
      router.replace("/auth/login");
      return;
    }

    // ✅ connecté mais reste sur login → sortir
    if (hasSession && pathname === "/auth/login") {
      router.replace("/rz-roles");
      return;
    }
  }, [authReady, hasSession, pathname]);

  /* =========================
     PUSH TOKEN SAFE
  ========================== */
  useEffect(() => {
    if (!mounted) return;
    if (!user?.id) return;

    const isExpoGo = Constants.executionEnvironment === "storeClient";
    if (isExpoGo) return;

    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (cancelled) return;

        await supabase.from("profiles").update({ expo_push_token: token }).eq("id", user.id);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, user?.id]);

  /* =========================
     SCREENSHOT OK
  ========================== */
  useEffect(() => {
    if (!mounted) return;
    ScreenCapture.allowScreenCaptureAsync().catch(() => {});
  }, [mounted]);

  /* =========================
     ANDROID NAV BAR
  ========================== */
  useEffect(() => {
    if (!mounted) return;
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("visible").catch(() => {});
      NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
    }
  }, [mounted]);

  /* =========================
     FOOTER CONTROL
  ========================== */
  const noFooterPages = [
    "/",
    "/index",
    "/splash",
    "/welcome",
    "/auth/login",
    "/auth/register",
    "/flux-intro",
    "/legal/contract",
    "/legal/signature",
  ];

  const showFooter = !noFooterPages.includes(pathname);

  /* =========================
     UI
  ========================== */
  return (
    <View style={{ flex: 1 }}>
      <LayoutWithFooter enabled={showFooter}>
        <ProfileNudgeProvider>
          <Slot />
        </ProfileNudgeProvider>
      </LayoutWithFooter>
    </View>
  );
}

/* ===================================================
   ROOT
=================================================== */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <WalletProvider>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <LayoutInner />
        </WalletProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}