import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase"; // 🔥 SUPABASE

export default function VideoInfos() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  /** 🔥 Animation */
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  /** 🔥 Charger vidéos depuis Supabase */
  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos_infos") // 👈 Remplace par ta table réelle
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Erreur Supabase:", error);
      } else {
        setVideos(data || []);
      }
    } catch (e) {
      console.log("Erreur:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      {/* 🔥 HEADER */}
      <View style={styles.header}>
        {/* ✅ FLÈCHE SUPPRIMÉE */}

        {/* ✅ TITRE DESCENDU + ALIGNÉ À GAUCHE */}
        <Text style={styles.headerTitle}>Vidéos d’Information</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      {/* 🔥 SCROLLVIEW */}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>🎬 Centre Vidéo Officiel RHAZN</Text>
          <Text style={styles.introText}>
            Explore les vidéos éducatives officielles pour comprendre l’écosystème RHAZN.
          </Text>
        </View>

        {/* 🔥 LOADING */}
        {loading && (
          <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 60 }} />
        )}

        {/* 🔥 LISTE VIDE */}
        {!loading && videos.length === 0 && (
          <Text style={{ color: "#777", textAlign: "center", marginTop: 20 }}>
            Aucune vidéo officielle n’est disponible.
          </Text>
        )}

        {/* 🔥 LISTE VIDÉOS */}
        {!loading &&
          videos.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.videoCard}
              onPress={() =>
                router.push({
                  pathname: "/video-player",
                  params: {
                    title: v.title,
                    url: v.url,
                  },
                })
              }
            >
              <Image
                source={
                  v.thumb
                    ? { uri: v.thumb }
                    : require("../assets/images/avatar3.png")
                }
                style={styles.videoThumb}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitle}>{v.title}</Text>
                <Text style={styles.videoDesc}>
                  {v.desc || "Vidéo officielle RHAZN"}
                </Text>
              </View>

              <Feather name="play-circle" size={28} color="#FFD700" />
            </TouchableOpacity>
          ))}
      </ScrollView>
    </Animated.View>
  );
}

/***************** STYLES *****************/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // ✅ SCROLL DESCENDU (était 110)
  scroll: { paddingTop: 125, paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: { width: 40, height: 40, resizeMode: "contain" },

  // ✅ TITRE ALIGNÉ À GAUCHE + UN ESPACE PLUS BAS
  headerTitle: {
    color: "#FFD700",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,    // ✅ DESCENDU D’UN ESPACE
    textAlign: "left",
    flex: 1,
  },

  introBox: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 14,
    borderColor: "#FFD70022",
    borderWidth: 1,
    marginBottom: 20,
  },
  introTitle: { color: "#FFD700", fontSize: 16, fontWeight: "700" },
  introText: { color: "#bbb", fontSize: 13, marginTop: 6 },

  videoCard: {
    flexDirection: "row",
    backgroundColor: "#111",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 14,
    alignItems: "center",
  },

  videoThumb: {
    width: 90,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },

  videoTitle: { color: "#FFD700", fontWeight: "700", fontSize: 14 },
  videoDesc: { color: "#aaa", fontSize: 12, marginTop: 2 },
});
