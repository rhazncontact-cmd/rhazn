// ======================================================
// RHAZN — USER PROFILE EDIT (APPLE-LIKE PREMIUM FINAL)
// Sync with user-profile imperial (monetization progress)
// - Manual inputs: birth_country, birth_city, birth_department
// - Required fields: full_name, phone, whatsapp_phone, sex, birth_date,
//   birth_city, birth_country, birth_department, nif, profession,
//   marital_status, premier_souvenir, avatar_url
// - After sealed: birth_* + sex + birth_date + premier_souvenir + profession immutable
// ======================================================

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { Picker } from "@react-native-picker/picker";

import { supabase } from "../lib/supabase";

/* ================= PALETTE APPLE PREMIUM ================= */

const COLORS = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#111111",
  sub: "#6E6E73",
  border: "#E5E5EA",
  gold: "#D4AF37",
  red: "#DC2626",
};

const AVATAR_BUCKET = "avatars";

/* ================= OPTIONS (simple, safe) ================= */

const PROFESSION_PRESETS = [
  "Écolier",
  "Étudiant",
  "Ingénieur",
  "Docteur",
  "Commerçant",
  "Avocat",
  "Infirmier",
  "Professeur",
  "Technicien",
  "Artiste",
  "Entrepreneur",
  "Autre",
];

const MARITAL_PRESETS = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"];

/* ================= COUNTRY CODES ================= */

const COUNTRY_CODES = [
  { code: "+509", label: "Haïti 🇭🇹" },
  { code: "+1", label: "USA 🇺🇸" },
  { code: "+33", label: "France 🇫🇷" },
  { code: "+44", label: "UK 🇬🇧" },
  { code: "+1-809", label: "République Dominicaine 🇩🇴" },
  { code: "+55", label: "Brésil 🇧🇷" },
  { code: "+221", label: "Sénégal 🇸🇳" },
  { code: "+225", label: "Côte d’Ivoire 🇨🇮" },
];

const isFilled = (v: any) => String(v ?? "").trim().length > 0;

const formatDateFR = (d: any) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/* ================= AUTO FORMATTERS ================= */

/* ================= DATE NORMALIZER (DB) ================= */

const normalizeBirthDateToISO = (input: string) => {
  const v = input.trim();
  if (!v) return null;

  // déjà ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // format jj/mm/aaaa
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

// 📅 Auto date
const formatBirthDateInput = (text: string) => {
  let v = text.replace(/\D/g, "");

  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);

  return v.slice(0, 10);
};

// 🪪 Auto NIF
const formatNIFInput = (text: string) => {
  let v = text.replace(/\D/g, "");
  const parts = [];

  for (let i = 0; i < v.length; i += 3) {
    parts.push(v.slice(i, i + 3));
  }

  return parts.join("-").slice(0, 15);
};

/* ====================================================== */
/* ======================= SCREEN ======================= */
/* ====================================================== */

export default function UserProfileEdit() {
  const router = useRouter();
  const params = useLocalSearchParams();
  

  // ======================================================
// REDIRECTION OBLIGATOIRE PHOTO WARNING
// ======================================================

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  /* ================= MODIFIABLES ================= */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [phone, setPhone] = useState("");

  const [countryCode, setCountryCode] = useState("+509");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const [birthDateText, setBirthDateText] = useState(""); // "DD/MM/YYYY" (input)

  // Manual inputs requested
  const [birthDepartment, setBirthDepartment] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthCountry, setBirthCountry] = useState("");

  const [nif, setNif] = useState("");
  const [profession, setProfession] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [premierSouvenir, setPremierSouvenir] = useState("");

  const [maritalModal, setMaritalModal] = useState(false);

  /* ================= READONLY ================= */
  const [email, setEmail] = useState("");

  const [sealedAt, setSealedAt] = useState<string | null>(null); // profile_completed_at
  const isSealed = !!sealedAt;

  /* ================= AVATAR ================= */
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);

  const [payModal, setPayModal] = useState(false);
  const [payType, setPayType] = useState<"profile" | "photo" | null>(null);

  /* ================= TOAST ================= */
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
  setToast(msg);

  Animated.timing(toastAnim, {
    toValue: 1,
    duration: 200,
    useNativeDriver: true,
  }).start();

  const duration = msg.includes("ACSET") ? 10000 : 3000;

  setTimeout(() => {
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, duration);
};

  /* ================= LOAD ================= */

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return router.replace("/auth/login");

      setUser(auth.user);
      setEmail(auth.user.email ?? "");

      const { data } = await supabase
  .from("profiles")
  .select(`
    full_name,
    phone,
    whatsapp_country_code,
    whatsapp_phone,
    sex,
    birth_date,
    birth_department,
    birth_city,
    birth_country,
    nif,
    profession,
    marital_status,
    premier_souvenir,
    avatar_url,
    profile_completed_at
  `)
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

        // Manual fields (now editable)
        setBirthDepartment(data.birth_department ?? "");
        setBirthCity(data.birth_city ?? "");
        setBirthCountry(data.birth_country ?? "");

        setNif(data.nif ?? "");
        setProfession(data.profession ?? "");
        setMaritalStatus(data.marital_status ?? "");
        setPremierSouvenir(data.premier_souvenir ?? "");

        setAvatarPublicUrl(data.avatar_url ?? null);
        setSealedAt(data.profile_completed_at ? String(data.profile_completed_at) : null);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
  if (params?.photo) {
    const uri =
      typeof params.photo === "string"
        ? params.photo
        : Array.isArray(params.photo)
        ? params.photo[0]
        : null;

    if (uri) {
      setAvatarLocalUri(uri);
    }
  }
}, [params?.photo]);

  const uploadAvatar = async (uid: string, uri: string) => {
  try {
    const fileExt = uri.split(".").pop() || "jpg";
    const fileName = `${uid}.${fileExt}`;
    const filePath = fileName;

    const formData = new FormData();

    formData.append("file", {
      uri,
      name: fileName,
      type: "image/jpeg",
    } as any);

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, formData, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (error) {
      console.log("UPLOAD ERROR", error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  } catch (e) {
    console.log("UPLOAD CRASH", e);
    return null;
  }
};
  /* ================= AVATAR PICK ================= */

  const openGallery = async () => {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      showToast("Permission galerie refusée. Active-la dans les réglages.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!res.canceled) setAvatarLocalUri(res.assets[0].uri);
  } catch (e) {
    console.log("GALLERY ERROR:", e);
    showToast("Impossible d’ouvrir la galerie.");
  }
};

const openCamera = async () => {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      showToast("Permission caméra refusée. Active-la dans les réglages.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!res.canceled) setAvatarLocalUri(res.assets[0].uri);
  } catch (e) {
    console.log("CAMERA ERROR:", e);
    showToast("Impossible d’ouvrir la caméra.");
  }
};

  /* ================= VALIDATION (sync with user-profile) ================= */

  const validate = () => {
    if (!isFilled(firstName) || !isFilled(lastName)) return "Nom complet requis";
    if (!sex) return "Sexe requis";
    if (!isFilled(phone)) return "Téléphone requis";
    if (!isFilled(whatsappPhone)) return "WhatsApp requis";

    const iso = normalizeBirthDateToISO(birthDateText);
    if (!iso) return "Date naissance invalide (jj/mm/aaaa)";

    if (!isFilled(birthDepartment)) return "Département requis";
    if (!isFilled(birthCity)) return "Ville naissance requise";
    if (!isFilled(birthCountry)) return "Pays naissance requis";

    if (!isFilled(nif)) return "NIF requis";
    if (!isFilled(profession)) return "Profession requise";
    if (!isFilled(maritalStatus)) return "Statut matrimonial requis";
    if (!isFilled(premierSouvenir)) return "Premier souvenir requis";

    return null;
  };

  /* ================= SUBMIT ================= */

  const submitProfile = async () => {
  const errMsg = validate();
  if (errMsg) return showToast(errMsg);

  setSubmitting(true);

  if (!user?.id) {
    setSubmitting(false);
    return showToast("Session invalide. Reconnectez-vous.");
  }

  try {
    // 🔒 On garde le check sealed uniquement
    const { data: fresh, error: freshErr } = await supabase
      .from("profiles")
      .select("profile_completed_at")
      .eq("id", user.id)
      .single();

    if (freshErr) {
      setSubmitting(false);
      return showToast("Erreur système. Réessayez.");
    }

    const isSealedNow = !!fresh?.profile_completed_at;
    const isoBirth = normalizeBirthDateToISO(birthDateText);

    const payload: any = {
      full_name: `${lastName.trim()} ${firstName.trim()}`,
      phone: phone.trim(),
      whatsapp_country_code: countryCode,
      whatsapp_phone: whatsappPhone.trim(),
      nif: nif.trim(),
      marital_status: maritalStatus.trim(),
      profile_stage: "pending_cadna",
      cadna_status: "pending",
    };

    // Champs immuables seulement avant scellé
    if (!isSealedNow) {
      payload.sex = sex;
      payload.birth_date = isoBirth;
      payload.birth_department = birthDepartment.trim();
      payload.birth_city = birthCity.trim();
      payload.birth_country = birthCountry.trim();
      payload.premier_souvenir = premierSouvenir.trim();
      payload.profession = profession.trim();
    }

    // 🔥 UPLOAD PHOTO SI NOUVELLE PHOTO
if (avatarLocalUri) {
  const url = await uploadAvatar(user.id, avatarLocalUri);
  console.log("URL AVATAR =", url);
  if (url) {
    payload.avatar_url = url;
  }
}

    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);

    if (error) {
      if (
        error.message?.includes("ACSET_REQUIRED") ||
        error.message?.toLowerCase().includes("insufficient") ||
        error.message?.toLowerCase().includes("not enough") ||
        error.message?.toLowerCase().includes("acset")
      ) {
        setSubmitting(false);
        return showToast(
          `Solde ACSET insuffisant

Consommez des contenus pour générer des ACSET,
puis réessayez.`
        );
      }

      setSubmitting(false);
      return showToast(error.message || "Erreur système");
    }

    setSubmitting(false);
    router.replace("/user-profile");
  } catch (e) {
    setSubmitting(false);
    return showToast("Erreur système. Réessayez.");
  }
};

  /* ================= LOADING ================= */

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </View>
    );

  /* ========================== UI ======================== */

  return (
    
    <>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* ================= AVATAR HERO ================= */}
        <View style={styles.hero}>

  <View style={styles.avatarWrap}>

  {/* ====================================================== */}
  {/* CERCLE PHOTO → WARNING AVANT GALERIE */}
  {/* ====================================================== */}
  <View>
  {avatarLocalUri || avatarPublicUrl ? (
    <Image source={{ uri: avatarLocalUri || avatarPublicUrl }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarFallback}>
      <Ionicons name="person" size={40} color="#999" />
    </View>
  )}
</View>

  {/* ====================================================== */}
  {/* BOUTON CAMERA → WARNING AVANT CAMERA */}
  {/* ====================================================== */}

</View>

          {isSealed && (
            <View style={styles.sealedPill}>
              <Text style={styles.sealedText}>Identité scellée</Text>
            </View>
          )}
        </View>

        {/* ================= IDENTITÉ ================= */}
        <Section title="Identité">
          <Readonly label="Email" value={email} />

          {/* Manual inputs (requested) — locked after sealed */}
          <Input
            label="Pays de naissance"
            value={birthCountry}
            onChange={setBirthCountry}
            readonly={isSealed}
            hint="Ex: Haïti"
          />
          <Input
            label="Ville de naissance"
            value={birthCity}
            onChange={setBirthCity}
            readonly={isSealed}
            hint="Ex: Port-Au-Prince"
          />
          <Input
            label="Département"
            value={birthDepartment}
            onChange={setBirthDepartment}
            readonly={isSealed}
            hint="Ex: Ouest / Centre / Sud..."
          />
        </Section>

        {/* ================= PERSONNEL ================= */}
        <Section title="Informations personnelles">
          <Input label="Nom" value={lastName} onChange={setLastName} />
          <Input label="Prénom" value={firstName} onChange={setFirstName} />

          <Input label="Téléphone" value={phone} onChange={setPhone} keyboard="phone-pad" />

          <Text style={styles.label}>WhatsApp</Text>

<View style={styles.whatsappRow}>
  {/* Indicatif */}
  <View style={styles.codeBox}>
    <Picker
      selectedValue={countryCode}
      onValueChange={(val) => setCountryCode(val)}
      style={{ fontWeight: "800" }}
    >
      {COUNTRY_CODES.map((c) => (
        <Picker.Item
          key={c.code}
          label={`${c.label} (${c.code})`}
          value={c.code}
        />
      ))}
    </Picker>
  </View>

  {/* Numéro */}
  <TextInput
    value={whatsappPhone}
    onChangeText={(t) => setWhatsappPhone(t.replace(/\D/g, ""))}
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

          <Input
  label="NIF"
  value={nif}
  onChange={(t: string) => setNif(formatNIFInput(t))}
  keyboard="numeric"
/>

          {/* Profession immutable after sealed */}
          <Input
            label="Profession"
            value={profession}
            onChange={setProfession}
            readonly={isSealed}
            hint={profession ? "" : `Ex: ${PROFESSION_PRESETS.slice(0, 6).join(" • ")}`}
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

          {/* Premier souvenir immutable after sealed */}
          <Input
            label="Premier souvenir"
            value={premierSouvenir}
            onChange={setPremierSouvenir}
            readonly={isSealed}
            hint="Un mot (ou mots) avec traits d’union si besoin"
          />
        </Section>

        {/* ================= SEX ================= */}
        <View style={styles.card}>
          <Text style={styles.label}>Sexe</Text>
          <View style={styles.sexRow}>
            {["M", "F"].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  if (isSealed) return;
                  setSex(s as any);
                }}
                style={[styles.sexBtn, sex === s && styles.sexActive, isSealed && styles.sexDisabled]}
                activeOpacity={isSealed ? 1 : 0.9}
              >
                <Text style={sex === s ? styles.sexActiveText : styles.sexText}>
                  {s === "M" ? "Homme" : "Femme"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isSealed && <Text style={styles.smallHint}>Naissance, sexe, profession et premier souvenir verrouillés après “scellé”.</Text>}
        </View>

        {/* ================= SAVE ================= */}
        <TouchableOpacity style={styles.primary} onPress={submitProfile} activeOpacity={0.9}>
          {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Enregistrer</Text>}
        </TouchableOpacity>
        <TouchableOpacity
  style={[
    styles.primary,
    { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border },
  ]}
  onPress={() => router.push("/photo-warning")}
  activeOpacity={0.9}
>
  <Text style={{ fontWeight: "900", color: "#111" }}>
    Ajouter / Modifier la photo
  </Text>
</TouchableOpacity>
      </ScrollView>

{/* ✅ MODAL STATUT MATRIMONIAL (APPLE) */}
<Modal transparent visible={maritalModal} animationType="fade">
  <TouchableOpacity
    style={styles.modalBackdrop}
    activeOpacity={1}
    onPress={() => setMaritalModal(false)}
  >
    <View style={styles.appleModal}>
      <Text style={styles.modalTitle}>Statut matrimonial</Text>

      {MARITAL_PRESETS.map((m) => {
        const active = maritalStatus === m;

        return (
          <TouchableOpacity
            key={m}
            onPress={() => {
              setMaritalStatus(m);
              setMaritalModal(false);
            }}
            style={[styles.optionBtn, active && styles.optionActive]}
            activeOpacity={0.9}
          >
            <Text style={active ? styles.optionActiveText : styles.optionText}>
              {m}
            </Text>

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

/* ====================================================== */
/* ================= COMPONENTS ========================= */
/* ====================================================== */

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

/* ====================================================== */
/* ================= STYLES ============================= */
/* ====================================================== */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 22 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  hero: { alignItems: "center", marginBottom: 28 },

  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
  },

  camera: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.gold,
    padding: 6,
    borderRadius: 14,
  },

  sealedPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.gold + "20",
    borderWidth: 1,
    borderColor: COLORS.gold + "55",
  },
  sealedText: { color: COLORS.gold, fontWeight: "900", fontSize: 12 },

  sectionTitle: {
    color: COLORS.sub,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 8,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 18,
  },

  label: { fontSize: 12, color: COLORS.sub, marginTop: 10, fontWeight: "800" },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    fontWeight: "800",
    color: COLORS.text,
  },

  inputReadonly: {
    backgroundColor: "#F5F5F7",
    color: COLORS.sub,
  },

  readonly: {
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },

  sexRow: { flexDirection: "row", marginTop: 10 },

  sexBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    marginRight: 10,
  },

  sexActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  sexDisabled: { opacity: 0.6 },

  sexText: { fontWeight: "800", color: COLORS.text },
  sexActiveText: { fontWeight: "900", color: "#000" },

  smallHint: { marginTop: 8, color: COLORS.sub, fontWeight: "700", fontSize: 12 },

  primary: {
    backgroundColor: COLORS.gold,
    padding: 16,
    borderRadius: 18,
    marginTop: 20,
    alignItems: "center",
  },

  primaryText: { fontWeight: "900", color: "#000" },

  toast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#000",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
  },

  toastText: { color: "#fff", fontWeight: "800" },
whatsappRow: {
  flexDirection: "row",
  marginTop: 6,
},

codeBox: {
  flex: 0.45,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 14,
  backgroundColor: "#fff",
  justifyContent: "center",
  marginRight: 8,
},

numberInput: {
  flex: 0.55,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 14,
  padding: 12,
  fontWeight: "800",
  color: COLORS.text,
},

appleSelect: {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 16,
  padding: 16,
  marginTop: 6,
  backgroundColor: "#fff",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

appleValue: {
  fontWeight: "900",
  color: "#000",
},

applePlaceholder: {
  fontWeight: "800",
  color: "#999",
},

modalBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  padding: 24,
},

appleModal: {
  backgroundColor: "#fff",
  borderRadius: 26,
  padding: 20,
},

modalTitle: {
  fontWeight: "900",
  fontSize: 16,
  textAlign: "center",
  marginBottom: 18,
},

optionBtn: {
  padding: 16,
  borderRadius: 14,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

optionActive: {
  backgroundColor: COLORS.gold,
},

optionText: {
  fontWeight: "800",
  color: "#111",
},

optionActiveText: {
  fontWeight: "900",
  color: "#000",
},

avatarWrap: {
  position: "relative",
  width: 120,
  height: 120,
  borderRadius: 60,
  alignSelf: "center",
},

cameraBtn: {
  position: "absolute",
  bottom: 0,
  right: 0,
  backgroundColor: COLORS.gold,
  padding: 8,
  borderRadius: 16,
  zIndex: 50,        // iOS
  elevation: 12,     // Android
},

});