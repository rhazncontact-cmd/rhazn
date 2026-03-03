import {
  Entypo,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/* 🔔 BADGE NOTIFICATIONS (SAFE) */
let useNotificationBadgeSafe = () => 0;
try {
  // @ts-ignore
  ({ useNotificationBadge: useNotificationBadgeSafe } =
    require("../hooks/useNotificationBadge"));
} catch {}

/* 🎨 PALETTE RHAZN — Apple-like */
const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  gold: "#D4AF37",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  hairline: "rgba(255,255,255,0.08)",
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COMM_HEIGHT = SCREEN_HEIGHT;

export default function RZUserDashboard() {
  const router = useRouter();

  const notifCount = useNotificationBadgeSafe();
  const [isCommOpen, setIsCommOpen] = useState(false);

  /* ===================== ANIMATIONS ===================== */
  const commTranslateY = useSharedValue(COMM_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const springIOS = { damping: 22, stiffness: 220 };

  const commStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: commTranslateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  /* ===================== ANDROID NAV BAR ===================== */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  /* ===================== RZ-COMM ===================== */
  const openRZCommunication = () => {
    if (isCommOpen) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCommOpen(true);
    backdropOpacity.value = withTiming(0.45, { duration: 220 });
    commTranslateY.value = withSpring(0, springIOS);
  };

  const closeRZCommunication = () => {
    if (!isCommOpen) return;
    backdropOpacity.value = withTiming(0, { duration: 180 });
    commTranslateY.value = withSpring(COMM_HEIGHT, springIOS);
    setTimeout(() => setIsCommOpen(false), 260);
  };

  /* ===================== GESTURE ===================== */
  const panCommClose = Gesture.Pan()
    .onUpdate((e) => {
      if (!isCommOpen) return;
      if (e.translationY > 0) {
        commTranslateY.value = Math.min(e.translationY, COMM_HEIGHT);
      }
    })
    .onEnd((e) => {
      if (!isCommOpen) return;
      const shouldClose = e.translationY > 120 || e.velocityY > 900;
      if (shouldClose) {
        runOnJS(closeRZCommunication)();
      } else {
        commTranslateY.value = withSpring(0, springIOS);
      }
    });

  /* ===================== SAFE NAV ===================== */
  const safeNavigate = (route: string) => {
    Haptics.selectionAsync();
    if (isCommOpen) closeRZCommunication();
    setTimeout(() => router.push(route as any), 220);
  };

  /* ===================== MENU ===================== */
const menu = [
  {
    title: "Accéder à la BANQ",
    icon: "account-balance",
    route: "/banq/",
    IconLib: MaterialIcons,
  },
  {
    title: "Publier un PACT",
    icon: "search",
    route: "/user-publish-pact/",
    IconLib: Feather,
  },

  /* ✅ NOUVELLE CARTE (remplace bouton i) */
  {
    title: "PACT – Exigences",
    icon: "shield-checkmark-outline",
    route: "/user-rules",
    IconLib: Ionicons,
  },

  {
    title: "Video-Infos",
    icon: "videocam-outline",
    route: "/user-video-infos/",
    IconLib: Ionicons,
  },
  {
    title: "Notifications",
    icon: "notifications-outline",
    route: "/user-notifications/",
    IconLib: Ionicons,
    badgeCount: notifCount,
  },
];

 return (
  <View style={styles.container}>
    <StatusBar backgroundColor={COLORS.bg} barStyle="light-content" />

    {/* ================= HEADER ================= */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Tableau de bord</Text>
      <Text style={styles.headerSubtitle}>Espace personnel RHAZN</Text>

      <TouchableOpacity
        style={styles.roleSwitchButton}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.selectionAsync();
          router.replace("/rz-roles");
        }}
      >
        <Ionicons
          name="swap-horizontal-outline"
          size={20}
          color={COLORS.white}
        />
      </TouchableOpacity>
    </View>

    {/* ================= MENU (SIMPLE + STABLE) ================= */}
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: 20,
        paddingBottom: 260,
      }}
    >
      {menu.map((item, i) => (
        <Animated.View key={i} entering={FadeInUp.delay(i * 90)}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.85}
            onPress={() => safeNavigate(item.route)}
          >
            <item.IconLib
              name={item.icon as any}
              size={22}
              color={COLORS.gold}
            />

            <Text style={styles.menuTitle}>{item.title}</Text>

            {item.badgeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badgeCount}</Text>
              </View>
            )}

            <Entypo name="chevron-right" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>

    {/* ================= FOOTER ================= */}
    <View
      style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
      }}
    >
      {/* MON ESPACE */}
      <TouchableOpacity
        style={styles.spaceButton}
        activeOpacity={0.9}
        onPress={() => {
          Haptics.selectionAsync();
          router.push("/user-space/mon-espace");
        }}
      >
        <Ionicons name="person-circle-outline" size={18} color={COLORS.white} />
        <Text style={styles.spaceLabel}>Mon Espace</Text>
      </TouchableOpacity>

      {/* RZ COMM */}
      <TouchableOpacity
        style={styles.rzComButton}
        onPress={openRZCommunication}
        activeOpacity={0.9}
      >
        <View style={styles.rzComHandle} />
        <Text style={styles.rzComLabel}>RZ-Communication</Text>
      </TouchableOpacity>
    </View>

    {/* ================= OVERLAY ================= */}
    {isCommOpen && (
      <Pressable onPress={closeRZCommunication}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>
    )}

    <GestureDetector gesture={panCommClose}>
      <Animated.View style={[styles.commOverlay, commStyle]}>
        <View style={styles.commHeader}>
          <Image
            source={require("../assets/images/logo-rhazn.png")}
            style={styles.commLogo}
            resizeMode="contain"
          />
          <Text style={styles.commTitle}>RZ-Communication</Text>
        </View>

        <View style={styles.commHandle} />

        <Animated.View
          entering={FadeInUp.delay(180).springify()}
          style={styles.commAlert}
        >
          <Text style={styles.commAlertTitle}>Information</Text>

          <Text style={styles.commAlertText}>
            La chaîne RZ-Communication sera fonctionnelle sous peu.
            {"\n\n"}
            Vous serez informé dès qu'elle sera opérationnelle.
          </Text>

          <TouchableOpacity
            style={styles.commAlertButton}
            activeOpacity={0.85}
            onPress={closeRZCommunication}
          >
            <Text style={styles.commAlertButtonText}>Retour</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  </View>
);

}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  /* ================= ROOT ================= */
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* ================= HEADER ================= */
  header: {
    paddingTop: 70,
    paddingBottom: 16,
    paddingHorizontal: 22,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  roleSwitchButton: {
    position: "absolute",
    right: 18,
    top: 74,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: COLORS.hairline,
    zIndex: 5,
  },

  /* ================= MENU ================= */
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    marginHorizontal: 22,
    marginBottom: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },

  menuTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 14,
    fontWeight: "600",
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },

  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
  },

  /* ================= BOUTON "i" ================= */
  infoButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginBottom: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "rgba(212,175,55,0.06)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.20)",
  },

  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  infoIconText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
  },

  infoLabel: {
    flex: 1,
    color: COLORS.gold,
    fontSize: 16,
    marginLeft: 14,
    fontWeight: "700",
  },

  /* ================= FIX Z-INDEX CRITIQUE ================= */

  /* ⚠️ ces deux éléments DOIVENT être derrière le ScrollView */
  spaceButton: {
    position: "absolute",
    zIndex: 1, // 👈 FIX
    bottom: 250,
    left: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },

  spaceLabel: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 14,
  },

  rzComButton: {
    position: "absolute",
    zIndex: 1, // 👈 FIX
    bottom: 48,
    width: "100%",
    alignItems: "center",
  },

  rzComHandle: {
    width: 160,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    marginBottom: 6,
  },

  rzComLabel: {
    color: COLORS.gold,
    fontWeight: "800",
  },

  /* ================= OVERLAYS ================= */
  backdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#000",
    zIndex: 80,
  },

  commOverlay: {
    position: "absolute",
    bottom: 0,
    height: COMM_HEIGHT,
    width: "100%",
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 90,
    paddingTop: 10,
  },

  /* ================= COMM ================= */
  commHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    paddingHorizontal: 22,
    paddingTop: 18,
  },

  commLogo: {
    width: 34,
    height: 34,
  },

  commTitle: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8,
  },

  commHandle: {
    width: 70,
    height: 5,
    backgroundColor: "#444",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: -50,
    marginVertical: 15,
  },

  /* ================= ALERT ================= */
  commAlert: {
    marginTop: 300,
    marginHorizontal: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  commAlertTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
    marginBottom: 8,
  },

  commAlertText: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
  },

  commAlertButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#000",
  },

  commAlertButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
});


