import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function NoACSET() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* ✅ LOGO RHAZN */}
      <Image
        source={require("../assets/images/logo-rhazn.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* ✅ CARTE OR — MESSAGE PRINCIPAL */}
      <View style={styles.goldCard}>
        <Text style={styles.restrictedText}>
          Accès Réservé - Identité Agent non Trouvé
        </Text>
      </View>

      {/* ✅ INFO SECONDAIRE */}
      <Text style={styles.info}>
        Veuillez contacter un agent RHAZN habilité pour l’activation de votre
        compte.
      </Text>
    </View>
  );
}

const GOLD = "#D4AF37";
const GOLD_SOFT = "#E7C873";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: 30,
  },

  // ✅ CARTE OR ÉPURÉE
  goldCard: {
    backgroundColor: GOLD_SOFT,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 16,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },

  // ✅ TEXTE NOIR DANS CARTE OR
  restrictedText: {
    fontSize: 18,
    color: "#000", // ✅ NOIR comme demandé
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
  },

  // ✅ TEXTE INFORMATIF
  info: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
});
