import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ApplyAgent() {
  const router = useRouter();

  // Champs du formulaire
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [moralAnswer, setMoralAnswer] = useState("");
  const [motivation, setMotivation] = useState("");

  const [showThanks, setShowThanks] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.9)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const isValid =
    fullName.trim().length > 2 &&
    moralAnswer.trim().length > 20 &&
    motivation.trim().length > 20;

  const animateThanks = () => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const submitForm = () => {
    if (!isValid) {
      setShowErrors(true);
      animateShake();
      return;
    }

    setShowErrors(false);
    setShowThanks(true);
    animateThanks();
  };

  /** Écran de remerciement */
  if (showThanks) {
    return (
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.thankCard,
            {
              opacity: fade,
              transform: [{ scale: pop }],
            },
          ]}
        >
          <Text style={styles.title}>🎖 Merci pour ton engagement</Text>
          <Text style={styles.text}>
            Ton pacte moral est enregistré.
            {"\n\n"}
            Sur RHAZN, un Agent n’est pas un simple utilisateur : c’est un
            garde-fou du Mérite, un témoin de la vérité et de l’équité.
          </Text>

          <TouchableOpacity
            style={styles.btnGold}
            onPress={() => {
              setShowThanks(false);
              router.push("/rz-agent-dashboard");
            }}
          >
            <Feather name="shield" size={18} color="black" />
            <Text style={styles.btnText}>Accéder à mon espace Agent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, { marginTop: 10 }]}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={styles.btnOutlineText}>Retour au Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header flottant */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#FFD700" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Devenir Agent RZ</Text>

        <TouchableOpacity onPress={() => router.push("/dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={styles.logo}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bloc Intro / Badge */}
        <View style={styles.badgeCard}>
          <View style={styles.badgeIconWrapper}>
            <Feather name="shield" size={26} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeTitle}>Pacte d’Agent RHAZN</Text>
            <Text style={styles.badgeText}>
              L’Agent RZ est le gardien de la moralité, de la simplicité et du
              mérite humain. Ce formulaire n’est pas administratif : c’est un
              engagement public devant ta conscience.
            </Text>
          </View>
        </View>

        {/* Étapes */}
        <View style={styles.stepsRow}>
          <View style={styles.stepItem}>
            <View style={styles.stepDotActive} />
            <Text style={styles.stepLabel}>Identité</Text>
          </View>
          <View style={styles.stepSeparator} />
          <View style={styles.stepItem}>
            <View style={styles.stepDotActive} />
            <Text style={styles.stepLabel}>Moralité</Text>
          </View>
          <View style={styles.stepSeparator} />
          <View style={styles.stepItem}>
            <View style={styles.stepDotActive} />
            <Text style={styles.stepLabel}>Motivation</Text>
          </View>
        </View>

        {/* Code moral */}
        <Text style={styles.sectionTitle}>🛡 Code Moral RZ</Text>

        <View style={styles.rulesCard}>
          <Text style={styles.rule}>
            ✅ <Text style={styles.ruleStrong}>Respect absolu</Text> — aucune
            vulgarité, aucune moquerie, aucune humiliation.
          </Text>
          <Text style={styles.rule}>
            ✅ <Text style={styles.ruleStrong}>Vérité</Text> — transparence dans
            les actes, dans les propos et dans les choix.
          </Text>
          <Text style={styles.rule}>
            ✅ <Text style={styles.ruleStrong}>Authenticité</Text> — aucun faux
            visage, aucun personnage social, aucun double-jeu.
          </Text>
          <Text style={styles.rule}>
            ✅ <Text style={styles.ruleStrong}>Neutralité</Text> — aucun
            favoritisme, aucune manipulation du mérite.
          </Text>
        </View>

        {/* Formulaire */}
        <Animated.View
          style={[
            styles.formCard,
            { transform: [{ translateX: shake }] },
          ]}
        >
          <Text style={styles.sectionTitle}>📝 Formulaire d’engagement</Text>

          <Text style={styles.label}>Nom complet *</Text>
          <TextInput
            placeholder="Nom et prénom"
            placeholderTextColor="#777"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Ville / Pays (facultatif)</Text>
          <TextInput
            placeholder="Ex : Port-au-Prince, Haïti"
            placeholderTextColor="#777"
            style={styles.input}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Pour toi, qu’est-ce que la moralité ? *</Text>
          <TextInput
            placeholder="Exprime ta compréhension de la moralité, en lien avec ta conduite quotidienne."
            placeholderTextColor="#777"
            style={[styles.input, styles.textArea]}
            value={moralAnswer}
            onChangeText={setMoralAnswer}
            multiline
          />

          <Text style={styles.label}>
            Pourquoi veux-tu devenir Agent RZ ? *
          </Text>
          <TextInput
            placeholder="Explique en quoi ce rôle fait sens pour toi, et ce que tu veux protéger sur RHAZN."
            placeholderTextColor="#777"
            style={[styles.input, styles.textArea]}
            value={motivation}
            onChangeText={setMotivation}
            multiline
          />

          {showErrors && !isValid && (
            <Text style={styles.errorText}>
              ⚠️ Merci de remplir tous les champs obligatoires avec des
              réponses complètes. RHAZN ne valide pas les engagements
              superficiels.
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.btnGold,
              !isValid && { opacity: 0.6 },
            ]}
            onPress={submitForm}
            activeOpacity={0.85}
          >
            <Feather name="check-circle" size={18} color="black" />
            <Text style={styles.btnText}>Valider mon pacte moral</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            En validant, tu reconnais que ta présence sur RHAZN sera évaluée
            d’abord sur ta conduite morale avant ton talent.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*********** STYLES ***********/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: { color: "#FFD700", fontSize: 18, fontWeight: "bold" },
  logo: { width: 40, height: 40, resizeMode: "contain" },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 40,
  },

  badgeCard: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD70033",
    padding: 14,
    marginBottom: 18,
  },
  badgeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  badgeTitle: {
    color: "#FFD700",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  badgeText: { color: "#bbb", fontSize: 12 },

  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    justifyContent: "center",
  },
  stepItem: { alignItems: "center", flexDirection: "column" },
  stepDotActive: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#FFD700",
    marginBottom: 4,
  },
  stepLabel: { color: "#aaa", fontSize: 11 },
  stepSeparator: {
    width: 30,
    height: 1,
    backgroundColor: "#333",
    marginHorizontal: 6,
  },

  sectionTitle: {
    color: "#FFD700",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },

  rulesCard: {
    backgroundColor: "#101010",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    marginBottom: 20,
  },
  rule: { color: "#ccc", fontSize: 13, marginBottom: 4 },
  ruleStrong: { color: "#FFD700", fontWeight: "600" },

  formCard: {
    backgroundColor: "#0b0b0b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },

  label: {
    color: "#ddd",
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 6,
    fontSize: 13,
  },
  textArea: {
    height: 130,
    textAlignVertical: "top",
  },

  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6,
  },

  btnGold: {
    backgroundColor: "#FFD700",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnText: { fontWeight: "700", fontSize: 14 },

  footerNote: {
    color: "#777",
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  thankCard: {
    backgroundColor: "#111",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD70033",
    width: "100%",
  },
  title: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  text: {
    color: "#bbb",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#FFD70099",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#FFD700",
    fontWeight: "600",
    fontSize: 13,
  },
});
