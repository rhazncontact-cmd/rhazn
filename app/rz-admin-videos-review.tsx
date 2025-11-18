// app/rz-admin-videos-review.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type VideoItem = {
  id: string;
  user: string;
  title: string;
  duration: number; // seconds
  thumb: string;
  qob: number;
  views: number;
};

export default function RZAdminVideoReview() {
  const router = useRouter();

  // --- Data (mock) ---
  const [videos, setVideos] = useState<VideoItem[]>([
    { id: "v1", user: "User001", title: "PACT — Créativité Sincère", duration: 45, thumb: "https://picsum.photos/200?1", qob: 0, views: 0 },
    { id: "v2", user: "User002", title: "PACT — Authenticité Pure", duration: 38, thumb: "https://picsum.photos/200?2", qob: 0, views: 0 },
    { id: "v3", user: "User003", title: "PACT — Vertu & Naturel", duration: 52, thumb: "https://picsum.photos/200?3", qob: 0, views: 0 },
  ]);
  const [approved, setApproved] = useState<number>(0);
  const [rejected, setRejected] = useState<number>(0);

  const pending = useMemo(() => videos.length, [videos]);

  // --- Modal state (no animated pointerEvents) ---
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [current, setCurrent] = useState<VideoItem | null>(null);

  const modal = useRef(new Animated.Value(0)).current; // opacity & scale driver

  const openModal = (item: VideoItem) => {
    setCurrent(item);
    setModalVisible(true);
    Animated.timing(modal, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const closeModal = () => {
    Animated.timing(modal, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setCurrent(null);
        setProgress(0);
        setPlaying(false);
      }
    });
  };

  // --- Fake player controls for preview ---
  const [progress, setProgress] = useState<number>(0); // 0..1
  const [playing, setPlaying] = useState<boolean>(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const startPlay = () => {
    if (!current) return;
    setPlaying(true);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + 1 / Math.max(1, current.duration);
        if (np >= 1) {
          clearInterval(progressRef.current!);
          progressRef.current = null;
          setPlaying(false);
          return 1;
        }
        return np;
      });
    }, 1000);
  };

  const pausePlay = () => {
    setPlaying(false);
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  };

  const rewind5 = () => setProgress((p) => Math.max(0, p - (current ? 5 / current.duration : 0.12)));
  const forward5 = () => setProgress((p) => Math.min(1, p + (current ? 5 / current.duration : 0.12)));

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // --- Approve / Reject ---
  const handleApprove = (id: string) => {
    setVideos((arr) => arr.filter((v) => v.id !== id));
    setApproved((a) => a + 1);
    if (current?.id === id) closeModal();
  };

  const handleReject = (id: string) => {
    setVideos((arr) => arr.filter((v) => v.id !== id));
    setRejected((r) => r + 1);
    if (current?.id === id) closeModal();
  };

  // --- Modal animated styles ---
  const modalBackdropStyle = {
    opacity: modal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [{ scale: modal.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }) }],
  };

  const modalCardStyle = {
    opacity: modal,
    transform: [{ scale: modal.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Validation Flux — Revue</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statsBar}>
          <StatBadge label="En attente" value={pending} />
          <StatBadge label="Validées" value={approved} />
          <StatBadge label="Rejetées" value={rejected} />
        </View>
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>Tout est validé !</Text>
            <Text style={styles.emptyText}>Aucune vidéo en attente de revue. Excellent travail, administrateur.</Text>
          </View>
        ) : (
          videos.map((v) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.row}>
                <Image source={{ uri: v.thumb }} style={styles.thumb} />
                <View style={{ flex: 1 }}>
                  <View style={styles.userRow}>
                    <Text style={styles.userName}>{v.user}</Text>
                    <Text style={styles.userBadge}>PACT</Text>
                  </View>
                  <Text style={styles.meta}>⏱ {v.duration}s   👁 {v.views}   ✨ QOB {v.qob}</Text>
                  <Text style={styles.title}>{v.title}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.btnPreview]} onPress={() => openModal(v)}>
                  <Text style={styles.btnPreviewTxt}>👁️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleApprove(v.id)}>
                  <Text style={styles.btnTxt}>✓ Valider</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleReject(v.id)}>
                  <Text style={styles.btnTxt}>✗ Rejeter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL */}
      {isModalVisible && (
        <Animated.View
          // IMPORTANT: pointerEvents en string, pas animé
          pointerEvents={isModalVisible ? "auto" : "none"}
          style={[styles.modal, modalBackdropStyle]}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeModal} />

          <Animated.View style={[styles.modalCard, modalCardStyle]}>
            {/* Video preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewIcon}>🎬</Text>
            </View>

            <Text style={styles.modalUser}>{current?.user}</Text>
            <Text style={styles.modalInfo}>
              {current?.title}{"\n"}
              <Text style={{ color: "#FFD700" }}>Durée : {current?.duration ?? 0}s</Text>
            </Text>

            {/* Controls */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>

            <View style={styles.ctrlRow}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={rewind5}><Text style={styles.ctrlTxt}>⏪ -5s</Text></TouchableOpacity>
              {playing ? (
                <TouchableOpacity style={styles.ctrlBtn} onPress={pausePlay}><Text style={styles.ctrlTxt}>⏸ Pause</Text></TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.ctrlBtn} onPress={startPlay}><Text style={styles.ctrlTxt}>{progress >= 1 ? "▶ Rejouer" : "▶ Play"}</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={styles.ctrlBtn} onPress={forward5}><Text style={styles.ctrlTxt}>⏩ +5s</Text></TouchableOpacity>
            </View>

            {/* Decisions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.mBtn, styles.mClose]} onPress={closeModal}>
                <Text style={styles.mCloseTxt}>Fermer</Text>
              </TouchableOpacity>
              {current && (
                <>
                  <TouchableOpacity style={[styles.mBtn, styles.mApprove]} onPress={() => handleApprove(current.id)}>
                    <Text style={styles.mBtnTxt}>✓ Valider</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.mBtn, styles.mReject]} onPress={() => handleReject(current.id)}>
                    <Text style={styles.mBtnTxt}>✗ Rejeter</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

/* ---- Small components ---- */
const StatBadge = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statBadge}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* ---- Styles ---- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255,215,0,0.08)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { color: "#FFD700", fontSize: 18 },
  headerTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "700",
    textShadowColor: "rgba(255,215,0,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  statsBar: { flexDirection: "row", gap: 12 },
  statBadge: {
    flex: 1,
    backgroundColor: "rgba(26,26,26,0.8)",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: { color: "#FFD700", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  card: {
    backgroundColor: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" as any,
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  row: { flexDirection: "row", gap: 14 },
  thumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: "#333", backgroundColor: "#222" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  userName: { color: "#fff", fontWeight: "600", fontSize: 15 },
  userBadge: {
    color: "#4ade80",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(74,222,128,0.18)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
  },
  meta: { color: "#777", fontSize: 12, marginBottom: 4 },
  title: { color: "#aaa", fontSize: 13 },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPreview: {
    flex: 0.25,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.35)",
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  btnPreviewTxt: { color: "#FFD700", fontSize: 16, fontWeight: "700" },
  btnApprove: { backgroundColor: "#16a34a" },
  btnReject: { backgroundColor: "#dc2626" },
  btnTxt: { color: "#fff", fontWeight: "700" },

  // Modal
  modal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  modalCard: {
    width: "86%",
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  previewBox: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  previewIcon: { fontSize: 64, color: "#fff", opacity: 0.9 },

  modalUser: { color: "#FFD700", fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalInfo: { color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },

  progressBar: { height: 6, backgroundColor: "#1a1a1a", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#333", marginTop: 14 },
  progressFill: { height: "100%", backgroundColor: "#FFD700" },

  ctrlRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  ctrlBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  ctrlTxt: { color: "#fff", fontWeight: "700" },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  mBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  mClose: { backgroundColor: "#333" },
  mApprove: { backgroundColor: "#16a34a" },
  mReject: { backgroundColor: "#dc2626" },
  mCloseTxt: { color: "#fff", fontWeight: "700" },
  mBtnTxt: { color: "#fff", fontWeight: "700" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 72, opacity: 0.8 },
  emptyTitle: { color: "#4ade80", fontWeight: "800", fontSize: 20, marginTop: 10 },
  emptyText: { color: "#888", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 24, lineHeight: 20 },
});
