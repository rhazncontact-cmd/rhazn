// ======================================================
// RHAZN PHOTO UPLOAD — APPLE PREMIUM FINAL
// Stable • Anti crash • Alertes intelligentes • Pro
// ======================================================

import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";

/* ====================================================== */
const COLORS = {
  bg: "#000",
  gold: "#D4AF37",
  red: "#FF453A",
  green: "#34C759",
};

/* ======================================================
APPLE TOAST
====================================================== */
function useToast() {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = (m: string) => {
    setMsg(m);
    setVisible(true);

    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 3000);
  };

  const node = visible ? (
    <Animated.View
      style={{
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: "#111",
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.gold,
        opacity,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "800" }}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, node };
}

/* ====================================================== */
export default function PhotoUpload() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [working, setWorking] = useState(true);

  const mode =
    typeof params.mode === "string"
      ? params.mode
      : Array.isArray(params.mode)
      ? params.mode[0]
      : "gallery";

  useEffect(() => {
    const open = async () => {
      try {
        /* ================= CAMERA ================= */
        if (mode === "camera") {
          const perm = await ImagePicker.requestCameraPermissionsAsync();

          if (perm.status !== "granted") {
            toast.show(
              "Autorisez la caméra pour prendre votre photo de profil."
            );
            setTimeout(() => router.back(), 1500);
            return;
          }

          const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
            cameraType: ImagePicker.CameraType.front,
          });

          if (res.canceled) {
            toast.show("Aucune photo sélectionnée.");
            setTimeout(() => router.back(), 1200);
            return;
          }

          const uri = res.assets?.[0]?.uri;
          if (!uri) {
            toast.show("Impossible de lire la photo.");
            setTimeout(() => router.back(), 1200);
            return;
          }

          router.replace({
            pathname: "/user-profile-edit",
            params: { photo: uri },
          });

          return;
        }

        /* ================= GALLERY ================= */
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (perm.status !== "granted") {
          toast.show(
            "Autorisez l'accès aux photos pour choisir une image de profil."
          );
          setTimeout(() => router.back(), 1500);
          return;
        }

        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });

        if (res.canceled) {
          toast.show("Sélection annulée.");
          setTimeout(() => router.back(), 1200);
          return;
        }

        const uri = res.assets?.[0]?.uri;

        if (!uri) {
          toast.show("Erreur lecture image.");
          setTimeout(() => router.back(), 1200);
          return;
        }

        router.replace({
          pathname: "/user-profile-edit",
          params: { photo: uri },
        });
      } catch (e) {
        console.log("PHOTO ERROR", e);
        toast.show("Impossible d'ouvrir la galerie.");
        setTimeout(() => router.back(), 1500);
      } finally {
        setWorking(false);
      }
    };

    open();
  }, [mode]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {toast.node}
      <ActivityIndicator size="large" color={COLORS.gold} />
      <Text style={{ color: "#888", marginTop: 10 }}>
        Préparation de la photo...
      </Text>
    </View>
  );
}