import * as ImagePicker from "expo-image-picker";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  View,
} from "react-native";

import { useWallet } from "../context/WalletContext";
import { supabase } from "../lib/supabase";
import RZBottomSheet from "./components/RZBottomSheet";

const MIN_TAN_PUBLISH = 250;
const MAX_SUSPENTZ_PER_WEEK = 5;

type ModalMode = "info" | "lowTan" | "limit" | "confirm";

export default function PublierSuspentz() {
  const router = useRouter();
  const { tanBalance, weeklySuspentzCount } = useWallet() as any;

  const currentTan = Number(tanBalance ?? 0);
  const weeklyCount = Number(weeklySuspentzCount ?? 0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>("info");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 🔒 Bloc capture écran
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
    NavigationBar.setBehaviorAsync("overlay-swipe").catch(() => {});
  }, []);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 25,
    onPanResponderMove: (_, g) => {
      if (g.dx < -100) router.back();
    },
  });

  // 🌟 Animation glow
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
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#D4AF37", "#F8E48C"],
  });

  // 🎥 Sélection vidéo
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!res.canceled) {
      setVideo(res.assets[0]);
    }
  };

  // ✅ Validation puis paiement/upload
  const handlePublish = async () => {
    if (!title || !video) {
      Alert.alert("Erreur", "Titre et vidéo obligatoires.");
      return;
    }

    if (currentTan < MIN_TAN_PUBLISH) {
      setModalMode("lowTan");
      setModalText("Solde TAN insuffisant.");
      setModalVisible(true);
      return;
    }

    if (weeklyCount >= MAX_SUSPENTZ_PER_WEEK) {
      setModalMode("limit");
      setModalText("Limite hebdomadaire atteinte.");
      setModalVisible(true);
      return;
    }

    setModalMode("confirm");
    setModalText(`Cette publication coûtera ${MIN_TAN_PUBLISH} TAN.`);
    setModalVisible(true);
  };

  const confirmPublish = async () => {
    setModalVisible(false);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      // 💰 Paiement
      const { error: payError } = await supabase.rpc("pay_exposure_tan", {
        p_creator_uid: user.id,
        p_amount: MIN_TAN_PUBLISH,
      });

      if (payError) throw payError;

      // ☁️ Upload
      const ext = video.uri.split(".").pop();
      const filePath = `suspentz/${user.id}/${Date.now()}.${ext}`;

      const fileObj = {
        uri: video.uri,
        name: filePath,
        type: "video/mp4",
      } as any;

      const { error: uploadError } = await supabase.storage
        .from("suspentz_videos")
        .upload(filePath, fileObj);

      if (uploadError) throw uploadError;

      // 🗃️ Insert DB → CADNA
      const { error: dbError } = await supabase.from("suspentz").insert({
        title,
        description,
        video_url: filePath,
        creator_uid: user.id,
        exposure_pric: MIN_TAN_PUBLISH,
        status: "pending",
      });

      if (dbError) throw dbError;

      Alert.alert("Succès", "Contenu envoyé à la CADNA pour validation ✅");
      setTitle("");
      setDescription("");
      setVideo(null);
      router.push("/my-pacts");
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Publier un SUSPENTZ</Text>
          <Text style={styles.subHeader}>Solde TAN : {currentTan}</Text>
          <Text style={styles.subRule}>Coût : {MIN_TAN_PUBLISH} TAN</Text>
        </View>
        <Image source={require("../assets/images/rhazn-logo.png")} style={{ width: 60, height: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 200, paddingTop: 130 }}>
        <TextInput
          placeholder="Titre"
          placeholderTextColor="#777"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
          placeholder="Description"
          placeholderTextColor="#777"
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, { height: 100 }]}
        />

        <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
          <Text style={{ color: "#fff" }}>
            {video ? "Changer la vidéo" : "Importer la vidéo"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.publishBtn} onPress={handlePublish}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.publishText}>PAYER → ENVOYER À LA CADNA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>{modalText}</Text>

            {modalMode === "confirm" && (
              <TouchableOpacity style={styles.btnPrimary} onPress={confirmPublish}>
                <Text style={styles.btnPrimaryText}>CONFIRMER</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.btnSecondaryText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RZBottomSheet />
    </View>
  );
}

/* ========== STYLES ========== */

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
    zIndex: 99,
  },

  title: { fontSize: 26, fontWeight: "700", color: "#D4AF37" },
  subHeader: { fontSize: 13, color: "#aaa" },
  subRule: { fontSize: 12, color: "#777" },

  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    margin: 10,
  },

  uploadBtn: {
    backgroundColor: "#222",
    padding: 14,
    margin: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  publishBtn: {
    backgroundColor: "#D4AF37",
    padding: 16,
    margin: 10,
    borderRadius: 10,
  },

  publishText: {
    color: "#000",
    textAlign: "center",
    fontWeight: "800",
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
  },

  modalText: { color: "#fff", textAlign: "center", marginBottom: 20 },

  btnPrimary: {
    backgroundColor: "#D4AF37",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  btnPrimaryText: { color: "#000", textAlign: "center", fontWeight: "700" },

  btnSecondary: {
    borderWidth: 1,
    borderColor: "#444",
    padding: 12,
    borderRadius: 10,
  },
  btnSecondaryText: { color: "#fff", textAlign: "center" },
});
