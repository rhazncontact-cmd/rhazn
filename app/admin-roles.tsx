import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

/* 🍎 RHAZN Palette */
const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  text: "#1C1C1E",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
};

/* ⚠️ SUPREME UNIQUE */
const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

type Roles = {
  is_cad: boolean;
  is_cadna: boolean;
};

export default function AdminRoles() {
  const router = useRouter();
  const lock = useRef(false);

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<Roles>({
    is_cad: false,
    is_cadna: false,
  });

  /* Android UI */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  /* 🔥 SESSION CLEAN + AUTH SAFE */
  useEffect(() => {
    (async () => {
      try {
        // FORCE reset token cassé
        await supabase.auth.signOut();

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth/login");
          return;
        }

        const user = session.user;

        console.log("AUTH EMAIL 👉", user?.email);

        const cleanEmail = (user.email || "").trim().toLowerCase();
        setEmail(cleanEmail);

        // récupère rôle
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = (profile?.role || "").toUpperCase();

        setRoles({
          is_cad: role === "CAD" || role === "SUPREME",
          is_cadna: role === "CADNA" || role === "SUPREME",
        });

        setLoading(false);
      } catch (e) {
        console.log("AUTH ERROR:", e);
        await supabase.auth.signOut();
        router.replace("/auth/login");
      }
    })();
  }, []);

  /* 🔐 Supreme access */
  const isSupreme = useMemo(() => {
    const clean = (email || "").trim().toLowerCase();
    const supreme = SUPREME_EMAIL.trim().toLowerCase();
    return clean === supreme;
  }, [email]);

  const canAccessCAD = isSupreme || roles.is_cad;
  const canAccessCADNA = isSupreme || roles.is_cadna;

  /* navigation safe */
  const go = (route: string) => {
    if (lock.current) return;
    lock.current = true;
    Haptics.selectionAsync().catch(() => {});

    setTimeout(() => {
      router.push(route);
      lock.current = false;
    }, 100);
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Administration RHAZN</Text>
        <Text style={styles.subtitle}>Accès hiérarchisé sécurisé</Text>

        {/* DEBUG VISUEL */}
        <Text style={{ fontSize: 12, marginTop: 10 }}>
          Email connecté: {email}
        </Text>
      </View>

      <View style={styles.cardsWrap}>
        {/* SUPREME */}
        <AdminCard
          icon={<Ionicons name="diamond" size={26} color={COLORS.gold} />}
          title="Compte Supreme"
          subtitle="Autorité absolue"
          locked={!isSupreme}
          onPress={() => go("/admin-dashboard-supreme")}
        />

        {/* CAD */}
        <AdminCard
          icon={<MaterialIcons name="verified-user" size={26} color={COLORS.gold} />}
          title="CAD — Membres"
          subtitle="Conseil Administration"
          locked={!canAccessCAD}
          onPress={() => go("/admin-dashboard-cad")}
        />

        {/* CADNA */}
        <AdminCard
          icon={<MaterialIcons name="shield" size={26} color={COLORS.gold} />}
          title="CADNA — Membres"
          subtitle="Autorité Normalisation"
          locked={!canAccessCADNA}
          onPress={() => go("/rz-admin-governance/cadna/cadna-dashboard")}
        />
      </View>
    </View>
  );
}

/* CARD */
function AdminCard({
  icon,
  title,
  subtitle,
  locked,
  onPress,
}: any) {
  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.85}
      onPress={!locked ? onPress : undefined}
      style={[styles.card, locked && { opacity: 0.4 }]}
    >
      <View style={styles.iconWrap}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>

      {locked ? (
        <Ionicons name="lock-closed" size={18} color="#999" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#999" />
      )}
    </TouchableOpacity>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    marginTop: 70,
    marginHorizontal: 22,
    marginBottom: 30,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 13,
    color: COLORS.sub,
    marginTop: 6,
    fontWeight: "600",
  },

  cardsWrap: {
    paddingHorizontal: 22,
    gap: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    elevation: 4,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardSub: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
    fontWeight: "600",
  },
});
