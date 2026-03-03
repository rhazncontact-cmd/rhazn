import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getStoreSignedUrl } from "../services/storeSignedUrl";

const GOLD = "#D4AF37";
const PREVIEW_LIMIT_MS = 15000; // ⏱️ 15 secondes STRICTES

type Props = {
  productId: string; // 🔐 jamais d’URL directe
};

export default function AudioPreview15s({ productId }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);

  /* ----------------------------- PLAY PREVIEW ----------------------------- */
  const play = async () => {
    if (ended || playing || loading) return;

    try {
      setLoading(true);

      // 🔐 1) URL signée PREVIEW (Edge Function)
      const signedUrl = await getStoreSignedUrl(productId, "preview");

      // 📊 2) Analytics (preview audio)
      await supabase.rpc("log_store_event", {
        p_product_id: productId,
        p_action: "preview_audio",
      });

      // ▶️ 3) Lecture audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: signedUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlaying(true);

      // ⏱️ 4) Cutoff strict à 15 secondes
      timerRef.current = setTimeout(async () => {
        await stop(true);
      }, PREVIEW_LIMIT_MS);
    } catch {
      // UX premium : silence volontaire
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- STOP / CLEANUP ----------------------------- */
  const stop = async (auto = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }

    setPlaying(false);
    if (auto) setEnded(true);
  };

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  /* ----------------------------- UI ----------------------------- */
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.btn,
          (ended || playing || loading) && { opacity: 0.6 },
        ]}
        onPress={play}
        disabled={ended || playing || loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Feather
              name={ended ? "lock" : "play"}
              size={18}
              color="#000"
            />
            <Text style={styles.text}>
              {ended ? "Aperçu terminé" : "Écouter 15s"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  btn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#000",
    fontWeight: "900",
    marginLeft: 6,
  },
});
