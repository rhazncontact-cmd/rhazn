// app/profile.tsx — VERSION FINALE RHAZN ULTRA PREMIUM SÉCURISÉE

import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

// --------------------------------------------------
// BADGE AUTOMATIQUE SELON QOB
// --------------------------------------------------
function getBadge(qob: number) {
  if (qob >= 10000) return { label: "DIAMANT", color: "#00f2ff" };
  if (qob >= 3000) return { label: "PLATINE", color: "#e5e4e2" };
  if (qob >= 1000) return { label: "OR", color: GOLD };
  return { label: "BRONZE", color: "#cd7f32" };
}

// --------------------------------------------------

export default function UserProfile() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ tan: 0, qob: 0 });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [qrVisible, setQrVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // --------------------------------------------------
  // LOAD USER
  // --------------------------------------------------
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;

        if (!uid) {
          router.replace("/auth/login");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uid", uid)
          .single();

        if (error || !data) {
          Alert.alert("Erreur", "Impossible de charger votre profil.");
          return;
        }

        setUser(data);
        setStats({
          tan: data.tan || 0,
          qob: data.qob || 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const badge = getBadge(stats.qob);

  // --------------------------------------------------
  // UPLOAD AVATAR
  // --------------------------------------------------
  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) return;

      const ext = uri.split(".").pop();
      const path = `avatar_${uid}.${ext}`;
      const blob = await (await fetch(uri)).blob();

      await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true });

      const { data: url } =
        supabase.storage.from("avatars").getPublicUrl(path);

      await supabase
        .from("users")
        .update({ avatar_url: url.publicUrl })
        .eq("uid", uid);

      setUser({ ...user, avatar_url: url.publicUrl });
    } catch (e) {
      Alert.alert("Erreur", "Impossible de mettre à jour la photo.");
    } finally {
      setUploading(false);
      setPickerOpen(false);
    }
  };

  const takeSelfie = async () => {
    const r = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.8,
    });

    if (!r.canceled) uploadAvatar(r.assets[0].uri);
  };

  const pickGallery = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!r.canceled) uploadAvatar(r.assets[0].uri);
  };

  // --------------------------------------------------

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={{ color: "#aaa", marginTop: 12 }}>
          Chargement du profil…
        </Text>
      </View>
    );
  }

  return (
    <SecureScreen scope="Profil">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />

          <TouchableOpacity onPress={() => router.push("/explorer")}>
            <Text style={styles.spaceBtn}>Mon Espace</Text>
          </TouchableOpacity>
        </View>

        {/* ================= CARD PROFIL ================= */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={() => setPickerOpen(true)}>
            <Image
              source={
                user?.avatar_url
                  ? { uri: user.avatar_url }
                  : require("../assets/images/avatar7.png")
              }
              style={styles.avatar}
            />
            {uploading && (
              <ActivityIndicator style={styles.avatarLoader} color={GOLD} />
            )}
          </TouchableOpacity>

          <Text style={styles.name}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.uid}>ID : {user?.uid}</Text>

          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>

          <TouchableOpacity onPress={() => setQrVisible(true)}>
            <Text style={styles.qrBtn}>Afficher mon QR</Text>
          </TouchableOpacity>
        </View>

        {/* ================= STATS ================= */}
        <View style={styles.statsRow}>
          <Stat title="TAN Reçus" value={stats.tan} />
          <Stat title="QOB Reçus" value={stats.qob} />
        </View>

        {/* ================= ACTIONS ================= */}
        <View style={styles.actionsBox}>
          <Action label="Alertes & Notifications" onPress={() => router.push("/notifications")} />
          <Action label="Statistiques Avancées" onPress={() => router.push("/stats")} />
          <Action label="Sécurité & PIN" onPress={() => router.push("/security-pin")} />
        </View>

        {/* ================= QR MODAL ================= */}
        <Modal visible={qrVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <QRCode value={user?.uid || ""} size={200} />
              <TouchableOpacity
                onPress={() => setQrVisible(false)}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>FERMER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ================= PHOTO PICKER ================= */}
        <Modal visible={pickerOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <TouchableOpacity style={styles.modalBtn} onPress={takeSelfie}>
                <Text style={styles.modalBtnText}>Selfie</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBtn} onPress={pickGallery}>
                <Text style={styles.modalBtnText}>Galerie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#444" }]}
                onPress={() => setPickerOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SecureScreen>
  );
}

// --------------------------------------------------
// COMPOSANTS UI
// --------------------------------------------------
function Stat({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function Action({ label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
      <Feather name="chevron-right" size={18} color={GOLD} />
    </TouchableOpacity>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  logo: { width: 40, height: 40 },

  spaceBtn: {
    color: GOLD,
    fontWeight: "800",
  },

  profileCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: GOLD,
  },

  avatarLoader: {
    position: "absolute",
    top: 38,
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },

  email: { color: "#aaa", fontSize: 12 },
  uid: { color: "#666", fontSize: 11, marginTop: 4 },

  badge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
  },

  badgeText: { fontWeight: "900", color: "#000" },

  qrBtn: { color: GOLD, marginTop: 12, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  statBox: {
    width: "48%",
    backgroundColor: "#111",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 16,
    borderColor: "#333",
    borderWidth: 1,
  },

  statValue: { color: GOLD, fontSize: 24, fontWeight: "900" },
  statLabel: { color: "#aaa" },

  actionsBox: {
    backgroundColor: "#111",
    marginTop: 20,
    borderRadius: 16,
    borderColor: "#333",
    borderWidth: 1,
    overflow: "hidden",
  },

  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomColor: "#222",
    borderBottomWidth: 1,
  },

  actionText: { color: "#fff", fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  modalBox: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
  },

  modalBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  modalBtnText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#000",
  },
});
