import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const TARGET_TEXT = "Le Baobab";

// 🎨 PALETTE PREMIUM
const COLORS = {
  black: "#000000",
  card: "#111111",
  white: "#FFFFFF",
  gray: "#9A9A9A",
  green: "#00C853",
  crimson: "#B00020",
};

export default function SignaturePremiumScreen() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const successScale = useRef(new Animated.Value(0)).current;

  const showAlert = (msg: string, error = false) => {
    setIsError(error);
    setAlert(msg);
    setTimeout(() => setAlert(null), 3000);
  };

  // ✅ BLOCAGE DU COLLAGE
  const handleChange = (text: string) => {
    if (text.length - value.length > 1) {
      showAlert("❌ Le collage est désactivé. Veuillez taper manuellement.", true);
      return;
    }

    setValue(text);

    // ✅ VALIDATION AUTOMATIQUE STRICTE
    if (text === TARGET_TEXT) {
      Animated.timing(successScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      showAlert("✅ Signature validée avec succès.", false);

      setTimeout(() => {
        router.replace("/flux-intro");
      }, 1100);
    }

    // ❌ ERREUR SI TEXTE COMPLET MAIS INCORRECT
    if (text.length >= TARGET_TEXT.length && text !== TARGET_TEXT) {
      showAlert(
        "❌ Texte incorrect",
        `Le texte doit être écrit exactement comme suit :\n${TARGET_TEXT}`,
        true
      );
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.full}>
      <View style={styles.centerWrap}>
        {/* ✅ CARTE PREMIUM */}
        <View style={styles.card}>
          <Text style={styles.title}>Signature Finale</Text>

          <Text style={styles.subtitle}>
            Veuillez taper exactement le texte suivant pour confirmer :
          </Text>

          <Text style={styles.target}>{TARGET_TEXT}</Text>

          <TextInput
            value={value}
            onChangeText={handleChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Tapez ici..."
            placeholderTextColor={COLORS.gray}
            style={[
              styles.input,
              {
                borderColor: isError ? COLORS.crimson : COLORS.green,
              },
            ]}
          />

          {alert && (
            <Text
              style={[
                styles.alert,
                { color: isError ? COLORS.crimson : COLORS.green },
              ]}
            >
              {alert}
            </Text>
          )}
        </View>

        {/* ✅ ANIMATION SUCCÈS */}
        <Animated.View
          style={[
            styles.successOverlay,
            {
              transform: [{ scale: successScale }],
              opacity: successScale,
            },
          ]}
        >
          <Text style={styles.successText}>✅</Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },

  centerWrap: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
  },

  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },

  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },

  subtitle: {
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 14,
  },

  target: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 18,
  },

  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    color: COLORS.white,
    fontSize: 16,
    backgroundColor: "#0A0A0A",
  },

  alert: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
  },

  successOverlay: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
  },

  successText: { fontSize: 90 },
});
