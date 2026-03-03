import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const GOLD = "#D4AF37";

/* -------------------------------------------------------------------------- */
/*                             STORE SUBMIT SCREEN                             */
/* -------------------------------------------------------------------------- */

export default function StoreSubmit() {
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>(); 
  // product = VIDEO | AUDIO | TEXT | etc.

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔐 AUTO USER DATA (LOCKED)
  const [authorName, setAuthorName] = useState("");
  const [authorUid, setAuthorUid] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");

  // 🧾 FORM
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);

  // 💰 PRICE
  const [priceTan, setPriceTan] = useState<number>(0);

  // 🔔 NOTIFICATION
  const notifAnim = useRef(new Animated.Value(0)).current;
  const [notif, setNotif] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotif(msg);
    Animated.timing(notifAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => setNotif(null));
    }, 2400);
  };

  /* ----------------------------- LOAD USER + PRICE ----------------------------- */
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");

      setAuthorUid(auth.user.id);
      setAuthorEmail(auth.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .single();

      setAuthorName(profile?.full_name || "");

      const { data: eco } = await supabase
        .from("eco_formules")
        .select(`${product?.toLowerCase()}_exposure_price_tan`)
        .single();

      setPriceTan(
        Number(
          eco?.[`${product?.toLowerCase()}_exposure_price_tan`] ?? 0
        )
      );

      setLoading(false);
    };

    load();
  }, [product]);

  /* ----------------------------- PICK FILE ----------------------------- */
  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (!res.canceled) {
      setFilePath(res.assets[0].uri);
    }
  };

  /* ----------------------------- SUBMIT ----------------------------- */
  const submit = async () => {
    if (!title || !description || !filePath) {
      notify("Tous les champs sont obligatoires");
      return;
    }

    try {
      setSubmitting(true);

      // 🔥 RPC UNIQUE (débit + insertion + CADNA)
      const { error } = await supabase.rpc(
        "submit_store_product",
        {
          p_product_type: product,
          p_title: title.trim(),
          p_description: description.trim(),
          p_media_path: filePath,
        }
      );

      if (error) throw error;

      notify("Soumission envoyée au CADNA");
      setTimeout(() => router.back(), 800);
    } catch {
      notify("Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <SecureScreen scope="RHAZN-Store">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* HEADER */}
          <Text style={styles.title}>
            Exposer une œuvre — {product}
          </Text>

          <Text style={styles.price}>
            Coût d’exposition :{" "}
            <Text style={{ color: GOLD, fontWeight: "900" }}>
              {priceTan} TAN
            </Text>
          </Text>

          {/* LOCKED INFO */}
          <View style={styles.lockedBox}>
            <Locked label="Auteur" value={authorName} />
            <Locked label="Code utilisateur" value={authorUid} />
            <Locked label="Email" value={authorEmail} />
          </View>

          {/* FORM */}
          <View style={styles.card}>
            <Label>Titre</Label>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l’œuvre"
              placeholderTextColor="#555"
            />

            <Label>Description courte</Label>
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Décrivez brièvement votre œuvre"
              placeholderTextColor="#555"
            />

            <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
              <Feather name="upload" size={18} color={GOLD} />
              <Text style={styles.fileText}>
                {filePath ? "Fichier sélectionné" : "Choisir un fichier"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={submit}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting
                  ? "Soumission…"
                  : "Soumettre pour validation"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* DISCLAIMER */}
          <Text style={styles.disclaimer}>
            Toute soumission est analysée par le CADNA.  
            Les frais d’exposition ne sont pas remboursables.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NOTIF */}
      {notif && (
        <Animated.View
          style={[styles.notif, { opacity: notifAnim }]}
        >
          <BlurView intensity={40} tint="dark" style={styles.notifBlur}>
            <Text style={styles.notifText}>{notif}</Text>
          </BlurView>
        </Animated.View>
      )}
    </SecureScreen>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   UI                                      */
/* -------------------------------------------------------------------------- */

function Label({ children }: any) {
  return <Text style={styles.label}>{children}</Text>;
}

function Locked({ label, value }: any) {
  return (
    <View style={styles.lockedRow}>
      <Text style={styles.lockedLabel}>{label}</Text>
      <Text style={styles.lockedValue}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    padding: 20,
    paddingBottom: 80,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },

  price: {
    color: "#aaa",
    marginBottom: 18,
    fontSize: 14,
  },

  lockedBox: {
    backgroundColor: "#0c0c0c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 18,
  },

  lockedRow: {
    marginBottom: 8,
  },

  lockedLabel: {
    color: "#777",
    fontSize: 12,
  },

  lockedValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#333",
  },

  label: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
    padding: 12,
    marginTop: 6,
  },

  fileBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  fileText: {
    color: GOLD,
    marginLeft: 8,
    fontWeight: "700",
  },

  submitBtn: {
    backgroundColor: GOLD,
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  submitText: {
    fontWeight: "900",
    color: "#000",
    fontSize: 15,
  },

  disclaimer: {
    color: "#777",
    fontSize: 12,
    marginTop: 18,
    textAlign: "center",
  },

  notif: {
    position: "absolute",
    top: 90,
    alignSelf: "center",
    zIndex: 999,
  },

  notifBlur: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
  },

  notifText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
