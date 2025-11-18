// app/upload-suspentz.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { supabase } from "../lib/supabase";
import { uploadFluxVideo } from "./services/videoStorageService";

/* --- WEEK LOGIC --- */
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/* Vidéos CODE (inchangé) */
const codeVideos = {
  1: "https://storage.rhazn.app/codes/1.mp4",
  2: "https://storage.rhazn.app/codes/2.mp4",
  3: "https://storage.rhazn.app/codes/3.mp4",
  4: "https://storage.rhazn.app/codes/4.mp4",
  5: "https://storage.rhazn.app/codes/5.mp4",
};

export default function UploadSuspentz() {
  const router = useRouter();

  const [video, setVideo] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [rzMsg, setRzMsg] = useState<string>("");
  const [rzVisible, setRzVisible] = useState<boolean>(false);
  const [rulesVisible, setRulesVisible] = useState<boolean>(false);

  const activeCode = ((isoWeek(new Date()) - 1) % 50) + 1;

  /* Swipe LEFT only */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 25 && Math.abs(g.dy) < 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) router.back();
      },
    })
  ).current;

  /* Alert */
  const rzOpacity = useRef(new Animated.Value(0)).current;
  const rzY = useRef(new Animated.Value(20)).current;

  function showRZ(msg: string) {
    setRzMsg(msg);
    setRzVisible(true);
    Animated.parallel([
      Animated.timing(rzOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(rzY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(rzOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(rzY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => setRzVisible(false));
    }, 3000);
  }

  /* Keyboard animation */
  const inputY = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      Animated.parallel([
        Animated.timing(inputY, { toValue: -165, duration: 340, useNativeDriver: true }),
        Animated.timing(inputScale, { toValue: 1.04, duration: 340, useNativeDriver: true }),
      ]).start();
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      Animated.parallel([
        Animated.timing(inputY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(inputScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    });

    return () => { show.remove(); hide.remove(); };
  }, []);

  /* Sound */
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch {}
    })();
    NavigationBar.setVisibilityAsync("hidden").catch(() => {});
  }, []);

  /* Pick video */
  async function pickVideo() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!r.canceled) setVideo(r.assets[0].uri);
  }

  /* Submit */
  async function submit() {
    if (!title.trim()) return showRZ("Un titre est requis.");
    if (!video) return showRZ("Sélectionnez une vidéo.");

    setUploading(true);

    try {
      const uploadUrl = await uploadFluxVideo(video, setProgress, title, activeCode);

      const { error } = await supabase
        .from("suspentz")
        .insert({
          title,
          url: uploadUrl,
          code: activeCode,
          created_at: new Date(),
          etat: "pending", // Pour validation IA + admin
        });

      if (error) throw error;

      showRZ("✅ Soumis.\nAnalyse IA + Administration.");

      setVideo(null);
      setTitle("");
      setProgress(0);

    } catch (err: any) {
      console.log("UPLOAD ERROR:", err);
      showRZ(err?.message || "Erreur inconnue. Voir console.");
    }

    setUploading(false);
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <View style={styles.container}>

        {/* Logo */}
        <TouchableOpacity style={styles.header} onPress={() => router.push("/dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={styles.logo} />
        </TouchableOpacity>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingTop: 120 }} keyboardShouldPersistTaps="handled">

            <Text style={styles.codeTitle}>Publier un SUSPENTZ</Text>

            {/* CODE LIST */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.codeScroll}>
              {Array.from({ length: 50 }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.codeCard}
                  onPress={() =>
                    router.push({
                      pathname: "/codeVideo",
                      params: { code: i + 1, video: codeVideos[i + 1] }
                    })
                  }
                >
                  <Text style={styles.codeCardTitle}>CODE-{i + 1}</Text>
                  <Text style={styles.codeCardSub}>Hebdo</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Active CODE */}
            <TouchableOpacity
              style={styles.activeCard}
              onPress={() =>
                router.push({
                  pathname: "/codeVideo",
                  params: { code: activeCode, video: codeVideos[activeCode] }
                })
              }
            >
              <Text style={styles.activeCardTitle}>En cours : CODE-{activeCode}</Text>
            </TouchableOpacity>

            {/* Panel */}
            <View style={styles.panel}>
              <Animated.View style={{ transform: [{ translateY: inputY }, { scale: inputScale }] }}>
                <View style={styles.searchBar}>
                  <Ionicons name="film-outline" size={18} color="#777" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Titre du SUSPENTZ"
                    placeholderTextColor="#777"
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>
              </Animated.View>

              <TouchableOpacity style={styles.selectBtn} onPress={pickVideo}>
                <Feather name="upload" size={20} color="#FFD700" />
                <Text style={styles.selectText}>Sélectionner une vidéo</Text>
              </TouchableOpacity>

              {video && <Text style={styles.fileName}>✅ Vidéo sélectionnée</Text>}
              {uploading && (
                <>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.progress}>{progress.toFixed(0)}%</Text>
                </>
              )}

              <TouchableOpacity style={styles.publishBtn} onPress={submit}>
                <Text style={styles.publishText}>Soumettre pour validation</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRulesVisible(true)} style={styles.infoButton}>
                <Ionicons name="information-circle" size={24} color="#777" />
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ALERT */}
        {rzVisible && (
          <Animated.View style={{
            position: "absolute",
            top: "18%",
            left: 16,
            right: 16,
            opacity: rzOpacity,
            transform: [{ translateY: rzY }],
            zIndex: 1000
          }}>
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{rzMsg}</Text>
            </View>
          </Animated.View>
        )}

        {/* RULES MODAL */}
        <Modal visible={rulesVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRulesVisible(false)}>
            <TouchableOpacity style={styles.rulesBox} activeOpacity={1}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.rulesTitle}>Règlements SUSPENTZ</Text>
                {[
                  "Max 125 sec",
                  "Naturel + moral",
                  "Code hebdo respecté",
                  "Pas de mise en scène",
                  "Pas de bijoux / filtre / maquillage",
                  "Pas de vulgarité",
                  "Originalité absolue",
                ].map((r, i) => (
                  <Text key={i} style={styles.rule}>• {r}</Text>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </View>
    </View>
  );
}

/* STYLES */
const CARD_W = 140;
const CARD_H = 180;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { position: "absolute", top: 42, right: 20, zIndex: 50 },
  logo: { width: 50, height: 50, resizeMode: "contain" },

  codeTitle: { textAlign: "center", fontSize: 22, fontWeight: "800", color: "#FFD700", marginBottom: 16 },

  codeScroll: { paddingHorizontal: 16, gap: 14 },
  codeCard: {
    width: CARD_W, height: CARD_H, backgroundColor: "#0f0f0f",
    borderRadius: 16, borderWidth: 1, borderColor: "#222",
    justifyContent: "center", alignItems: "center"
  },
  codeCardTitle: { color: "#FFD700", fontSize: 18, fontWeight: "700" },
  codeCardSub: { color: "#777", fontSize: 12 },

  activeCard: {
    width: CARD_W * 2, height: CARD_H * 0.35,
    backgroundColor: "#0b0b0b",
    borderRadius: 18, borderWidth: 1, borderColor: "#1f3b1f",
    alignSelf: "center", marginTop: 18, marginBottom: 10,
    justifyContent: "center", alignItems: "center"
  },
  activeCardTitle: { color: "#4ade80", fontSize: 20, fontWeight: "800" },

  panel: {
    backgroundColor: "#0d0d0d",
    padding: 22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#222",
    marginTop: 40
  },

  searchBar: {
    backgroundColor: "#111",
    borderWidth: 1, borderColor: "#222",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 26,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 15, textAlign: "center" },

  selectBtn: {
    backgroundColor: "#111", padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: "#333",
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    marginBottom: 12
  },
  selectText: { marginLeft: 8, color: "#FFD700", fontSize: 16 },

  fileName: { color: "#4ade80", textAlign: "center" },
  progress: { color: "#FFD700", textAlign: "center", marginTop: 6 },

  publishBtn: { backgroundColor: "#FFD700", paddingVertical: 14, borderRadius: 10 },
  publishText: { textAlign: "center", color: "#000", fontWeight: "800", fontSize: 16 },

  infoButton: { marginTop: 12, alignSelf: "flex-end" },

  alertBox: {
    backgroundColor: "#0b0b0b",
    borderWidth: 1, borderColor: "#FFD70020",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#FFD700",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { height: 4, width: 0 }
  },
  alertText: { color: "#FFD700", fontSize: 17, fontWeight: "700", textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  rulesBox: {
    backgroundColor: "#111", padding: 18,
    borderRadius: 18, borderWidth: 1, borderColor: "#222",
    maxHeight: "75%"
  },
  rulesTitle: { color: "#FFD700", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  rule: { color: "#ddd", fontSize: 14, marginBottom: 6 }
});
