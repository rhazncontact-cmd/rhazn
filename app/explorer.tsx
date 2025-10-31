import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, Easing, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ExplorerRHAZN() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [showBack, setShowBack] = useState(false);

  // ✅ Cache la barre Android
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  // ✨ Animation dorée
  const glow = new Animated.Value(0);
  Animated.loop(
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
    ])
  ).start();
  const glowColor = glow.interpolate({ inputRange: [0, 1], outputRange: ["#D4AF37", "#F8E48C"] });

  // ✅ Classement dynamique → tri automatique selon QOB
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

  const handleTap = () => {
    setShowBack(true);
    setTimeout(() => setShowBack(false), 2000);
  };

  const handleCategoryPress = (label) => {
    if (label === "Vidéos") return router.push("/flux");
    if (label === "Mélodies") return router.push("/melodies");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ✅ Header RHAZN */}
      <View style={styles.header}>
        <Text style={styles.title}>Explorer...</Text>
        <TouchableOpacity onPress={() => router.push("/")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={{ width: 60, height: 60, resizeMode: "contain" }} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={1} onPress={handleTap} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingTop: 120 }}>

          {/* ✅ Barre recherche */}
          <TouchableOpacity onPress={() => router.push("/search")}>
            <View style={styles.SearchBar}>
              <Feather name="search" size={20} color="#888" />
              <TextInput placeholder="Rechercher un PACT ou un créateur" placeholderTextColor="#777" style={styles.input} editable={false} />
            </View>
          </TouchableOpacity>

          {/* ✅ Classement */}
          <Text style={styles.sectionTitle}>Classement — Mois Précédent</Text>

          {/* ✅ Trophées */}
          <View style={{ flexDirection: "row" }}>
            <FeatureAwardCard label="CIR du Mois" score="1500" icon={<Ionicons name="trophy" size={32} color="#D4AF37" />} onPress={() => router.push("/cir")} />
            <FeatureAwardCard label="PRIX D'HOR" score="1200" icon={<Feather name="award" size={32} color="#D4AF37" />} onPress={() => router.push("/prix-dhor")} />
          </View>

          {/* ✅ ligne gold */}
          <Animated.View style={{
            height: 2, backgroundColor: glowColor, marginTop: 18, marginBottom: 35,
            marginHorizontal: 24, borderRadius: 4, shadowColor: "#F8E48C", shadowOpacity: 0.9, shadowRadius: 6
          }} />

          {/* ✅ TOP 10 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 25 }}>
            {sortedCreators.map((item, i) => (
              <ProfileCard key={i} name={item.name} qob={item.qob} avatar={item.avatar} onPress={() => goToCreator(item.name)} />
            ))}
            {[1,2,3,4,5,6].map((n) => (
              <ProfileCard key={`extra-${n}`} name="À venir" qob="---" placeholder />
            ))}
          </ScrollView>

          {/* ✅ Mon Coin */}
          <Text style={styles.sectionTitle}>Mon Coin RHAZN</Text>
          <View style={styles.grid}>
            <FeatureCard label="Abonnements" count="20" icon={<Feather name="users" size={22} color="#D4AF37" />} onPress={goToSubs} />
            <FeatureCard label="Ma Bibliothèque" count="24" icon={<Ionicons name="book-outline" size={22} color="#D4AF37" />} onPress={goToLibrary} />
            <FeatureCard label="Mes Créations" count="6" icon={<Feather name="edit" size={22} color="#D4AF37" />} onPress={goToMyCreations} />
            <FeatureCard label="Mes ACSET" count="103" active icon={<MaterialIcons name="account-balance-wallet" size={22} color="#4ade80" />} onPress={goToWallet} />
          </View>

          {/* ✅ Catégories */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>PACT — CATÉGORIES</Text>
          <View style={styles.pactGrid}>
            {categories.map((item, i) => (
              <TouchableOpacity key={i} onPress={() => handleCategoryPress(item.label)} style={styles.featureCard}>
                <View style={styles.featureIcon}>{item.icon}</View>
                <Text style={styles.featureLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        {/* ✅ Modal Coming Soon */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>Cette option n'est pas encore disponible{"\n"}— Coming soon —</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.quitButton}>
                <Text style={{ fontWeight: "700", textAlign: "center" }}>Quitter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ✅ Retour flottant */}
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-circle" size={62} color="#D4AF37" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

/*************** CARDS ***************/
function ProfileCard({ name, qob, avatar, onPress, placeholder }) {
  return (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileImage}>
        {placeholder ? (
          <View style={{ flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="person-circle-outline" size={32} color="#666" />
          </View>
        ) : <Image source={avatar} style={{ width: "100%", height: "100%" }} /> }
      </View>
      <Text style={styles.profileName}>{name}</Text>
      <View style={styles.profileCount}>
        <Text style={{ color: placeholder ? "#666" : "#D4AF37", fontWeight: "bold", fontSize: 14 }}>Q</Text>
        <Text style={{ color: placeholder ? "#555" : "#aaa" }}>{qob}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FeatureAwardCard({ label, score, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileImage}>
        <View style={{ flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
      </View>
      <Text style={styles.profileName}>{label}</Text>
      <View style={styles.profileCount}>
        <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 14 }}>Q</Text>
        <Text style={{ color: "#aaa" }}>{score}</Text>
      </View>
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

/*************** STYLES ***************/
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
  profileCount: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4, gap: 4 },
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
