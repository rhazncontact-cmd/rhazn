// app/upload-suspentz.tsx
// VERSION PRO — RHAZN OFFICIEL

import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { useUser } from "../context/UserContext";
import { supabase } from "../lib/supabase";
import { uploadFluxVideo } from "./services/videoStorageService";


/* SYSTÈME RHAZN */
const TAN_COST = 125;


/* UTIL — Semaine ISO */
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}


/* Vidéo CODÉE (inchangé) */
const codeVideos = {
  1: "https://storage.rhazn.app/codes/1.mp4",
  2: "https://storage.rhazn.app/codes/2.mp4",
  3: "https://storage.rhazn.app/codes/3.mp4",
  4: "https://storage.rhazn.app/codes/4.mp4",
  5: "https://storage.rhazn.app/codes/5.mp4",
};


export default function UploadSuspentz() {
  const router = useRouter();
  const { user, refreshUser } = useUser();

  const [video, setVideo] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [rzMsg, setRzMsg] = useState<string>("");
  const [rzVisible, setRzVisible] = useState<boolean>(false);
  const [rulesVisible, setRulesVisible] = useState<boolean>(false);

  const activeCode = ((isoWeek(new Date()) - 1) % 50) + 1;


  /* PROTECTION — TAN minimum */
  useEffect(() => {
    if (!user) return;

    if (user.tan < 1) {
      showRZ("Solde insuffisant : 1 TAN minimum requis.");
      setTimeout(() => router.replace("/agent-buy-acset"), 1200);
    }
  }, [user]);


  /* SWIPE */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 25 && Math.abs(g.dy) < 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) router.back();
      },
    })
  ).current;


  /* Alert RHAZN */
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


  /* Pick video */
  async function pickVideo() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!r.canceled) setVideo(r.assets[0].uri);
  }


  /* SUBMIT — VERSION PRO */
  async function submit() {
    if (!user) return;
    if (!title.trim()) return showRZ("Un titre est requis.");
    if (!video) return showRZ("Sélectionnez une vidéo.");

    if (user.tan < TAN_COST)
      return showRZ(`Solde insuffisant : ${TAN_COST} TAN requis.`);

    setUploading(true);

    try {
      // Upload video
      const uploadUrl = await uploadFluxVideo(video, setProgress, title, activeCode);

      // Déduction TAN
      const { error: errTan } = await supabase
        .from("users")
        .update({ tan: user.tan - TAN_COST })
        .eq("uid", user.uid);

      if (errTan) throw errTan;

      // Enregistrement
      const { error: errInsert } = await supabase.from("suspentz").insert({
        title,
        video_url: uploadUrl,
        author_uid: user.uid,
        author_email: user.email,
        duration_seconds: 0,
        tan_cost: TAN_COST,
        status: "pending",
        created_at: new Date(),
      });

      if (errInsert) throw errInsert;

      showRZ("SUSPENTZ envoyé — Analyse IA + administration.");

      setVideo(null);
      setTitle("");
      setProgress(0);

      refreshUser();

      setTimeout(() => router.push("/rz-user-dashboard"), 1200);

    } catch (err: any) {
      console.log("UPLOAD ERROR:", err);
      showRZ(err?.message || "Erreur inconnue.");
    }

    setUploading(false);
  }


  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <View style={styles.container}>

        {/* Logo */}
        <TouchableOpacity style={styles.header} onPress={() => router.push("/rz-user-dashboard")}>
          <Image source={require("../assets/images/rhazn-logo.png")} style={styles.logo} />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingTop: 120 }} keyboardShouldPersistTaps="handled">

            <Text style={styles.codeTitle}>Publier un SUSPENTZ</Text>

            {/* Code Hebdo */}
            <TouchableOpacity
              style={styles.activeCard}
              onPress={() =>
                router.push({
                  pathname: "/codeVideo",
                  params: { code: activeCode, video: codeVideos[activeCode] }
                })
              }
            >
              <Text style={styles.activeCardTitle}>CODE-{activeCode} Hebdo</Text>
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

              {video && <Text style={styles.fileName}>Vidéo sélectionnée</Text>}
              {uploading && (
                <>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.progress}>{progress.toFixed(0)}%</Text>
                </>
              )}

              <TouchableOpacity style={styles.publishBtn} onPress={submit}>
                <Text style={styles.publishText}>Publier le SUSPENTZ</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>


        {/* ALERT RHAZN */}
        {rzVisible && (
          <Animated.View
            style={{
              position: "absolute",
              top: "18%",
              left: 16,
              right: 16,
              opacity: rzOpacity,
              transform: [{ translateY: rzY }],
              zIndex: 1000
            }}
          >
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{rzMsg}</Text>
            </View>
          </Animated.View>
        )}

      </View>
    </View>
  );
};


/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { position: "absolute", top: 42, right: 20, zIndex: 50 },
  logo: { width: 50, height: 50, resizeMode: "contain" },

  codeTitle: { textAlign: "center", fontSize: 22, fontWeight: "800", color: "#FFD700", marginBottom: 16 },

  activeCard: {
    width: 220, height: 60,
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

});
