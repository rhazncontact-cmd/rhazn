/**
 * screens/MusicUploadScreen.tsx
 * ✅ ADMIN UNIQUEMENT — Supreme peut uploader des musiques
 * ✅ Upload MP3 à Supabase Storage
 * ✅ Ajoute automatiquement à la table music_tracks
 * ✅ Gère les métadonnées (titre, artiste, genre, durée)
 */

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const C = {
  bg: "#0A0A0A",
  card: "#141414",
  gold: "#D4AF37",
  white: "#FFF",
  gray: "#666",
  muted: "rgba(255,255,255,0.60)",
  border: "rgba(255,255,255,0.10)",
  hairline: "rgba(255,255,255,0.06)",
  blue: "#007AFF",
  ok: "#34C759",
  danger: "#FF453A",
  goldDim: "rgba(212,175,55,0.14)",
};

type UploadState = "idle" | "uploading" | "done" | "error";

export default function MusicUploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // States
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    mimeType: string;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("RHAZN");
  const [genre, setGenre] = useState("");
  const [durationSec, setDurationSec] = useState("180");
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSupreme, setIsSupreme] = useState(false);

  // ✅ Vérifier que c'est l'admin
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        const email = user?.email?.toLowerCase() || "";
        const isAdmin = email === "meyounbauniklovegodstory@gmail.com";

        if (!isAdmin) {
          setError("🔒 Accès réservé aux administrateurs RHAZN");
          setTimeout(() => {
            router.replace("/");
          }, 2000);
        } else {
          setIsSupreme(true);
        }
      } catch (e) {
        console.error("Erreur vérification admin:", e);
        router.replace("/");
      }
    })();
  }, []);

  // ✅ Choisir un fichier MP3
  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name || "audio.mp3",
          uri: asset.uri,
          mimeType: asset.mimeType || "audio/mpeg",
        });
        setError(null);
        Haptics.selectionAsync().catch(() => {});
      }
    } catch (e) {
      console.error("Erreur picking audio:", e);
      setError("❌ Erreur sélection du fichier");
    }
  };

  // ✅ UPLOADER LA MUSIQUE
  const uploadMusic = async () => {
    if (!selectedFile || !title.trim() || !artist.trim()) {
      setError("❌ Remplissez titre, artiste et sélectionnez un fichier");
      return;
    }

    try {
      setUploadState("uploading");
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // ✅ ÉTAPE 1: Lire le fichier
      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // ✅ ÉTAPE 2: Upload à Supabase Storage
      const fileName = `${title.replace(/\s+/g, "_")}_${Date.now()}.mp3`;
      const storagePath = `music/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("music")
        .upload(storagePath, Buffer.from(fileContent, "base64"), {
          contentType: "audio/mpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // ✅ ÉTAPE 3: Obtenir l'URL publique
      const { data } = supabase.storage
        .from("music")
        .getPublicUrl(storagePath);

      if (!data?.publicUrl) throw new Error("URL publique non trouvée");

      // ✅ ÉTAPE 4: Ajouter à la BD
      const { data: dbData, error: dbError } = await supabase
        .from("music_tracks")
        .insert([
          {
            title: title.trim(),
            artist: artist.trim(),
            duration_sec: parseInt(durationSec) || 180,
            file_url: data.publicUrl,
            file_path: storagePath,
            genre: genre.trim() || null,
            is_downloadable: isDownloadable,
            is_active: true,
          },
        ])
        .select();

      if (dbError) throw dbError;

      console.log("✅ Musique uploadée avec succès:", dbData);

      // ✅ Succès!
      setUploadState("done");
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});

      // Reset après 2 secondes
      setTimeout(() => {
        setSelectedFile(null);
        setTitle("");
        setArtist("RHAZN");
        setGenre("");
        setDurationSec("180");
        setIsDownloadable(false);
        setUploadState("idle");
      }, 2000);
    } catch (e: any) {
      console.error("❌ Erreur upload:", e);
      setUploadState("error");
      setError(`❌ ${e?.message || "Erreur lors de l'upload"}`);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    }
  };

  if (!isSupreme) {
    return (
      <View style={s.container}>
        <Text style={s.errorText}>Accès réservé aux administrateurs...</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.iconBg}>
              <Ionicons name="cloud-upload" size={24} color={C.gold} />
            </View>
            <View>
              <Text style={s.headerTitle}>Ajouter Musique</Text>
              <Text style={s.headerSub}>Admin RHAZN</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={C.white} />
          </TouchableOpacity>
        </View>

        {/* File Picker */}
        <TouchableOpacity
          onPress={pickAudioFile}
          style={[s.filePickerBtn, selectedFile && s.filePickerBtnActive]}
        >
          <View style={s.filePickerIcon}>
            <Ionicons
              name={selectedFile ? "checkmark-circle" : "musical-notes"}
              size={32}
              color={C.gold}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.filePickerTitle}>
              {selectedFile ? "✅ Fichier sélectionné" : "Sélectionner MP3"}
            </Text>
            <Text style={s.filePickerSub}>
              {selectedFile ? selectedFile.name : "Appuyez pour choisir"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.gray} />
        </TouchableOpacity>

        {/* Formulaire */}
        <View style={s.form}>
          <View style={s.formGroup}>
            <Text style={s.label}>Titre *</Text>
            <TextInput
              placeholder="Ex: Ban Mea"
              placeholderTextColor={C.gray}
              style={s.input}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Artiste *</Text>
            <TextInput
              placeholder="Ex: RHAZN"
              placeholderTextColor={C.gray}
              style={s.input}
              value={artist}
              onChangeText={setArtist}
              maxLength={100}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Genre</Text>
            <TextInput
              placeholder="Ex: Afrobeat"
              placeholderTextColor={C.gray}
              style={s.input}
              value={genre}
              onChangeText={setGenre}
              maxLength={50}
            />
          </View>

          <View style={s.formGroup}>
            <Text style={s.label}>Durée (secondes)</Text>
            <TextInput
              placeholder="180"
              placeholderTextColor={C.gray}
              style={s.input}
              value={durationSec}
              onChangeText={setDurationSec}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* Téléchargeable? */}
          <View style={s.downloadableRow}>
            <View>
              <Text style={s.label}>Téléchargeable?</Text>
              <Text style={s.sublabel}>Les utilisateurs peuvent télécharger</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDownloadable(!isDownloadable)}
              style={[
                s.toggleBtn,
                isDownloadable && s.toggleBtnActive,
              ]}
            >
              {isDownloadable && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={s.errorBoxText}>{error}</Text>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          onPress={uploadMusic}
          disabled={uploadState === "uploading" || !selectedFile}
          style={[
            s.uploadBtn,
            uploadState === "uploading" && s.uploadBtnLoading,
            (uploadState === "uploading" || !selectedFile) && { opacity: 0.6 },
          ]}
        >
          {uploadState === "uploading" ? (
            <>
              <ActivityIndicator color="#000" />
              <Text style={s.uploadBtnText}>Upload en cours...</Text>
            </>
          ) : uploadState === "done" ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={s.uploadBtnText}>✅ Ajoutée!</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#000" />
              <Text style={s.uploadBtnText}>Ajouter la musique</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={14} color={C.blue} />
          <Text style={s.infoBoxText}>
            La musique sera accessible dans le catalogue RHAZN pour tous les utilisateurs
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: "900",
  },
  headerSub: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },

  filePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: C.hairline,
  },
  filePickerBtnActive: {
    borderColor: C.gold,
    backgroundColor: "rgba(212,175,55,0.08)",
  },
  filePickerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  filePickerTitle: {
    color: C.white,
    fontWeight: "900",
    fontSize: 14,
  },
  filePickerSub: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },

  form: {
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    color: C.white,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sublabel: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    backgroundColor: "#111",
    color: C.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    fontSize: 14,
  },

  downloadableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,59,48,0.12)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.35)",
  },
  errorBoxText: {
    color: C.danger,
    fontWeight: "600",
    fontSize: 12,
    flex: 1,
  },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 14,
  },
  uploadBtnLoading: {
    opacity: 0.8,
  },
  uploadBtnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 16,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,122,255,0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.25)",
  },
  infoBoxText: {
    color: C.blue,
    fontWeight: "600",
    fontSize: 12,
    flex: 1,
  },

  errorText: {
    color: C.muted,
    textAlign: "center",
    paddingTop: 100,
    fontSize: 14,
  },
});