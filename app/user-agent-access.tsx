// ======================================================
// RHAZN — AGENT ACCESS (PREMIUM APPLE-LIKE EDITION)
// UI luxe • Toast intelligent • Boutons premium actifs
// ✅ FIX: validation agent fiable (RPC get_agent_by_code)
// ✅ FIX: plus d' "Accès refusé" fantôme (attend la réponse)
// ✅ FIX: trims + upper + remove espaces invisibles
// ======================================================

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";
const BG = "#000";

/* ======================================================
🔥 TOAST APPLE-LIKE
====================================================== */
function useRzToast() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;

  const show = (t: string, m: string) => {
    setTitle(t);
    setMsg(m);
    setVisible(true);

    opacity.setValue(0);
    ty.setValue(8);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(ty, { toValue: 8, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }, 4200);
  };

  const node = visible ? (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY: ty }] }]}>
      <Text style={styles.toastTitle}>{title}</Text>
      <Text style={styles.toastMsg}>{msg}</Text>
    </Animated.View>
  ) : null;

  return { show, node };
}

export default function UserAgentAccess() {
  const router = useRouter();
  const toast = useRzToast();

  const [code, setCode] = useState("");
  const [loadingBuy, setLoadingBuy] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  /* 🧠 auto-repair profil (inchangé) */
  useEffect(() => {
    (async () => {
      try {
        await supabase.rpc("ensure_my_profile");
      } catch {}
    })();
  }, []);

  /* ======================================================
     ✅ Normalize code (anti espaces / tirets invisibles)
  ====================================================== */
  const normalizeAgentCode = (input: string) => {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ""); // supprime TOUT sauf lettres/chiffres
};

  const resolveAndGo = async (mode: "buy" | "withdraw") => {
    const raw = normalizeAgentCode(code);

    if (!raw) {
      toast.show(
        "Code requis",
        "Diagnostic : aucun code agent.\nSolution : saisissez le code fourni par votre agent (ex: ED-123456)."
      );
      return;
    }

    try {
      mode === "buy" ? setLoadingBuy(true) : setLoadingWithdraw(true);

      /* ======================================================
         🔥 SOURCE OF TRUTH = RPC get_agent_by_code(p_code)
         (évite bug .single() + RLS + 0 row)
      ====================================================== */
      const { data, error } = await supabase.rpc("get_agent_by_code", { p_code: raw });

      if (error) throw error;

      const agentId = (data as any)?.agent_id ?? null;
      if (!agentId) {
        toast.show(
          "Accès refusé",
          "Diagnostic : code agent invalide ou inactif.\nSolution : vérifiez le code auprès de l’agent."
        );
        return;
      }

      const pathname = mode === "buy" ? "/user-buy-acset-request" : "/user-withdraw-request";

      router.push({
  pathname,
  params: {
    ed_id: String(agentId),
    ed_code: raw,
  },
});

    } catch (e: any) {
      // log utile sans casser UI
      console.log("Agent resolve error:", e?.message ?? e);

      toast.show(
        "Accès refusé",
        "Diagnostic : code agent invalide ou inactif.\nSolution : vérifiez le code auprès de l’agent."
      );
    } finally {
      setLoadingBuy(false);
      setLoadingWithdraw(false);
    }
  };

  const canSubmit = normalizeAgentCode(code).length > 0;

  return (
    <View style={styles.container}>
      {toast.node}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Accès Agent RHAZN</Text>
        <Text style={styles.sub}>Entrez le code fourni par votre agent certifié</Text>

        {/* CARD PREMIUM */}
        <View style={styles.card}>
          <View style={styles.inputBox}>
            <Feather name="hash" size={18} color="#888" />
            <TextInput
              placeholder="ED-123456"
              placeholderTextColor="#666"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loadingBuy && !loadingWithdraw}
              returnKeyType="done"
            />
          </View>

          {/* ACHETER */}
          <Pressable
            style={[styles.goldBtn, (!canSubmit || loadingWithdraw) && { opacity: 0.5 }]}
            disabled={!canSubmit || loadingWithdraw}
            onPress={() => resolveAndGo("buy")}
          >
            {loadingBuy ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Acheter TAN</Text>}
          </Pressable>

          {/* 🔥 RETRAIT ACTIVÉ PREMIUM */}
          <Pressable
            style={[styles.blueBtn, (!canSubmit || loadingBuy) && { opacity: 0.5 }]}
            disabled={!canSubmit || loadingBuy}
            onPress={() => resolveAndGo("withdraw")}
          >
            {loadingWithdraw ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Retrait TAN</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* ======================================================
STYLES PREMIUM
====================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  content: {
    paddingTop: 80,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  title: {
    color: GOLD,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
  },

  sub: {
    color: "#888",
    marginBottom: 30,
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: 20,
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 18,
  },

  input: {
    flex: 1,
    color: "#FFF",
    marginLeft: 8,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },

  goldBtn: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 12,
  },

  blueBtn: {
    backgroundColor: "#4FC3F7",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  btnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },

  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.92)",
    borderWidth: 1,
    borderColor: GOLD,
    zIndex: 999,
  },
  toastTitle: { color: "#FFF", fontWeight: "900" },
  toastMsg: { color: "#CCC", marginTop: 4 },
});
