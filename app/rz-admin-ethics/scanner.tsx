import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import { AdminScreen } from "../../components/admin/AdminUI";

export default function RZAdminEthicsScanner() {

  /** ✨ Glow moral (ligne divine) */
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        })
      ])
    ).start();
  }, []);

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#9A7F00", "#FFD700"]
  });

  /** 🧠 Mock IA — Score de Pureté */
  const [result, setResult] = useState<null | {
    purity: number;
    tone: string;
    issues: string[];
  }>(null);

  function scanNow() {
    const purity = Math.random();
    const issues = [];

    if (purity < 0.25) issues.push("Langage inapproprié");
    if (purity < 0.45) issues.push("Ton agressif");
    if (purity < 0.65) issues.push("Attitude suspecte");
    if (purity < 0.85) issues.push("Expression émotionnelle instable");

    setResult({
      purity,
      tone:
        purity > 0.85
          ? "Pur et maîtrisé"
          : purity > 0.65
          ? "Acceptable, ton neutre"
          : purity > 0.45
          ? "Instable"
          : "Agressif / à risque",
      issues
    });
  }

  return (
    <AdminScreen
      title="Scanner de Contenus"
      subtitle="Analyse IA • Moralité • Langage • Attitude"
      showBack
    >

      {/* Ligne Glow */}
      <Animated.View style={[styles.divider, { backgroundColor: glowColor }]} />

      {/* Section intro */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyse IA en direct</Text>
        <Text style={styles.sectionDesc}>
          Le système évalue la pureté morale du PACT : langage, ton, attitude.
        </Text>
      </View>

      {/* Bouton Scan */}
      <TouchableOpacity style={styles.scanBtn} onPress={scanNow}>
        <Feather name="search" size={22} color="#000" />
        <Text style={styles.scanBtnText}>Scanner maintenant</Text>
      </TouchableOpacity>

      {/* Résultats */}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Résultats Analyse</Text>

          <Text style={styles.row}>
            Pureté morale :{" "}
            <Text style={[styles.value, { color: purityColor(result.purity) }]}>
              {Math.round(result.purity * 100)}%
            </Text>
          </Text>

          <Text style={styles.row}>
            Ton global : <Text style={styles.value}>{result.tone}</Text>
          </Text>

          {result.issues.length > 0 && (
            <>
              <Text style={styles.issuesTitle}>Points détectés :</Text>
              {result.issues.map((i, idx) => (
                <Text key={idx} style={styles.issueLine}>
                  • {i}
                </Text>
              ))}
            </>
          )}

          {result.issues.length === 0 && (
            <Text style={styles.good}>
              Aucun problème détecté ✔ Pureté optimale
            </Text>
          )}
        </View>
      )}

    </AdminScreen>
  );
}

/** 🎨 Couleur selon pureté morale */
function purityColor(p: number) {
  if (p > 0.85) return "#22c55e";
  if (p > 0.65) return "#facc15";
  if (p > 0.45) return "#fb923c";
  return "#ef4444";
}

/* ---------------------------------- */
/*               STYLES               */
/* ---------------------------------- */

const styles = StyleSheet.create({
  divider: {
    height: 2,
    width: "45%",
    marginLeft: 22,
    marginBottom: 26,
    borderRadius: 8
  },

  section: { paddingHorizontal: 18, marginBottom: 16 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionDesc: { color: "#999", marginTop: 4, fontSize: 12 },

  scanBtn: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFD700",
    alignSelf: "flex-start",
    marginLeft: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 18
  },

  scanBtnText: { fontWeight: "800", color: "#000" },

  resultBox: {
    backgroundColor: "#0B0B0B",
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    gap: 8
  },

  resultTitle: {
    color: "#FFD700",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 6
  },

  row: { color: "#d6d6d6", fontSize: 13 },

  value: { color: "#FFD700", fontWeight: "700" },

  issuesTitle: {
    color: "#fff",
    marginTop: 10,
    fontWeight: "700",
    fontSize: 13
  },

  issueLine: { color: "#fb923c", fontSize: 12 },

  good: {
    color: "#22c55e",
    marginTop: 10,
    fontWeight: "700",
    fontSize: 13
  }
});
