import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<null | boolean>(null);

  useEffect(() => {
    const check = async () => {
      // 1️⃣ Session
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;

      if (!uid) {
        router.replace("/auth/login");
        return;
      }

      // 2️⃣ Chargement user
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("uid", uid)
        .maybeSingle();

      if (error || !data || data.role !== "admin") {
        // 🔥 Log DENIED
        await supabase.from("admin_access_logs").insert({
          user_uid: uid,
          event_type: "denied",
          success: false,
          reason: error
            ? `db_error: ${error.message}`
            : `role=${data?.role ?? "unknown"}`,
        });

        router.replace("/not-authorized");
        return;
      }

      // 3️⃣ Log GRANTED + mise à jour last_admin_access
      await Promise.all([
        supabase.from("admin_access_logs").insert({
          user_uid: uid,
          event_type: "granted",
          success: true,
          reason: "AdminGuard passed",
        }),
        supabase
          .from("users")
          .update({ last_admin_access: new Date().toISOString() })
          .eq("uid", uid),
      ]);

      setAllowed(true);
    };

    check();
  }, []);

  if (allowed === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={GOLD} />
        <Text style={{ color: GOLD, marginTop: 10 }}>Vérification du mérité...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
