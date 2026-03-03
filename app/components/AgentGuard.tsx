import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AgentGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAgent = async () => {
      /* 1️⃣ Session */
      const { data: authData } = await supabase.auth.getUser();

      const user = authData?.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      /* =====================================================
         🔥 RHAZN FINAL LOGIC (EDS ONLY)
         profiles.role SUPPRIMÉ COMPLETEMENT
      ===================================================== */

      const { data: ed } = await supabase
        .from("eds")
        .select("id")
        .eq("auth_uid", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!ed) {
        router.replace("/user-dashboard");
        return;
      }

      /* ✅ Agent autorisé */
      setAuthorized(true);
    };

    checkAgent();
  }, []);

  /* ⏳ Loader */
  if (authorized !== true) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return <>{children}</>;
}
