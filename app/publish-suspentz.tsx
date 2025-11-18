import { Feather, Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// ✅ RZ Communication Footer
import RZBottomSheet from "./components/RZBottomSheet";

export default function PublierSuspentz() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  // 🔙 Swipe gauche uniquement pour revenir
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 25,
    onPanResponderMove: (_, g) => {
      if (g.dx < -100) router.back();
    }
  });

  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#D4AF37", "#F8E48C"]
  });

  // 📌 Types de SUSPENTZ (PACT)
  const categories = [
    {
      label: "Flux-Vidéos",
      subtitle: "Flux-Vidéos",
      icon: <Ionicons name="film-outline" size={26} color="#D4AF37" />
    },
    {
      label: "Video Clip",
      subtitle: "Vidéo Clip",
      icon: <Feather name="video" size={22} color="#4ade80" />
    },
    { label: "Lyrics", icon: <Feather name="feather" size={22} color="#D4AF37" /> },
    { label: "Livres", icon: <Ionicons name="book-outline" size={22} color="#D4AF37" /> },
    { label: "Mélodies", icon: <Feather name="music" size={22} color="#D4AF37" /> },
    { label: "Musiques", icon: <Ionicons name="headset-outline" size={22} color="#D4AF37" /> },
    { label: "Arts", icon: <Ionicons name="color-palette-outline" size={22} color="#D4AF37" /> },
    { label: "Autres", icon: <Feather name="grid" size={22} color="#D4AF37" /> }
  ];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Publier un SUSPENTZ</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 60, height: 60, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 150, paddingTop: 120 }}
      >

        {/* BARRE DE RECHERCHE */}
        <TouchableOpacity onPress={() => router.push("/search")}>
          <View style={styles.SearchBar}>
            <Feather name="search" size={20} color="#888" />
            <TextInput
              placeholder="Rechercher un style ou format de SUSPENTZ"
              placeholderTextColor="#777"
              style={styles.input}
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Sélectionner le type de SUSPENTZ</Text>

        <Animated.View
          style={{
            height: 2,
            backgroundColor: glowColor,
            marginVertical: 30,
            marginHorizontal: 24,
            borderRadius: 4
          }}
        />

        {/* GRID DES TYPE DE SUSPENTZ */}
        <View style={styles.pactGrid}>
          {categories.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (i === 0) {
                  router.push("/upload-banq"); // 🔥 Nouveau nom
                } else {
                  setModalVisible(true);
                }
              }}
              style={styles.featureCard}
            >
              <View style={styles.featureIcon}>{item.icon}</View>
              <Text style={styles.featureLabel}>{item.subtitle ?? item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* MODAL COMING SOON */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>Fonctionnalité bientôt disponible</Text>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.quitButton}
            >
              <Text style={{ fontWeight: "700", textAlign: "center" }}>
                Quitter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RZBottomSheet />
    </View>
  );
}

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
    zIndex: 999
  },

  title: { fontSize: 28, fontWeight: "700", color: "#D4AF37" },

  SearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    margin: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222"
  },

  input: { color: "#fff", marginLeft: 12, flex: 1 },

  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 20,
    marginBottom: 10
  },

  pactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20
  },

  featureCard: {
    width: "48%",
    backgroundColor: "#111",
    paddingVertical: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center"
  },

  featureIcon: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333"
  },

  featureLabel: { color: "#fff", fontSize: 13, marginBottom: 5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center"
  },

  modalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center"
  },

  quitButton: {
    width: "70%",
    backgroundColor: "#FFBC7E",
    paddingVertical: 12,
    borderRadius: 10
  }
});
