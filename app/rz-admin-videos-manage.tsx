import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase"; // ✅ SUPABASE

export default function RZAdminVideosManage() {
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const defaultThumb = require("../assets/images/avatar3.png");

  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  /** 📥 Charger vidéos depuis Supabase */
  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      console.log("LOAD VIDEOS ERROR →", error);
      return;
    }

    const list = data.map((v) => ({
      ...v,
      thumb: defaultThumb,
    }));

    setVideos(list);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  /** ➕ Ajouter une vidéo */
  const addVideo = async () => {
    if (!title.trim() || !url.trim()) return;

    const { error } = await supabase.from("videos").insert({
      title,
      url,
      createdAt: Date.now(),
    });

    if (error) {
      console.log("ADD VIDEO ERROR →", error);
      return;
    }

    setTitle("");
    setUrl("");

    loadVideos();
  };

  /** ❌ Supprimer une vidéo */
  const deleteVideo = async (id) => {
    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("DELETE VIDEO ERROR →", error);
      return;
    }

    loadVideos();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#FFD700" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Gestion Vidéos — RZ-ADMIN</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      {/* CONTENU */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ transform: [{ translateY: slide }] }}>
          <Text style={styles.pageTitle}>➕ Ajouter / Supprimer Vidéos</Text>
          <Text style={styles.pageDesc}>
            Gérer les vidéos officielles RHAZN. Simplicité & contrôle total.
          </Text>
        </Animated.View>

        {/* FORMULAIRE */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Ajouter une vidéo</Text>

          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Titre"
            placeholderTextColor="#777"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>URL YouTube</Text>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/xxxx"
            placeholderTextColor="#777"
            value={url}
            onChangeText={setUrl}
          />

          <TouchableOpacity style={styles.btnGold} onPress={addVideo}>
            <Feather name="upload" size={18} color="black" />
            <Text style={styles.btnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* LISTE */}
        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>
          Vidéos Publiées
        </Text>

        {videos.map((v) => (
          <View key={v.id} style={styles.videoCard}>
            <Image source={defaultThumb} style={styles.thumb} />

            <View style={{ flex: 1 }}>
              <Text style={styles.videoTitle}>{v.title}</Text>
              <Text style={styles.videoUrl}>{v.url}</Text>
            </View>

            <TouchableOpacity onPress={() => deleteVideo(v.id)}>
              <Feather name="trash-2" size={24} color="#ff5b5b" />
            </TouchableOpacity>
          </View>
        ))}

        {videos.length === 0 && (
          <Text style={styles.empty}>Aucune vidéo trouvée</Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

/*************** STYLES ***************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
  },

  headerTitle: { color: "#FFD700", fontSize: 16, fontWeight: "700" },
  logo: { width: 40, height: 40, resizeMode: "contain" },

  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  pageTitle: { color: "#FFD700", fontSize: 18, fontWeight: "700" },
  pageDesc: { color: "#aaa", fontSize: 12, lineHeight: 16, marginBottom: 18 },

  formCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD70033",
    padding: 16,
  },

  sectionTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  label: { color: "#ccc", fontSize: 13, marginTop: 10, marginBottom: 4 },

  input: {
    backgroundColor: "#0e0e0e",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 14,
  },

  btnGold: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },

  btnText: { fontWeight: "700", fontSize: 14 },

  videoCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  thumb: { width: 80, height: 60, borderRadius: 8, marginRight: 12 },

  videoTitle: { color: "#FFD700", fontSize: 14, fontWeight: "700" },
  videoUrl: { color: "#777", fontSize: 11, marginTop: 4 },

  empty: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
});
