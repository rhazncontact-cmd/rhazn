import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as Network from "expo-network";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#FFD700";
const { width } = Dimensions.get("window");

export default function ApplyAgent() {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [cityOfBirth, setCityOfBirth] = useState("");

  const [idDoc, setIdDoc] = useState<any>(null);
  const [selfie, setSelfie] = useState<any>(null);
  const [cvFile, setCvFile] = useState<any>(null);
  const [companyDocs, setCompanyDocs] = useState<any>(null);
  const [depositSlip, setDepositSlip] = useState<any>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // ==================== OFFLINE CACHE ====================
  useEffect(() => {
    const init = async () => {
      const net = await Network.getNetworkStateAsync();
      setIsOnline(!!net.isConnected);

      const saved = await AsyncStorage.getItem("apply-agent-cache");
      if (saved) {
        const s = JSON.parse(saved);
        setFullName(s.fullName || "");
        setFirstName(s.firstName || "");
        setCityOfBirth(s.cityOfBirth || "");
        setIdDoc(s.idDoc || null);
        setSelfie(s.selfie || null);
        setCvFile(s.cvFile || null);
        setCompanyDocs(s.companyDocs || null);
        setDepositSlip(s.depositSlip || null);
        setSignature(s.signature || null);
        setStep(s.step || 0);
        translateX.setValue(-(s.step || 0) * width);
      }
    };
    init();
  }, []);

  const saveCache = async () => {
    await AsyncStorage.setItem(
      "apply-agent-cache",
      JSON.stringify({
        fullName,
        firstName,
        cityOfBirth,
        idDoc,
        selfie,
        cvFile,
        companyDocs,
        depositSlip,
        signature,
        step,
      })
    );
  };

  // ==================== PICK FILE ====================
  const pickFile = async (setter: any) => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (!res.canceled) {
      setter(res.assets[0]);
      await saveCache();
    }
  };

  // ==================== VALIDATION ====================
  const isStepValid = () => {
    if (step === 0)
      return (
        fullName &&
        firstName &&
        cityOfBirth &&
        idDoc &&
        selfie &&
        cvFile
      );

    if (step === 1) return companyDocs;
    if (step === 2) return depositSlip && signature;

    return false;
  };

  // ==================== NEXT STEP ====================
  const goNext = () => {
    if (!isStepValid()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation", "Veuillez compléter tous les champs requis.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const next = step + 1;
    Animated.timing(translateX, {
      toValue: -next * width,
      duration: 420,
      useNativeDriver: true,
    }).start();

    setStep(next);
    saveCache();
  };

  // ==================== UPLOAD ====================
  const uploadFile = async (file: any, bucket: string) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const extension = file.name?.split(".").pop() || "bin";
    const filePath = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: file.mimeType || "application/octet-stream",
      });

    if (error) throw error;
    return filePath;
  };

  // ==================== PDF ====================
  const generateReceiptPDF = async (payload: any) => {
    const html = `
      <html>
        <body style="font-family:Arial;padding:20px;">
          <h2 style="text-align:center;">REÇU OFFICIEL — RHAZN ED</h2>
          <hr/>
          <p><b>Nom :</b> ${payload.full_name}</p>
          <p><b>Prénom :</b> ${payload.first_name}</p>
          <p><b>Email :</b> ${payload.email}</p>
          <p><b>Ville :</b> ${payload.city_of_birth}</p>
          <p><b>CV :</b> Document reçu</p>
          <p><b>Date :</b> ${new Date().toLocaleString()}</p>
          <p><b>Statut :</b> DEMANDE ENREGISTRÉE</p>
          <hr/>
          <img src="${signature}" width="200"/>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  // ==================== SUBMIT ====================
  const submitForm = async () => {
    if (!isOnline) {
      Alert.alert("Hors connexion", "Soumission impossible sans internet.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      if (!data?.user) throw new Error("Session invalide");

      const idPath = await uploadFile(idDoc, "agent-ids");
      const selfiePath = await uploadFile(selfie, "agent-selfies");
      const cvPath = await uploadFile(cvFile, "agent-cv");
      const companyPath = await uploadFile(companyDocs, "agent-companies");
      const depositPath = await uploadFile(depositSlip, "agent-deposits");

      const payload = {
        user_uid: data.user.id,
        email: data.user.email,
        full_name: fullName.trim(),
        first_name: firstName.trim(),
        city_of_birth: cityOfBirth.trim(),
        id_document_path: idPath,
        selfie_path: selfiePath,
        cv_path: cvPath,
        company_docs_path: companyPath,
        deposit_slip_path: depositPath,
        signature_base64: signature,
        status: "PENDING",
      };

      const { error } = await supabase
        .from("agent_applications")
        .insert(payload);

      if (error) throw error;

      await generateReceiptPDF(payload);
      await AsyncStorage.removeItem("apply-agent-cache");

      Alert.alert("Succès", "Dossier Agent transmis avec succès.");
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Échec de soumission.");
    } finally {
      setLoading(false);
    }
  };

  // ==================== UI ====================
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#000" }}>
      <BlurView intensity={40} tint="dark" style={styles.glassHeader}>
        <View style={styles.headerInner}>
          <Text style={styles.title}>Demande d’Accréditation</Text>
          <Image
            source={require("../assets/images/logo-rhazn.png")}
            style={styles.logo}
          />
        </View>
      </BlurView>

      <View style={{ height: 130 }} />

      <View style={styles.progress}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  step === i ? GOLD : i < step ? "#22c55e" : "#333",
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={{
          flexDirection: "row",
          width: width * 3,
          transform: [{ translateX }],
        }}
      >
        {/* STEP 0 */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Informations personnelles</Text>

          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor="#777"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="#777"
            value={firstName}
            onChangeText={setFirstName}
          />

          <TextInput
            style={styles.input}
            placeholder="Ville de naissance"
            placeholderTextColor="#777"
            value={cityOfBirth}
            onChangeText={setCityOfBirth}
          />

          <TouchableOpacity style={styles.upload} onPress={() => pickFile(setIdDoc)}>
            <Text style={styles.uploadText}>
              {idDoc ? "✅ Pièce d'identité sélectionnée" : "Téléverser pièce d'identité"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.upload} onPress={() => pickFile(setSelfie)}>
            <Text style={styles.uploadText}>
              {selfie ? "✅ Selfie sélectionné" : "Téléverser selfie"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.upload} onPress={() => pickFile(setCvFile)}>
            <Text style={styles.uploadText}>
              {cvFile ? "✅ CV sélectionné (PDF)" : "Téléverser votre CV (PDF)"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* STEP 1 */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Documents Entreprise</Text>

          <TouchableOpacity
            style={styles.upload}
            onPress={() => pickFile(setCompanyDocs)}
          >
            <Text style={styles.uploadText}>
              {companyDocs
                ? "✅ Document entreprise sélectionné"
                : "Téléverser document entreprise"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* STEP 2 */}
        <View style={styles.page}>
          <Text style={styles.stepTitle}>Paiement & Signature</Text>

          <TouchableOpacity
            style={styles.upload}
            onPress={() => pickFile(setDepositSlip)}
          >
            <Text style={styles.uploadText}>
              {depositSlip
                ? "✅ Bordereau sélectionné"
                : "Téléverser bordereau de dépôt"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.upload, { borderStyle: "dashed" }]}
            onPress={() => setSignature("signed")}
          >
            <Text style={styles.uploadText}>
              {signature ? "✅ Signature enregistrée" : "Signer"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ✅ BOUTON FLOTTANT REMONTÉ DE 2 ESPACES */}
      <BlurView intensity={45} tint="dark" style={styles.glassFooter}>
        {step < 2 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.btnText}>Continuer →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, loading && { opacity: 0.6 }]}
            onPress={submitForm}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Envoi..." : "Soumettre"}
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles: any = {
  glassHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingBottom: 16,
    zIndex: 20,
  },

  headerInner: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: { width: 38, height: 38 },

  title: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "900",
  },

  progress: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 10,
  },

  dot: { width: 9, height: 9, borderRadius: 9, marginHorizontal: 6 },

  page: { width, padding: 22 },

  stepTitle: {
    color: GOLD,
    fontSize: 18,
    marginBottom: 14,
    fontWeight: "700",
  },

  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 16,
    fontSize: 15,
  },

  upload: {
    backgroundColor: "#111",
    borderColor: GOLD,
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },

  uploadText: {
    color: GOLD,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },

  // ✅ Bouton flottant ajusté vers le haut
  glassFooter: {
    position: "absolute",
    bottom: 46,   // ← remonté de 2 espaces ✅
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 22,
    zIndex: 20,
  },

  nextBtn: {
    backgroundColor: GOLD,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  btnText: {
    fontWeight: "800",
    fontSize: 15,
    color: "#000",
  },
};
