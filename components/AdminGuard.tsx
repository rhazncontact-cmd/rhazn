import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../././lib/supabase";

/**
🛡️ RHAZN ADMIN GUARD — ULTRA LOCK FINAL
✔ SUPREME accès direct
✔ CAD accès
✔ CADNA accès
✔ Pas de boucle
✔ Pas de blocage fantôme
✔ Sécurité fintech stable
*/

const SUPREME_EMAIL = "meyounbauniklovegodstory@gmail.com";

type Status = "loading" | "ok" | "deny";

export default function AdminGuard({ children }: { children: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const checkAccess = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!mounted.current) return;

        // ❌ pas connecté
        if (!user) {
          setStatus("deny");
          return;
        }

        const email = (user.email || "").toLowerCase();

        // 👑 SUPREME accès absolu
        if (email === SUPREME_EMAIL) {
          setStatus("ok");
          return;
        }

        // 🔎 lire role réel
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!mounted.current) return;

        const role = (profile?.role || "").toUpperCase();

        // 🔥 AUTORISATIONS RHAZN
        if (
          role === "SUPREME" ||
          role === "CAD" ||
          role === "CADNA"
        ) {
          setStatus("ok");
          return;
        }

        // ❌ refus
        setStatus("deny");
      } catch (e) {
        console.log("AdminGuard error:", e);
        setStatus("deny");
      }
    };

    checkAccess();

    return () => {
      mounted.current = false;
    };
  }, []);

  /* 🔁 redirection si refus */
  useEffect(() => {
    if (status === "deny") {
      router.replace("/admin-roles");
    }
  }, [status]);

  /* ⏳ loading */
  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  }

  /* ❌ refus */
  if (status !== "ok") return null;

  /* ✅ accès */
  return <>{children}</>;
}
