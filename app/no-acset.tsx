import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NoACSET() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo RHAZN */}
      <Image
        source={require("../assets/images/logo-rhazn.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Message */}
      <Text style={styles.title}>Aucun ACSET détecté</Text>
      <Text style={styles.subtitle}>
        Pour accéder au Cycle du Mérite, vous devez avoir des ACSET.
      </Text>

      <Text style={styles.info}>
        Merci de contacter un agent RHAZN pour activer votre compte.
      </Text>

      {/* Bouton retour */}
      <TouchableOpacity
        onPress={() => router.replace("/auth")}
        style={styles.btn}
      >
        <Text style={styles.btnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const GOLD = "#D4AF37";

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
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    color: GOLD,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  info: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: "800",
    color: "#000",
    fontSize: 16,
  },
});
