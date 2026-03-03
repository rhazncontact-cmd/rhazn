import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

/* ===================== STATUS RING ===================== */
const getProfileRingColor = (
  accountStatus: string,
  photoStatus: string,
  certified: boolean
) => {
  if (accountStatus === "sleep" || accountStatus === "suspended")
    return "#D32F2F"; // 🔴

  if (photoStatus === "pending")
    return "#FF9800"; // 🟠

  if (photoStatus === "approved" && certified)
    return "#00C853"; // 🟢

  return "rgba(255,255,255,0.25)";
};

/* -------------------------------------------------------------------------- */
/*                              SETTINGS SCREEN                                */
/* -------------------------------------------------------------------------- */

export default function SettingsUser() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState("none");
  const [accountStatus, setAccountStatus] = useState("active");
  const [certified, setCertified] = useState(false);

  const [photoPriceTan, setPhotoPriceTan] = useState<number>(0);

  const [avatarOpen, setAvatarOpen] = useState(false);

  /* ----------------------------- NOTIFICATION ----------------------------- */
  const notifAnim = useRef(new Animated.Value(0)).current;
  const [notif, setNotif] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotif(msg);
    Animated.timing(notifAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => setNotif(null));
    }, 2200);
  };

  /* ----------------------------- LOAD PROFILE ----------------------------- */
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          phone,
          profile_photo_url,
          profile_photo_status,
          account_status,
          member_certified
        `)
        .eq("id", auth.user.id)
        .single();

      const { data: eco } = await supabase
        .from("eco_formules")
        .select("profile_photo_change_price")
        .single();

      if (profile) {
        setProfileId(profile.id);
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setPhotoStatus(profile.profile_photo_status || "none");
        setAccountStatus(profile.account_status || "active");
        setCertified(!!profile.member_certified);

        if (profile.profile_photo_url) {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(profile.profile_photo_url, 3600);
          if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
        }
      }

      setPhotoPriceTan(Number(eco?.profile_photo_change_price ?? 0));
      setLoading(false);
    };

    load();
  }, []);

  /* ----------------------------- AVATAR FLOW ----------------------------- */
  const submitAvatar = async (localUri: string) => {
    try {
      const res = await fetch(localUri);
      const blob = await res.blob();
      const path = `pending/${profileId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: rpcError } = await supabase.rpc(
        "submit_profile_photo",
        { p_photo_url: path }
      );

      if (rpcError) throw rpcError;

      showNotification("Photo envoyée pour validation CADNA");
      setPhotoStatus("pending");
    } catch {
      showNotification("Erreur lors de l’envoi de la photo");
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!res.canceled) {
      await submitAvatar(res.assets[0].uri);
    }
    setAvatarOpen(false);
  };

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!res.canceled) {
      await submitAvatar(res.assets[0].uri);
    }
    setAvatarOpen(false);
  };

  /* ----------------------------- SAVE PROFILE ----------------------------- */
  const saveProfile = async () => {
    try {
      setSaving(true);
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", profileId);

      showNotification("Profil mis à jour");
    } catch {
      showNotification("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- LOGOUT ----------------------------- */
  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SecureScreen scope="Settings">
      {/* ================= HEADER AVATAR ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setAvatarOpen(true)}
          style={[
            styles.avatarRing,
            {
              borderColor: getProfileRingColor(
                accountStatus,
                photoStatus,
                certified
              ),
            },
          ]}
        >
          <Image
            source={
              avatarUrl
                ? { uri: avatarUrl }
                : require("../assets/images/avatar3.png")
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Label>Identifiant</Label>
            <TextInput
              style={[styles.input, styles.readonly]}
              value={profileId}
              editable={false}
              selectTextOnFocus
              onLongPress={() => {
                Clipboard.setStringAsync(profileId);
                showNotification("Identifiant copié");
              }}
            />

            <Label>Nom complet</Label>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />

            <Label>Téléphone</Label>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveProfile}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityBox}>
            <SecurityItem
              label="Sécurité & PIN"
              onPress={() => router.push("/user-security-pin/")}
            />
            <SecurityItem danger label="Déconnexion" onPress={logout} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= AVATAR MODAL ================= */}
      <Modal transparent visible={avatarOpen} animationType="fade">
        <BlurView intensity={45} tint="dark" style={styles.avatarModal}>
          <View style={styles.avatarCard}>
            <Text style={styles.priceText}>
              Changement de photo de profil :{" "}
              <Text style={{ color: GOLD, fontWeight: "900" }}>
                {photoPriceTan} TAN
              </Text>
            </Text>

            <TouchableOpacity onPress={takePhoto} style={styles.avatarAction}>
              <Text style={styles.avatarText}>📷 Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickFromGallery} style={styles.avatarAction}>
              <Text style={styles.avatarText}>🖼️ Choisir depuis la galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAvatarOpen(false)}>
              <Text style={styles.avatarCancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      {/* ================= NOTIFICATION ================= */}
      {notif && (
        <Animated.View style={[styles.notifContainer, { opacity: notifAnim }]}>
          <BlurView intensity={40} tint="dark" style={styles.notifBlur}>
            <Text style={styles.notifText}>{notif}</Text>
          </BlurView>
        </Animated.View>
      )}
    </SecureScreen>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   UI                                      */
/* -------------------------------------------------------------------------- */

function Label({ children }: any) {
  return <Text style={styles.label}>{children}</Text>;
}

function SecurityItem({ label, onPress, danger }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.securityItem}>
      <Text style={[styles.securityText, danger && { color: "#FF5C5C" }]}>
        {label}
      </Text>
      <Feather name="chevron-right" size={18} color={danger ? "#FF5C5C" : GOLD} />
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },

  header: { paddingTop: 60, alignItems: "center" },

  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: { width: 92, height: 92, borderRadius: 46 },

  scroll: { padding: 20, paddingBottom: 80 },

  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#333",
  },

  label: { color: "#aaa", fontSize: 12, marginTop: 14 },

  input: {
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 12,
    marginTop: 6,
  },

  readonly: { opacity: 0.6 },

  saveBtn: {
    backgroundColor: GOLD,
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveText: { fontWeight: "900", color: "#000" },

  securityBox: {
    backgroundColor: "#111",
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },

  securityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomColor: "#222",
    borderBottomWidth: 1,
  },

  securityText: { color: "#fff", fontWeight: "700" },

  avatarModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarCard: {
    width: "80%",
    backgroundColor: "#111",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#333",
  },

  priceText: {
    color: "#ccc",
    textAlign: "center",
    marginBottom: 14,
    fontSize: 13,
  },

  avatarAction: { paddingVertical: 14 },

  avatarText: { color: "#fff", fontSize: 16, textAlign: "center" },

  avatarCancel: {
    color: "#FF5C5C",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },

  notifContainer: {
    position: "absolute",
    top: 90,
    alignSelf: "center",
    zIndex: 999,
  },

  notifBlur: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
  },

  notifText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
