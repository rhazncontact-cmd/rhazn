import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

export default function IdentityWarning() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");

      const { data } = await supabase
        .from("profiles")
        .select("profile_completed_at")
        .eq("id", auth.user.id)
        .single();

      if (data?.profile_completed_at) {
        router.replace("/user-profile-edit");
      } else {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* LOGO PREMIUM */}
        <Text style={styles.logo}>RHAZN</Text>

        <View style={styles.card}>
          <Text style={styles.title}>IDENTITÉ OFFICIELLE — AVERTISSEMENT</Text>

          <Text style={styles.text}>
Votre identité RHAZN constitue votre base juridique.
Les informations que vous allez fournir doivent être
strictement conformes à votre identité réelle.
          </Text>

          <Text style={styles.section}>
1. Toutes les données doivent être exactes et vérifiables
par une pièce d’identité officielle valide.
          </Text>

          <Text style={styles.section}>
2. Certaines informations deviendront irréversiblement immuables.
Elles ne pourront plus être modifiées.
          </Text>

          <Text style={styles.section}>
3. Toute falsification, erreur volontaire ou non conformité future
entraînera :
          </Text>

          <Text style={styles.danger}>
• Bannissement définitif sans préavis{"\n"}
• Blocage irréversible du wallet{"\n"}
• Perte définitive des gains{"\n"}
• Interdiction permanente de réintégration
          </Text>

          <Text style={styles.text}>
Aucune contestation ne sera acceptée.
Aucun appel ne sera possible.
          </Text>

          <Text style={styles.commitment}>
En continuant, vous confirmez :
{"\n"}✔ Fournir des informations réelles
{"\n"}✔ Utiliser une pièce valide
{"\n"}✔ Comprendre l’irréversibilité
{"\n"}✔ Accepter toutes les conséquences
          </Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.9}
            onPress={async () => {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return;

  await supabase
    .from("profiles")
    .update({ identity_warning_seen: true })
    .eq("id", auth.user.id);

  router.replace("/user-profile-edit");
}}
          >
            <Text style={styles.buttonText}>
Je comprends et je poursuis
            </Text>
          </TouchableOpacity>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.gold,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 18,
  },
  text: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 14,
    lineHeight: 20,
  },
  section: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  danger: {
    fontSize: 14,
    color: COLORS.red,
    fontWeight: "800",
    marginBottom: 14,
    lineHeight: 22,
  },
  commitment: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 22,
    lineHeight: 20,
    fontWeight: "700",
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
});