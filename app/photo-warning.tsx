import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { supabase } from "../lib/supabase";

const COLORS = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#111111",
  sub: "#6E6E73",
  gold: "#D4AF37",
  red: "#DC2626",
};

export default function PhotoWarning() {
  const router = useRouter();
  const { mode, first } = useLocalSearchParams();

  const pickedMode =
  typeof mode === "string"
    ? mode
    : Array.isArray(mode)
    ? mode[0]
    : "gallery";
  const isFirst = first === "1";

  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        <Text style={styles.logo}>RHAZN</Text>
        <Text style={styles.subtitle}>
          Identité Visuelle Officielle
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exigences obligatoires</Text>

          <Text style={styles.text}>
• Photo réelle récente ou avatar fidèle{"\n"}
• Visage clairement visible{"\n"}
• Apparence naturelle et élégante{"\n"}
• Tenue digne et professionnelle
          </Text>

          <Text style={styles.sectionTitle}>Strictement interdits</Text>

          <Text style={styles.text}>
• Maquillage excessif{"\n"}
• Perruques ou faux cheveux{"\n"}
• Faux ongles ou vernis exagérés{"\n"}
• Bijoux extravagants{"\n"}
• Filtres trompeurs{"\n"}
• Photos provocantes ou sexualisées{"\n"}
• Image ne représentant pas l’utilisateur réel
          </Text>

          <Text style={styles.sectionTitle}>
Authenticité des informations
          </Text>

          <Text style={styles.text}>
Votre photo doit correspondre à votre identité réelle.
Certaines données deviennent immuables après validation.
Toute non-conformité rendra le compte obsolète.
          </Text>

          <Text style={styles.sectionTitleRed}>
Sanctions en cas de fraude
          </Text>

          <Text style={styles.danger}>
• Bannissement définitif{"\n"}
• Blocage permanent du wallet{"\n"}
• Perte définitive des gains{"\n"}
• Exclusion irréversible de RHAZN
          </Text>

          <TouchableOpacity
            style={[
              styles.checkbox,
              accepted && { borderColor: COLORS.gold }
            ]}
            onPress={() => setAccepted(!accepted)}
          >
            <Text style={styles.checkboxText}>
              {accepted ? "☑ " : "☐ "}
              Je confirme que ma photo et mes informations sont
              réelles et conformes à mon identité légale.
              J’accepte les règles immuables RHAZN.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!accepted}
            style={[
              styles.button,
              { opacity: accepted ? 1 : 0.4 }
            ]}
            onPress={async () => {
              if (!accepted) return;

              const { data: auth } = await supabase.auth.getUser();

              if (auth?.user && isFirst) {
                await supabase
                  .from("profiles")
                  .update({ identity_warning_seen: true })
                  .eq("id", auth.user.id);
              }

              router.replace(`/photo-upload?mode=${pickedMode}`);
            }}
          >
            <Text style={styles.buttonText}>
              J’ACCEPTE ET CONTINUER
            </Text>
          </TouchableOpacity>

          <Text style={styles.signature}>
Signature numérique RHAZN{"\n"}
Engagement irrévocable
          </Text>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.gold,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.sub,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionTitleRed: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
    color: COLORS.red,
  },
  text: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  danger: {
    fontSize: 14,
    marginBottom: 18,
    color: COLORS.red,
    fontWeight: "800",
    lineHeight: 20,
  },
  checkbox: {
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  checkboxText: {
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "900",
    color: "#000",
  },
  signature: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.sub,
  },
});