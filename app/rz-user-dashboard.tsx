// app/rz-user-dashboard.tsx

import { Entypo, Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";
import RZBottomSheet from "./components/RZBottomSheet";

const GOLD = "#D4AF37";

export default function RZUserDashboard() {
  const router = useRouter();

  const [notifCount, setNotifCount] = useState(0);
  const [userUid, setUserUid] = useState<string | null>(null);

  // 🔔 Animation du badge
  const badgeScale = useSharedValue(1);
  const prevCountRef = useRef(0);

  // ================== NOTIFS : CHARGEMENT + REALTIME ==================
  const loadNotifCount = async (uid: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_uid", uid)
      .eq("is_read", false);

    setNotifCount(count || 0);
  };

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid || !isMounted) return;

      setUserUid(uid);
      await loadNotifCount(uid);

      // Realtime notifications
      channel = supabase
        .channel(`notif-badge-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            const n = payload.new as any;
            if (n?.user_uid === uid) {
              loadNotifCount(uid);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ================== ANIMATION BADGE (bounce Apple-like) ==================
  useEffect(() => {
    if (notifCount > prevCountRef.current && notifCount > 0) {
      badgeScale.value = 1.25;
      badgeScale.value = withSpring(1, {
        damping: 7,
        stiffness: 220,
      });
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // ================== BOUTON "TOUT MARQUER COMME LU" ==================
  const markAllAsRead = async () => {
    if (!userUid) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_uid", userUid);

    setNotifCount(0);
  };

  // ================== MENU ==================
  const menu = [
    {
      title: "Accéder à la BANQ",
      desc: "Découvrez les PACT authentiques",
      icon: "film-outline",
      route: "/banq",
      IconLib: Ionicons,
    },
    {
      title: "Explorer",
      desc: "Classements, créateurs, tendances",
      icon: "search",
      route: "/explorer",
      IconLib: Feather,
    },
    {
      title: "Publier un PACT",
      desc: "Partagez votre talent authentique",
      icon: "upload",
      route: "/publish-PACT",
      IconLib: Feather,
    },
    {
      title: "Notifications",
      desc: "QOB reçus, TAN reçus, alertes",
      icon: "notifications-outline",
      route: "/notifications",
      IconLib: Ionicons,
      badgeCount: notifCount,
    },
    {
      title: "Mon Profil",
      desc: "Statistiques, PACT, paramètres",
      icon: "user",
      route: "/profile",
      IconLib: Feather,
    },
    {
      title: "Wallet",
      desc: "ACSET, TAN et transactions",
      icon: "wallet",
      route: "/wallet-utilisateur",
      IconLib: Entypo,
    },
  ];

  // ================== RENDER ==================
  return (
    <View style={styles.container}>
      {/* BARRE NATIVE */}
      <StatusBar translucent={false} backgroundColor="#000" barStyle="light-content" />

      {/* RZ-COMMUNICATION */}
      <View style={styles.rzComWrapper}>
        <View style={styles.grayBar} />
        <Text style={styles.rzComText}>RZ-Communication</Text>
      </View>

      {/* HEADER FLOTTANT */}
      <View style={styles.floatingHeader}>
        <View>
          <Text style={styles.title}>MENU</Text>
          <Text style={styles.subtitle}>
            Le mérite se découvre, se crée et se partage...
          </Text>
        </View>

        <Animated.View entering={FadeInUp.duration(1200)}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* BOUTON "TOUT MARQUER COMME LU" */}
      {notifCount > 0 && (
        <View style={styles.clearWrapper}>
          <TouchableOpacity onPress={markAllAsRead} style={styles.clearNotifBtn}>
            <Text style={styles.clearNotifText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENU SCROLLABLE */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 190, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuContainer}>
          {menu.map((item, i) => (
            <Animated.View key={i} entering={FadeInUp.delay(i * 120)}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.menuIcon}>
                  <item.IconLib name={item.icon} size={24} color={GOLD} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>

                {/* BADGE NOTIFS DYNAMIQUE */}
                {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                  <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
                    <Text style={styles.badgeText}>
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </Text>
                  </Animated.View>
                )}

                <Feather
                  name="chevron-right"
                  size={22}
                  color="rgba(212,175,55,0.6)"
                />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* FOOTER RHAZN */}
      <RZBottomSheet />
    </View>
  );
}

/******************************
 * STYLES
 ******************************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  /* RZ COMMUNICATION */
  rzComWrapper: {
    position: "absolute",
    top: 0,
    width: "100%",
    backgroundColor: "#000",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 30,
  },
  grayBar: {
    width: 180,
    height: 3,
    backgroundColor: "#444",
    borderRadius: 8,
    marginBottom: 6,
  },
  rzComText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  /* HEADER FLOTTANT */
  floatingHeader: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000",
    zIndex: 20,
  },
  logo: { width: 55, height: 55 },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: GOLD,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
    maxWidth: 240,
  },

  /* BOUTON CLEAR NOTIFS */
  clearWrapper: {
    position: "absolute",
    top: 135,
    width: "100%",
    alignItems: "center",
    zIndex: 19,
  },
  clearNotifBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.5)",
  },
  clearNotifText: {
    color: GOLD,
    fontWeight: "700",
    fontSize: 12,
  },

  /* MENU */
  menuContainer: { paddingHorizontal: 20, marginTop: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    marginBottom: 14,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
    marginRight: 15,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
  },
  menuTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  menuDesc: { color: "#888", fontSize: 12, marginTop: 4 },

  /* BADGE NOTIFS */
  badge: {
    backgroundColor: "#FF3B30",
    minWidth: 22,
    height: 22,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
});
