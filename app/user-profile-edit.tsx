// ======================================================
// RHAZN — USER PROFILE EDIT (APPLE-LIKE PREMIUM FINAL)
// ✅ FIX CLOSURE : useRef pour avatarPublicUrl
// ✅ ACSET débité SEULEMENT si upload réussi
// ✅ Barre de progression upload
// ✅ Modal succès Apple-like
// ✅ Vérification réseau avant upload
// ✅ NOUVEAU : Departement dropdown + CIN field
// ======================================================

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import NetInfo from "@react-native-community/netinfo";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "../lib/supabase";

/* ================= COÛTS ACSET ================= */
const ACSET_EDIT_INFO  = 10;
const ACSET_EDIT_PHOTO = 15;

/* ================= PALETTE ================= */
const COLORS = {
  bg:     "#F2F2F7",
  card:   "#FFFFFF",
  text:   "#111111",
  sub:    "#6E6E73",
  border: "#E5E5EA",
  gold:   "#D4AF37",
  red:    "#DC2626",
  green:  "#34C759",
};

const AVATAR_BUCKET = "avatars";

/* ================= OPTIONS ================= */
const PROFESSION_PRESETS = [
  "Écolier","Étudiant","Ingénieur","Docteur","Commerçant",
  "Avocat","Infirmier","Professeur","Technicien","Artiste",
  "Entrepreneur","Autre",
];
const MARITAL_PRESETS = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"];
const DEPARTEMENT_PRESETS = [
  "Artibonite",
  "Centre",
  "Grand'Anse",
  "Nippes",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Est",
  "Utilisateur Diaspora",
  "Utilisateur International",
];

const COUNTRY_CODES = [
  { code: "+509",   label: "Haïti 🇭🇹" },
  { code: "+1",     label: "USA 🇺🇸" },
  { code: "+33",    label: "France 🇫🇷" },
  { code: "+44",    label: "UK 🇬🇧" },
  { code: "+1-809", label: "République Dominicaine 🇩🇴" },
  { code: "+55",    label: "Brésil 🇧🇷" },
  { code: "+221",   label: "Sénégal 🇸🇳" },
  { code: "+225",   label: "Côte d'Ivoire 🇨🇮" },
];

const isFilled = (v: any) => String(v ?? "").trim().length > 0;

const formatDateFR = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`;
};

const normalizeBirthDateToISO = (input: string) => {
  const v = input.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const formatBirthDateInput = (text: string) => {
  let v = text.replace(/\D/g, "");
  if (v.length > 2) v = v.slice(0,2) + "/" + v.slice(2);
  if (v.length > 5) v = v.slice(0,5) + "/" + v.slice(5,9);
  return v.slice(0,10);
};

const formatNIFInput = (text: string) => {
  let v = text.replace(/\D/g, "");
  const parts = [];
  for (let i = 0; i < v.length; i += 3) parts.push(v.slice(i, i+3));
  return parts.join("-").slice(0,15);
};

// ─── Modal succès Apple-like ────────────────────────────
function SuccessModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      // Auto-fermeture après 2.5s
      const t = setTimeout(onClose, 2500);
      return () => clearTimeout(t);
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={ss.backdrop}>
        <Animated.View style={[ss.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Icône succès */}
          <View style={ss.iconRing}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.green} />
          </View>
          <Text style={ss.title}>Photo mise à jour !</Text>
          <Text style={ss.sub}>Votre photo de profil a été uploadée et sauvegardée avec succès.</Text>
          <View style={ss.acsetPill}>
            <Ionicons name="flash" size={13} color="#000" />
            <Text style={ss.acsetTxt}>-{ACSET_EDIT_PHOTO} ACSET débités</Text>
          </View>
          <TouchableOpacity style={ss.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={ss.btnTxt}>Parfait</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.50)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  card:     { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 28, alignItems: "center", gap: 12, width: "100%", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  iconRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(52,199,89,0.12)", borderWidth: 1.5, borderColor: "rgba(52,199,89,0.30)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:    { color: "#111111", fontSize: 22, fontWeight: "900", textAlign: "center" },
  sub:      { color: "#6E6E73", fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
  acsetPill:{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D4AF37", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  acsetTxt: { color: "#000", fontWeight: "900", fontSize: 13 },
  btn:      { width: "100%", backgroundColor: "#111111", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnTxt:   { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});

// ─── Barre de progression upload ────────────────────────
function UploadProgressBar({ progress, visible }: { progress: number; visible: boolean }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  if (!visible) return null;

  return (
    <View style={pb.wrap}>
      <View style={pb.row}>
        <Ionicons name="cloud-upload-outline" size={13} color={COLORS.gold} />
        <Text style={pb.label}>Upload en cours…</Text>
        <Text style={pb.pct}>{Math.round(progress)}%</Text>
      </View>
      <View style={pb.track}>
        <Animated.View style={[pb.fill, {
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
        }]} />
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  wrap:  { backgroundColor: "rgba(212,175,55,0.10)", borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  row:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  label: { flex: 1, color: COLORS.gold, fontWeight: "700", fontSize: 12 },
  pct:   { color: COLORS.gold, fontWeight: "900", fontSize: 12 },
  track: { height: 6, backgroundColor: "rgba(212,175,55,0.15)", borderRadius: 3, overflow: "hidden" },
  fill:  { height: "100%", backgroundColor: COLORS.gold, borderRadius: 3 },
});

/* ====================================================== */
export default function UserProfileEdit() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const hasValidated = !!params?.validated;
    const hasPhoto     = !!params?.photo;
    if (!hasValidated && !hasPhoto) {
      router.replace("/identity-warning");
    }
  }, []);

  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [photoLoading,  setPhotoLoading]  = useState(false);
  const [uploadProgress,setUploadProgress]= useState(0);
  const [showSuccess,   setShowSuccess]   = useState(false);
  const [user,          setUser]          = useState<any>(null);

  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [sex,             setSex]             = useState<"M"|"F"|"">("");
  const [phone,           setPhone]           = useState("");
  const [countryCode,     setCountryCode]     = useState("+509");
  const [whatsappPhone,   setWhatsappPhone]   = useState("");
  const [birthDateText,   setBirthDateText]   = useState("");
  const [birthDepartment, setBirthDepartment] = useState("");
  const [birthCity,       setBirthCity]       = useState("");
  const [birthCountry,    setBirthCountry]    = useState("");
  const [nif,             setNif]             = useState("");
  const [cin,             setCin]             = useState("");
  const [profession,      setProfession]      = useState("");
  const [maritalStatus,   setMaritalStatus]   = useState("");
  const [premierSouvenir, setPremierSouvenir] = useState("");
  const [maritalModal,    setMaritalModal]    = useState(false);
  const [departementModal,setDepartementModal] = useState(false);
  const [souvenirInfo,    setSouvenirInfo]    = useState(false);
  const [photoModal,      setPhotoModal]      = useState(false);
  const [email,           setEmail]           = useState("");
  const [sealedAt,        setSealedAt]        = useState<string|null>(null);
  const isSealed = !!sealedAt;

  const [avatarLocalUri,  setAvatarLocalUri]  = useState<string|null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string|null>(null);

  // ✅ FIX CLOSURE : ref synchrone pour avatar URL
  const avatarPublicUrlRef = useRef<string | null>(null);

  const [toast,   setToast]   = useState<string|null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const duration = msg.includes("ACSET") ? 6000 : 3000;
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => setToast(null));
    }, duration);
  };

  /* Load profil */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");
      setUser(auth.user);
      setEmail(auth.user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select(`full_name,phone,whatsapp_country_code,whatsapp_phone,sex,
          birth_date,birth_department,birth_city,birth_country,
          nif,cin,profession,marital_status,premier_souvenir,
          avatar_url,profile_completed_at`)
        .eq("id", auth.user.id)
        .single();

      if (data) {
        if (data.full_name) {
          const parts = String(data.full_name).split(" ");
          setLastName(parts[0] ?? "");
          setFirstName(parts.slice(1).join(" ") ?? "");
        }
        setPhone(data.phone ?? "");
        setCountryCode(data.whatsapp_country_code ?? "+509");
        setWhatsappPhone(data.whatsapp_phone ?? "");
        setSex(data.sex ?? "");
        setBirthDateText(data.birth_date ? formatDateFR(data.birth_date) : "");
        setBirthDepartment(data.birth_department ?? "");
        setBirthCity(data.birth_city ?? "");
        setBirthCountry(data.birth_country ?? "");
        setNif(data.nif ?? "");
        setCin(data.cin ?? "");
        setProfession(data.profession ?? "");
        setMaritalStatus(data.marital_status ?? "");
        setPremierSouvenir(data.premier_souvenir ?? "");

        // ✅ Init state ET ref ensemble
        const url = data.avatar_url ?? null;
        setAvatarPublicUrl(url);
        avatarPublicUrlRef.current = url;

        setSealedAt(data.profile_completed_at ? String(data.profile_completed_at) : null);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (params?.photo) {
      const uri = typeof params.photo === "string"
        ? params.photo
        : Array.isArray(params.photo) ? params.photo[0] : null;
      if (uri) setAvatarLocalUri(uri);
    }
  }, [params?.photo]);

  // ─── Upload avatar avec progression simulée ────────────
  const uploadAvatar = async (
    uid: string,
    uri: string,
    onProgress: (pct: number) => void
  ): Promise<string | null> => {
    try {
      // Simulation progression : 0% → 30% pendant la lecture
      onProgress(10);
      const fileExt  = uri.split(".").pop() ?? "jpg";
      const fileName = `${uid}.${fileExt}`;
      const formData = new FormData();
      formData.append("file", { uri, name: fileName, type: "image/jpeg" } as any);

      onProgress(30);

      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(fileName, formData, { upsert: true, contentType: "image/jpeg" });

      onProgress(80);

      if (error) {
        console.error("UPLOAD ERROR", error.message);
        return null;
      }

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
      onProgress(100);
      return pub.publicUrl;
    } catch (e: any) {
      console.error("UPLOAD CRASH", e?.message);
      return null;
    }
  };

  // ══════════════════════════════════════════════════════════
  // ✅ GESTION PHOTO — ordre strict :
  // 1. Vérifier réseau
  // 2. Vérifier ACSET
  // 3. Choisir photo
  // 4. Uploader
  // 5. Sauvegarder profil
  // 6. Débiter ACSET (seulement si 4 et 5 réussis)
  // 7. Afficher modal succès
  // ══════════════════════════════════════════════════════════
  const handlePhotoChange = async (source: "gallery" | "camera") => {
    setPhotoModal(false);
    if (!user?.id) return;

    // ── ÉTAPE 1 : Vérifier la connexion réseau ──────────────
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      Alert.alert(
        "Pas de connexion",
        "Vérifiez votre connexion internet et réessayez. Aucun ACSET ne sera débité.",
        [{ text: "OK" }]
      );
      return;
    }

    // ── ÉTAPE 2 : Vérifier le solde ACSET ──────────────────
    const { data: walletData } = await supabase
      .from("wallets")
      .select("acset_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentAcset = Number(walletData?.acset_balance ?? 0);
    if (currentAcset < ACSET_EDIT_PHOTO) {
      showToast(`Solde insuffisant. Photo = ${ACSET_EDIT_PHOTO} ACSET | Votre solde = ${currentAcset} ACSET`);
      return;
    }

    // ── ÉTAPE 3 : Ouvrir galerie ou caméra ─────────────────
    let pickerResult: ImagePicker.ImagePickerResult | null = null;
    try {
      if (source === "gallery") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") { showToast("Permission galerie refusée."); return; }
        pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"], allowsEditing: true, aspect: [1,1], quality: 0.9,
        });
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") { showToast("Permission caméra refusée."); return; }
        pickerResult = await ImagePicker.launchCameraAsync({
          allowsEditing: true, aspect: [1,1], quality: 0.9,
          cameraType: ImagePicker.CameraType.front,
        });
      }
    } catch {
      showToast("Impossible d'ouvrir la sélection de photo.");
      return;
    }

    if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
      return; // Annulé — aucun débit
    }

    const uri = pickerResult.assets[0].uri;
    setPhotoLoading(true);
    setUploadProgress(0);

    try {
      // ── ÉTAPE 4 : Uploader avec barre de progression ────
      const publicUrl = await uploadAvatar(user.id, uri, (pct) => {
        setUploadProgress(pct);
      });

      if (!publicUrl) {
        showToast("❌ Échec de l'upload. ACSET non débité. Vérifiez votre connexion.");
        setPhotoLoading(false);
        setUploadProgress(0);
        return;
      }

      // ── ÉTAPE 5 : Sauvegarder avatar_url dans le profil ─
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (profileErr) {
        showToast("❌ Upload réussi mais profil non mis à jour. ACSET non débité.");
        console.error("Profile update error:", profileErr.message);
        setPhotoLoading(false);
        setUploadProgress(0);
        return;
      }

      // ── ÉTAPE 6 : Débiter ACSET (photo OK + profil OK) ─
      const { error: debitErr } = await supabase.rpc("debit_photo_acset");
      if (debitErr) {
        console.error("Débit ACSET photo error:", debitErr.message);
        // Photo sauvegardée mais débit échoué → on continue quand même
      } else {
        console.log(`✅ Débit photo OK : -${ACSET_EDIT_PHOTO} ACSET`);
      }

      // ── ÉTAPE 7 : Mettre à jour state + ref ─────────────
      setAvatarLocalUri(uri);
      setAvatarPublicUrl(publicUrl);
      avatarPublicUrlRef.current = publicUrl; // ✅ ref synchrone

      // ✅ Invalider le cache global pour ce user
      if (user?.id) {
        const { avatarStore } = await import("../lib/avatarStore");
        avatarStore.invalidate(user.id);
      }

      console.log("✅ [PHOTO] avatarPublicUrlRef.current:", avatarPublicUrlRef.current);

      // ── ÉTAPE 8 : Modal succès Apple-like ───────────────
      setShowSuccess(true);

    } catch (e: any) {
      console.error("handlePhotoChange crash:", e?.message);
      showToast("❌ Erreur inattendue. ACSET non débité.");
    } finally {
      setPhotoLoading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  const ensureWalletExists = async (uid: string): Promise<boolean> => {
    try {
      const { data: existing, error: checkErr } = await supabase
        .from("wallets").select("user_id").eq("user_id", uid).maybeSingle();
      if (checkErr) return true;
      if (existing) return true;
      const { error: insertErr } = await supabase
        .from("wallets").insert({ user_id: uid, tan_balance: 0, acset_balance: 0 });
      if (insertErr?.code === "23505") return true;
      if (insertErr) { showToast("Impossible de créer votre wallet. Réessayez."); return false; }
      return true;
    } catch { return true; }
  };

  const validate = () => {
    if (!isFilled(firstName) || !isFilled(lastName)) return "Nom complet requis";
    if (!sex)                       return "Sexe requis";
    if (!isFilled(phone))           return "Téléphone requis";
    if (!isFilled(whatsappPhone))   return "WhatsApp requis";
    if (!normalizeBirthDateToISO(birthDateText)) return "Date naissance invalide (jj/mm/aaaa)";
    if (!isFilled(birthDepartment)) return "Département requis";
    if (!isFilled(birthCity))       return "Ville naissance requise";
    if (!isFilled(birthCountry))    return "Pays naissance requis";
    if (!isFilled(nif) && !isFilled(cin)) return "NIF ou CIN requis";
    if (!isFilled(profession))      return "Profession requise";
    if (!isFilled(maritalStatus))   return "Statut matrimonial requis";
    if (!isFilled(premierSouvenir)) return "Souvenir inoubliable requis";
    return null;
  };

  const submitProfile = async () => {
    const errMsg = validate();
    if (errMsg) return showToast(errMsg);
    setSubmitting(true);
    if (!user?.id) { setSubmitting(false); return showToast("Session invalide."); }

    try {
      const { data: fresh, error: freshErr } = await supabase
        .from("profiles").select("profile_completed_at").eq("id", user.id).single();
      if (freshErr) { setSubmitting(false); return showToast("Erreur système."); }

      const isSealedNow = !!fresh?.profile_completed_at;
      const isoBirth    = normalizeBirthDateToISO(birthDateText);

      const { data: walletCheck } = await supabase
        .from("wallets").select("acset_balance").eq("user_id", user.id).maybeSingle();
      const currentAcset = Number(walletCheck?.acset_balance ?? 0);

      if (currentAcset < ACSET_EDIT_INFO) {
        setSubmitting(false);
        showToast(`Solde insuffisant. Modification = ${ACSET_EDIT_INFO} ACSET | Votre solde = ${currentAcset} ACSET`);
        return;
      }

      const payload: any = {
        full_name:             `${lastName.trim()} ${firstName.trim()}`,
        phone:                 phone.trim(),
        whatsapp_country_code: countryCode,
        whatsapp_phone:        whatsappPhone.trim(),
        nif:                   nif.trim(),
        cin:                   cin.trim(),
        marital_status:        maritalStatus.trim(),
        profile_stage:         "pending_cadna",
        cadna_status:          "pending",
      };

      if (!isSealedNow) {
        payload.sex              = sex;
        payload.birth_date       = isoBirth;
        payload.birth_department = birthDepartment.trim();
        payload.birth_city       = birthCity.trim();
        payload.birth_country    = birthCountry.trim();
        payload.premier_souvenir = premierSouvenir.trim();
        payload.profession       = profession.trim();
      }

      // ✅ FIX CLOSURE : utiliser le ref, toujours à jour
      const currentAvatarUrl = avatarPublicUrlRef.current ?? avatarPublicUrl ?? null;
      payload.avatar_url = currentAvatarUrl;

      console.log("📦 [SUBMIT] avatarPublicUrlRef.current:", avatarPublicUrlRef.current);
      console.log("📦 [SUBMIT] avatarPublicUrl (state):", avatarPublicUrl);
      console.log("📦 [SUBMIT] payload.avatar_url final:", payload.avatar_url);

      const walletOk = await ensureWalletExists(user.id);
      if (!walletOk) { setSubmitting(false); return; }

      const { data: rpcData, error: rpcErr } = await supabase.rpc("rz_update_profile", {
        p_user_id:               user.id,
        p_full_name:             payload.full_name,
        p_phone:                 payload.phone,
        p_whatsapp_country_code: payload.whatsapp_country_code,
        p_whatsapp_phone:        payload.whatsapp_phone,
        p_nif:                   payload.nif,
        p_cin:                   payload.cin,
        p_marital_status:        payload.marital_status,
        p_profile_stage:         payload.profile_stage,
        p_cadna_status:          payload.cadna_status,
        p_sex:                   payload.sex ?? null,
        p_birth_date:            payload.birth_date ?? null,
        p_birth_department:      payload.birth_department ?? null,
        p_birth_city:            payload.birth_city ?? null,
        p_birth_country:         payload.birth_country ?? null,
        p_premier_souvenir:      payload.premier_souvenir ?? null,
        p_profession:            payload.profession ?? null,
        p_avatar_url:            payload.avatar_url,
      });

      console.log("✅ [RPC] rpcData:", JSON.stringify(rpcData));
      if (rpcErr) console.log("❌ [RPC] Erreur:", rpcErr.message);

      if (rpcErr) {
        setSubmitting(false);
        if (rpcErr.message?.includes("Wallet introuvable")) {
          showToast("Wallet introuvable. Veuillez patienter et réessayer.");
        } else if (rpcErr.message?.includes("ACSET")) {
          showToast("Solde ACSET insuffisant. Rechargez votre compte.");
        } else {
          showToast(rpcErr.message || "Erreur lors de la sauvegarde.");
        }
        return;
      }

      setSubmitting(false);
      router.replace("/user-profile");
    } catch {
      setSubmitting(false);
      showToast("Erreur système. Réessayez.");
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.gold} /></View>;
  }

  return (
    <>
      {/* ✅ Modal succès Apple-like */}
      <SuccessModal visible={showSuccess} onClose={() => setShowSuccess(false)} />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            {avatarLocalUri || avatarPublicUrl ? (
              <Image source={{ uri: avatarLocalUri ?? avatarPublicUrl! }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
            {photoLoading && (
              <View style={styles.avatarLoader}>
                <ActivityIndicator color={COLORS.gold} size="small" />
              </View>
            )}
          </View>

          {/* ✅ Barre de progression upload */}
          {photoLoading && (
            <View style={{ width: "80%", marginTop: 12 }}>
              <UploadProgressBar progress={uploadProgress} visible={photoLoading} />
            </View>
          )}

          {isSealed && (
            <View style={styles.sealedPill}>
              <Text style={styles.sealedText}>Identité scellée</Text>
            </View>
          )}
        </View>

        {/* ── Identité ── */}
        <Section title="Identité">
          <Readonly label="Email" value={email} />
          <Input label="Pays de naissance"  value={birthCountry}    onChange={setBirthCountry}    readonly={isSealed} hint="Ex: Haïti" />
          <Input label="Ville de naissance" value={birthCity}       onChange={setBirthCity}       readonly={isSealed} hint="Ex: Port-Au-Prince" />
          
          {/* ✅ NOUVEAU : Departement Dropdown */}
          <Text style={styles.label}>Département</Text>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => !isSealed && setDepartementModal(true)}
            style={styles.appleSelect}
          >
            <Text style={birthDepartment ? styles.appleValue : styles.applePlaceholder}>
              {birthDepartment || "Choisir département"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>
        </Section>

        {/* ── Informations personnelles ── */}
        <Section title="Informations personnelles">
          <Input label="Nom"    value={lastName}  onChange={setLastName} />
          <Input label="Prénom" value={firstName} onChange={setFirstName} />
          <Input label="Téléphone" value={phone} onChange={setPhone} keyboard="phone-pad" />

          <Text style={styles.label}>WhatsApp</Text>
          <View style={styles.whatsappRow}>
            <View style={styles.codeBox}>
              <Picker selectedValue={countryCode} onValueChange={(val) => setCountryCode(val)}>
                {COUNTRY_CODES.map((c) => (
                  <Picker.Item key={c.code} label={`${c.label} (${c.code})`} value={c.code} />
                ))}
              </Picker>
            </View>
            <TextInput
              value={whatsappPhone}
              onChangeText={(t) => setWhatsappPhone(t.replace(/\D/g,""))}
              keyboardType="phone-pad"
              placeholder="Numéro WhatsApp"
              style={styles.numberInput}
            />
          </View>

          <Input
            label="Date de naissance (jj/mm/aaaa)"
            value={birthDateText}
            onChange={(t: string) => setBirthDateText(formatBirthDateInput(t))}
            keyboard="numeric"
            readonly={isSealed}
          />
          
          {/* ✅ NOUVEAU : NIF/CIN avec 2 champs */}
          <Text style={styles.label}>NIF/CIN</Text>
          <Input label="NIF" value={nif}
            onChange={(t: string) => setNif(formatNIFInput(t))}
            keyboard="numeric"
            hint="Optionnel si CIN rempli"
          />
          <Input label="CIN" value={cin}
            onChange={(t: string) => setCin(t.toUpperCase())}
            hint="Optionnel si NIF rempli"
          />

          <Input label="Profession" value={profession} onChange={setProfession}
            readonly={isSealed}
            hint={profession ? "" : `Ex: ${PROFESSION_PRESETS.slice(0,6).join(" • ")}`}
          />

          <Text style={styles.label}>Statut matrimonial</Text>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => !isSealed && setMaritalModal(true)}
            style={styles.appleSelect}
          >
            <Text style={maritalStatus ? styles.appleValue : styles.applePlaceholder}>
              {maritalStatus || "Choisir statut matrimonial"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            <Text style={[styles.label, { flex: 1, marginTop: 0 }]}>Un Souvenir Inoubliable</Text>
            <TouchableOpacity onPress={() => setSouvenirInfo(true)} style={styles.infoBtn} activeOpacity={0.75}>
              <Ionicons name="information-circle" size={20} color={COLORS.gold} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={premierSouvenir}
            editable={!isSealed}
            onChangeText={setPremierSouvenir}
            style={[styles.input, isSealed && styles.inputReadonly]}
            placeholder="Ex: mer  ou  mer-sable-soleil"
            placeholderTextColor="#A1A1AA"
          />
        </Section>

        {/* ── Sexe ── */}
        <View style={styles.card}>
          <Text style={styles.label}>Sexe</Text>
          <View style={styles.sexRow}>
            {["M","F"].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => { if (!isSealed) setSex(s as any); }}
                style={[styles.sexBtn, sex === s && styles.sexActive, isSealed && styles.sexDisabled]}
                activeOpacity={isSealed ? 1 : 0.9}
              >
                <Text style={sex === s ? styles.sexActiveText : styles.sexText}>
                  {s === "M" ? "Homme" : "Femme"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isSealed && (
            <Text style={styles.smallHint}>
              Naissance, sexe, profession et souvenir inoubliable verrouillés après "scellé".
            </Text>
          )}
        </View>

        {/* ── Boutons ── */}
        <TouchableOpacity style={styles.primary} onPress={submitProfile} activeOpacity={0.9}>
          {submitting ? <ActivityIndicator color="#000" /> : (
            <>
              <Text style={styles.primaryText}>Enregistrer</Text>
              <Text style={{ fontSize: 10, color: "rgba(0,0,0,0.55)", fontWeight: "800", marginTop: 2 }}>
                {ACSET_EDIT_INFO} ACSET
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, marginTop: 12 }]}
          onPress={() => setPhotoModal(true)}
          activeOpacity={0.9}
          disabled={photoLoading}
        >
          {photoLoading ? <ActivityIndicator color={COLORS.gold} /> : (
            <>
              <Text style={{ fontWeight: "900", color: "#111" }}>
                Ajouter / Modifier la photo
              </Text>
              <Text style={{ fontSize: 10, color: COLORS.sub, fontWeight: "700", marginTop: 2 }}>
                {ACSET_EDIT_PHOTO} ACSET · Upload immédiat
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Info coûts ACSET ── */}
        <View style={styles.acsetInfoCard}>
          <View style={styles.acsetInfoRow}>
            <Ionicons name="create-outline" size={15} color={COLORS.gold} />
            <Text style={styles.acsetInfoTxt}>Modifier ses informations</Text>
            <Text style={styles.acsetInfoCost}>{ACSET_EDIT_INFO} ACSET</Text>
          </View>
          <View style={[styles.acsetInfoRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }]}>
            <Ionicons name="camera-outline" size={15} color={COLORS.sub} />
            <Text style={styles.acsetInfoTxt}>Changer la photo de profil</Text>
            <Text style={[styles.acsetInfoCost, { color: COLORS.sub }]}>{ACSET_EDIT_PHOTO} ACSET</Text>
          </View>
          <View style={[styles.acsetInfoRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.sub} />
            <Text style={[styles.acsetInfoTxt, { fontStyle: "italic" }]}>ACSET débité uniquement si upload réussi</Text>
            <Text style={[styles.acsetInfoCost, { color: COLORS.green }]}>✓</Text>
          </View>
        </View>

      </ScrollView>

      {/* ✅ MODAL CHOIX SOURCE PHOTO */}
      <Modal transparent visible={photoModal} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPhotoModal(false)}>
          <View style={[styles.appleModal, { padding: 24 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 8 }]}>Choisir la source</Text>
            <Text style={{ color: COLORS.sub, fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 18 }}>
              La photo sera uploadée immédiatement. {ACSET_EDIT_PHOTO} ACSET débités uniquement si l'upload réussit.
            </Text>
            <TouchableOpacity
              style={[styles.photoSourceBtn, { backgroundColor: COLORS.gold }]}
              onPress={() => handlePhotoChange("gallery")}
              activeOpacity={0.88}
            >
              <Ionicons name="images-outline" size={20} color="#000" />
              <Text style={{ color: "#000", fontWeight: "900", fontSize: 14 }}>Galerie photos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoSourceBtn, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 }]}
              onPress={() => handlePhotoChange("camera")}
              activeOpacity={0.88}
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.text} />
              <Text style={{ color: COLORS.text, fontWeight: "900", fontSize: 14 }}>Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 14, alignItems: "center" }} onPress={() => setPhotoModal(false)}>
              <Text style={{ color: COLORS.sub, fontWeight: "700" }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal info Souvenir Inoubliable ── */}
      <Modal transparent visible={souvenirInfo} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSouvenirInfo(false)}>
          <View style={styles.appleModal}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <View style={styles.infoIconRing}><Ionicons name="key" size={20} color={COLORS.gold} /></View>
              <Text style={styles.modalTitle}>Un Souvenir Inoubliable</Text>
            </View>
            <Text style={styles.infoDesc}>Ce champ est votre clé de sécurité personnelle RHAZN. Il doit être mémorisé et ne jamais être partagé.</Text>
            <View style={styles.infoDivider} />
            <View style={styles.infoRule}>
              <View style={[styles.infoRuleBadge, { backgroundColor: "rgba(212,175,55,0.10)" }]}>
                <Text style={styles.infoRuleNum}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoRuleTitle}>Un seul mot</Text>
                <Text style={styles.infoRuleSub}>Un mot simple qui vous est propre</Text>
                <View style={styles.infoExampleBox}>
                  <Text style={styles.infoExampleLabel}>Exemple</Text>
                  <Text style={styles.infoExampleValue}>mer</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoRule}>
              <View style={[styles.infoRuleBadge, { backgroundColor: "rgba(212,175,55,0.10)" }]}>
                <Text style={styles.infoRuleNum}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoRuleTitle}>Mot composé avec tirets</Text>
                <Text style={styles.infoRuleSub}>Plusieurs mots reliés par des tirets</Text>
                <View style={styles.infoExampleBox}>
                  <Text style={styles.infoExampleLabel}>Exemple</Text>
                  <Text style={styles.infoExampleValue}>mer-sable-soleil</Text>
                </View>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoWarning}>
              <Ionicons name="warning-outline" size={14} color={COLORS.red} />
              <Text style={styles.infoWarningTxt}>Ce souvenir devient immuable après validation. Choisissez soigneusement.</Text>
            </View>
            <TouchableOpacity style={[styles.primary, { marginTop: 14 }]} onPress={() => setSouvenirInfo(false)} activeOpacity={0.88}>
              <Text style={styles.primaryText}>Compris</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal statut matrimonial */}
      <Modal transparent visible={maritalModal} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setMaritalModal(false)}>
          <View style={styles.appleModal}>
            <Text style={styles.modalTitle}>Statut matrimonial</Text>
            {MARITAL_PRESETS.map((m) => {
              const active = maritalStatus === m;
              return (
                <TouchableOpacity key={m} onPress={() => { setMaritalStatus(m); setMaritalModal(false); }}
                  style={[styles.optionBtn, active && styles.optionActive]} activeOpacity={0.9}>
                  <Text style={active ? styles.optionActiveText : styles.optionText}>{m}</Text>
                  {active && <Ionicons name="checkmark" size={18} color="#000" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ NOUVEAU : Modal Département */}
      <Modal transparent visible={departementModal} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDepartementModal(false)}>
          <View style={styles.appleModal}>
            <Text style={styles.modalTitle}>Département de naissance</Text>
            {DEPARTEMENT_PRESETS.map((d) => {
              const active = birthDepartment === d;
              return (
                <TouchableOpacity key={d} onPress={() => { setBirthDepartment(d); setDepartementModal(false); }}
                  style={[styles.optionBtn, active && styles.optionActive]} activeOpacity={0.9}>
                  <Text style={active ? styles.optionActiveText : styles.optionText}>{d}</Text>
                  {active && <Ionicons name="checkmark" size={18} color="#000" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
    </>
  );
}

/* ── Sub-composants ── */
const Section = ({ title, children }: any) => (
  <View style={{ marginBottom: 22 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

function Input({ label, value, onChange, keyboard, readonly, hint }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        editable={!readonly}
        onChangeText={onChange}
        keyboardType={keyboard}
        style={[styles.input, readonly && styles.inputReadonly]}
        placeholder={hint || ""}
        placeholderTextColor="#A1A1AA"
      />
    </>
  );
}

function Readonly({ label, value }: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readonly}>
        <Text style={{ color: COLORS.sub, fontWeight: "800" }}>{value || "—"}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.bg, padding: 22 },
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  hero:           { alignItems: "center", marginBottom: 28 },
  avatarWrap:     { position: "relative", width: 120, height: 120, borderRadius: 60, alignSelf: "center" },
  avatar:         { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.card, justifyContent: "center", alignItems: "center" },
  avatarLoader:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 60, backgroundColor: "rgba(0,0,0,0.40)", justifyContent: "center", alignItems: "center" },
  sealedPill:  { marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.gold + "20", borderWidth: 1, borderColor: COLORS.gold + "55" },
  sealedText:  { color: COLORS.gold, fontWeight: "900", fontSize: 12 },
  sectionTitle:{ color: COLORS.sub, fontWeight: "800", fontSize: 12, marginBottom: 8 },
  card:        { backgroundColor: COLORS.card, padding: 16, borderRadius: 18 },
  label:       { fontSize: 12, color: COLORS.sub, marginTop: 10, fontWeight: "800" },
  input:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginTop: 6, fontWeight: "800", color: COLORS.text },
  inputReadonly:{ backgroundColor: "#F5F5F7", color: COLORS.sub },
  readonly:    { backgroundColor: "#F5F5F7", borderRadius: 14, padding: 12, marginTop: 6 },
  sexRow:      { flexDirection: "row", marginTop: 10 },
  sexBtn:      { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", marginRight: 10 },
  sexActive:   { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  sexDisabled: { opacity: 0.6 },
  sexText:     { fontWeight: "800", color: COLORS.text },
  sexActiveText:{ fontWeight: "900", color: "#000" },
  smallHint:   { marginTop: 8, color: COLORS.sub, fontWeight: "700", fontSize: 12 },
  primary:     { backgroundColor: COLORS.gold, padding: 16, borderRadius: 18, marginTop: 20, alignItems: "center" },
  primaryText: { fontWeight: "900", color: "#000" },
  photoSourceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
  toast:     { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: "#000", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 18 },
  toastText: { color: "#fff", fontWeight: "800" },
  whatsappRow: { flexDirection: "row", marginTop: 6 },
  codeBox:     { flex: 0.45, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: "#fff", justifyContent: "center", marginRight: 8 },
  numberInput: { flex: 0.55, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, fontWeight: "800", color: COLORS.text },
  appleSelect:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginTop: 6, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appleValue:      { fontWeight: "900", color: "#000" },
  applePlaceholder:{ fontWeight: "800", color: "#999" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  appleModal:    { backgroundColor: "#fff", borderRadius: 26, padding: 20 },
  modalTitle:    { fontWeight: "900", fontSize: 16, textAlign: "center", marginBottom: 18 },
  optionBtn:     { padding: 16, borderRadius: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionActive:  { backgroundColor: COLORS.gold },
  optionText:    { fontWeight: "800", color: "#111" },
  optionActiveText:{ fontWeight: "900", color: "#000" },
  infoBtn:        { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(212,175,55,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  infoIconRing:   { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.28)" },
  infoDesc:       { fontSize: 13, color: "#555", lineHeight: 19, fontWeight: "600", marginBottom: 4 },
  infoDivider:    { height: 1, backgroundColor: "#E5E5EA", marginVertical: 12 },
  infoRule:       { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  infoRuleBadge:  { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  infoRuleNum:    { color: COLORS.gold, fontWeight: "900", fontSize: 13 },
  infoRuleTitle:  { color: "#111", fontWeight: "800", fontSize: 13, marginBottom: 2 },
  infoRuleSub:    { color: "#888", fontWeight: "600", fontSize: 12 },
  infoExampleBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(212,175,55,0.07)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, borderWidth: 1, borderColor: "rgba(212,175,55,0.20)", alignSelf: "flex-start" },
  infoExampleLabel:{ color: COLORS.gold, fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  infoExampleValue:{ color: "#111", fontWeight: "900", fontSize: 13, letterSpacing: 0.3 },
  infoWarning:    { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "rgba(220,38,38,0.06)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(220,38,38,0.18)" },
  infoWarningTxt: { color: COLORS.red, fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 17 },
  acsetInfoCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  acsetInfoRow:  { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 },
  acsetInfoTxt:  { flex: 1, color: COLORS.sub, fontWeight: "700", fontSize: 12 },
  acsetInfoCost: { color: COLORS.gold, fontWeight: "900", fontSize: 12 },
});