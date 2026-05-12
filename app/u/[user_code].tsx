import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

/* 🎨 RHAZN PALETTE */
const GOLD = "#D4AF37";
const DARK = "#0B0B0B";
const LIGHT = "#F5F5F7";

/* ===================== CADNA ===================== */
function cadnaLabel(status?: string) {
  return status === "approved"
    ? { text: "Identité vérifiée CADNA", color: "#16A34A" }
    : { text: "Validation CADNA en cours", color: "#F59E0B" };
}

/* ===================== SCREEN ===================== */
export default function PublicProfile() {
  const { user_code } = useLocalSearchParams<{ user_code: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (!user_code) return;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_code", user_code)
        .eq("is_public", true)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }

      setProfile(data);

      const { data: works } = await supabase
        .from("store_products")
        .select("id")
        .eq("owner_uid", data.id)
        .limit(1);

      setIsCreator(!!works?.length);
      setLoading(false);
    })();
  }, [user_code]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.boot}>
        <Text style={{ color: "#777" }}>Profil introuvable</Text>
      </View>
    );
  }

  const cadna = cadnaLabel(profile.cadna_status);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* LOGO */}
      <View style={styles.top}>
        <Image
          source={require("../../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      {/* CARD */}
      <View style={styles.card}>
        {/* AVATAR + RING */}
        <View style={styles.avatarWrap}>
          <View style={styles.ring} />
          <Image
            source={
              profile.avatar_url
                ? { uri: profile.avatar_url }
                : require("../../assets/images/avatar7.png")
            }
            style={styles.avatar}
          />
        </View>

        {/* NAME */}
        <Text style={styles.name}>
          {profile.first_name || profile.last_name
            ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`
            : "Utilisateur RHAZN"}
        </Text>

        {/* CODE */}
        <Text style={styles.code}>{profile.user_code}</Text>

        {/* BADGES */}
        <View style={styles.badges}>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorText}>Créateur RHAZN</Text>
            </View>
          )}

          <View style={[styles.cadnaBadge, { borderColor: cadna.color }]}>
            <Text style={[styles.cadnaText, { color: cadna.color }]}>
              {cadna.text}
            </Text>
          </View>
        </View>

        {/* QR PLACEHOLDER */}
        <View style={styles.qrBlock}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={56} color="#999" />
          </View>
          <Text style={styles.qrHint}>
            Code QR disponible dans la version complète
          </Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.replace("/auth/register")}
      >
        <Text style={styles.ctaText}>Rejoindre RHAZN</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: LIGHT },

  boot: {
    flex: 1,
    backgroundColor: LIGHT,
    justifyContent: "center",
    alignItems: "center",
  },

  top: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  logo: { width: 44, height: 44 },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 28,
    paddingVertical: 34,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  avatarWrap: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: GOLD,
    opacity: 0.9,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },

  name: {
    fontSize: 22,
    fontWeight: "900",
    color: DARK,
    marginTop: 10,
    textAlign: "center",
  },

  code: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#555",
  },

  badges: {
    marginTop: 18,
    alignItems: "center",
    gap: 8,
  },

  creatorBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  creatorText: {
    color: "#3730A3",
    fontWeight: "800",
    fontSize: 12,
  },

  cadnaBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cadnaText: { fontWeight: "800", fontSize: 12 },

  qrBlock: {
    marginTop: 26,
    alignItems: "center",
  },

  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },

  qrHint: {
    marginTop: 12,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  cta: {
    marginTop: 30,
    marginHorizontal: 40,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 999,
  },

  ctaText: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    color: "#000",
  },
});