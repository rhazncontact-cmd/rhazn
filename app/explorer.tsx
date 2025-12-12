import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";
import RZBottomSheet from "./components/RZBottomSheet";

/* ====================== UTIL ====================== */

const getAvatarUrl = (path: string | null) => {
  if (!path) return "https://via.placeholder.com/150";
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
};

/* ====================== COMPOSANT ====================== */

export default function ExplorerRHAZN() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible");
    NavigationBar.setBehaviorAsync("inset-swipe");
  }, []);

  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  const loadTopCreators = async () => {
    const { data, error } = await supabase.rpc("get_top_creators_by_period", {
      p_period: period,
    });

    if (!error && data) setTopCreators(data);
  };

  useEffect(() => {
    loadTopCreators();

    const channel = supabase
      .channel("top-creators-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => loadTopCreators()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period]);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glow]);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#D4AF37", "#F8E48C"],
  });

  const goToCreatorLibrary = (creatorUid: string) => {
    router.push(`/library?creator=${creatorUid}`);
  };
  const goToWallet = () => router.push("/wallet-utilisateur");
  const goToLibrary = () => router.push("/library");
  const goToSubs = () => router.push("/subscriptions");
  const goToMyCreations = () => router.push("/library");

  const categories = [
    { label: "Lyrics", icon: <Feather name="feather" size={22} color="#D4AF37" /> },
    { label: "Livres", icon: <Ionicons name="book-outline" size={22} color="#D4AF37" /> },
    { label: "Mélodies", icon: <Feather name="music" size={22} color="#D4AF37" /> },
    { label: "Musiques", icon: <Ionicons name="headset-outline" size={22} color="#D4AF37" /> },
    { label: "Vidéos", icon: <Feather name="video" size={22} color="#D4AF37" /> },
    { label: "Arts", icon: <Ionicons name="color-palette-outline" size={22} color="#D4AF37" /> },
    { label: "Autres", icon: <Feather name="grid" size={22} color="#D4AF37" /> },
  ];

  const handleCategoryPress = (label: string) => {
    if (label === "Vidéos") return router.push("/banq");
    if (label === "Mélodies") return router.push("/profile");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
        <TouchableOpacity onPress={() => router.push("/rz-user-dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 60, height: 60, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      {/* BARRE DE RECHERCHE */}
      <TouchableOpacity
        onPress={() => router.push("/search")}
        activeOpacity={0.9}
        style={styles.floatingSearch}
      >
        <Feather name="search" size={20} color="#888" />
        <TextInput
          placeholder="Rechercher un PACT ou un créateur"
          placeholderTextColor="#777"
          style={styles.input}
          editable={false}
        />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 260, paddingTop: 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodSelector}>
          {["day", "week", "month"].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p as any)}
              style={[
                styles.periodBtn,
                period === p && { backgroundColor: "#D4AF37" },
              ]}
            >
              <Text style={{ color: period === p ? "#000" : "#fff" }}>
                {p === "day" ? "Jour" : p === "week" ? "Semaine" : "Mois"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Top Créateurs</Text>

        <Animated.View
          style={{
            height: 2,
            backgroundColor: glowColor,
            marginVertical: 30,
            marginHorizontal: 24,
            borderRadius: 4,
          }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {topCreators.map((creator, index) => (
            <ProfileCard
              key={creator.uid}
              rank={index + 1}
              name={creator.email.split("@")[0]}
              qob={creator.total_qob}
              avatar={{ uri: getAvatarUrl(creator.avatar_path) }}
              onPress={() => goToCreatorLibrary(creator.uid)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Mon Espace</Text>

        <View style={styles.grid}>
          <FeatureCard label="Abonnements" count="20" icon={<Feather name="users" size={22} color="#D4AF37" />} onPress={goToSubs} />
          <FeatureCard label="Ma Bibliothèque" count="24" icon={<Ionicons name="book-outline" size={22} color="#D4AF37" />} onPress={goToLibrary} />
          <FeatureCard label="Mes Créations" count="6" icon={<Feather name="edit" size={22} color="#D4AF37" />} onPress={goToMyCreations} />
          <FeatureCard label="Mes ACSET" count="103" active icon={<MaterialIcons name="account-balance-wallet" size={22} color="#4ade80" />} onPress={goToWallet} />
        </View>

        <Text style={styles.sectionTitle}>Catégories PACT</Text>

        <View style={styles.pactGrid}>
          {categories.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => handleCategoryPress(item.label)} style={styles.featureCard}>
              <View style={styles.featureIcon}>{item.icon}</View>
              <Text style={styles.featureLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ================= RZ COMMUNICATION FLOTTANTE ================= */}
      <View style={styles.rzFloatingContainer}>
        <RZBottomSheet />
      </View>
    </View>
  );
}

/* ====================== STYLES ====================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 42,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#000",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 999,
  },

  title: { fontSize: 28, fontWeight: "700", color: "#D4AF37" },

  floatingSearch: {
    position: "absolute",
    top: 110,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    zIndex: 998,
  },

  input: { color: "#fff", marginLeft: 12, flex: 1 },

  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },

  periodSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },

  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  featureCard: {
    width: "48%",
    backgroundColor: "#111",
    paddingVertical: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },

  featureIcon: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  featureLabel: { color: "#fff", fontSize: 13, marginBottom: 5 },

  pactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
  },

  rzFloatingContainer: {
    position: "absolute",
    bottom: 24,          // ✅ AU-DESSUS de la barre Android
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 16,     // ✅ Déplacement de 2 espaces vers le bas
  },
});
