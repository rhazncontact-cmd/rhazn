// app/components/SecureScreen.tsx
// ✅ FINAL PRO — SecureScreen (RHAZN)
// - Fix: network errors must NOT redirect to contract
// - Contract redirect ONLY when profile fetch succeeds and contract_accepted_at is missing
// - Adds simple retry + timeout for stability on Android/Expo Go
// - Keeps biometrics → PIN fallback
// - Keeps Apple-like UI

import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

/* ===================== CONSTANTES ===================== */
const GOLD = "#D4AF37";
const TEMP_PIN = "1234"; // ⚠️ PIN TEMPORAIRE (À CHANGER EN PROD)
const PIN_LENGTH = 4;

// Réseau (Expo Go / Android): éviter les redirects abusifs
const CONTRACT_CHECK_TIMEOUT_MS = 4500;
const CONTRACT_CHECK_RETRY = 2; // 0..2 (donc 3 tentatives max)
const RETRY_DELAY_MS = 450;

/* 🍎 UI Apple-like — RHAZN */
const UI = {
  bg: "#000000",
  card: "#0E0E0E",
  card2: "#111111",
  text: "#FFFFFF",
  sub: "#A7A7AA",
  sub2: "#8E8E93",
  hairline: "rgba(255,255,255,0.08)",
  overlay: "rgba(0,0,0,0.70)",
};

type Props = {
  children: React.ReactNode;
  scope?: string; // ex: "Admin", "Wallet", "Profil", etc.
};

/* ===================== HELPERS ===================== */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error("timeout")), ms);
  });

  try {
    const res = await Promise.race([promise, timeout]);
    return res as T;
  } finally {
    clearTimeout(t);
  }
}

function looksLikeNetworkError(err: any) {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("fetch") ||
    msg.includes("socket") ||
    msg.includes("econn") ||
    msg.includes("dns")
  );
}

/* ====================================================== */
/* =================== COMPONENT ======================== */
/* ====================================================== */
export default function SecureScreen({ children, scope = "RHAZN" }: Props) {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const [booting, setBooting] = useState(true);

  // Network-state UI (no abusive redirects)
  const [netIssue, setNetIssue] = useState<string | null>(null);

  const hiddenInputRef = useRef<TextInput>(null);

  /* ===================== TEXTES CONTEXTUELS ===================== */
  const helperText = useMemo(
    () => ({
      title: `${scope} — Sécurité`,
      subtitle:
        "Pour continuer, confirmez votre identité.\n" +
        "La biométrie est indisponible ou a été refusée.",
      action: "Saisissez votre PIN de sécurité pour accéder à cet espace.",
    }),
    [scope]
  );

  /* ===================== SECURE ACCESS ===================== */
  useEffect(() => {
    let alive = true;

    const secureAccess = async () => {
      try {
        setBooting(true);
        setNetIssue(null);

        // 1) USER
        const authRes = await withTimeout(
          supabase.auth.getUser(),
          CONTRACT_CHECK_TIMEOUT_MS
        );

        const user = authRes?.data?.user;
        if (!user) {
          if (!alive) return;
          setBooting(false);
          router.replace("/auth/login");
          return;
        }

        // 2) CONTRACT CHECK (robust)
        // ✅ Redirect to contract ONLY if the fetch succeeds and contract is missing.
        // ❗ On network errors/timeouts: do NOT redirect (avoid false negatives)
        let profile: any = null;
        let profileError: any = null;

        for (let i = 0; i <= CONTRACT_CHECK_RETRY; i++) {
          try {
            const res = await withTimeout(
              supabase
                .from("profiles")
                .select("contract_accepted_at")
                .eq("id", user.id)
                .single(),
              CONTRACT_CHECK_TIMEOUT_MS
            );

            profile = res?.data ?? null;
            profileError = res?.error ?? null;

            // If no error, break (success path)
            if (!profileError) break;

            // If error but not network-like, break (real error)
            if (!looksLikeNetworkError(profileError)) break;
          } catch (e) {
            profileError = e;
            if (!looksLikeNetworkError(e)) break;
          }

          // network-like → retry a bit
          if (i < CONTRACT_CHECK_RETRY) await sleep(RETRY_DELAY_MS);
        }

        if (!alive) return;

        // If contract fetch succeeded (no error):
        if (!profileError) {
          if (!profile?.contract_accepted_at) {
            setBooting(false);
            router.replace("/legal/contract");
            return;
          }
        } else {
          // Network-like error → allow access temporarily (do NOT redirect)
          if (looksLikeNetworkError(profileError)) {
            setNetIssue(
              "Connexion instable : impossible de vérifier le contrat pour le moment."
            );
          } else {
            // Non-network error: do NOT send to contract by default; show warning but allow PIN/biometrics
            setNetIssue(
              "Impossible de vérifier le contrat (erreur serveur)."
            );
          }
        }

        // 3) BIOMETRICS / PIN
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: `Sécurité ${scope}`,
            fallbackLabel: "Utiliser le PIN",
            cancelLabel: "Annuler",
          });

          if (!alive) return;

          if (result.success) {
            setAuthorized(true);
            setPinRequired(false);
            setBooting(false);
            return;
          }
        }

        // Biometrics absent/refused → PIN
        setPinRequired(true);
        setBooting(false);
      } catch (e: any) {
        if (!alive) return;

        // On catch: never redirect to contract; show PIN fallback
        if (looksLikeNetworkError(e)) {
          setNetIssue(
            "Connexion instable : vérification impossible. Vous pouvez continuer via PIN."
          );
        }

        setPinRequired(true);
        setBooting(false);
      }
    };

    secureAccess();
    return () => {
      alive = false;
    };
  }, [scope, router]);

  /* ===================== PIN HANDLING ===================== */
  const onPinChange = (v: string) => {
    if (!/^\d*$/.test(v)) return;
    if (v.length > PIN_LENGTH) return;

    if (v.length > pin.length) {
      Haptics.selectionAsync();
    }

    setPin(v);

    if (v.length === PIN_LENGTH) {
      verifyPin(v);
    }
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      setCheckingPin(true);

      // ❗ PIN TEMPORAIRE (DEV)
      if (enteredPin !== TEMP_PIN) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Accès refusé", "PIN incorrect.");
        setPin("");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuthorized(true);
      setPinRequired(false);
    } finally {
      setCheckingPin(false);
    }
  };

  /* ===================== BOOT ===================== */
  if (booting) {
    return (
      <View style={styles.bootWrap}>
        <View style={styles.bootCard}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.bootTitle}>Sécurisation…</Text>
          <Text style={styles.bootText}>
            Vérification de votre identité en cours.
          </Text>

          {!!netIssue && (
            <Text style={styles.netWarn}>
              ⚠️ {netIssue}
            </Text>
          )}
        </View>
      </View>
    );
  }

  /* ===================== PIN MODAL ===================== */
  if (!authorized && pinRequired) {
    return (
      <Modal transparent visible animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{helperText.title}</Text>
            <Text style={styles.sheetSubtitle}>{helperText.subtitle}</Text>

            {!!netIssue && (
              <Text style={styles.netWarnModal}>
                ⚠️ {netIssue}
              </Text>
            )}

            <Text style={styles.sheetAction}>{helperText.action}</Text>

            {/* PIN DOTS */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => hiddenInputRef.current?.focus()}
              style={styles.pinDotsWrap}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pin.length > i && styles.pinDotFilled,
                  ]}
                />
              ))}
            </TouchableOpacity>

            {/* Hidden Input */}
            <TextInput
              ref={hiddenInputRef}
              value={pin}
              onChangeText={onPinChange}
              keyboardType="numeric"
              autoFocus
              maxLength={PIN_LENGTH}
              secureTextEntry
              style={styles.hiddenInput}
            />

            {checkingPin && (
              <ActivityIndicator color={GOLD} style={{ marginTop: 16 }} />
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() =>
                Alert.alert("Accès annulé", "Retour à l’espace utilisateur.", [
                  {
                    text: "OK",
                    onPress: () => router.replace("/user-space"),
                  },
                ])
              }
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  /* ===================== AUTORISÉ ===================== */
  return <>{children}</>;
}

/* ====================================================== */
/* =================== STYLES =========================== */
/* ====================================================== */
const styles = StyleSheet.create({
  bootWrap: {
    flex: 1,
    backgroundColor: UI.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  bootCard: {
    backgroundColor: UI.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: UI.hairline,
    padding: 24,
    alignItems: "center",
  },
  bootTitle: {
    color: UI.text,
    fontWeight: "900",
    marginTop: 14,
  },
  bootText: {
    color: UI.sub,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  netWarn: {
    marginTop: 12,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: UI.overlay,
    justifyContent: "center",
    padding: 22,
  },

  sheet: {
    backgroundColor: UI.card2,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: UI.hairline,
    padding: 22,
    alignItems: "center",
  },

  sheetTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  sheetSubtitle: {
    color: UI.sub,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  sheetAction: {
    color: UI.sub2,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },

  netWarnModal: {
    marginTop: 10,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 16,
  },

  pinDotsWrap: {
    flexDirection: "row",
    marginTop: 22,
    marginBottom: 10,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: UI.hairline,
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },

  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  cancelBtn: {
    marginTop: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: UI.text,
    fontWeight: "800",
  },
});
