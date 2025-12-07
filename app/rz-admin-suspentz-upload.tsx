import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

export default function RZAdminSuspentzUpload() {
  const router = useRouter();
  const [openWeb, setOpenWeb] = useState(false);

  // URL de ton upload mobile (à créer tout de suite après)
  const uploadURL =
    "https://your-domain-or-supabase-url/upload.html";

  if (openWeb) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: uploadURL }}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload SUSPENTZ</Text>

      <Text style={styles.subtitle}>
        Publiez vos vidéos en toute sécurité via RHAZN Studio Mobile.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setOpenWeb(true)}
      >
        <Text style={styles.btnText}>Ouvrir RHAZN Studio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
      >
        <Text style={styles.backTxt}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    color: "#AAA",
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
    width: "90%",
  },

  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },

  btnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },

  back: {
    marginTop: 40,
  },
  backTxt: {
    color: "#FFD700",
    fontSize: 14,
  },
});
