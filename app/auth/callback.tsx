import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";

/**
 * Callback appelé automatiquement après clic sur le lien email Supabase
 * 👉 Confirme l’email
 * 👉 Crée la session
 * 👉 Supprime définitivement "Waiting for verification"
 */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const finalizeAuth = async () => {
      try {
        // 1️⃣ Récupération de la session créée par Supabase
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          // Sécurité : retour login si problème
          router.replace("/auth/login");
          return;
        }

        const userId = data.session.user.id;

        // 2️⃣ Vérification du profil (optionnel mais recommandé)
        const { data: profile } = await supabase
          .from("profiles")
          .select("contract_accepted")
          .eq("id", userId)
          .maybeSingle();

        // 3️⃣ Redirection finale logique
        router.replace(
          profile?.contract_accepted
            ? "/rz-roles"
            : "/legal/contract"
        );
      } catch (err) {
        // En cas d’erreur inattendue
        router.replace("/auth/login");
      }
    };

    finalizeAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});
