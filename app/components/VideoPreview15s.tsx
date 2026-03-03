import { Feather } from "@expo/vector-icons";
import { Video } from "expo-av";
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
const PREVIEW_LIMIT_SEC = 15; // ⏱️ 15 secondes STRICTES

type Props = {
  productId: string; // 🔐 jamais d’URL directe
};

export default function VideoPreview15s({ productId }: Props) {
  const videoRef = useRef<Video>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);

  /* ----------------------------- LOAD PREVIEW ----------------------------- */
  const loadPreview = async () => {
    if (locked || loading) return;

    try {
      setLoading(true);

      // 🔐 1) URL signée PREVIEW (Edge Function)
      const signedUrl = await getStoreSignedUrl(productId, "preview");
      setVideoUrl(signedUrl);

      // 📊 2) Analytics (preview vidéo)
      await supabase.rpc("log_store_event", {
        p_product_id: productId,
        p_action: "preview_video",
      });
    } catch {
      // UX premium : silence volontaire
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- CLEANUP ----------------------------- */
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* VIDEO PLAYER */}
      {videoUrl && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          resizeMode="contain"
          style={styles.video}
          useNativeControls={!locked}
          shouldPlay
          onPlaybackStatusUpdate={(status) => {
            if (
              status.isLoaded &&
              status.positionMillis / 1000 >= PREVIEW_LIMIT_SEC
            ) {
              videoRef.current?.pauseAsync();
              setLocked(true);
            }
          }}
        />
      )}

      {/* OVERLAY LOCK */}
      {locked && (
        <View style={styles.overlay}>
          <Feather name="lock" size={22} color={GOLD} />
          <Text style={styles.lockText}>
            Aperçu terminé — Achat requis
          </Text>
        </View>
      )}

      {/* PREVIEW BUTTON */}
      {!videoUrl && !locked && (
        <TouchableOpacity
          style={[
            styles.previewBtn,
            loading && { opacity: 0.6 },
          ]}
          onPress={loadPreview}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Feather name="play" size={18} color="#000" />
              <Text style={styles.previewText}>Lire 15s</Text>
            </>
          )}
        </TouchableOpacity>
      )}
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
  video: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#000",
  },
  previewBtn: {
    marginTop: 10,
    backgroundColor: GOLD,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: {
    color: "#000",
    fontWeight: "900",
    marginLeft: 6,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  lockText: {
    marginTop: 8,
    color: GOLD,
    fontWeight: "700",
    textAlign: "center",
  },
});
