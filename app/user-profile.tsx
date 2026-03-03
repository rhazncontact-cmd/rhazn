// app/user-profile.tsx  (UI PROFIL IMPÉRIAL • RHAZN)
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import QRCode from "react-native-qrcode-svg";
import { supabase } from "../lib/supabase";

/* ================= PALETTE APPLE PREMIUM ================= */

const COLORS = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#111111",
  sub: "#6E6E73",
  green: "#16A34A",
  orange: "#F59E0B",
  red: "#DC2626",
  gold: "#D4AF37",
};

/* ================= HELPERS ================= */

const safeText = (v: any) => {
  if (v === null || v === undefined) return "";
  return String(v);
};

const formatDateFR = (d: any) => {
  if (!d) return "—";
  // Accept: YYYY-MM-DD, ISO, timestamp
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return safeText(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
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
  const num = Number(n);
  if (Number.isNaN(num)) return safeText(n);
  // ACSET peut être numeric décimal : on garde 2 décimales max sans trailing .00
  const fixed = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  return fixed.replace(/\.00$/, "");
};

const calcSecondsLeft = (createdAt: any, profileCompletedAt: any) => {
  if (!createdAt) return 0;
  if (profileCompletedAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  const deadline = created + 50 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return Math.max(0, Math.floor((deadline - now) / 1000));
};

const prettyCountdown = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0j 00:00:00";
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${days}j ${hh}:${mm}:${ss}`;
};

const Row = ({ label, value, copy }: any) => {
  const handleCopy = async () => {
    if (!copy || !value) return;

    await Clipboard.setStringAsync(String(value));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // mini feedback visuel console (pro dev)
    console.log("📋 Copié :", value);
  };

  return (
    <TouchableOpacity
      activeOpacity={copy ? 0.7 : 1}
      onPress={handleCopy}
      style={styles.row}
    >
      <Text style={styles.rowLabel}>{label}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={[styles.rowValue, copy && styles.rzidValue]}
          numberOfLines={copy ? 2 : 1}
          ellipsizeMode="tail"
        >
          {value || "—"}
        </Text>

        {copy && (
          <TouchableOpacity onPress={handleCopy} hitSlop={10}>
            <Feather name="copy" size={16} color={COLORS.gold} />
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

function Pill({ text, tone }: { text: string; tone: "ok" | "pending" | "bad" | "gold" }) {
  const map: any = {
    ok: COLORS.green,
    pending: COLORS.orange,
    bad: COLORS.red,
    gold: COLORS.gold,
  };
  const c = map[tone] || COLORS.sub;

  return (
    <View style={[styles.pill, { backgroundColor: c + "20", borderColor: c + "55" }]}>
      <Text style={[styles.pillText, { color: c }]}>{text}</Text>
    </View>
  );
}

function StatusBadge({ label, type }: any) {
  const map: any = {
    ok: COLORS.green,
    pending: COLORS.orange,
    bad: COLORS.red,
  };

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

  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [photoVisible, setPhotoVisible] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(0);

  /* ================= LOAD PROFILE ================= */

const loadProfile = async () => {
  const { data: auth } = await supabase.auth.getUser();
console.log("AUTH USER 👉", auth?.user);
console.log("AUTH EMAIL 👉", auth?.user?.email);
console.log("AUTH ID 👉", auth?.user?.id);
  const uid = auth?.user?.id;

  if (!uid) {
    setProfile(null);
    setLoading(false);
    return;
  }

  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single();

  const { data: w } = await supabase
    .from("wallets")
    .select("tan_balance, acset_balance, status, updated_at")
    .eq("user_id", uid)
    .single();

  setProfile(p);
  setWallet(w || null);
  setLoading(false);

  setSecondsLeft(calcSecondsLeft(p?.created_at, p?.profile_completed_at));
};

/* ===== CHARGE AU PREMIER LOAD ===== */
useEffect(() => {
  loadProfile();
}, []);

/* ===== RELOAD AUTO QUAND ON REVIENT SUR L'ÉCRAN ===== */
useFocusEffect(
  useCallback(() => {
    loadProfile();
  }, [])
);

  useEffect(() => {
    if (!profile) return;

    // Tick countdown each second for imperial UI
    const t = setInterval(() => {
      setSecondsLeft(calcSecondsLeft(profile?.created_at, profile?.profile_completed_at));
    }, 1000);

    return () => clearInterval(t);
  }, [profile?.created_at, profile?.profile_completed_at]);

  const initials = profile?.full_name?.[0]?.toUpperCase() || "R";

  const monetStatus = useMemo(() => {
    if (!profile) return { label: "—", type: "pending" as const };

    if (profile.account_status === "PAUSED") return { label: "Compte en pause", type: "bad" as const };

    return profile.monetization_enabled
      ? { label: "Monétisation activée", type: "ok" as const }
      : { label: "Monétisation désactivée", type: "pending" as const };
  }, [profile]);

  const cadnaBadge = useMemo(() => {
    const s = safeText(profile?.cadna_status);
    if (!s) return { label: "CADNA: —", type: "pending" as const };
    if (s === "approved") return { label: "CADNA: Vérifié", type: "ok" as const };
    if (s === "rejected") return { label: "CADNA: Rejeté", type: "bad" as const };
    return { label: "CADNA: En validation", type: "pending" as const };
  }, [profile?.cadna_status]);

  const roleLabel = useMemo(() => {
    const r = safeText(profile?.role).toUpperCase();
    if (!r) return "MEMBRE";
    return r;
  }, [profile?.role]);

  // Monétisation progress based on required fields
  const progress = useMemo(() => {
    if (!profile) return { ratio: 0, done: 0, total: 0, missing: [] as string[] };

    // Champs requis (alignés avec ta logique)
    const required: Array<{ key: string; label: string; ok?: (v: any) => boolean }> = [
      { key: "full_name", label: "Nom complet" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "whatsapp_phone", label: "WhatsApp" },
      { key: "nif", label: "NIF" },
      { key: "profession", label: "Profession" },
      { key: "marital_status", label: "Statut matrimonial" },
      { key: "birth_date", label: "Date naissance" },
      { key: "sex", label: "Sexe" },
      { key: "birth_city", label: "Ville naissance" },
      { key: "birth_country", label: "Pays naissance" },
      { key: "avatar_url", label: "Photo profil" },
      { key: "premier_souvenir", label: "Premier souvenir" },
    ];

    const isFilled = (v: any) => !!safeText(v).trim();

    const missing: string[] = [];
    let done = 0;

    for (const f of required) {
      const v = (profile as any)[f.key];
      const ok = f.ok ? f.ok(v) : isFilled(v);
      if (ok) done += 1;
      else missing.push(f.label);
    }

    const total = required.length;
    const ratio = total === 0 ? 0 : done / total;
    return { ratio, done, total, missing };
  }, [profile]);

  const deadlineText = useMemo(() => {
    if (!profile?.created_at) return "—";
    if (profile?.profile_completed_at) return "Scellé";
    return prettyCountdown(secondsLeft);
  }, [profile?.created_at, profile?.profile_completed_at, secondsLeft]);

  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );

  if (!profile) return null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ================= HERO ================= */}
        <View style={styles.hero}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhotoVisible(true);
            }}
          >
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.name}>{profile.full_name || "Utilisateur"}</Text>
          <Text style={styles.email}>{profile.email}</Text>

          {/* Badges premium */}
          <View style={styles.pillsRow}>
            <Pill text={roleLabel} tone={roleLabel === "SUPREME" ? "gold" : "pending"} />
            <Pill text={cadnaBadge.label} tone={cadnaBadge.type === "ok" ? "ok" : cadnaBadge.type === "bad" ? "bad" : "pending"} />
          </View>

          <StatusBadge label={monetStatus.label} type={monetStatus.type} />
        </View>

        {/* ================= MONETIZATION PROGRESS (IMPERIAL) ================= */}
        <Section title="Monétisation • Progression">
          <View style={{ gap: 10 }}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Profil complet</Text>
              <Text style={styles.progressMeta}>
                {progress.done}/{progress.total}
              </Text>
            </View>

            <ProgressBar value={progress.ratio} />

            <Row label="Compte à rebours (50 jours)" value={deadlineText} />
            <Row label="Inscription" value={formatDateFR(profile.created_at)} />
            <Row label="Scellé le" value={profile.profile_completed_at ? formatDateFR(profile.profile_completed_at) : "—"} />

            {/* Missing fields hint (compact, premium) */}
            {!profile.monetization_enabled && progress.missing.length > 0 && (
              <View style={styles.missingCard}>
                <Text style={styles.missingTitle}>À compléter pour monétiser</Text>
                <Text style={styles.missingText}>
                  {progress.missing.slice(0, 6).join(" • ")}
                  {progress.missing.length > 6 ? " • ..." : ""}
                </Text>
              </View>
            )}
          </View>
        </Section>

        {/* ================= IDENTITY ================= */}
        <Section title="Identité RHAZN">
          <Row label="RZ-ID (public)" value={profile.user_code} copy />
          <Row label="Rôle" value={profile.role || "Membre"} />
          <Row label="Email" value={profile.email} />
          <Row label="Téléphone" value={profile.phone} />
          <Row label="WhatsApp" value={profile.whatsapp_phone} />
        </Section>

        {/* ================= PERSONAL ================= */}
        <Section title="Informations personnelles">
          <Row label="Date naissance" value={formatDateFR(profile.birth_date)} />
          <Row label="Sexe" value={profile.sex} />
          <Row label="Ville naissance" value={profile.birth_city} />
          <Row label="Pays naissance" value={profile.birth_country} />

          <Row label="NIF" value={profile.nif} />
          <Row label="Profession" value={profile.profession} />
          <Row label="Statut matrimonial" value={profile.marital_status} />

          <Row label="Premier souvenir" value={profile.premier_souvenir} />
          <Row label="Souvenir inversé" value={profile.premier_souvenir_rev} />
        </Section>

        {/* ================= ACCOUNT ================= */}
        <Section title="Compte & BANQ">
          <Row label="Monétisation" value={monetStatus.label} />
          <Row label="Statut système" value={profile.account_status || "—"} />
          <Row label="Créateur" value={profile.is_creator ? "Oui" : "Non"} />

          <Row label="TAN (solde)" value={`${formatMoney(wallet?.tan_balance)} TAN`} />
          <Row label="ACSET (solde)" value={`${formatAcset(wallet?.acset_balance)} ACSET`} />
          <Row label="Wallet status" value={wallet?.status || "—"} />
        </Section>

        {/* ================= ACTIONS ================= */}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/identity-warning")}>
          <Text style={styles.primaryText}>Modifier le profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/user-security-pin")}>
          <Text style={styles.secondaryText}>Changer le PIN</Text>
        </TouchableOpacity>

        <View style={styles.qrWrap}>
          <QRCode value={`https://rhazn.com/u/${profile.user_code}`} size={130} />
        </View>
      </ScrollView>

      {/* ================= MODAL PHOTO ================= */}
      <Modal visible={photoVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.photoCard}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.photoZoom} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.initials}>{initials}</Text>
              </View>
            )}

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

  content: {
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 120,
  },

  boot: { flex: 1, justifyContent: "center", alignItems: "center" },

  hero: { alignItems: "center", marginBottom: 28 },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },

  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },

  initials: { fontSize: 36, fontWeight: "900", color: COLORS.gold },

  name: { fontSize: 22, fontWeight: "900", marginTop: 10, color: COLORS.text },
  email: { color: COLORS.sub, marginBottom: 8 },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 10,
  },

  badgeText: { fontWeight: "800", fontSize: 12 },

  pillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 8,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },

  pillText: { fontWeight: "900", fontSize: 12 },

  sectionTitle: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  rowLabel: { color: COLORS.sub },
  rowValue: { fontWeight: "700", color: COLORS.text },

  primaryBtn: {
    backgroundColor: COLORS.gold,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 14,
  },

  primaryText: { color: "#000", fontWeight: "900" },

  secondaryBtn: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },

  secondaryText: { fontWeight: "800", color: COLORS.text },

  qrWrap: { alignItems: "center", marginTop: 28 },

  /* Progress */
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: { fontWeight: "900", color: COLORS.text },
  progressMeta: { fontWeight: "900", color: COLORS.sub },

  progressWrap: { gap: 6 },

  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#00000010",
    overflow: "hidden",
  },

  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },

  progressText: { fontWeight: "900", color: COLORS.sub, fontSize: 12 },

  missingCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#00000006",
    borderWidth: 1,
    borderColor: "#00000010",
  },

  missingTitle: { fontWeight: "900", color: COLORS.text, marginBottom: 4, fontSize: 12 },
  missingText: { color: COLORS.sub, fontWeight: "700", fontSize: 12, lineHeight: 16 },

  /* MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },

  photoCard: {
    backgroundColor: "#FFF",
    padding: 26,
    borderRadius: 26,
    alignItems: "center",
    width: 300,
  },

  photoZoom: {
    width: 240,
    height: 240,
    borderRadius: 30,
  },

  photoFallback: {
    width: 240,
    height: 240,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    marginTop: 18,
    fontWeight: "800",
    color: COLORS.sub,
  },

  rzidValue: {
  maxWidth: 210,
  textAlign: "right",
  fontWeight: "900",
  letterSpacing: 0.6,
},
});