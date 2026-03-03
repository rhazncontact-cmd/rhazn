// app/user-send-tan.tsx
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import SecureScreen from "./components/SecureScreen";

const COLORS = {
  bg: "#000000",
  card: "#0F0F0F",
  card2: "#111111",
  stroke: "#1C1C1E",
  white: "#FFFFFF",
  gray: "#8E8E93",
  soft: "rgba(255,255,255,0.08)",
  gold: "#D4AF37",
  red: "#FF3B30",
  green: "#00C853",
};

// 🏦 RÈGLES TAN — LOGIQUE FINALE RHAZN (codées en dur)
const TRANSFER_MIN_TAN = 1000;
const TRANSFER_MAX_TAN_PER_DAY = 2_500_000;
const TAN_TRANSFER_FEE_PERCENT = 2;

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );

export default function UserSendTanScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [fromUid, setFromUid] = useState<string | null>(null);

  // 🔎 Recherche intelligente
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
  { id: string; user_code: string | null; email: string | null; phone: string | null }[]
>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [amountStr, setAmountStr] = useState("");

  

  const [todayUsed, setTodayUsed] = useState<number>(0);

  const [alert, setAlert] = useState<{ msg: string; kind: "ok" | "err" } | null>(
    null
  );

  const alertOpacity = useRef(new Animated.Value(0)).current;

  const showAlert = (msg: string, kind: "ok" | "err" = "err") => {
    setAlert({ msg, kind });
    alertOpacity.setValue(0);
    Animated.timing(alertOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(alertOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setAlert(null));
    }, 2600);
  };

  useEffect(() => {
    NavigationBar.setVisibilityAsync("visible").catch(() => {});
    NavigationBar.setBehaviorAsync("inset-swipe").catch(() => {});
  }, []);

  // 🔐 Load auth + rules + today usage
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id ?? null;

        if (!uid) {
          router.replace("/auth/login");
          return;
        }

        if (!mounted) return;
        setFromUid(uid);

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const { data: transfers } = await supabase
          .from("tan_transfers")
          .select("amount_tan, fee_tan, created_at")
          .gte("created_at", start.toISOString())
          .eq("from_uid", uid);

        const used =
          (transfers ?? []).reduce(
            (s, r: any) =>
              s + Number(r?.amount_tan ?? 0) + Number(r?.fee_tan ?? 0),
            0
          ) ?? 0;

        if (!mounted) return;
        setTodayUsed(used);
      } catch {
        showAlert(
          "Erreur de chargement.\nSolution : vérifiez votre connexion.",
          "err"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // 🔎 Suggestions ≥ 2 caractères (SAFE FINTECH)
useEffect(() => {
  if (sending) return; // 🔒 NE PAS FAIRE DE RPC PENDANT UN TRANSFERT

  let active = true;
  let timer: any;

  const run = async () => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const { data, error } = await supabase.rpc(
      "search_transfer_recipients_v2",
      { p_q: q }
    );

    if (!active) return;

    if (!error && data) {
      setSuggestions(data);
    } else {
      setSuggestions([]);
    }

    setSearching(false);
  };

  // debounce UX premium
  timer = setTimeout(run, 180);

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}, [query, sending]); // 👈 AJOUT sending ici


  const amount = useMemo(() => {
  const cleaned = amountStr.replace(/\D+/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}, [amountStr]);

  const fee = useMemo(() => {
  if (!amount) return 0;
  return Math.ceil((amount * TAN_TRANSFER_FEE_PERCENT) / 100);
}, [amount]);

  const total = useMemo(() => amount + fee, [amount, fee]);
  useEffect(() => {
  console.log("AMOUNT DEBUG", { amountStr, amount, fee, total });
}, [amountStr, amount, fee, total]);

  const remaining = useMemo(() => {
  return Math.max(0, TRANSFER_MAX_TAN_PER_DAY - todayUsed);
}, [todayUsed]);

  const canSubmit = useMemo(() => {
  if (sending) return false;
  if (!fromUid) return false;
  if (!selectedUid) return false;
  if (!amount || amount <= 0) return false;
  if (amount < TRANSFER_MIN_TAN) return false;
  if (total <= 0) return false;
  return true;
}, [sending, fromUid, selectedUid, amount, total, remaining]);

useEffect(() => {
  console.log("SUBMIT DEBUG", {
    fromUid,
    selectedUid,
    amount,
    fee,
    total,
    remaining,
    canSubmit,
  });
}, [fromUid, selectedUid, amount, fee, total, remaining, canSubmit]);



  const refreshTodayUsed = async () => {
    if (!fromUid) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { data: transfers } = await supabase
      .from("tan_transfers")
      .select("amount_tan, fee_tan, created_at")
      .gte("created_at", start.toISOString())
      .eq("from_uid", fromUid);

    const used =
      (transfers ?? []).reduce(
        (s, r: any) => s + Number(r?.amount_tan ?? 0) + Number(r?.fee_tan ?? 0),
        0
      ) ?? 0;

    setTodayUsed(used);
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showAlert("Sélectionnez un destinataire valide et un montant correct.", "err");
      return;
    }

    setSuggestions([]);
    setSearching(false);

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      if (!selectedUid) {
        showAlert(
          "Destinataire requis.\nSolution : sélectionnez un utilisateur dans la liste.",
          "err"
        );
        return;
      }

      const payload = {
  p_to_uid: selectedUid,
  p_amount_tan: Number(amount),
};

// 🔥 DEBUG FINTECH CRITIQUE — NE PAS SUPPRIMER POUR L’INSTANT
console.log("RECIPIENT DEBUG", {
  selectedUid,
  payload,
  recipient_id_sent: payload.p_to_uid,
});

const { data, error } = await supabase.rpc("user_send_tan", payload);

// 🔥 LOG FINTECH CRITIQUE
console.log("RPC user_send_tan RESULT", { data, error });

if (error) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  showAlert(
    `Échec du transfert.\n${error.message ?? "Erreur inconnue RPC."}`,
    "err"
  );
  return;
}

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showAlert("Transfert validé.", "ok");

      setAmountStr("");
      setQuery("");
      setSelectedUid(null);
      setSuggestions([]);

      await refreshTodayUsed();

      setTimeout(() => {
        router.back();
      }, 650);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showAlert("Erreur inattendue.\nSolution : vérifiez le RPC user_send_tan.", "err");
    } finally {
      setSending(false);
    }
  };

  return (
    <SecureScreen scope="Wallet">
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="chevron-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Envoyer TAN</Text>
            <Text style={styles.subtitle}>Transfert sécurisé · RHAZN</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/wallet-utilisateur")}
            style={styles.headerBtn}
          >
            <MaterialIcons name="account-balance-wallet" size={22} color={COLORS.gold} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.gold} />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ALERT */}
              {alert && (
                <Animated.View
                  style={[
                    styles.alertBox,
                    {
                      opacity: alertOpacity,
                      borderColor:
                        alert.kind === "ok"
                          ? "rgba(0,200,83,0.35)"
                          : "rgba(255,59,48,0.35)",
                    },
                  ]}
                >
                  <Ionicons
                    name={alert.kind === "ok" ? "checkmark-circle" : "alert-circle"}
                    size={18}
                    color={alert.kind === "ok" ? COLORS.green : COLORS.red}
                  />
                  <Text
                    style={[
                      styles.alertText,
                      { color: alert.kind === "ok" ? COLORS.green : COLORS.red },
                    ]}
                  >
                    {alert.msg}
                  </Text>
                </Animated.View>
              )}

              {/* CARD: INPUTS */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Destinataire</Text>

                <View style={styles.inputRow}>
                  <MaterialIcons name="person-outline" size={18} color={COLORS.gray} />
                  <TextInput
                    value={query}
                    onChangeText={(t) => {
                      setQuery(t);
                      setSelectedUid(null);
                    }}
                    placeholder="Code RHAZN, email ou téléphone"
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    editable={!sending}
                  />
                </View>

                {query.trim().length >= 2 && (
                  <View style={styles.suggestionsBox}>
                    {searching && (
                      <Text style={styles.suggestionMuted}>Recherche…</Text>
                    )}

                    {!searching && suggestions.length === 0 && (
                      <Text style={styles.suggestionMuted}>
                        Aucun utilisateur trouvé
                      </Text>
                    )}

                    {!searching &&
                      suggestions.map((u) => (
                        <TouchableOpacity
                          key={u.id}
                          style={styles.suggestionRow}
                          onPress={() => {
                            setQuery(
                             u.user_code ??
                             u.email ??
                             u.phone ??
                             "Utilisateur"
                       );

                            setSelectedUid(u.id);
                            setSuggestions([]);
                            Haptics.selectionAsync().catch(() => {});
                          }}
                        >
                          <Ionicons
                            name="person-circle-outline"
                            size={18}
                            color={COLORS.gold}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestionMain}>
  {u.user_code ?? "—"}
</Text>

                            <Text style={styles.suggestionSub}>
                              {u.email ?? u.phone ?? "—"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={[styles.cardTitle, { marginTop: 12 }]}>Montant</Text>

                <View style={styles.inputRow}>
                  <MaterialIcons name="payments" size={18} color={COLORS.gold} />
                  <TextInput
  value={amountStr}
  onChangeText={(t) => {
    const cleaned = t.replace(/\D+/g, "");
    setAmountStr(cleaned);
  }}
  placeholder="Montant TAN"
  placeholderTextColor={COLORS.gray}
  keyboardType="numeric"
  style={styles.input}
  editable={!sending}
/>
                </View>

                <View style={styles.previewBox}>
                  <RowLine
                    label="Frais admin"
                    value={`${fmt(fee)} TAN`}
                    accent={fee > 0 ? COLORS.gold : COLORS.gray}
                  />
                  <RowLine
                    label="Total débité"
                    value={`${fmt(total)} TAN`}
                    accent={COLORS.white}
                  />
                </View>
              </View>

              {/* CARD: LIMITS */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Limites</Text>

                <View style={styles.limitsGrid}>
                  <LimitPill
  label="Minimum"
  value={`${fmt(TRANSFER_MIN_TAN)} TAN`}
  icon="trending-up"
/>

<LimitPill
  label="Plafond / jour"
  value={`${fmt(TRANSFER_MAX_TAN_PER_DAY)} TAN`}
  icon="calendar-today"
/>
                  <LimitPill
                    label="Utilisé aujourd’hui"
                    value={`${fmt(todayUsed)} TAN`}
                    icon="history"
                  />
                  <LimitPill
                    label="Restant"
                    value={`${fmt(remaining)} TAN`}
                    icon="savings"
                  />
                </View>

                <Text style={styles.miniNote}>
                  Le plafond est calculé sur{" "}
                  <Text style={{ color: COLORS.white }}>montant + frais (2 %)</Text>.
                </Text>

              </View>

              {/* CTA */}
              <TouchableOpacity
                style={[
                  styles.cta,
                  !canSubmit && { opacity: 0.45 },
                  sending && { opacity: 0.65 },
                ]}
                onPress={onSubmit}
                disabled={!canSubmit || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="#000" />
                    <Text style={styles.ctaText}>Confirmer le transfert</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push("/user-history")}
                disabled={sending}
              >
                <Ionicons name="time-outline" size={18} color={COLORS.gray} />
                <Text style={styles.secondaryText}>Voir l’historique</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SecureScreen>
  );
}

/* ---------------- UI helpers ---------------- */

function RowLine({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.rowLine}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: accent ?? COLORS.white }]}>{value}</Text>
    </View>
  );
}

function LimitPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.pill}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialIcons name={icon} size={16} color={COLORS.gold} />
        <Text style={styles.pillLabel}>{label}</Text>
      </View>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingTop: 64,
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  subtitle: { color: COLORS.gray, fontSize: 12, marginTop: 2 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { color: COLORS.gray, fontSize: 12 },

  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  alertText: { fontSize: 13, fontWeight: "800", lineHeight: 18, flex: 1 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0B0B0B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.stroke,
    opacity: 0.8,
    marginVertical: 14,
  },

  suggestionsBox: {
    marginTop: 10,
    backgroundColor: COLORS.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    overflow: "hidden",
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.soft,
  },

  suggestionMain: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },

  suggestionSub: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 2,
  },

  suggestionMuted: {
    color: COLORS.gray,
    fontSize: 12,
    padding: 12,
    textAlign: "center",
  },

  previewBox: {
    marginTop: 14,
    backgroundColor: COLORS.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.soft,
    padding: 12,
  },
  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLabel: { color: COLORS.gray, fontSize: 12, fontWeight: "700" },
  rowValue: { color: COLORS.white, fontSize: 13, fontWeight: "900" },

  limitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    width: "48%",
    backgroundColor: "#0B0B0B",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    padding: 12,
  },
  pillLabel: { color: COLORS.gray, fontSize: 11, fontWeight: "700" },
  pillValue: { color: COLORS.white, fontSize: 13, fontWeight: "900", marginTop: 8 },

  miniNote: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 16,
  },

  cta: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.45)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  ctaText: { color: "#000", fontSize: 14, fontWeight: "900" },

  secondaryBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 30,
  },
  secondaryText: { color: COLORS.gray, fontSize: 13, fontWeight: "800" },
});
