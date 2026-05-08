import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

/* 🎨 PALETTE RHAZN — Apple-like, naturelle */
const COLORS = {
  bg: "#000000",
  card: "#0E0E0E",
  gold: "#D4AF37",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  softRed: "#C74A4A",
};

type Status = "loading" | "allowed" | "denied";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const didRoute = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      try {
        // 1️⃣ Vérifier la session
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;

        if (!uid) {
          if (!didRoute.current) {
            didRoute.current = true;
            router.replace("/auth/login");
          }
          return;
        }

        // 2️⃣ Vérifier le rôle Admin (lecture seule)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", uid)
          .maybeSingle();

        if (error || !profile?.is_admin) {
          if (mounted) setStatus("denied");
          return;
        }

        if (mounted) setStatus("allowed");
      } catch {
        if (mounted) setStatus("denied");
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ⏳ Écran de vérification
  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text
          style={{
            color: COLORS.gold,
            marginTop: 12,
            fontSize: 14,
            letterSpacing: 0.3,
          }}
        >
          Vérification du privilège…
        </Text>
      </View>
    );
  }

  // ❌ Accès refusé — VERSION PREMIUM
  if (status === "denied") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: COLORS.card,
            borderRadius: 18,
            paddingVertical: 32,
            paddingHorizontal: 26,
            alignItems: "center",
          }}
        >
          {/* Ligne dorée discrète */}
          <View
            style={{
              width: 42,
              height: 3,
              borderRadius: 2,
              backgroundColor: COLORS.gold,
              marginBottom: 18,
            }}
          />

          {/* Titre */}
          <Text
            style={{
              color: COLORS.white,
              fontSize: 20,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 8,
              letterSpacing: 0.4,
            }}
          >
            Accès Administrateur
          </Text>

          {/* Sous-titre */}
          <Text
            style={{
              color: COLORS.softRed,
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            Privilège non accordé
          </Text>

          {/* Description */}
          <Text
            style={{
              color: COLORS.gray,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            Ce compte ne dispose pas des autorisations nécessaires pour accéder à
            l’espace Agent RHAZN.
          </Text>
        </View>
      </View>
    );
  }

  // ✅ Accès autorisé
  return <>{children}</>;
}
