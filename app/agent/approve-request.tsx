// app/agent/approve-request.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v.trim()
  );
}

type RequestContext = {
  request_type: "withdraw" | "purchase";
  request_amount_tan: number;
  agent_wallet_balance: number;
  agent_commission_tan: number;
  supreme_share_tan: number;
  status: string;
};

export default function AgentApproveRequest() {
  const router = useRouter();
  const { request_id } = useLocalSearchParams<{ request_id?: string }>();

  const safeRequestId = useMemo(() => String(request_id ?? "").trim(), [request_id]);
  const requestIdOk = useMemo(() => isUuid(safeRequestId), [safeRequestId]);

  const [ctx, setCtx] = useState<RequestContext | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [confirmCode, setConfirmCode] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  /* ================= LOAD CONTEXT ================= */
  useEffect(() => {
    if (!requestIdOk) return;

    let mounted = true;

    (async () => {
      setLoadingCtx(true);
      const { data, error } = await supabase.rpc(
        "get_agent_request_context",
        { p_request_id: safeRequestId }
      );

      if (!mounted) return;

      if (error) {
        Alert.alert("Accès refusé", error.message);
        router.back();
        return;
      }

      setCtx(data as RequestContext);
      setLoadingCtx(false);
    })();

    return () => {
      mounted = false;
    };
  }, [safeRequestId, requestIdOk]);

  /* ================= APPROVE ================= */
  const approve = async () => {
    if (!requestIdOk || !ctx) return;

    setSending(true);
    try {
      const { error } = await supabase.rpc("agent_approve_withdraw_request", {
        p_request_id: safeRequestId,
        p_confirm_code: confirmCode.trim() || null,
        p_note: note.trim() || null,
      });

      if (error) {
        Alert.alert("Impossible", error.message);
        return;
      }

      Alert.alert(
        "✅ Transaction validée",
        "Les écritures ont été effectuées avec succès.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setSending(false);
    }
  };

  if (loadingCtx)
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={GOLD} />
      </View>
    );

  if (!ctx)
    return (
      <View style={styles.loader}>
        <Text style={{ color: "#999" }}>Demande introuvable</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Validation Agent</Text>

        <View style={styles.kv}>
          <Text style={styles.k}>Type</Text>
          <Text style={styles.v}>{ctx.request_type}</Text>
        </View>

        <View style={styles.kv}>
          <Text style={styles.k}>Montant demandé</Text>
          <Text style={styles.v}>{ctx.request_amount_tan} TAN</Text>
        </View>

        <View style={styles.kv}>
          <Text style={styles.k}>Votre commission</Text>
          <Text style={[styles.v, { color: GOLD }]}>
            +{ctx.agent_commission_tan} TAN
          </Text>
        </View>

        <View style={styles.kv}>
          <Text style={styles.k}>Votre solde actuel</Text>
          <Text style={styles.v}>{ctx.agent_wallet_balance} TAN</Text>
        </View>

        <TextInput
          placeholder="Code de confirmation (optionnel)"
          value={confirmCode}
          onChangeText={setConfirmCode}
          style={styles.input}
        />

        <TextInput
          placeholder="Note interne (optionnelle)"
          value={note}
          onChangeText={setNote}
          style={[styles.input, { height: 70 }]}
          multiline
        />

        <TouchableOpacity
          style={[styles.approveBtn, sending && { opacity: 0.7 }]}
          onPress={approve}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.approveText}>Approuver</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 64 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    margin: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: { color: "#FFF", fontSize: 18, fontWeight: "900", marginBottom: 14 },
  kv: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  k: { color: "rgba(255,255,255,0.55)", fontWeight: "700" },
  v: { color: "#FFF", fontWeight: "900" },
  input: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    color: "#FFF",
  },
  approveBtn: {
    marginTop: 18,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  approveText: { color: "#000", fontWeight: "900" },
});
