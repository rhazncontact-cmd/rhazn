import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// ✅ Import de la chaîne RZ
import RZBottomSheet from "./components/RZBottomSheet";

export default function ExplorerRHAZN() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ["#D4AF37", "#F8E48C"] });

  const creators = [
    { name: "BA", qob: 901008, avatar: require("../assets/images/avatar1.png") },
    { name: "Sr Doc", qob: 13010746, avatar: require("../assets/images/avatar7.png") },
    { name: "Nel", qob: 30005, avatar: require("../assets/images/avatar12.png") },
    { name: "Sinsin", qob: 10028, avatar: require("../assets/images/avatar15.png") },
  ];
  const sortedCreators = [...creators].sort((a, b) => b.qob - a.qob);

  const categories = [
    { label: "Lyrics", icon: <Feather name="feather" size={22} color="#D4AF37" /> },
    { label: "Livres", icon: <Ionicons name="book-outline" size={22} color="#D4AF37" /> },
    { label: "Mélodies", icon: <Feather name="music" size={22} color="#D4AF37" /> },
    { label: "Musiques", icon: <Ionicons name="headset-outline" size={22} color="#D4AF37" /> },
    { label: "Vidéos", icon: <Feather name="video" size={22} color="#D4AF37" /> },
    { label: "Arts", icon: <Ionicons name="color-palette-outline" size={22} color="#D4AF37" /> },
    { label: "Autres", icon: <Feather name="grid" size={22} color="#D4AF37" /> },
  ];

  const goToCreator = (name) => router.push(`/profile?name=${name}`);
  const goToWallet = () => router.push("/wallet");
  const goToLibrary = () => router.push("/library");
  const goToSubs = () => router.push("/subscriptions");
  const goToMyCreations = () => router.push("/my-pacts");

  const handleTap = () => { setShowBack(true); setTimeout(() => setShowBack(false), 2000); };

  const handleCategoryPress = (label) => {
    if (label === "Vidéos") return router.push("/banq");
    if (label === "Mélodies") return router.push("/melodies-rhazn");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
        <TouchableOpacity onPress={() => router.push("/rz-user-dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={{ width: 60, height: 60, resizeMode: "contain" }} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={1} onPress={handleTap} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingTop: 120 }}>

          <TouchableOpacity onPress={() => router.push("/search")}>
            <View style={styles.SearchBar}>
              <Feather name="search" size={20} color="#888" />
              <TextInput placeholder="Rechercher un PACT ou un créateur" placeholderTextColor="#777" style={styles.input} editable={false} />
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Top Créateurs — Mois Précédent</Text>

          <Animated.View style={{
            height: 2, backgroundColor: glowColor, marginVertical: 30,
            marginHorizontal: 24, borderRadius: 4
          }} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 25 }}>
            {sortedCreators.map((item, i) => (
              <ProfileCard key={i} name={item.name} qob={item.qob} avatar={item.avatar} onPress={() => goToCreator(item.name)} />
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Mon Espace</Text>
          <View style={styles.grid}>
            <FeatureCard label="Abonnements" count="20" icon={<Feather name="users" size={22} color="#D4AF37" />} onPress={goToSubs} />
            <FeatureCard label="Ma Bibliothèque" count="24" icon={<Ionicons name="book-outline" size={22} color="#D4AF37" />} onPress={goToLibrary} />
            <FeatureCard label="Mes Créations" count="6" icon={<Feather name="edit" size={22} color="#D4AF37" />} onPress={goToMyCreations} />
            <FeatureCard label="Mes ACSET" count="103" active icon={<MaterialIcons name="account-balance-wallet" size={22} color="#4ade80" />} onPress={goToWallet} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Catégories PACT</Text>
          <View style={styles.pactGrid}>
            {categories.map((item, i) => (
              <TouchableOpacity key={i} onPress={() => handleCategoryPress(item.label)} style={styles.featureCard}>
                <View style={styles.featureIcon}>{item.icon}</View>
                <Text style={styles.featureLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>Option bientôt disponible</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.quitButton}>
                <Text style={{ fontWeight: "700", textAlign: "center" }}>Quitter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-circle" size={62} color="#D4AF37" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ✅ Ajout RZ Communication ici */}
      <RZBottomSheet />
    </View>
  );
}

function ProfileCard({ name, qob, avatar, onPress }) {
  return (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileImage}>
        <Image source={avatar} style={{ width: "100%", height: "100%" }} />
      </View>
      <Text style={styles.profileName}>{name}</Text>
      <Text style={styles.profileCount}>{qob} QOB</Text>
    </TouchableOpacity>
  );
}

function FeatureCard({ label, count, icon, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.featureCard, active && { borderColor: "#4ade80" }]}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureLabel}>{label}</Text>
      {count && <Text style={[styles.featureCount, active && { color: "#4ade80" }]}>{count}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 42, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: "#000", flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 999 },
  title: { fontSize: 28, fontWeight: "700", color: "#D4AF37" },
  SearchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#111", margin: 20, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#222" },
  input: { color: "#fff", marginLeft: 12, flex: 1 },
  sectionTitle: { fontSize: 18, color: "#fff", fontWeight: "600", marginLeft: 20, marginBottom: 10 },
  profileCard: { width: 120, marginRight: 16 },
  profileImage: { width: 120, height: 120, backgroundColor: "#222", borderRadius: 16, overflow: "hidden" },
  profileName: { color: "#fff", marginTop: 6, fontSize: 13, textAlign: "center" },
  profileCount: { color: "#D4AF37", fontSize: 12, textAlign: "center", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 20 },
  featureCard: { width: "48%", backgroundColor: "#111", paddingVertical: 20, marginBottom: 16, borderRadius: 14, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  featureIcon: { backgroundColor: "#222", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#333" },
  featureLabel: { color: "#fff", fontSize: 13, marginBottom: 5 },
  featureCount: { color: "#aaa", fontSize: 13 },
  pactGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "80%", backgroundColor: "#111", padding: 20, borderRadius: 12, borderWidth: 1, borderColor: "#444", alignItems: "center" },
  modalText: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  quitButton: { width: "70%", backgroundColor: "#FFBC7E", paddingVertical: 12, borderRadius: 10 },
  backButton: { position: "absolute", bottom: 40, left: "50%", transform: [{ translateX: -30 }], zIndex: 200, opacity: 0.95 },
});
