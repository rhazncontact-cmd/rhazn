import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import RZBottomSheet from "./components/RZBottomSheet";

/* ====================== COMPOSANT ====================== */

export default function ExplorerRHAZN() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ Barre Android toujours visible
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible");
    NavigationBar.setBehaviorAsync("inset-swipe");
  }, []);

  // ================= NAVIGATION =================
  const goToWallet = () => router.push("/wallet-utilisateur");
  const goToMyCreations = () => router.push("/publish-suspentz");

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
    if (label === "Mélodies") return router.push("/banq");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Publication PACTs</Text>
        <TouchableOpacity onPress={() => router.push("/rz-user-dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 60, height: 60, resizeMode: "contain" }}
          />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
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

      <ScrollView contentContainerStyle={{ paddingBottom: 220, paddingTop: 200 }} showsVerticalScrollIndicator={false}>
        
        {/* ================= MON ESPACE ================= */}
        <Text style={styles.sectionTitle}>Sélectionnez un PACT</Text>

        <View style={styles.grid}>
          <FeatureCard
            label="Suspentz"
            count="6"
            icon={<Feather name="edit" size={22} color="#D4AF37" />}
            onPress={goToMyCreations}
          />

          <FeatureCard
            label="Mes ACSET"
            count="103"
            active
            icon={
              <MaterialIcons
                name="account-balance-wallet"
                size={22}
                color="#4ade80"
              />
            }
            onPress={goToWallet}
          />
        </View>

        {/* ================= CATÉGORIES PACT ================= */}
        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>
          Catégories de Contenu
        </Text>

        <View style={styles.pactGrid}>
          {categories.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleCategoryPress(item.label)}
              style={styles.featureCard}
            >
              <View style={styles.featureIcon}>{item.icon}</View>
              <Text style={styles.featureLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* MODAL */}
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

      <RZBottomSheet />
    </View>
  );
}

/* ====================== CARTE ====================== */

function FeatureCard({ label, count, icon, active, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.featureCard, active && { borderColor: "#4ade80" }]}
    >
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureLabel}>{label}</Text>
      {count && (
        <Text style={[styles.featureCount, active && { color: "#4ade80" }]}>
          {count}
        </Text>
      )}
    </TouchableOpacity>
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
    marginLeft: 20,
    marginBottom: 10,
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

  featureCount: { color: "#aaa", fontSize: 13 },

  pactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
  },

  modalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },

  quitButton: {
    width: "70%",
    backgroundColor: "#FFBC7E",
    paddingVertical: 12,
    borderRadius: 10,
  },
});
