// ======================================================
// RHAZN ROOT LAYOUT
// ✅ Session permanente (jamais de déconnexion fantôme)
// ✅ Offline-safe
// ✅ Son notifications
// ✅ usePresence — ping toutes les 30s quand app ouverte
// ======================================================

// ✅ DOIT être ligne 1 ABSOLUE
import 'react-native-gesture-handler';

import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { Slot, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import 'react-native-gesture-handler';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NetInfo from "@react-native-community/netinfo";
import * as Linking from "expo-linking";
import AcsetRewardAlert from "../components/AcsetRewardAlert";
import AppUpdateAlert from "../components/AppUpdateAlert";
import FloatingReplyButton from "../components/FloatingReplyButton";
import ProfileNudgeProvider from "../components/ProfileNudgeProvider";
import { UserProvider } from "../context/UserContext";
import { WalletProvider } from "../context/WalletContext";
import { logoutStore } from "../lib/logoutStore";
import { notifSound } from "../lib/notifSound";
import { supabase } from "../lib/supabase";
import { updateStore } from "../lib/useAppUpdate";
import { usePresence } from "../lib/usePresence";
import LayoutWithFooter from "./providers/LayoutWithFooter";

/* ===================================================
   PAGES SANS FOOTER
=================================================== */
const NO_FOOTER_PAGES = [
  "/", "/index", "/splash", "/flux-intro",
  "/auth/login", "/auth/register",
  "/legal/contract", "/legal/signature",
  "/edit-profile",
];

/* ===================================================
   PAGES AUTH
=================================================== */
const AUTH_PAGES = [
  "/auth/login", "/auth/register",
  "/splash", "/flux-intro",
  "/legal/contract", "/legal/signature",
  "/edit-profile",
];

/* ===================================================
   ERROR BOUNDARY
=================================================== */
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.log("RHAZN CRASH", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
          <Text style={{ color: "#D4AF37" }}>Une erreur est survenue</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ===================================================
   LAYOUT INTERNE
=================================================== */
function LayoutInner() {
  const pathname = usePathname();
  const router   = useRouter();

  const [mounted,    setMounted]    = useState(false);
  const [authReady,  setAuthReady]  = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [offline,    setOffline]    = useState(false);

  const pathnameRef    = useRef(pathname);
  const routingLock    = useRef(false);
  const hasRoutedOnce  = useRef(false);
  const isOnline       = useRef(true);
  const sessionCache   = useRef<string | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { setMounted(true); }, []);

  // ✅ Présence temps réel — ping 30s quand app ouverte
  usePresence();

  /* ===================================================
     RÉSEAU
  =================================================== */
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      isOnline.current = online;
      setOffline(!online);
      console.log("🌐 Réseau:", online ? "EN LIGNE" : "HORS LIGNE");
    });
    return () => unsub();
  }, []);

  /* ===================================================
     ROUTING CENTRAL
  =================================================== */
  const checkAndRoute = async (uid: string) => {
    if (!isOnline.current) {
      console.log("📵 Offline → aucun routing");
      routingLock.current = false;
      return;
    }

    if (routingLock.current) return;
    routingLock.current = true;

    const LEGAL_FLOW = ["/legal/contract", "/legal/signature", "/splash", "/flux-intro"];
    if (LEGAL_FLOW.some(p => pathnameRef.current.startsWith(p))) {
      routingLock.current = false;
      return;
    }

    const MAIN_PAGES = ["/banq", "/rz-channel", "/user-", "/mon-espace", "/user-space", "/agent", "/admin"];
    if (MAIN_PAGES.some(p => pathnameRef.current.startsWith(p))) {
      routingLock.current = false;
      return;
    }

    if (!isOnline.current && sessionCache.current) {
      console.log("📵 Offline + session connue → pas de redirect");
      routingLock.current = false;
      return;
    }

    try {
      let profile = null;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from("profiles")
          .select("contract_accepted_at, signature_accepted_at, avatar_url, full_name")
          .eq("id", uid)
          .maybeSingle();
        if (data) { profile = data; break; }
        await new Promise(r => setTimeout(r, 600));
      }

      if (!profile?.contract_accepted_at) {
        router.replace("/splash");
        return;
      }

      if (!profile?.signature_accepted_at) {
        router.replace("/legal/signature");
        return;
      }

      if (!profile.avatar_url || !profile.full_name || profile.full_name.length < 3) {
        if (!pathnameRef.current.startsWith("/edit-profile")) {
          router.replace("/edit-profile");
        }
        return;
      }

      const needsRedirect =
        pathnameRef.current === "/" ||
        pathnameRef.current === "/index" ||
        pathnameRef.current.startsWith("/auth");

      if (needsRedirect) {
        router.replace("/banq/suspentz");
      }

    } catch (e) {
      console.warn("checkAndRoute error:", e);
    } finally {
      setTimeout(() => { routingLock.current = false; }, 2000);
    }
  };

  /* ===================================================
     SESSION INIT + AUTH LISTENER
  =================================================== */
  useEffect(() => {
    if (!mounted) return;
    let alive = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const uid  = data.session?.user?.id ?? null;
      const hasS = !!uid;

      if (uid) sessionCache.current = uid;

      setHasSession(hasS);
      setAuthReady(true);

      if (hasS && !hasRoutedOnce.current) {
        hasRoutedOnce.current = true;
        await checkAndRoute(data.session!.user.id);
      }
    };

    init();

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      console.log("🔗 Deep link reçu dans _layout:", url);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AUTH EVENT 👉", event);

      if (event === "PASSWORD_RECOVERY") {
        console.log("🔑 PASSWORD_RECOVERY event → reset-password");
        hasRoutedOnce.current = true;
        router.replace("/auth/reset-password");
        return;
      }

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user?.id) {
        setHasSession(true);
        setAuthReady(true);
        sessionCache.current = session.user.id;

        const currentPath = pathnameRef?.current ?? "";
        if (currentPath.includes("reset-password")) {
          console.log("SIGNED_IN ignoré — utilisateur sur reset-password");
          return;
        }

        if (!hasRoutedOnce.current) {
          hasRoutedOnce.current = true;
          await checkAndRoute(session.user.id);
        }
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        setHasSession(true);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (!logoutStore.isExplicit) {
          await new Promise(r => setTimeout(r, 1500));
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.id) {
            console.log("SIGNED_OUT ignoré — session toujours active");
            return;
          }
        }

        if (alive) {
          logoutStore.reset();
          hasRoutedOnce.current = false;
          setHasSession(false);
          try { Notifications.setBadgeCountAsync(0); } catch {}
          router.replace("/auth/login");
        }
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [mounted]);

  /* ===================================================
     APP STATE — reprise depuis background
  =================================================== */
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState !== "active") return;

      if (!isOnline.current && sessionCache.current) {
        console.log("📵 AppState active offline — session conservée");
        setHasSession(true);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          sessionCache.current = data.session.user.id;
          setHasSession(true);
        }
      } catch (_e) {
        if (sessionCache.current) setHasSession(true);
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, []);

  /* ===================================================
     GUARD MINIMAL
  =================================================== */
  useEffect(() => {
    if (!authReady) return;

    if (!isOnline.current) {
      console.log("📵 Guard bloqué — offline");
      return;
    }

    const isAuthPage = AUTH_PAGES.some(p => pathname === p || pathname.startsWith("/auth"));
    const isRootPage = pathname === "/" || pathname === "/index";

    if (!isOnline.current && sessionCache.current) {
      console.log("📵 Guard offline — pas de redirect, session connue");
      return;
    }

    if (!hasSession && !isAuthPage && isOnline.current) {
      router.replace("/auth/login");
      return;
    }

    if (hasSession && isRootPage && !routingLock.current) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) checkAndRoute(data.user.id);
      });
    }
  }, [authReady, hasSession]);

  /* ===================================================
     NAVIGATION BAR ANDROID
  =================================================== */
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
      NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
    }
  }, []);

  /* ===================================================
     POLLING UPDATE
  =================================================== */
  useEffect(() => {
    updateStore.startPolling();
  }, []);

  /* ===================================================
     ✅ SON NOTIFICATIONS — init au montage
  =================================================== */
  useEffect(() => {
    (async () => {
      try {
        await notifSound.init();
        console.log("🔔 _layout — notifSound initialisé ✅");
      } catch (e: any) {
        console.warn("🔔 _layout — notifSound init error:", e?.message);
      }
    })();
    return () => {
      notifSound.unload();
    };
  }, []);

  /* ===================================================
     ✅ BADGE ICÔNE APP — nombre de notifs non-lues
  =================================================== */
  useEffect(() => {
    if (!hasSession) return;

    // Demander permission badge (iOS)
    Notifications.requestPermissionsAsync({
      ios: { allowBadge: true },
    }).catch(() => {});

    let alive = true;

    const updateBadge = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (!uid || !alive) return;

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_uid", uid)
          .eq("is_read", false);

        const n = count ?? 0;
        // ✅ Mettre à jour le badge de l'icône de l'app
        await Notifications.setBadgeCountAsync(n);
      } catch {}
    };

    // Mettre à jour immédiatement
    updateBadge();

    // Écouter les nouvelles notifications en realtime
    const channel = supabase
      .channel("badge-update")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
      }, () => { updateBadge(); })
      .subscribe();

    // Mettre à jour quand l'app revient au premier plan
    const { AppState } = require("react-native");
    const appSub = AppState.addEventListener("change", (state: string) => {
      if (state === "active") updateBadge();
    });

    return () => {
      alive = false;
      supabase.removeChannel(channel);
      appSub.remove();
    };
  }, [hasSession]);

  /* ===================================================
     ✅ REALTIME NOTIFICATIONS + SON
  =================================================== */
  useEffect(() => {
    if (!hasSession) {
      console.log("🔔 _layout — pas de session, canal son non créé");
      return;
    }

    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id ?? null;

        console.log("🔔 _layout — uid pour son:", uid ?? "NULL ❌");

        if (!uid || !alive) return;

        const channelName = `global-notif-sound-${uid}`;
        console.log("🔔 _layout — création canal:", channelName);

        channelRef = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            {
              event:  "INSERT",
              schema: "public",
              table:  "notifications",
              filter: `user_uid=eq.${uid}`,
            },
            async (payload: any) => {
              console.log("🔔 _layout — PAYLOAD REÇU ✅ titre:", payload?.new?.title);
              try {
                await notifSound.play();
                console.log("🔔 _layout — son joué ✅");
              } catch (e: any) {
                console.warn("🔔 _layout — erreur play:", e?.message);
              }
            }
          )
          .subscribe((status: string) => {
            console.log("🔔 _layout — statut canal:", status);
            if (status === "SUBSCRIBED") {
              console.log("🔔 _layout — canal actif, prêt à recevoir ✅");
            }
            if (status === "CHANNEL_ERROR") {
              console.warn("🔔 _layout — CHANNEL_ERROR — reconnexion auto Supabase");
            }
          });

      } catch (e: any) {
        console.warn("🔔 _layout — erreur setup canal:", e?.message);
      }
    })();

    return () => {
      alive = false;
      if (channelRef) {
        supabase.removeChannel(channelRef).catch(() => {});
        channelRef = null;
        console.log("🔔 _layout — canal son retiré");
      }
    };
  }, [hasSession]);

  const showFooter = !NO_FOOTER_PAGES.includes(pathname);

  return (
    <View style={{ flex: 1 }}>
      <LayoutWithFooter enabled={showFooter}>
        <ProfileNudgeProvider>
          <Slot />
        </ProfileNudgeProvider>
      </LayoutWithFooter>

      {/* Bannière offline */}
      {offline && (
        <View
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            right: 20,
            backgroundColor: "#111",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "#333",
            zIndex: 9999,
          }}
        >
          <Text style={{ color: "#D4AF37", fontWeight: "600", fontSize: 14, textAlign: "center" }}>
            ⚠️ Connexion internet instable
          </Text>
          <Text style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 4 }}>
            Certaines fonctionnalités peuvent être limitées
          </Text>

           {/* ✅ Bouton Fermer */}
    <TouchableOpacity
      onPress={() => setOffline(false)}
      style={{
        marginTop: 10,
        alignSelf: "center",
        backgroundColor: "#D4AF37",
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 24,
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: "#000", fontWeight: "700", fontSize: 13 }}>
        Compris
      </Text>
    </TouchableOpacity>
  </View>
)}

      {/* ✅ Bouton flottant Répondre — admins support uniquement */}
      {hasSession && <FloatingReplyButton />}

      {/* ✅ Alerte récompense ACSET — toutes les 20 TAN dépensées */}
      <AcsetRewardAlert hasSession={hasSession} />

      <AppUpdateAlert />
    </View>
  );
}

/* ===================================================
   ROOT
=================================================== */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}