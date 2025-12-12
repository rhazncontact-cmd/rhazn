import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";
const ACSET_RATE = 250;

export default function RZAgentDashboard() {
  const router = useRouter();

  const [tanBalance, setTanBalance] = useState(0);
  const [acsetBalance, setAcsetBalance] = useState(0);
  const [infoVisible, setInfoVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------------------------------------
  // 🔐 INIT AGENT — WALLET — REALTIME (SANS AUCUNE REDIRECTION)
  // -----------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const initAgent = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const uid = session?.session?.user?.id;

        if (!uid) {
          // ❌ Aucune redirection — AgentGuard gère
          setLoading(false);
          return;
        }

        /* 1️⃣ Vérification du DERNIER statut Agent (SANS REDIRIGER) */
        const { data: agent } = await supabase
          .from("agent_applications")
          .select("status")
          .eq("user_uid", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!agent || agent.status !== "ACCEPTED") {
          // ❌ Zéro redirection
          // ✅ AgentGuard bloquera automatiquement
          setLoading(false);
          return;
        }

        /* 2️⃣ WALLET AGENT — Création auto si absent */
        const { data: wallet } = await supabase
          .from("agents_wallet")
          .select("*")
          .eq("agent_uid", uid)
          .maybeSingle();

        if (!wallet) {
          await supabase.from("agents_wallet").insert({
            agent_uid: uid,
            tan: 0,
            acset: 0,
          });
        }

        /* 3️⃣ Chargement Wallet */
        const loadWallet = async () => {
          const { data } = await supabase
            .from("agents_wallet")
            .select("*")
            .eq("agent_uid", uid)
            .single();

          if (mounted && data) {
            const tan = data.tan ?? 0;
            const acset = data.acset ?? Math.floor(tan / ACSET_RATE);

            setTanBalance(tan);
            setAcsetBalance(acset);
          }
        };

        await loadWallet();

        /* 4️⃣ REALTIME WALLET */
        channel = supabase
          .channel(`agent-wallet-${uid}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "agents_wallet",
              filter: `agent_uid=eq.${uid}`,
            },
            (payload) => {
              const newRow = payload.new;
              if (!newRow) return;

              const tan = newRow.tan ?? 0;
              const acset = newRow.acset ?? Math.floor(tan / ACSET_RATE);

              setTanBalance(tan);
              setAcsetBalance(acset);
            }
          )
          .subscribe();

        setLoading(false);
      } catch (e) {
        console.log("AGENT_DASHBOARD_INIT_ERROR:", e);
        setLoading(false);
      }
    };

    initAgent();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // -----------------------------------------------------------------------
  // 🧱 UI DASHBOARD AGENT
  // -----------------------------------------------------------------------
  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/dashboard")}
            style={styles.backButton}
          >
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>

          <Text style={styles.title}>Agent RHAZN</Text>

          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            style={styles.infoIcon}
          >
            <Ionicons
              name="information-circle-outline"
              size={28}
              color={GOLD}
            />
          </TouchableOpacity>
        </View>

        {/* SOLDE */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Solde Disponible</Text>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{tanBalance}</Text>
            <Text style={styles.balanceUnit}>TAN</Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{acsetBalance}</Text>
            <Text style={styles.balanceUnit}>ACSET</Text>
          </View>

          <Text style={styles.balanceNote}>
            1 ACSET = {ACSET_RATE} TAN{"\n"}
            Conversion automatique selon vos ventes.
          </Text>
        </View>

        {/* OPÉRATIONS */}
        <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          <Text style={styles.sectionTitle}>Opérations</Text>

          <View style={styles.grid}>
            <Tile
              title="Historique"
              icon={<MaterialIcons name="history" size={28} color="#FFD700" />}
              onPress={() => router.push("/agent-history")}
            />

            <Tile
              title="Recevoir Paiement"
              icon={<MaterialIcons name="payments" size={28} color="#4ade80" />}
              onPress={() => router.push("/agent-receive")}
            />

            <Tile
              title="Acheter ACSET (Admin)"
              icon={<MaterialIcons name="shopping-cart" size={28} color="#FFBC7E" />}
              onPress={() => router.push("/agent-buy-acset")}
            />

            <Tile
              title="Vente Présentielle ACSET"
              icon={<MaterialIcons name="sell" size={28} color="#38bdf8" />}
              onPress={() => router.push("/agent-direct-sale")}
            />
          </View>
        </ScrollView>

        {/* POPUP INFO */}
        <Modal
          transparent
          visible={infoVisible}
          animationType="fade"
          onRequestClose={() => setInfoVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setInfoVisible(false)}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                • L’Agent vend UNIQUEMENT les ACSET en présentiel.{"\n\n"}
                • Le paiement réel est fait directement au point de vente.{"\n\n"}
                • Le crédit ACSET est immédiat après validation.{"\n\n"}
                • Aucun ACSET n’est envoyé sans paiement réel.{"\n\n"}
                • Toutes les ventes sont historisées dans le système.
              </Text>
            </View>
          </Pressable>
        </Modal>
      </View>
    </AgentGuard>
  );
}

/* --------------------------------------------------------- */
/* 🧩 COMPOSANT TILE                                         */
/* --------------------------------------------------------- */
function Tile({ title, icon, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tile}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );
}

/* --------------------------------------------------------- */
/* 🎨 STYLES                                                 */
/* --------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },

  header: {
    paddingTop: 60,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  backButton: { padding: 6 },
  title: { color: GOLD, fontSize: 22, fontWeight: "900" },
  infoIcon: { padding: 6 },

  balanceCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderColor: "#333",
    borderWidth: 1,
    padding: 20,
    marginTop: 10,
  },

  balanceTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  balanceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 6 },

  balanceValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginRight: 8,
  },

  balanceUnit: { color: GOLD, fontSize: 18 },

  balanceNote: { color: "#aaa", marginTop: 10, fontSize: 12 },

  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 14,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  tile: {
    width: "48%",
    backgroundColor: "#111",
    paddingVertical: 18,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },

  iconWrap: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  tileText: { color: "#fff", fontSize: 13, textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  modalBox: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 12,
    borderColor: "#333",
    borderWidth: 1,
  },

  modalText: { color: "#fff", lineHeight: 22, fontSize: 14 },
});
