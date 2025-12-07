// app/rz-admin/videos.tsx
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import AdminGuard from "../components/AdminGuard";

const GOLD = "#D4AF37";

type Pact = {
  id: string;
  uid: string;
  title: string;
  status: string;
  created_at: string;
};

export default function RZAdminVideos() {
  const router = useRouter();

  const [videos, setVideos] = useState<Pact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // bouton disabled
  const [err, setErr] = useState<string | null>(null);

  // ================================================================
  // 🔄 Load PENDING videos
  // ================================================================
  const loadPending = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("pacts")
        .select("id, uid, title, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVideos(data || []);
      setErr(null);
    } catch (e: any) {
      console.log("LOAD_VIDEOS_ERROR:", e);
      setErr("Impossible de charger les vidéos.");
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // 🔁 Realtime — auto-refresh
  // ================================================================
  useEffect(() => {
    loadPending();

    const channel = supabase
      .channel("videos-validation-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pacts" },
        loadPending
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ================================================================
  // 🟩 APPROVE
  // ================================================================
  const approve = async (id: string) => {
    setBusy(id);

    try {
      const { error } = await supabase
        .from("pacts")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.log("APPROVE_ERROR:", e);
    } finally {
      setBusy(null);
    }
  };

  // ================================================================
  // ❌ REJECT
  // ================================================================
  const reject = async (id: string) => {
    setBusy(id);

    try {
      const { error } = await supabase
        .from("pacts")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.log("REJECT_ERROR:", e);
    } finally {
      setBusy(null);
    }
  };

  // ================================================================
  // UI
  // ================================================================
  return (
    <AdminGuard>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={26} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Validation Flux-Vidéos</Text>

          <View style={{ width: 26 }} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={GOLD} size="large" />
          </View>
        )}

        {err && !loading && (
          <View style={styles.center}>
            <Text style={styles.error}>{err}</Text>
          </View>
        )}

        {!loading && !err && (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 50 }}
            style={{ marginTop: 20 }}
          >
            {videos.length === 0 && (
              <Text style={styles.empty}>Aucune vidéo en attente.</Text>
            )}

            {videos.map((v) => (
              <View key={v.id} style={styles.card}>
                <Text style={styles.videoTitle}>{v.title}</Text>
                <Text style={styles.videoSub}>UID : {v.uid}</Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btnApprove, busy === v.id && { opacity: 0.5 }]}
                    onPress={() => approve(v.id)}
                    disabled={busy === v.id}
                  >
                    {busy === v.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="check" size={20} color="#fff" />
                    )}
                    <Text style={styles.btnText}>Valider</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnReject, busy === v.id && { opacity: 0.5 }]}
                    onPress={() => reject(v.id)}
                    disabled={busy === v.id}
                  >
                    {busy === v.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="x" size={20} color="#fff" />
                    )}
                    <Text style={styles.btnText}>Rejeter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  error: { color: "#f87171", textAlign: "center", paddingHorizontal: 20 },

  empty: { color: "#777", textAlign: "center", marginTop: 20 },

  card: {
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 16,
  },

  videoTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  videoSub: { color: "#999", fontSize: 12, marginTop: 4 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  btnApprove: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  btnReject: {
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  btnText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
