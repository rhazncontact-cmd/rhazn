import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NoACSET() {
  const router = useRouter();

  const goToContactED = () => {
    router.push("/contact-ed");
  };

  return (
    <View style={styles.container}>
      {/* ✅ LOGO RHAZN */}
      <Image
        source={require("../assets/images/logo-rhazn.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* ✅ CARTE OR — MAINTENANT CLIQUABLE */}
      <TouchableOpacity style={styles.goldCard} onPress={goToContactED}>
        <Text style={styles.restrictedText}>
          Localisez un Agent RHAZN certifié à proximité de votre position.
        </Text>
      </TouchableOpacity>

      {/* ✅ INFO SECONDAIRE */}
      <Text style={styles.info}>
        L’accès sera disponible dès que votre solde atteindra le seuil requis
        ou après activation du compte.
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

  // ✅ CARTE OR ÉPURÉE (CLIQUABLE)
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
    color: "#000",
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
