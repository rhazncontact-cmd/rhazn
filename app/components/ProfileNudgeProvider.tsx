import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

const EVERY_MS = 25 * 60 * 1000; // 25 minutes
const KEY_LAST_NUDGE = "rz_last_profile_nudge_ts";

export default function ProfileNudgeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const appState = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAppActive = useMemo(() => appState.current === "active", [appState.current]);

  // ✅ (Optionnel) config notifs
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  const isProfileComplete = async (uid: string) => {
    // 👉 Le plus simple: profile_completed_at non null = complet
    const { data, error } = await supabase
      .from("profiles")
      .select("profile_completed_at")
      .eq("id", uid)
      .single();

    if (error) return true; // fail-safe: pas de spam si erreur
    return !!data?.profile_completed_at;
  };

  const sendLocalNotif = async () => {
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== "granted") {
        const ask = await Notifications.requestPermissionsAsync();
        if (ask.status !== "granted") return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Identité RHAZN incomplète",
          body: "Complétez votre profil pour activer la monétisation et sécuriser votre compte.",
        },
        trigger: null, // immédiat
      });
    } catch {
      // ignore
    }
  };

  const nudgeIfNeeded = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    // ✅ throttle strict: pas plus d'une fois/25 min même si rerender
    const last = await AsyncStorage.getItem(KEY_LAST_NUDGE);
    const lastTs = last ? Number(last) : 0;
    if (Date.now() - lastTs < EVERY_MS) return;

    const complete = await isProfileComplete(uid);
    if (complete) return;

    await AsyncStorage.setItem(KEY_LAST_NUDGE, String(Date.now()));

    // ✅ si app active -> modal, sinon notif
    if (appState.current === "active") {
      setVisible(true);
    } else {
      await sendLocalNotif();
    }
  };

  useEffect(() => {
    // ✅ AppState listener
    const sub = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;
      // Quand l'utilisateur revient dans l'app, on peut re-check
      if (nextState === "active") nudgeIfNeeded();
    });

    // ✅ interval 25 min
    timerRef.current = setInterval(() => {
      nudgeIfNeeded();
    }, EVERY_MS);

    // ✅ check initial (après login)
    nudgeIfNeeded();

    return () => {
      sub.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <>
      {children}

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.card}>
            <Text style={styles.title}>Identité RHAZN incomplète</Text>
            <Text style={styles.msg}>
              Pour activer la monétisation et sécuriser votre compte, vous devez compléter votre profil.
            </Text>

            <View style={{ flexDirection: "row", marginTop: 14 }}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setVisible(false)}>
                <Text style={styles.btnGhostText}>Plus tard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnGold}
                onPress={() => {
                  setVisible(false);
                  router.push("/user-profile-edit");
                }}
              >
                <Text style={styles.btnGoldText}>Compléter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
  },
  title: { fontWeight: "900", fontSize: 16, textAlign: "center" },
  msg: { marginTop: 8, color: "#555", fontWeight: "700", textAlign: "center", lineHeight: 18 },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    alignItems: "center",
  },
  btnGhostText: { fontWeight: "900", color: "#111" },
  btnGold: {
    flex: 1,
    backgroundColor: "#D4AF37",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  btnGoldText: { fontWeight: "900", color: "#000" },
});