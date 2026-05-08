import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

/**
 * Écran d'attente après inscription
 * L'utilisateur doit cliquer sur le lien reçu par email
 */
export default function WaitEmail() {
  const router = useRouter();

  // Sécurité : si l'utilisateur revient ici après confirmation
  useEffect(() => {
    const timer = setTimeout(() => {
      // Optionnel : proposer de revenir au login
    }, 15000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D4AF37" />

      <Text style={styles.title}>Confirmation requise</Text>

      <Text style={styles.text}>
        Nous avons envoyé un e-mail de confirmation à votre adresse.
        {"\n\n"}
        👉 Ouvrez votre boîte mail et cliquez sur le lien pour activer votre
        compte.
        {"\n\n"}
        Vous pourrez ensuite vous connecter.
      </Text>

      <Text
        style={styles.link}
        onPress={() => router.replace("/auth/login")}
      >
        Retour à la connexion
      </Text>
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
    padding: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 24,
    textAlign: "center",
  },
  text: {
    color: "#AAAAAA",
    fontSize: 14,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  link: {
    marginTop: 30,
    color: "#D4AF37",
    fontWeight: "700",
    fontSize: 14,
  },
});
