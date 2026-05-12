// app/user-profile.tsx  (UI PROFIL IMPÉRIAL • RHAZN)
// ✅ Badge rôle intelligent : CADNA-MEMBRE / Agent RHAZN / USER/CRÉATEUR
// ✅ ACSET : 10 pour infos profil, 25 pour photo (SQL côté RPC)

import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PinVerifyModal from "../components/PinVerifyModal";
import { supabase } from "../lib/supabase";

/* ================= PALETTE APPLE PREMIUM ================= */
const COLORS = {
  bg:     "#F2F2F7",
  card:   "#FFFFFF",
  text:   "#111111",
  sub:    "#6E6E73",
  green:  "#16A34A",
  orange: "#F59E0B",
  red:    "#DC2626",
  gold:   "#D4AF37",
};

/* ================= HELPERS ================= */
const safeText = (v: any) => {
  if (v === null || v === undefined) return "";
  return String(v);
};

const formatDateFR = (d: any) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return safeText(d);
  const dd   = String(dt.getDate()).padStart(2, "0");
  const mm   = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatMoney = (n: any) => {
  if (n === null || n === undefined) return "0";
  const num = Number(n);
  if (Number.isNaN(num)) return safeText(n);
  return Math.floor(num).toLocaleString("fr-FR");
};

const formatAcset = (n: any) => {
  if (n === null || n === undefined) return "0";
  const num   = Number(n);
  if (Number.isNaN(num)) return safeText(n);
  const fixed = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  return fixed.replace(/\.00$/, "");
};

const calcSecondsLeft = (createdAt: any, profileCompletedAt: any) => {
  if (!createdAt) return 0;
  if (profileCompletedAt) return 0;
  const created  = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const deadline = created + 50 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
};

const prettyCountdown = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0j 00:00:00";
  const days = Math.floor(seconds / 86400);
  const h    = Math.floor((seconds % 86400) / 3600);
  const m    = Math.floor((seconds % 3600) / 60);
  const s    = seconds % 60;
  return `${days}j ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

const Row = ({ label, value, displayValue, copy }: any) => {
  // ── RZ-ID :
  //   value        = rz_id long → ce qui est copié dans le presse-papier
  //   displayValue = user_code court → ce qui est affiché masqué
  //   Sans displayValue → value est utilisé pour les deux
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!copy || !value) return;
    await Clipboard.setStringAsync(String(value));    // ← user_code complet
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Masquage : 8 premiers chars + •••••• + 4 derniers
  // Ex: RZHA1990••••••UY59  — copie code complet
  const baseDisplay = displayValue || value;
  const maskedValue = (() => {
    if (!copy || !baseDisplay) return baseDisplay || "—";
    const s = String(baseDisplay);
    if (s.length <= 12) return s;
    return s.slice(0, 8) + "••••••" + s.slice(-4);
  })();

  return (
    <TouchableOpacity activeOpacity={copy ? 0.82 : 1} onPress={handleCopy} style={styles.row}>
      {/* Label — flex:0 pour ne pas empiéter sur la valeur */}
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      {/* Valeur — flex:1 pour occuper le reste */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
        <Text style={[styles.rowValue, copy && styles.rzidValue]} numberOfLines={3} adjustsFontSizeToFit>
          {maskedValue}
        </Text>
        {copy && (
          <TouchableOpacity
            onPress={handleCopy}
            hitSlop={10}
            style={[styles.copyBtn, copied && styles.copyBtnDone]}
          >
            <Feather
              name={copied ? "check" : "copy"}
              size={14}
              color={copied ? COLORS.green : COLORS.gold}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const Section = ({ title, children }: any) => (
  <View style={{ marginBottom: 22 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

/* ================= BADGES ================= */
function Pill({ text, tone }: { text: string; tone: "ok"|"pending"|"bad"|"gold"|"blue" }) {
  const map: any = {
    ok:      COLORS.green,
    pending: COLORS.orange,
    bad:     COLORS.red,
    gold:    COLORS.gold,
    blue:    "#0A84FF",
  };
  const c = map[tone] || COLORS.sub;
  return (
    <View style={[styles.pill, { backgroundColor: c + "20", borderColor: c + "55" }]}>
      <Text style={[styles.pillText, { color: c }]}>{text}</Text>
    </View>
  );
}

function StatusBadge({ label, type }: any) {
  const map: any = { ok: COLORS.green, pending: COLORS.orange, bad: COLORS.red };
  return (
    <View style={[styles.badge, { backgroundColor: map[type] + "20" }]}>
      <Text style={[styles.badgeText, { color: map[type] }]}>{label}</Text>
    </View>
  );
}

/* ================= PROGRESS ================= */
function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

/* ================= SCREEN ================= */
export default function UserProfile() {
  const router = useRouter();


  const [pinVisible, setPinVisible] = useState(true);
  const [pinReady,   setPinReady]   = useState(false);

  const [profile,      setProfile]      = useState<any>(null);
  const [wallet,       setWallet]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [photoVisible, setPhotoVisible] = useState(false);
 const [avatarVersion, setAvatarVersion] = useState(Date.now());

 const [secondsLeft, setSecondsLeft] = useState(0);

  // ✅ Nombre de publications pour badge USER/CRÉATEUR
  const [pubCount, setPubCount] = useState(0);

  /* ── Load profile + wallet + publications ── */
  const loadProfile = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) { setProfile(null); setLoading(false); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("id, user_code, rz_id, full_name, email, phone, whatsapp_country_code, whatsapp_phone, sex, birth_date, birth_department, birth_city, birth_country, nif, profession, marital_status, premier_souvenir, premier_souvenir_rev, avatar_url, role, cadna_status, account_status, monetization_enabled, is_creator, profile_completed_at, profile_stage, created_at")
      .eq("id", uid)
      .single();

    const { data: w } = await supabase
      .from("wallets")
      .select("tan_balance, acset_balance, status, updated_at")
      .eq("user_id", uid).single();

    // ✅ Compter les publications pour le badge créateur
    const { count } = await supabase
      .from("store_products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);

    console.log("USER_CODE 👉", p?.user_code);
    setProfile(p);
    setWallet(w || null);
    setAvatarVersion(Date.now()); // ✅ force refresh de l'image
    setPubCount(count ?? 0);
    setLoading(false);
    setSecondsLeft(calcSecondsLeft(p?.created_at, p?.profile_completed_at));
  };

  useEffect(() => { loadProfile(); }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  useEffect(() => {
    if (!profile) return;
    const t = setInterval(() => {
      setSecondsLeft(calcSecondsLeft(profile?.created_at, profile?.profile_completed_at));
    }, 1000);
    return () => clearInterval(t);
  }, [profile?.created_at, profile?.profile_completed_at]);

  const initials = profile?.full_name?.[0]?.toUpperCase() || "R";

  const monetStatus = useMemo(() => {
  if (!profile) return { label: "—", type: "pending" };

  if (profile.account_status === "PAUSED") {
    return { label: "Compte en pause", type: "bad" };
  }

  const role = String(profile.role || "").toLowerCase();

  if (["agent", "admin", "cadna", "supreme"].includes(role)) {
    return { label: "Monétisation activée", type: "ok" };
  }

  return profile.monetization_enabled
    ? { label: "Monétisation activée", type: "ok" }
    : { label: "Monétisation désactivée", type: "pending" };
}, [profile]);

  // ═══════════════════════════════════════════════════════════
  // ✅ BADGE RÔLE INTELLIGENT
  // Priorité :
  //   1. SUPREME → badge or
  //   2. role = "agent" → "Agent RHAZN"
  //   3. ≥ 1 publication → "USER/CRÉATEUR"
  //   4. cadna_status = "approved" → "CADNA-MEMBRE"
  //   5. Sinon → "MEMBRE"
  // ═══════════════════════════════════════════════════════════
  const roleBadge = useMemo(() => {
    if (!profile) return { label: "MEMBRE", tone: "pending" as const };

    const role = safeText(profile.role).toLowerCase();

    // ✅ Ordre de priorité : rôle explicite > créateur > membre
    if (role === "supreme") {
      return { label: "SUPREME",     tone: "gold"    as const };
    }
    if (role === "admin") {
      return { label: "ADMIN",       tone: "gold"    as const };
    }
    if (role === "cadna") {
      return { label: "CADNA",       tone: "ok"      as const };
    }
    if (role === "cada") {
      return { label: "CADA",        tone: "ok"      as const };
    }
    if (role === "agent") {
      return { label: "AGENT RHAZN", tone: "blue"    as const };
    }
    if (pubCount >= 1) {
      return { label: "CRÉATEUR",    tone: "ok"      as const };
    }
    if (profile.cadna_status === "approved") {
      return { label: "CERTIFIÉ CADNA", tone: "ok"  as const };
    }
    return { label: "MEMBRE",        tone: "pending" as const };
  }, [profile, pubCount]);

  const progress = useMemo(() => {
    if (!profile) return { ratio: 0, done: 0, total: 0, missing: [] as string[] };
    const required: Array<{ key: string; label: string }> = [
      { key: "full_name",      label: "Nom complet" },
      { key: "email",          label: "Email" },
      { key: "phone",          label: "Téléphone" },
      { key: "whatsapp_phone", label: "WhatsApp" },
      { key: "nif",            label: "NIF" },
      { key: "profession",     label: "Profession" },
      { key: "marital_status", label: "Statut matrimonial" },
      { key: "birth_date",     label: "Date naissance" },
      { key: "sex",            label: "Sexe" },
      { key: "birth_city",     label: "Ville naissance" },
      { key: "birth_country",  label: "Pays naissance" },
      { key: "avatar_url",     label: "Photo profil" },
      { key: "premier_souvenir", label: "Souvenir inoubliable" },
    ];
    const isFilled = (v: any) => !!safeText(v).trim();
    const missing: string[] = [];
    let done = 0;
    for (const f of required) {
      const ok = isFilled((profile as any)[f.key]);
      if (ok) done++; else missing.push(f.label);
    }
    const total = required.length;
    return { ratio: total === 0 ? 0 : done / total, done, total, missing };
  }, [profile]);

  const deadlineText = useMemo(() => {
    if (!profile?.created_at) return "—";
    if (profile?.profile_completed_at) return "Scellé";
    return prettyCountdown(secondsLeft);
  }, [profile?.created_at, profile?.profile_completed_at, secondsLeft]);

  // ── PIN gate ──
  if (!pinReady) {
    return (
      <>
        <PinVerifyModal
          visible={pinVisible}
          onSuccess={() => { setPinVisible(false); setPinReady(true); }}
          onCancel={() => router.back()}
          showManageLink={false}
        />
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <View style={styles.hero}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhotoVisible(true); }}
          >
            {profile.avatar_url
              ? <Image
                  source={{ uri: `${profile.avatar_url}?v=${avatarVersion}` }}
                  style={styles.avatar}
                />
              : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials}</Text></View>
            }
          </TouchableOpacity>

          <Text style={styles.name}>{profile.full_name || "Utilisateur"}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          {/* ✅ Badge rôle intelligent — un seul badge propre */}
          <View style={styles.pillsRow}>
            <Pill text={roleBadge.label} tone={roleBadge.tone} />
          </View>

          <StatusBadge label={monetStatus.label} type={monetStatus.type} />
        </View>

        {/* ── Monétisation Progress ── */}
        <Section title="Monétisation • Progression">
          <View style={{ gap: 10 }}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Profil complet</Text>
              <Text style={styles.progressMeta}>{progress.done}/{progress.total}</Text>
            </View>
            <ProgressBar value={progress.ratio} />
            <Row label="Compte à rebours (50 jours)" value={deadlineText} />
            <Row label="Inscription"  value={formatDateFR(profile.created_at)} />
            <Row label="Scellé le"    value={profile.profile_completed_at ? formatDateFR(profile.profile_completed_at) : "—"} />
            {!profile.monetization_enabled && progress.missing.length > 0 && (
              <View style={styles.missingCard}>
                <Text style={styles.missingTitle}>À compléter pour monétiser</Text>
                <Text style={styles.missingText}>
                  {progress.missing.slice(0,6).join(" • ")}
                  {progress.missing.length > 6 ? " • ..." : ""}
                </Text>
              </View>
            )}

            {/* ✅ Rappel coûts ACSET */}
            <View style={styles.acsetCostCard}>
              <Text style={styles.acsetCostTitle}>Coûts de modification</Text>
              <View style={styles.acsetCostRow}>
                <Text style={styles.acsetCostLabel}>Informations personnelles</Text>
                <Text style={styles.acsetCostValue}>10 ACSET</Text>
              </View>
              <View style={styles.acsetCostRow}>
                <Text style={styles.acsetCostLabel}>Photo de profil</Text>
                <Text style={styles.acsetCostValue}>25 ACSET</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* ── Identité RHAZN ── */}
        <Section title="Identité RHAZN">
          {/* ✅ RZ-ID :
               - Affiché  : 6 premiers chars masqués  ex: RZHA19••••••
               - Copié    : user_code complet immuable ex: RZHA19900513MDELABNUOY...
               - rz_id est un hash interne — jamais affiché */}
          <Row
            label="RZ-ID (public)"
            value={profile.user_code}
            copy
          />
          <Row label="Rôle"      value={roleBadge.label} />
          <Row label="Email"     value={profile.email} />
          <Row label="Téléphone" value={profile.phone} />
          <Row label="WhatsApp"  value={profile.whatsapp_phone} />
        </Section>

        {/* ── Informations personnelles ── */}
        <Section title="Informations personnelles">
          <Row label="Date naissance"    value={formatDateFR(profile.birth_date)} />
          <Row label="Sexe"              value={profile.sex} />
          <Row label="Ville naissance"   value={profile.birth_city} />
          <Row label="Pays naissance"    value={profile.birth_country} />
          <Row label="NIF"               value={profile.nif} />
          <Row label="Profession"        value={profile.profession} />
          <Row label="Statut matrimonial" value={profile.marital_status} />
          <Row label="Souvenir inoubliable" value={profile.premier_souvenir} />

        </Section>

        {/* ── Compte & BANQ ── */}
        <Section title="Compte & BANQ">
          <Row label="Monétisation"   value={monetStatus.label} />
          <Row label="Statut système" value={profile.account_status || "—"} />
          <Row label="Créateur"       value={profile.is_creator ? "Oui" : "Non"} />
          <Row label="Publications"   value={String(pubCount)} />
          <Row label="TAN (solde)"    value={`${formatMoney(wallet?.tan_balance)} TAN`} />
          <Row label="ACSET (solde)"  value={`${formatAcset(wallet?.acset_balance)} ACSET`} />
          <Row label="Wallet status"  value={wallet?.status || "—"} />
        </Section>

        {/* ── QR Code Placeholder ── */}
        <View style={styles.qrWrap}>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={56} color="#999" />
          </View>
          <Text style={styles.qrHint}>Code QR disponible dans la version complète</Text>
        </View>

      </ScrollView>

      {/* ── Modal photo ── */}
      <Modal visible={photoVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.photoCard}>
            {profile.avatar_url
              ? <Image
                  source={{ uri: `${profile.avatar_url}?v=${avatarVersion}` }}
                  style={styles.photoZoom}
                />
              : <View style={styles.photoFallback}><Text style={styles.initials}>{initials}</Text></View>
            }
            <TouchableOpacity onPress={() => setPhotoVisible(false)}>
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.bg },
  content:   { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 120 },
  boot:      { flex: 1, justifyContent: "center", alignItems: "center" },

  hero:           { alignItems: "center", marginBottom: 28 },
  avatar:         { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: COLORS.gold },
  avatarFallback: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.gold, justifyContent: "center", alignItems: "center" },
  initials:       { fontSize: 36, fontWeight: "900", color: COLORS.gold },
  name:           { fontSize: 22, fontWeight: "900", marginTop: 10, color: COLORS.text },
  email:          { color: COLORS.sub, marginBottom: 8 },

  badge:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 10 },
  badgeText: { fontWeight: "800", fontSize: 12 },

  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 },
  pill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  pillText: { fontWeight: "900", fontSize: 12 },

  sectionTitle: { color: COLORS.sub, fontSize: 12, fontWeight: "800", marginBottom: 8 },
  card:         { backgroundColor: COLORS.card, borderRadius: 18, padding: 14 },

  row:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, alignItems: "center" },
  rowLabel:  { color: COLORS.sub },
  rowValue:  { fontWeight: "700", color: COLORS.text },
  rzidValue: { fontWeight: "800", fontSize: 10, letterSpacing: 0.2, color: COLORS.gold, flexShrink: 1, textAlign: "right", lineHeight: 15 },
  copyBtn:   { width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  copyBtnDone:{ backgroundColor: "rgba(22,163,74,0.12)", borderColor: "rgba(22,163,74,0.35)" },

  primaryBtn:  { backgroundColor: COLORS.gold, padding: 15, borderRadius: 18, alignItems: "center", marginTop: 14 },
  primaryText: { color: "#000", fontWeight: "900" },
  secondaryBtn:  { backgroundColor: COLORS.card, padding: 15, borderRadius: 18, alignItems: "center", marginTop: 10 },
  secondaryText: { fontWeight: "800", color: COLORS.text },

  qrWrap: { alignItems: "center", marginTop: 28, marginBottom: 20 },
  qrPlaceholder: { width: 130, height: 130, backgroundColor: "#F5F5F7", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5EA", alignItems: "center", justifyContent: "center" },
  qrHint: { marginTop: 10, fontSize: 12, color: COLORS.sub, textAlign: "center" },

  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle:  { fontWeight: "900", color: COLORS.text },
  progressMeta:   { fontWeight: "900", color: COLORS.sub },
  progressWrap:   { gap: 6 },
  progressTrack:  { height: 10, borderRadius: 999, backgroundColor: "#00000010", overflow: "hidden" },
  progressFill:   { height: 10, borderRadius: 999, backgroundColor: COLORS.gold },
  progressText:   { fontWeight: "900", color: COLORS.sub, fontSize: 12 },

  missingCard:  { padding: 12, borderRadius: 14, backgroundColor: "#00000006", borderWidth: 1, borderColor: "#00000010" },
  missingTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 4, fontSize: 12 },
  missingText:  { color: COLORS.sub, fontWeight: "700", fontSize: 12, lineHeight: 16 },

  // ✅ Carte coûts ACSET
  acsetCostCard: {
    backgroundColor: "rgba(212,175,55,0.06)",
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(212,175,55,0.22)",
    gap: 6,
  },
  acsetCostTitle: { color: COLORS.gold, fontWeight: "900", fontSize: 12, marginBottom: 2 },
  acsetCostRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  acsetCostLabel: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  acsetCostValue: { color: COLORS.gold, fontSize: 12, fontWeight: "900" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" },
  photoCard:     { backgroundColor: "#FFF", padding: 26, borderRadius: 26, alignItems: "center", width: 300 },
  photoZoom:     { width: 240, height: 240, borderRadius: 30 },
  photoFallback: { width: 240, height: 240, borderRadius: 30, backgroundColor: COLORS.card, justifyContent: "center", alignItems: "center" },
  closeText:     { marginTop: 18, fontWeight: "800", color: COLORS.sub },
});