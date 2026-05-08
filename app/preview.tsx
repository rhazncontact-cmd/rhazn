import { Video } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDraft } from "../hooks/useDraft";

export default function PreviewScreen() {
  const { draft, isProcessing, generateVideo } = useDraft();

  const handleGenerate = async () => {
    await generateVideo();
  };

  const handleSave = async () => {
    if (!draft.finalVideoUri) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return;

    await MediaLibrary.saveToLibraryAsync(draft.finalVideoUri);
    alert("✅ Vidéo sauvegardée !");
  };

  const handlePublish = async () => {
    if (!draft.finalVideoUri) return;

    // 👉 ici tu enverras vers ton backend plus tard
    alert("🚀 Vidéo publiée !");
  };

  return (
    <View style={styles.container}>
      
      {/* 🎥 VIDEO */}
      {draft.finalVideoUri ? (
        <Video
          source={{ uri: draft.finalVideoUri }}
          style={styles.video}
          useNativeControls
          resizeMode="cover"
          isLooping
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={{ color: "#fff" }}>Aucune vidéo générée</Text>
        </View>
      )}

      {/* ⏳ LOADING */}
      {isProcessing && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>Processing...</Text>
        </View>
      )}

      {/* 🎯 ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={handleGenerate}>
          <Text style={styles.text}>🎬 Générer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.text}>💾 Sauver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.publish} onPress={handlePublish}>
          <Text style={styles.text}>🚀 Publier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  video: {
    flex: 1,
  },

  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },

  actions: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },

  button: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    width: 200,
    alignItems: "center",
  },

  publish: {
    backgroundColor: "#ff004f",
    padding: 14,
    borderRadius: 12,
    width: 220,
    alignItems: "center",
  },

  text: {
    color: "#fff",
    fontWeight: "bold",
  },
});
