// ======================================================
// RHAZN — AUTH GATE (ROUTING INTELLIGENT)
// ======================================================

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import LoaderRhazn from "./components/LoaderRhazn";

export default function AuthGate() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    check();
  }, [loading, session]);

  const check = async () => {
    /* ❌ pas connecté */
    if (!session) {
      router.replace("/auth/login");
      return;
    }

    const uid = session.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("contract_accepted_at, signature_accepted_at")
      .eq("id", uid)
      .maybeSingle();

    if (!profile?.contract_accepted_at) {
      router.replace("/legal/contract");
      return;
    }

    if (!profile?.signature_accepted_at) {
      router.replace("/legal/signature");
      return;
    }

    router.replace("/rz-roles");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <LoaderRhazn />
    </View>
  );
}
