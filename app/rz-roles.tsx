import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 Apple-like Light Palette */
const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  text: "#1C1C1E",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
  blue: "#007AFF",
};

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export default function RZRoles() {
  const router = useRouter();
  const lock = useRef(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileModal, setProfileModal] = useState(false);

  /* Android system UI */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  /* ===================== SESSION GUARD (SUPABASE ONLY) ===================== */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      // ⛔ Pas de session
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const userId = session.user.id;

      // ✅ sécurité onboarding (source DB)
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email, contract_accepted_at, signature_accepted_at")
        .eq("id", userId)
        .maybeSingle();

      if (pErr) {
        console.warn("RZRoles profile load error:", pErr.message);
      }

      // ⛔ tunnel légal obligatoire
      if (!p?.contract_accepted_at) {
        router.replace("/legal/contract");
        return;
      }

      if (!p?.signature_accepted_at) {
        router.replace("/legal/signature");
        return;
      }

      // ✅ profil prêt
      setProfile({
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        email: p?.email ?? session.user.email ?? null, // fallback utile
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* Navigation sécurisée */
  const go = (route: string) => {
    if (lock.current) return;
    lock.current = true;

    Haptics.selectionAsync().catch(() => {});

    setTimeout(() => {
      router.push(route);
      lock.current = false;
    }, 90);
  };

  const initial = useMemo(() => {
    if (!profile?.full_name) return "U";
    return profile.full_name.trim().charAt(0).toUpperCase();
  }, [profile]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setProfileModal(true);
          }}
          style={styles.avatarWrap}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.accountName}>
            {profile?.full_name ?? "Utilisateur"}
          </Text>
          <Text style={styles.accountSub}>{profile?.email ?? "—"}</Text>
        </View>

        <View style={styles.logoWrap}>
          <Image
            source={require("../assets/images/rz-logo.png")}
            style={styles.logo}
          />
        </View>
      </View>

      {/* ROLES */}
      <ScrollView contentContainerStyle={styles.content}>
        <RoleCard
          icon={<Ionicons name="person-circle" size={28} color={COLORS.gold} />}
          label="Compte Utilisateur"
          sub="Accès libre"
          onPress={() => go("/user-dashboard")}
        />

        <RoleCard
          icon={<MaterialIcons name="badge" size={26} color={COLORS.gold} />}
          label="Compte Agent / ED"
          sub="Accès sécurisé"
          onPress={() => go("/agent-key")}
        />

        <RoleCard
          icon={
            <MaterialIcons
              name="admin-panel-settings"
              size={26}
              color={COLORS.gold}
            />
          }
          label="Compte Admin"
          sub="Accès sécurisé"
          onPress={() => go("/admin-key")}
        />
      </ScrollView>

      {/* MODAL PROFIL */}
      {profileModal && (
        <View style={styles.modalBackdrop}>
          <View style={styles.profileModal}>
            <Text style={styles.modalTitle}>
              {profile?.full_name ?? "Compte"}
            </Text>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={async () => {
                Haptics.impactAsync(
                  Haptics.ImpactFeedbackStyle.Medium
                ).catch(() => {});

                await supabase.auth.signOut();

                setProfileModal(false);
                router.replace("/auth/login");
              }}
            >
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setProfileModal(false)}
            >
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ===================== CARD ===================== */
function RoleCard({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.cardIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    marginTop: 60,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    gap: 16,
    elevation: 4,
  },

  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: { width: 64, height: 64, borderRadius: 32 },

  avatarFallback: {
    backgroundColor: "#EFEFF4",
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarInitial: { fontSize: 22, fontWeight: "700" },

  accountName: { fontSize: 18, fontWeight: "800" },

  accountSub: { fontSize: 13, color: COLORS.sub },

  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: { width: 28, height: 28 },

  content: { padding: 20, paddingTop: 36 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  cardIcon: { width: 42, alignItems: "center" },

  cardLabel: { fontSize: 16, fontWeight: "700" },

  cardSub: { fontSize: 12, color: COLORS.sub },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  profileModal: {
    width: "86%",
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 22,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },

  logoutBtn: {
    backgroundColor: "#FFECEC",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  logoutText: { color: "#D70015", fontWeight: "800" },

  closeBtn: { paddingVertical: 12, alignItems: "center" },

  closeText: { color: COLORS.blue, fontWeight: "700" },
});
