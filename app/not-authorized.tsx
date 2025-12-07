import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const GOLD = "#D4AF37";

export default function NotAuthorizedScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      {/* Halo */}
      <View style={styles.glow} />
      <View style={styles.glow2} />

      {/* Logo */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/rhazn-logo.png")}
          style={styles.logo}
        />
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Accès refusé</Text>
        <Text style={styles.subtitle}>
          Cet espace est réservé au{" "}
          <Text style={{ color: GOLD }}>Conseil Administratif RHAZN</Text>.
        </Text>

        <Text style={styles.body}>
          Si tu penses qu’il s’agit d’une erreur, contacte immédiatement
          l’Administration RHAZN. Chaque accès admin est tracé, journalisé
          et jugé à la lumière.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/auth/login")}
        >
          <Text style={styles.buttonText}>Revenir à l’entrée</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>RHAZN — Sanctuaire du Mérite Absolu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  header: {
    position: "absolute",
    top: 50,
    right: 24,
  },
  logo: { width: 54, height: 54, resizeMode: "contain" },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 200,
    top: -40,
    right: -20,
    backgroundColor: "#FFD70022",
  },
  glow2: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 200,
    bottom: -50,
    left: -40,
    backgroundColor: "#FFD70011",
  },
  card: {
    marginHorizontal: 24,
    paddingVertical: 32,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: "rgba(12,12,12,0.96)",
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#ddd",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    textAlign: "center",
    fontSize: 14,
  },
  footer: {
    marginTop: 26,
    textAlign: "center",
    color: "#666",
    fontSize: 11,
  },
});
