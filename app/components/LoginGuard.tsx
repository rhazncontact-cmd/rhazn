import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../lib/supabase";

/**
 * Guard global :
 * - session obligatoire
 * - email confirmé
 * - contrat accepté
 */
export default function LoginGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // 1️⃣ Vérifier session
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/auth/login");
        return;
      }

      const user = data.session.user;

      // 2️⃣ Vérifier email confirmé
      if (!user.email_confirmed_at) {
        router.replace("/auth/wait-email");
        return;
      }

      // 3️⃣ Vérifier contrat
      const { data: profile } = await supabase
        .from("profiles")
        .select("contract_accepted")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.contract_accepted) {
        router.replace("/legal/contract");
        return;
      }

      // 4️⃣ Accès autorisé
      setChecking(false);
    };

    checkAccess();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
