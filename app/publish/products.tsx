/* ================================================================
📱 RHAZN — PUBLIER UN PRODUIT • ULTRA PREMIUM • APPLE-LIKE DARK
   app/publish/products.tsx
================================================================ */

import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DuplicateWarningModal from "../../components/DuplicateWarningModal";
import { DuplicateCheckResult, useContentDuplicateCheck } from "../../hooks/useContentDuplicateCheck";
import { supabase } from "../../lib/supabase";

const C = {
  bg:        "#000000",
  card:      "#0E0E0E",
  surface:   "#111111",
  input:     "#0A0A0A",
  white:     "#FFFFFF",
  muted:     "rgba(255,255,255,0.72)",
  sub:       "rgba(255,255,255,0.42)",
  border:    "rgba(255,255,255,0.12)",
  hairline:  "rgba(255,255,255,0.07)",
  gold:      "#D4AF37",
  goldDim:   "rgba(212,175,55,0.10)",
  goldBorder:"rgba(212,175,55,0.30)",
  danger:    "#FF453A",
  ok:        "#34C759",
  blue:      "#007AFF",
};

const { width: SW } = Dimensions.get("window");

const CATEGORIES = [
  // Électronique
  "Électronique",
  "Accessoires électroniques",
  "Informatique & Bureautique",
  "Téléphonie & Accessoires",
  "Photographie & Vidéo",
  "Audio & Musique",
  "Objets connectés",
  // Maison
  "Maison & Habitat",
  "Cuisine & Arts culinaires",
  "Salle de Bain",
  "Salon & Décoration",
  "Chambre",
  "Mobilier & Meubles",
  "Jardin & Extérieur",
  "Bricolage & Outils",
  // Mode
  "Mode & Style",
  "Vêtements",
  "Chaussures",
  "Accessoires de mode",
  "Bijoux artisanaux",
  "Beauté (produits naturels uniquement)",
  "Soins & Bien-être",
  // Sport
  "Sport & Loisirs",
  "Sport & Fitness",
  "Équipements sportifs",
  "Jeux & Loisirs",
  "Activités de plein air",
  // Culture
  "Arts & Création",
  "Design & Mode",
  "Graphisme & Illustration",
  "Photographie artistique",
  "Production vidéo",
  "Musique & Production musicale",
  "Écriture & Littérature",
  // Éducation
  "Livres & Publications",
  "Formation & Cours",
  "Coaching & Mentorat",
  "Recherche & Innovation",
  // Voyage
  "Tourisme & Expériences",
  "Transport & Mobilité",
  "Accessoires de voyage",
  // Nutrition
  "Produits alimentaires",
  "Nutrition & Santé naturelle",
  "Compléments naturels",
  // Services
  "Services professionnels",
  "Services créatifs",
  "Services numériques",
  "Conseil & Assistance",
  // Animaux
  "Produits pour animaux",
  "Services pour animaux",
  // Artisanat
  "Produits faits main",
  "Objets artistiques",
  // Divers
  "Autres produits",
  "Autres services",
] as const;

type Category = (typeof CATEGORIES)[number];

const MIN_IMAGES        = 5;
const MAX_IMAGES        = 50;
const MIN_IMG_DIMENSION = 800;
const ACSET_FALLBACK    = 10;
const STORAGE_BUCKET    = "products";

/* ✅ NAVIGATION TABS */
const NAV_TABS = [
  { label: "Suspentz", route: "/publish/suspentz" },
  { label: "Produits",  route: "/publish/products"  },
  { label: "KoseSans",  route: "/infos"              },
  { label: "Audio",     route: "/infos"              },
  { label: "Vidéo",     route: "/infos"              },
] as const;

type PickedImage = { uri: string; width: number; height: number; name?: string; type?: string; };
type Notice = { tone: "info"|"danger"|"ok"; title: string; message: string; actionLabel?: string; onAction?: () => void; };

function isHighQuality(img: PickedImage) { return img.width >= MIN_IMG_DIMENSION && img.height >= MIN_IMG_DIMENSION; }
function imageQualityLabel(img: PickedImage) {
  const ok = isHighQuality(img);
  return ok ? { label: `${img.width}×${img.height} — HD`, ok: true } : { label: `${img.width}×${img.height} — faible résolution`, ok: false };
}

const THUMB = (SW - 32 - 3 * 4) / 4;

function ImageThumb({ img, isCover, onRemove }: { img: PickedImage; index: number; isCover: boolean; onRemove: () => void; }) {
  return (
    <View style={th.wrap}>
      <Image source={{ uri: img.uri }} style={th.img} />
      {isCover && <View style={th.coverBadge}><Text style={th.coverTxt}>COUV.</Text></View>}
      {!isHighQuality(img) && <View style={th.lowBadge}><Ionicons name="warning" size={9} color="#FFF" /></View>}
      <Pressable style={th.removeBtn} onPress={onRemove}><Ionicons name="close" size={11} color="#FFF" /></Pressable>
    </View>
  );
}
const th = StyleSheet.create({
  wrap: { width: THUMB, height: THUMB, borderRadius: 10, overflow: "hidden", margin: 2 },
  img:  { width: "100%", height: "100%", backgroundColor: "#111" },
  coverBadge: { position: "absolute", top: 4, left: 4, backgroundColor: C.gold, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  coverTxt: { color: "#000", fontWeight: "900", fontSize: 7 },
  lowBadge: { position: "absolute", top: 4, right: 4, backgroundColor: C.danger, borderRadius: 5, padding: 3 },
  removeBtn: { position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
});



const dd = StyleSheet.create({
  wrap:        { marginBottom: 12, zIndex: 100 },
  trigger:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.input, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  triggerOpen: { borderColor: C.goldBorder, backgroundColor: "rgba(212,175,55,0.04)" },
  triggerTxt:  { color: C.white, fontWeight: "700", fontSize: 14, flex: 1 },
  placeholder: { color: "rgba(255,255,255,0.35)" },
  /* ✅ overflow: "hidden" SUPPRIMÉ — c'est lui qui bloquait le scroll tactile */
  list: {
    position: "absolute", top: 52, left: 0, right: 0,
    backgroundColor: "#0E0E0E",
    borderWidth: 1, borderColor: C.border, borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 20, zIndex: 200,
  },
  flatList:    { height: 260, borderRadius: 16 },
  item:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.hairline },
  itemActive:  { backgroundColor: "rgba(212,175,55,0.07)" },
  itemTxt:     { color: "rgba(255,255,255,0.82)", fontWeight: "700", fontSize: 13, flex: 1, paddingRight: 10 },
  itemTxtActive: { color: C.gold, fontWeight: "900" },
});

// ✅ CategoryDropdown — ScrollView + .map() — ZERO FlatList, zéro warning nested
function CategoryDropdown({ value, onSelect }: { value: Category|null; onSelect: (c: Category) => void; }) {
  const [query, setQuery] = useState(value ?? "");
  const [open,  setOpen]  = useState(false);

  const results: string[] = query.trim()
    ? CATEGORIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : (CATEGORIES as unknown as string[]);

  const choose = (cat: string) => {
    setQuery(cat);
    onSelect(cat as Category);
    setOpen(false);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <TextInput
        placeholder="Catégorie (obligatoire)"
        placeholderTextColor="rgba(255,255,255,0.35)"
        style={sc.input}
        value={query}
        onChangeText={(t) => { setQuery(t); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <View style={{
          backgroundColor: "#0E0E0E", borderRadius: 16,
          borderWidth: 1, borderColor: C.border,
          maxHeight: 220, overflow: "hidden",
          marginTop: -8, marginBottom: 4, elevation: 20, zIndex: 200,
        }}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {results.map((cat) => (
              <Pressable
                key={cat}
                style={{
                  paddingVertical: 13, paddingHorizontal: 16,
                  borderBottomWidth: 1, borderBottomColor: C.hairline,
                  backgroundColor: value === cat ? "rgba(212,175,55,0.07)" : "transparent",
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                }}
                onPress={() => choose(cat)}
              >
                <Text style={{
                  color: value === cat ? C.gold : "rgba(255,255,255,0.82)",
                  fontWeight: value === cat ? "900" : "700",
                  fontSize: 13, flex: 1,
                }}>
                  {cat}
                </Text>
                {value === cat && <Ionicons name="checkmark" size={16} color={C.gold} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function NoticeOverlay({ n, onClose }: { n: Notice; onClose: () => void }) {
  const color = n.tone === "ok" ? C.ok : n.tone === "danger" ? C.danger : C.blue;
  return (
    <View style={nt.overlay}>
      <View style={nt.card}>
        <View style={nt.top}>
          <View style={[nt.dot, { backgroundColor: color }]} />
          <Text style={nt.title}>{n.title}</Text>
          <Pressable onPress={onClose} style={nt.close}><Ionicons name="close" size={16} color="rgba(255,255,255,0.55)" /></Pressable>
        </View>
        <Text style={nt.msg}>{n.message}</Text>
        {n.actionLabel && n.onAction && (
          <TouchableOpacity style={[nt.actionBtn, { backgroundColor: color }]} onPress={() => { onClose(); n.onAction?.(); }} activeOpacity={0.85}>
            <Text style={nt.actionTxt}>{n.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const nt = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22, zIndex: 9999, elevation: 50 },
  card: { backgroundColor: "#0B0B0B", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", padding: 18, width: "100%", maxWidth: 420, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 24 },
  top: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { color: C.white, fontWeight: "900", fontSize: 14, flex: 1 },
  close: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.hairline },
  msg: { color: "rgba(255,255,255,0.72)", lineHeight: 18, fontSize: 12.5 },
  actionBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  actionTxt: { color: "#FFF", fontWeight: "900", fontSize: 13 },
});

export default function PublishProduct() {
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [category,    setCategory]    = useState<Category | null>(null);
  const [author,      setAuthor]      = useState("");
  const [priceTxt,    setPriceTxt]    = useState("");
  const [quantityTxt, setQuantityTxt] = useState("");
  const [description, setDescription] = useState("");
  const [images,      setImages]      = useState<PickedImage[]>([]);
  const [permOK,      setPermOK]      = useState(false);
  const [acsetBalance,   setAcsetBalance]   = useState<number | null>(null);
  const [acsetCost,      setAcsetCost]      = useState(ACSET_FALLBACK);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [isSupreme,      setIsSupreme]      = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [authorLocked,      setAuthorLocked]      = useState(false);   // vrai si dans la période 100j
  const [showAuthorInfo,    setShowAuthorInfo]    = useState(false);   // modal info nom
  const [showAuthorModal,   setShowAuthorModal]   = useState(false);   // carte saisie nom
  const [authorDraft,       setAuthorDraft]       = useState("");       // brouillon avant save
  const [authorLockedUntil, setAuthorLockedUntil] = useState<Date | null>(null);  // date déverrouillage
  const [notice,    setNotice]    = useState<Notice | null>(null);

  const { checkDuplicate, registerContentHash, checking: checkingDup, progress: dupProgress } = useContentDuplicateCheck();
  const [dupResult,    setDupResult]    = useState<DuplicateCheckResult | null>(null);
  const [showDupModal, setShowDupModal] = useState(false);

  const notify = (n: Notice) => { setNotice(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setPermOK(status === "granted");
      if (status !== "granted") notify({ tone: "danger", title: "Accès galerie requis", message: "Autorisez l'accès à votre galerie pour publier des photos produit." });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, author_name, author_name_set_at")
          .eq("id", user.id)
          .maybeSingle();

        // ✅ Priorité : author_name sauvegardé → full_name → email
        const savedName = prof?.author_name?.trim();
        const fallback  = prof?.full_name?.trim()
          || (user.user_metadata as any)?.full_name?.trim()
          || user.email?.trim()
          || "Auteur";

        setAuthor(savedName || fallback);

        // ✅ Vérifier le verrou 250 jours
        if (prof?.author_name_set_at && !isSupreme) {
          const setAt    = new Date(prof.author_name_set_at);
          const unlockAt = new Date(setAt.getTime() + 250 * 24 * 60 * 60 * 1000);
          if (new Date() < unlockAt) {
            setAuthorLocked(true);
            setAuthorLockedUntil(unlockAt);
          }
        }
      } catch { setAuthor(user.email?.trim() ?? "Auteur"); }
    })();
  }, []);

  const fetchCredits = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;
      const supreme = (user.email ?? "").toLowerCase() === "meyounbauniklovegodstory@gmail.com";
      setIsSupreme(supreme);
      if (supreme) { setAcsetBalance(Number.MAX_SAFE_INTEGER); return; }
      const { data: w } = await supabase.from("wallets").select("acset_balance").eq("user_id", user.id).single();
      setAcsetBalance(Number(w?.acset_balance ?? 0));
    } finally { setCreditsLoading(false); }
  }, []);

  useEffect(() => {
    setTimeout(async () => {
      try {
        const { data } = await supabase.from("publication_tariffs").select("acset_cost").eq("code", "PRODUCT").eq("active", true).maybeSingle();
        if (data?.acset_cost) setAcsetCost(Number(data.acset_cost));
      } catch {}
    }, 0);
    setTimeout(() => fetchCredits(), 0);
  }, [fetchCredits]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), []);

  const pickImages = async () => {
    if (!permOK) { notify({ tone: "danger", title: "Permission requise", message: "Autorisez l'accès à la galerie." }); return; }
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { notify({ tone: "info", title: "Maximum atteint", message: `Vous avez déjà ${MAX_IMAGES} images.` }); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 1, selectionLimit: remaining });
      if (result.canceled) return;
      const picked: PickedImage[] = result.assets.map((a) => ({ uri: a.uri, width: a.width ?? 0, height: a.height ?? 0, name: a.fileName ?? undefined, type: a.type ?? "image" }));
      const lowQuality = picked.filter((img) => !isHighQuality(img));
      if (lowQuality.length > 0) {
        notify({ tone: "danger", title: "Qualité insuffisante", message: `${lowQuality.length} image${lowQuality.length > 1 ? "s" : ""} en dessous de ${MIN_IMG_DIMENSION}×${MIN_IMG_DIMENSION}px.\n\nRHAZN exige des photos professionnelles HD.` });
      }
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
      Haptics.selectionAsync().catch(() => {});
    } catch { notify({ tone: "danger", title: "Erreur galerie", message: "Impossible d'ouvrir la galerie. Réessayez." }); }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const publish = async () => {
    const name  = productName.trim();
    const cat   = category;
    const au    = author.trim();
    const price = parseFloat(priceTxt.replace(",", "."));
    const qty   = parseInt(quantityTxt, 10);

    if (!name)  { notify({ tone: "danger", title: "Nom du produit requis", message: "Saisissez le nom de votre produit." }); return; }
    if (!cat)   { notify({ tone: "danger", title: "Catégorie requise", message: "Sélectionnez une catégorie." }); return; }
    if (isNaN(price) || price <= 0) { notify({ tone: "danger", title: "Prix invalide", message: "Saisissez un prix valide en HTG (ex: 1500)." }); return; }
    if (isNaN(qty) || qty < 1) { notify({ tone: "danger", title: "Quantité invalide", message: "Saisissez une quantité valide (min 1)." }); return; }
    if (images.length === 0) { notify({ tone: "danger", title: "Image de couverture requise", message: "Ajoutez au minimum 1 image.", actionLabel: "Choisir des images", onAction: pickImages }); return; }
    if (images.length < MIN_IMAGES) {
      notify({ tone: "info", title: `Minimum ${MIN_IMAGES} images recommandées`, message: `Vous avez ${images.length} image${images.length > 1 ? "s" : ""}. Voulez-vous publier quand même ?`, actionLabel: "Ajouter des images", onAction: pickImages });
    }
    const lowCount = images.filter((img) => !isHighQuality(img)).length;
    if (lowCount > 0) {
      notify({ tone: "danger", title: "Images de faible qualité", message: `${lowCount} image${lowCount > 1 ? "s" : ""} n'atteignent pas ${MIN_IMG_DIMENSION}×${MIN_IMG_DIMENSION}px. Continuez quand même ?`, actionLabel: "Continuer malgré tout", onAction: () => proceedPublish(name, cat, au, price, qty) });
      return;
    }
    // ✅ Vérification anti-doublons AVANT upload
    notify({ tone: "info", title: "Vérification…", message: "Contrôle des droits d'auteur RHAZN…" });
    const dupCheck = await checkDuplicate({
      title: name,
      fileUri: images[0]?.uri ?? "",
      contentType: "PRODUCT",
    });
    if (dupCheck.is_duplicate) {
      setNotice(null);
      setDupResult(dupCheck);
      setShowDupModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setNotice(null);
    await proceedPublish(name, cat, au, price, qty);
  };

  // ✅ Sauvegarde manuelle du nom auteur/entreprise
  const openAuthorModal = () => {
    setAuthorDraft(author);
    setShowAuthorModal(true);
  };

  const saveAuthorName = async () => {
    if (authorLocked && !isSupreme) return;
    const au = authorDraft.trim();
    if (!au) return;
    setAuthor(au);   // met à jour le champ affiché
    if (!au) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update({
        author_name:        au,
        author_name_set_at: new Date().toISOString(),
      }).eq("id", uid);
      const unlockAt = new Date(Date.now() + 250 * 24 * 60 * 60 * 1000);
      setAuthorLocked(true);
      setAuthorLockedUntil(unlockAt);
      
      notify({
        tone: "ok",
        title: "Nom enregistré ✓",
        message: "Votre nom d\"entreprise a été sauvegardé. Modifiable dans 250 jours.",
        actionLabel: "OK",
        onAction: () => {},
      });
    } catch {
      notify({ tone: "danger", title: "Erreur", message: "Impossible de sauvegarder le nom." });
    }
  };

  const proceedPublish = async (name: string, cat: Category, au: string, price: number, qty: number) => {
    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.replace("/auth/login"); return; }

      if (!isSupreme) {
        const available = Number(acsetBalance ?? 0);
        if (available < acsetCost) {
          notify({ tone: "danger", title: "ACSET insuffisants", message: `Publication refusée.\n\nRequis : ${acsetCost} ACSET\nDisponible : ${available} ACSET`, actionLabel: "Recharger mes ACSET", onAction: () => router.push("/banq/suspentz") });
          return;
        }
      }

      notify({ tone: "info", title: "Upload en cours…", message: "Envoi sécurisé de vos images vers RHAZN…" });

      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) { router.replace("/auth/login"); return; }

      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const img      = images[i];
        const ext      = img.uri.split(".").pop()?.toLowerCase() ?? "jpg";
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const path     = `${user.id}/${Date.now()}_${i}.${ext}`;
        const supabaseUrl = "https://mxxlchaygarszkygmylo.supabase.co";

        // ✅ XMLHttpRequest — natif React Native, pas de dépendance expo
        // Lit le fichier local en blob via fetch puis l'envoie avec le JWT explicite
        const localBlob: Blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", img.uri);
          xhr.responseType = "blob";
          xhr.onload  = () => resolve(xhr.response);
          xhr.onerror = () => reject(new Error(`Lecture image ${i + 1} échouée`));
          xhr.send();
        });

        const uploadStatus: number = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path}`);
          xhr.setRequestHeader("Authorization", `Bearer ${session!.access_token}`);
          xhr.setRequestHeader("Content-Type", mimeType);
          xhr.setRequestHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGxjaGF5Z2Fyc3preWdteWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1OTc3NjQsImV4cCI6MjA1NjE3Mzc2NH0.Fmn2ul5ESMX-DqrNxpjaRGOqCMgFGJMFPqgNExAbHEk");
          xhr.onload  = () => resolve(xhr.status);
          xhr.onerror = () => reject(new Error(`Upload image ${i + 1} — erreur réseau`));
          xhr.send(localBlob);
        });

        if (uploadStatus !== 200 && uploadStatus !== 201) {
          throw new Error(`Upload image ${i + 1} échoué (status ${uploadStatus})`);
        }

        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        if (!pub?.publicUrl) throw new Error(`URL publique introuvable (image ${i + 1})`);
        uploadedUrls.push(pub.publicUrl);
      }

      const { error: rpcErr } = await supabase.rpc("publish_product_final", {
        p_title: name, p_category_label: cat, p_price_htg: price, p_quantity: qty,
        p_description: description.trim() || null, p_cover_url: uploadedUrls[0],
        p_image_urls: JSON.stringify(uploadedUrls), p_cadna_status: "approved", // ✅ Publication directe — pas de validation CADNA
      });
      if (rpcErr) throw rpcErr;

      // ✅ Sauvegarder le nom auteur uniquement si modifié et non verrouillé
      if (au) {
        const { data: lastProduct } = await supabase
          .from("products")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastProduct?.id) {
          await supabase
            .from("products")
            .update({ author_name: au })
            .eq("id", lastProduct.id);
        }

        // ✅ author_name NE SE SAUVEGARDE PLUS ICI
        // L'utilisateur le modifie manuellement via le bouton "Enregistrer ce nom"
        // Ce nom est modifiable une fois, puis verrouillé 250 jours
      }

      await fetchCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // ✅ Enregistrer l'empreinte après upload réussi
    if (images[0]?.uri) {
      await registerContentHash("product-new", {
        title: name,
        fileUri: images[0].uri,
        contentType: "PRODUCT",
      });
    }

      notify({
        tone: "ok", title: "Publication envoyée !",
        message: "Votre produit est publié et visible immédiatement.",
        actionLabel: "OK",
        onAction: () => { setProductName(""); setCategory(null); setPriceTxt(""); setQuantityTxt(""); setDescription(""); setImages([]); router.replace("/publish/products"); },
      });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      notify({ tone: "danger", title: "Échec de publication", message: e?.message ?? "Erreur réseau. Vérifiez votre connexion." });
    } finally { setUploading(false); }
  };

  const coverImage = images[0] ?? null;

  // ── Centrage de la couverture ──
  const [showCenterModal, setShowCenterModal] = useState(false);
  const coverOffsetX = useRef(new Animated.Value(0)).current;
  const coverOffsetY = useRef(new Animated.Value(0)).current;
  const coverOffsetXVal = useRef(0);
  const coverOffsetYVal = useRef(0);
  const [coverSavedOffset, setCoverSavedOffset] = useState({ x: 0, y: 0 });

  const coverPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        coverOffsetX.setOffset(coverOffsetXVal.current);
        coverOffsetY.setOffset(coverOffsetYVal.current);
        coverOffsetX.setValue(0);
        coverOffsetY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: coverOffsetX, dy: coverOffsetY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        coverOffsetX.flattenOffset();
        coverOffsetY.flattenOffset();
        coverOffsetXVal.current += g.dx;
        coverOffsetYVal.current += g.dy;
      },
    })
  ).current;

  const resetCoverOffset = () => {
    coverOffsetX.setValue(0);
    coverOffsetY.setValue(0);
    coverOffsetXVal.current = 0;
    coverOffsetYVal.current = 0;
    setCoverSavedOffset({ x: 0, y: 0 });
  };

  const saveCoverOffset = () => {
    setCoverSavedOffset({ x: coverOffsetXVal.current, y: coverOffsetYVal.current });
    setShowCenterModal(false);
  };
  const lowQualityCount = images.filter((img) => !isHighQuality(img)).length;

  return (
    <>
    <DuplicateWarningModal
      visible={showDupModal}
      result={dupResult}
      isSupreme={isSupreme}
      onCancel={() => { setShowDupModal(false); setDupResult(null); }}
    />
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>

      {notice && <NoticeOverlay n={notice} onClose={() => setNotice(null)} />}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>

        {/* ════════ HEADER FLOTTANT ════════ */}
        <View style={sc.floatingHeader}>

          {/* Ligne 1 : Titre + Badge ACSET */}
          <View style={sc.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={sc.headerTitle}>Publier</Text>
              <Text style={sc.headerSub}>Boutique RHAZN • <Text style={sc.gold}>{acsetCost} ACSET</Text></Text>
            </View>
            <View style={sc.acsetBadge}>
              {creditsLoading
                ? <ActivityIndicator size="small" color={C.gold} />
                : <>
                    <Ionicons name="sparkles-outline" size={14} color={C.gold} />
                    <Text style={sc.acsetTxt}>{isSupreme ? "∞" : acsetBalance === null ? "—" : acsetBalance}</Text>
                    <Text style={sc.acsetLabel}>ACSET</Text>
                  </>
              }
            </View>
          </View>

          {/* ✅ Ligne 2 : Tabs navigation scrollables — "Produits" actif */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sc.navTabsScroll} contentContainerStyle={sc.navTabsContent}>
            {NAV_TABS.map((tab) => {
              const isActive = tab.label === "Produits";
              return (
                <Pressable
                  key={tab.label}
                  style={[sc.navTab, isActive && sc.navTabActive]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); if (!isActive) router.push(tab.route as any); }}
                >
                  <Text style={[sc.navTabTxt, isActive && sc.navTabTxtActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Ligne 3 : Pills */}
          <View style={sc.pillsRow}>
            <View style={sc.pill}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={sc.pillTxt} numberOfLines={1}>{todayLabel}</Text>
            </View>
            <View style={sc.pill}>
              <Ionicons name="images-outline" size={13} color="rgba(255,255,255,0.55)" />
              <Text style={sc.pillTxt}>{images.length} / {MAX_IMAGES}</Text>
            </View>
            <View style={[sc.pill, { borderColor: C.goldBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={C.gold} />
              <Text style={[sc.pillTxt, { color: C.gold }]}>CADNA</Text>
            </View>
          </View>
        </View>

        {/* ════════ SCROLL BODY ════════ */}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={sc.scrollContent}>

          {/* IMAGES */}
          <View style={sc.card}>
            <View style={sc.sectionRow}>
              <Text style={sc.sectionTitle}>Images produit</Text>
              <Text style={sc.sectionSub}>min {MIN_IMAGES} • max {MAX_IMAGES} • HD recommandée</Text>
            </View>

            {coverImage ? (
              <View style={sc.coverWrap}>
                <Image source={{ uri: coverImage.uri }} style={sc.coverImg} />
                <View style={sc.coverBadgeRow}>
                  <View style={sc.coverLabelBadge}>
                    <Ionicons name="star" size={10} color="#000" />
                    <Text style={sc.coverLabelTxt}>IMAGE DE COUVERTURE</Text>
                  </View>
                  <View style={[sc.qualBadge, isHighQuality(coverImage) ? sc.qualOk : sc.qualBad]}>
                    <Ionicons name={isHighQuality(coverImage) ? "checkmark-circle" : "warning"} size={12} color={isHighQuality(coverImage) ? C.ok : C.danger} />
                    <Text style={[sc.qualTxt, { color: isHighQuality(coverImage) ? C.ok : C.danger }]}>{imageQualityLabel(coverImage).label}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable style={sc.coverEmpty} onPress={pickImages}>
                <View style={sc.coverEmptyIcon}><Ionicons name="image-outline" size={28} color={C.gold} /></View>
                <Text style={sc.coverEmptyTitle}>Ajouter l'image de couverture</Text>
                <Text style={sc.coverEmptyHint}>Obligatoire • Min {MIN_IMG_DIMENSION}×{MIN_IMG_DIMENSION}px recommandé</Text>
              </Pressable>
            )}

            {images.length > 0 && (
              <View style={sc.thumbGrid}>
                {images.map((img, idx) => (
                  <ImageThumb key={`${img.uri}-${idx}`} img={img} index={idx} isCover={idx === 0} onRemove={() => removeImage(idx)} />
                ))}
              </View>
            )}

            {lowQualityCount > 0 && (
              <View style={sc.qualWarning}>
                <Ionicons name="warning-outline" size={15} color={C.danger} />
                <Text style={sc.qualWarningTxt}>{lowQualityCount} image{lowQualityCount > 1 ? "s" : ""} sous {MIN_IMG_DIMENSION}×{MIN_IMG_DIMENSION}px — qualité insuffisante pour RHAZN</Text>
              </View>
            )}

            <Pressable style={({ pressed }) => [sc.addImgBtn, pressed && { opacity: 0.85 }]} onPress={pickImages} disabled={images.length >= MAX_IMAGES}>
              <Feather name="upload" size={16} color={images.length >= MAX_IMAGES ? "rgba(255,255,255,0.28)" : C.gold} />
              <Text style={[sc.addImgTxt, images.length >= MAX_IMAGES && { color: "rgba(255,255,255,0.28)" }]}>
                {images.length === 0 ? "Choisir des images" : images.length >= MAX_IMAGES ? `Maximum atteint (${MAX_IMAGES})` : `Ajouter des images (${images.length}/${MAX_IMAGES})`}
              </Text>
              <Text style={sc.addImgCount}>{images.length}/{MAX_IMAGES}</Text>
            </Pressable>
          </View>

          {/* FORMULAIRE */}
          <View style={[sc.card, { zIndex: 50 }]}>
            <Text style={sc.sectionTitle}>Informations produit</Text>
            <View style={{ height: 14 }} />
            <TextInput placeholder="Nom du produit (obligatoire)" placeholderTextColor="rgba(255,255,255,0.30)" style={sc.input} value={productName} onChangeText={setProductName} returnKeyType="next" maxLength={120} />
            <CategoryDropdown value={category} onSelect={setCategory} />
            {/* ✅ Nom entreprise / auteur — tap pour ouvrir la carte de saisie */}
            <View style={sc.authorLabelRow}>
              <Text style={sc.authorLabel}>Nom entreprise ou auteur</Text>
              <TouchableOpacity style={sc.infoBtn} onPress={() => setShowAuthorInfo(true)} activeOpacity={0.75}>
                <Ionicons name="information-circle" size={18} color={C.gold} />
              </TouchableOpacity>
            </View>

            {/* Champ tap → ouvre la carte de saisie */}
            <TouchableOpacity
              style={[sc.authorTapField, authorLocked && !isSupreme && sc.authorTapFieldLocked]}
              onPress={() => { if (!authorLocked || isSupreme) openAuthorModal(); }}
              activeOpacity={authorLocked && !isSupreme ? 1 : 0.82}
            >
              <View style={{ flex: 1 }}>
                {author ? (
                  <Text style={sc.authorTapValue}>{author}</Text>
                ) : (
                  <Text style={sc.authorTapPlaceholder}>Toucher pour définir le nom…</Text>
                )}
                {authorLocked && !isSupreme && authorLockedUntil && (
                  <Text style={sc.authorTapLockDate}>
                    Verrouillé · Modifiable le {authorLockedUntil.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </Text>
                )}
              </View>
              {authorLocked && !isSupreme
                ? <Ionicons name="lock-closed" size={16} color="rgba(255,69,58,0.80)" />
                : <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
              }
            </TouchableOpacity>
            <View style={sc.doubleRow}>
              <View style={sc.halfWrap}>
                <TextInput placeholder="Prix (HTG)" placeholderTextColor="rgba(255,255,255,0.30)" style={[sc.input, sc.halfInput]} value={priceTxt} onChangeText={setPriceTxt} keyboardType="decimal-pad" returnKeyType="next" />
                <View style={sc.currencyBadge}><Text style={sc.currencyTxt}>HTG</Text></View>
              </View>
              <View style={sc.halfWrap}>
                <TextInput placeholder="Quantité" placeholderTextColor="rgba(255,255,255,0.30)" style={[sc.input, sc.halfInput]} value={quantityTxt} onChangeText={setQuantityTxt} keyboardType="number-pad" returnKeyType="done" />
                <View style={sc.currencyBadge}><Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.35)" /></View>
              </View>
            </View>
            <TextInput placeholder="Description du produit (optionnelle)" placeholderTextColor="rgba(255,255,255,0.30)" style={[sc.input, { height: 90, textAlignVertical: "top" }]} multiline value={description} onChangeText={setDescription} />
          </View>

          {/* RÉSUMÉ + CTA */}
          <View style={sc.card}>
            <View style={sc.recapRow}>
              <View style={sc.recapItem}><Text style={sc.recapVal}>{images.length}</Text><Text style={sc.recapLbl}>images</Text></View>
              <View style={sc.recapDivider} />
              <View style={sc.recapItem}><Text style={sc.recapVal}>{priceTxt || "—"}</Text><Text style={sc.recapLbl}>HTG</Text></View>
              <View style={sc.recapDivider} />
              <View style={sc.recapItem}><Text style={sc.recapVal}>{quantityTxt || "—"}</Text><Text style={sc.recapLbl}>en stock</Text></View>
              <View style={sc.recapDivider} />
              <View style={sc.recapItem}><Text style={[sc.recapVal, { color: C.gold }]}>{acsetCost}</Text><Text style={sc.recapLbl}>ACSET</Text></View>
            </View>
            <TouchableOpacity style={[sc.publishBtn, uploading && sc.publishBtnDisabled]} onPress={publish} disabled={uploading} activeOpacity={0.85}>
              {uploading
                ? <ActivityIndicator color="#000" />
                : <><Text style={sc.publishTxt}>Publier le produit</Text><View style={sc.publishCost}><Ionicons name="sparkles" size={13} color="#000" /><Text style={sc.publishCostTxt}>{acsetCost} ACSET</Text></View></>
              }
            </TouchableOpacity>
            <Text style={sc.footnote}>
              Après {acsetCost} ACSET consommé(s), votre produit est envoyé à <Text style={{ color: C.gold, fontWeight: "900" }}>CADNA</Text> pour validation.{"\n"}La 1ère image devient automatiquement l'image de couverture.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

    {/* ✅ CARTE SAISIE NOM ENTREPRISE — indépendante de la publication */}
    {showAuthorModal && (
      <View style={sc.authorInfoOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAuthorModal(false)} />
        <View style={sc.authorInfoCard}>
          <View style={sc.authorInfoHandle} />

          <View style={sc.authorInfoIconRing}>
            <Ionicons name="business" size={28} color={C.gold} />
          </View>

          <Text style={sc.authorInfoTitle}>Nom entreprise / auteur</Text>
          <Text style={sc.authorInfoMsg}>
            Ce nom sera affiché dans la Channel RHAZN. Verrouillé 250 jours après enregistrement.
          </Text>

          <View style={sc.authorInfoDivider} />

          {/* Champ de saisie */}
          <View style={sc.authorDraftWrap}>
            <TextInput
              value={authorDraft}
              onChangeText={setAuthorDraft}
              placeholder="Ex: Boutique RHAZN Haïti"
              placeholderTextColor="rgba(255,255,255,0.30)"
              style={sc.authorDraftInput}
              autoFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (authorDraft.trim()) {
                  saveAuthorName();
                  setShowAuthorModal(false);
                }
              }}
            />
            {authorDraft.trim().length > 0 && (
              <Text style={sc.authorDraftCount}>{authorDraft.trim().length}/80</Text>
            )}
          </View>

          <View style={sc.authorInfoDivider} />

          {/* Boutons */}
          <TouchableOpacity
            style={[sc.authorInfoOkBtn, !authorDraft.trim() && { opacity: 0.45 }]}
            disabled={!authorDraft.trim()}
            onPress={() => {
              saveAuthorName();
              setShowAuthorModal(false);
            }}
            activeOpacity={0.85}
          >
            <Text style={sc.authorInfoOkTxt}>Enregistrer ce nom</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={sc.authorModalCancelBtn}
            onPress={() => setShowAuthorModal(false)}
            activeOpacity={0.75}
          >
            <Text style={sc.authorModalCancelTxt}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* ✅ MODAL CENTRAGE COUVERTURE */}
    {showCenterModal && coverImage && (
      <View style={sc.centerOverlay}>
        <View style={sc.centerCard}>
          <View style={sc.centerHandle} />
          <Text style={sc.centerTitle}>Centrer l'image</Text>
          <Text style={sc.centerSub}>Glissez l'image pour la positionner</Text>
          <View style={sc.centerStage}>
            <Animated.Image
              source={{ uri: coverImage.uri }}
              style={[sc.centerImage, { transform: [{ translateX: coverOffsetX }, { translateY: coverOffsetY }] }]}
              resizeMode="cover"
              {...coverPanResponder.panHandlers}
            />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={sc.gridH} />
              <View style={[sc.gridH, { top: "66.6%" as any }]} />
              <View style={sc.gridV} />
              <View style={[sc.gridV, { left: "66.6%" as any }]} />
            </View>
          </View>
          <View style={sc.centerActions}>
            <TouchableOpacity style={sc.resetBtn} onPress={resetCoverOffset} activeOpacity={0.82}>
              <Ionicons name="refresh" size={14} color={C.gold} />
              <Text style={sc.resetTxt}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={sc.saveOffsetBtn} onPress={saveCoverOffset} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={16} color="#000" />
              <Text style={sc.saveOffsetTxt}>Valider le centrage</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={sc.centerCancelBtn} onPress={() => setShowCenterModal(false)}>
            <Text style={sc.centerCancelTxt}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* ✅ MODAL INFO NOM ENTREPRISE */}
    {showAuthorInfo && (
      <View style={sc.authorInfoOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAuthorInfo(false)} />
        <View style={sc.authorInfoCard}>
          {/* Handle */}
          <View style={sc.authorInfoHandle} />

          {/* Icône */}
          <View style={sc.authorInfoIconRing}>
            <Ionicons name="business" size={32} color={C.gold} />
          </View>

          <Text style={sc.authorInfoTitle}>Nom entreprise ou auteur</Text>

          <Text style={sc.authorInfoMsg}>
            Ce nom sera affiché dans la Channel RHAZN quand les utilisateurs cliquent sur vos produits.
          </Text>

          <View style={sc.authorInfoDivider} />

          {/* Règle 1 */}
          <View style={sc.authorInfoRule}>
            <View style={sc.authorInfoRuleNum}><Text style={sc.authorInfoRuleNumTxt}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={sc.authorInfoRuleTitle}>Choisissez soigneusement</Text>
              <Text style={sc.authorInfoRuleSub}>Ce nom représente votre identité commerciale sur RHAZN.</Text>
            </View>
          </View>

          {/* Règle 2 */}
          <View style={sc.authorInfoRule}>
            <View style={sc.authorInfoRuleNum}><Text style={sc.authorInfoRuleNumTxt}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={sc.authorInfoRuleTitle}>Verrouillé 250 jours</Text>
              <Text style={sc.authorInfoRuleSub}>Après enregistrement, le nom ne peut plus être modifié pendant 250 jours.</Text>
            </View>
          </View>

          {/* Règle 3 */}
          <View style={sc.authorInfoRule}>
            <View style={sc.authorInfoRuleNum}><Text style={sc.authorInfoRuleNumTxt}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={sc.authorInfoRuleTitle}>Indépendant de vos publications</Text>
              <Text style={sc.authorInfoRuleSub}>Cliquez "Sauvegarder" pour valider. Le nom ne change pas automatiquement à chaque publication.</Text>
            </View>
          </View>

          <View style={sc.authorInfoDivider} />

          {/* Avertissement */}
          <View style={sc.authorInfoWarning}>
            <Ionicons name="warning-outline" size={13} color="rgba(255,159,10,0.90)" />
            <Text style={sc.authorInfoWarningTxt}>
              Seul RHAZN ADMIN peut modifier ce nom avant le délai de 250 jours.
            </Text>
          </View>

          <TouchableOpacity
            style={sc.authorInfoOkBtn}
            onPress={() => setShowAuthorInfo(false)}
            activeOpacity={0.85}
          >
            <Text style={sc.authorInfoOkTxt}>Compris</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </>
  );
}

const sc = StyleSheet.create({
  floatingHeader: {
    position: "absolute", top: 44, left: 0, right: 0,
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 10,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.hairline,
    zIndex: 50, elevation: 12,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  headerTitle: { color: C.white, fontSize: 24, fontWeight: "900" },
  headerSub:   { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4 },
  gold:        { color: C.gold, fontWeight: "900" },
  headerRight: { alignItems: "flex-end", gap: 6 },

  /* Badge ACSET */
  acsetBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: C.goldBorder, backgroundColor: C.goldDim },
  acsetTxt:   { color: C.gold, fontWeight: "900", fontSize: 15 },
  acsetLabel: { color: "rgba(212,175,55,0.65)", fontWeight: "800", fontSize: 10 },

  /* ✅ Nav tabs */
  navTabsScroll:   { marginBottom: 10 },
  navTabsContent:  { gap: 8, paddingRight: 4 },
  navTab:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.04)" },
  navTabActive:    { backgroundColor: C.gold, borderColor: "transparent" },
  navTabTxt:       { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 13 },
  navTabTxtActive: { color: "#000", fontWeight: "900" },

  pillsRow: { flexDirection: "row", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.03)" },
  pillTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "800", fontSize: 11 },

  scrollContent: { paddingTop: 225, paddingHorizontal: 16, paddingBottom: 30 },

  card: { backgroundColor: C.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  sectionRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: C.white, fontWeight: "900", fontSize: 15 },
  sectionSub:   { color: "rgba(255,255,255,0.42)", fontWeight: "700", fontSize: 11 },

  coverWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: C.border },
  coverImg:  { width: "100%", height: 200, backgroundColor: "#111" },
  coverBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: "#0A0A0A" },
  coverLabelBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.gold, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  coverLabelTxt: { color: "#000", fontWeight: "900", fontSize: 9, letterSpacing: 0.5 },
  qualBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  qualOk:    { backgroundColor: "rgba(52,199,89,0.10)", borderColor: "rgba(52,199,89,0.30)" },
  qualBad:   { backgroundColor: "rgba(255,69,58,0.10)", borderColor: "rgba(255,69,58,0.30)" },
  qualTxt:   { fontWeight: "800", fontSize: 10 },
  coverEmpty: { borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.goldBorder, backgroundColor: C.goldDim, paddingVertical: 32, alignItems: "center", gap: 8, marginBottom: 12 },
  coverEmptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: "rgba(212,175,55,0.15)", borderWidth: 1, borderColor: C.goldBorder, alignItems: "center", justifyContent: "center" },
  coverEmptyTitle: { color: C.gold, fontWeight: "900", fontSize: 14 },
  coverEmptyHint:  { color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: 11 },
  thumbGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  qualWarning: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,69,58,0.08)", borderWidth: 1, borderColor: "rgba(255,69,58,0.25)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  qualWarningTxt: { color: C.danger, fontWeight: "700", fontSize: 12, flex: 1 },
  addImgBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  addImgTxt:   { color: C.gold, fontWeight: "900", flex: 1, marginLeft: 10 },
  addImgCount: { color: "rgba(255,255,255,0.42)", fontWeight: "800", fontSize: 12 },

  input: { backgroundColor: C.input, color: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, fontWeight: "700", fontSize: 14 },
  authorRow:   { position: "relative" },
  authorInputLocked: { color: "rgba(255,255,255,0.35)", borderColor: "rgba(255,69,58,0.25)" },
  autoBadgeLocked:   { backgroundColor: "rgba(255,69,58,0.10)", borderColor: "rgba(255,69,58,0.30)" },
  autoBadgeLockedTxt:{ color: "rgba(255,69,58,0.85)", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  lockNotice:        { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, paddingHorizontal: 2 },
  lockNoticeTxt:     { color: "rgba(255,69,58,0.70)", fontSize: 11, fontWeight: "600" },
  authorInput: { paddingRight: 72 },
  autoBadge: { position: "absolute", right: 12, top: 14, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.goldDim, borderRadius: 8, borderWidth: 1, borderColor: C.goldBorder, paddingHorizontal: 7, paddingVertical: 3 },
  autoBadgeTxt: { color: C.gold, fontWeight: "900", fontSize: 10 },
  doubleRow: { flexDirection: "row", gap: 10 },
  halfWrap:  { flex: 1, position: "relative" },
  halfInput: { paddingRight: 48 },
  currencyBadge: { position: "absolute", right: 10, top: 14, backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  currencyTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "900", fontSize: 11 },

  recapRow: { flexDirection: "row", backgroundColor: "#000", borderRadius: 16, padding: 14, marginBottom: 14 },
  recapItem:    { flex: 1, alignItems: "center", gap: 4 },
  recapVal:     { color: C.white, fontWeight: "900", fontSize: 16 },
  recapLbl:     { color: "rgba(255,255,255,0.42)", fontWeight: "700", fontSize: 10 },
  recapDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 8 },

  publishBtn: { backgroundColor: C.gold, borderRadius: 18, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.gold, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  publishBtnDisabled: { opacity: 0.60, shadowOpacity: 0 },
  publishTxt:  { color: "#000", fontWeight: "900", fontSize: 16 },
  publishCost: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  publishCostTxt: { color: "#000", fontWeight: "900", fontSize: 12 },

  // ── Couverture avec clip + bouton centrer ──
  coverClip:     { width: "100%", height: 200, overflow: "hidden", borderRadius: 12, backgroundColor: "#111" },
  centerBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 9, borderRadius: 12, backgroundColor: C.gold },
  centerBtnTxt:  { color: "#000", fontWeight: "900", fontSize: 13 },

  // ── Modal centrage ──
  centerOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.80)", justifyContent: "flex-end", zIndex: 9500, elevation: 95 },
  centerCard:     { backgroundColor: "#131313", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 44, alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.09)" },
  centerHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 4 },
  centerTitle:    { color: "#FFF", fontWeight: "900", fontSize: 18 },
  centerSub:      { color: "rgba(255,255,255,0.55)", fontWeight: "600", fontSize: 13 },
  centerStage:    { width: "100%", height: 260, borderRadius: 16, overflow: "hidden", backgroundColor: "#000", position: "relative", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  centerImage:    { position: "absolute", width: "100%", height: "100%", top: -40, left: -40, width: 500, height: 380 } as any,
  gridH:          { position: "absolute", top: "33.3%", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.20)" },
  gridV:          { position: "absolute", left: "33.3%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.20)" },
  centerActions:  { flexDirection: "row", gap: 12, width: "100%" },
  resetBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  resetTxt:       { color: C.gold, fontWeight: "800", fontSize: 13 },
  saveOffsetBtn:  { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: C.gold },
  saveOffsetTxt:  { color: "#000", fontWeight: "900", fontSize: 14 },
  centerCancelBtn:{ width: "100%", paddingVertical: 13, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  centerCancelTxt:{ color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 14 },

  // ── Modal info nom entreprise ──
  authorInfoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end", zIndex: 9000, elevation: 90 },
  authorInfoCard:    { backgroundColor: "#131313", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 44, alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.09)" },
  authorInfoHandle:  { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 14 },
  authorInfoIconRing:{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1.5, borderColor: "rgba(212,175,55,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  authorInfoTitle:   { color: "#FFF", fontWeight: "900", fontSize: 19, textAlign: "center" },
  authorInfoMsg:     { color: "rgba(255,255,255,0.60)", fontWeight: "600", fontSize: 13, textAlign: "center", lineHeight: 20 },
  authorInfoDivider: { width: "100%", height: 1, backgroundColor: "rgba(255,255,255,0.09)", marginVertical: 4 },
  authorInfoRule:    { flexDirection: "row", alignItems: "flex-start", gap: 12, width: "100%" },
  authorInfoRuleNum: { width: 24, height: 24, borderRadius: 8, backgroundColor: "rgba(212,175,55,0.12)", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)", alignItems: "center", justifyContent: "center" },
  authorInfoRuleNumTxt:  { color: C.gold, fontWeight: "900", fontSize: 12 },
  authorInfoRuleTitle:   { color: "#FFF", fontWeight: "800", fontSize: 13, marginBottom: 2 },
  authorInfoRuleSub:     { color: "rgba(255,255,255,0.50)", fontWeight: "600", fontSize: 12, lineHeight: 17 },
  authorInfoWarning:     { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(255,159,10,0.08)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,159,10,0.25)", width: "100%" },
  authorInfoWarningTxt:  { color: "rgba(255,159,10,0.90)", fontSize: 12, fontWeight: "700", flex: 1, lineHeight: 17 },
  authorInfoOkBtn:   { width: "100%", paddingVertical: 15, borderRadius: 18, backgroundColor: C.gold, alignItems: "center", marginTop: 4 },

  // ── Champ tap auteur ──
  authorTapField:      { flexDirection: "row", alignItems: "center", backgroundColor: "#0B0B0B", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, paddingVertical: 14, marginTop: 6, gap: 10 },
  authorTapFieldLocked:{ borderColor: "rgba(255,69,58,0.35)", backgroundColor: "rgba(255,69,58,0.04)" },
  authorTapValue:      { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  authorTapPlaceholder:{ color: "rgba(255,255,255,0.30)", fontWeight: "600", fontSize: 14 },
  authorTapLockDate:   { color: "rgba(255,69,58,0.70)", fontSize: 11, fontWeight: "600", marginTop: 3 },

  // ── Carte saisie auteur ──
  authorDraftWrap:  { width: "100%", backgroundColor: "#0B0B0B", borderRadius: 16, borderWidth: 1, borderColor: "rgba(212,175,55,0.35)", paddingHorizontal: 14, paddingVertical: 4 },
  authorDraftInput: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, paddingVertical: 12 },
  authorDraftCount: { color: "rgba(255,255,255,0.30)", fontSize: 11, fontWeight: "600", textAlign: "right", paddingBottom: 6 },
  authorModalCancelBtn: { width: "100%", paddingVertical: 13, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  authorModalCancelTxt: { color: "rgba(255,255,255,0.55)", fontWeight: "700", fontSize: 14 },
  authorInfoOkTxt:   { color: "#000", fontWeight: "900", fontSize: 15 },

  footnote: { color: "rgba(255,255,255,0.45)", fontSize: 11.5, lineHeight: 17, marginTop: 12, textAlign: "center" },
});