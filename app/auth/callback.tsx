// app/auth/callback.tsx
// ✅ Page intermédiaire — traite le token reset password
// ✅ Appelée par le deep link email → redirige vers reset-password

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) {
        setStatus("error");
        return;
      }

      console.log("🔑 callback URL:", url);

      // Parser le fragment (#) ou query (?)
      const hashPart  = url.split("#")[1];
      const queryPart = url.split("?")[1];
      const raw       = hashPart ?? queryPart ?? "";
      const params    = new URLSearchParams(raw);

      const type         = params.get("type");
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token") ?? "";
      const tokenHash    = params.get("token_hash");

      console.log("🔑 type:", type, "| access_token:", accessToken ? "✅" : "NULL", "| token_hash:", tokenHash ? "✅" : "NULL");

      try {
        // Méthode 1 — access_token direct (implicit flow)
        if (accessToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            console.log("✅ setSession OK → reset-password");
            router.replace("/auth/reset-password");
            return;
          }
          console.log("❌ setSession error:", error.message);
        }

        // Méthode 2 — token_hash (PKCE flow)
        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!error) {
            console.log("✅ verifyOtp OK → reset-password");
            router.replace("/auth/reset-password");
            return;
          }
          console.log("❌ verifyOtp error:", error.message);
        }

        // Méthode 3 — écouter PASSWORD_RECOVERY event
        // (Supabase peut aussi envoyer l'event directement)
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
            console.log("✅", event, "→ reset-password");
            sub.subscription.unsubscribe();
            router.replace("/auth/reset-password");
          }
        });

        // Timeout 10s
        setTimeout(() => {
          sub.subscription.unsubscribe();
          console.log("⏱ timeout → login");
          setStatus("error");
        }, 10000);

      } catch (e: any) {
        console.log("❌ callback error:", e?.message);
        setStatus("error");
      }
    };

    // Lire l'URL initiale (app ouverte depuis lien)
    Linking.getInitialURL().then(handle);

    // Ou URL reçue pendant que l'app tourne
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  if (status === "error") {
    return (
      <View style={s.screen}>
        <View style={s.card}>
          <Text style={s.emoji}>🔗</Text>
          <Text style={s.title}>Lien expiré</Text>
          <Text style={s.sub}>Ce lien est invalide ou a expiré.{"\n"}Refaites "Mot de passe oublié".</Text>
          <Text style={s.link} onPress={() => router.replace("/auth/login")}>
            ← Retour à la connexion
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <ActivityIndicator color={GOLD} size="large" style={{ marginBottom: 20 }} />
        <Text style={s.title}>Vérification en cours…</Text>
        <Text style={s.sub}>Ouverture de la réinitialisation{"\n"}de votre mot de passe.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", padding: 24 },
  card:   { backgroundColor: "#0D0D0D", borderRadius: 24, padding: 32, alignItems: "center", width: "100%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  emoji:  { fontSize: 40, marginBottom: 16 },
  title:  { color: "#FFF", fontSize: 20, fontWeight: "900", marginBottom: 8, textAlign: "center" },
  sub:    { color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 22 },
  link:   { color: GOLD, fontWeight: "800", fontSize: 14, marginTop: 24 },
});