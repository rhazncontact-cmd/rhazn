// app/components/AudioPreview15s.tsx

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getStoreSignedUrl } from "../../services/storeSignedUrl";

/* ===================== RHAZN CONSTANTES ===================== */
const GOLD = "#D4AF37";
const PREVIEW_LIMIT_MS = 15000; // ⏱️ 15 secondes STRICTES

type Props = {
  audioPath: string | null;
};

export default function AudioPreview15s({ audioPath }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  /* 🔐 Charger URL signée */
  useEffect(() => {
    let active = true;

    const loadSignedUrl = async () => {
      if (!audioPath) return;
      const url = await getStoreSignedUrl(audioPath, 300);
      if (active) setSignedUrl(url);
    };

    loadSignedUrl();

    return () => {
      active = false;
    };
  }, [audioPath]);

  /* ▶️ Lecture preview 15s */
  const playPreview = async () => {
    if (!signedUrl || loading) return;

    setLoading(true);

    try {
      // Nettoyage précédent
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: signedUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlaying(true);

      // ⏱️ Arrêt forcé à 15s
      setTimeout(async () => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch {}
        soundRef.current = null;
        setPlaying(false);
      }, PREVIEW_LIMIT_MS);
    } catch (e) {
      console.warn("Audio preview error:", e);
    } finally {
      setLoading(false);
    }
  };

  /* 🧹 Cleanup */
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  if (!audioPath) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={playPreview}
        disabled={loading || playing}
      >
        {loading ? (
          <ActivityIndicator color={GOLD} />
        ) : (
          <Ionicons
            name={playing ? "pause-circle" : "play-circle"}
            size={42}
            color={GOLD}
          />
        )}
      </Pressable>

      <Text style={styles.text}>Preview audio · 15s</Text>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 12,
  },
  button: {
    padding: 8,
  },
  text: {
    marginTop: 6,
    color: "#999",
    fontSize: 13,
  },
});
