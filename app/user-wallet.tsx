// app/user-wallet.tsx
// ✅ FINAL PRO — TAN-only wallet (Apple-like / RHAZN)
// - ACSET card kept (publish credits)
// - Publish / Consume cards removed
// - ACSET badge under title (real server balance)
// - TAN only (no seconds logic)
// - Premium floating TAN card (big numbers safe)
// - ✅ HTG conversion card (net fees)
// - ✅ ACSET earning law: each paid content → +0.08 ACSET (backend only)
// - ✅ QOB handled backend-side (no UI mutation here)
// - ✅ TAN-only wallet (no time / seconds logic anywhere)

import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  /* ✅ AJOUTS CRITIQUES (clavier + modal Android fix) */
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

import { supabase } from "../lib/supabase";
import RzPinLock from "./components/RzPinLock";

/* ===================== PALETTE APPLE-LIKE ===================== */
const BG = "#FFFFFF";
const CARD = "#F6F7F9";
const SOFT = "#E5E5EA";
const TEXT = "#111111";
const MUTED = "#6E6E73";
const GOLD = "#D4AF37";

/* ===================== CONVERSION TAN → HTG ===================== */
const TAN_TO_HTG_RATE = 0.5;      // 1 TAN = 0.5 HTG
const WITHDRAW_FEE_RATE = 0.30;   // 30% frais totaux

/* ===================== TYPES ===================== */
type Wallet = {
  tan_balance: number;        // 💰 monnaie réelle
  acset_balance: number;     // 🎟️ crédits de publication (non monétaire)
};

export default function WalletUtilisateurRHAZN() {
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet>({
    tan_balance: 0,
    acset_balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);

  /* ===================== FORMAT TAN ===================== */
  const tanLabel = useMemo(() => {
    try {
      return wallet.tan_balance.toLocaleString("fr-FR");
    } catch {
      return String(wallet.tan_balance);
    }
  }, [wallet.tan_balance]);

  /* ===================== CONVERSION HTG ===================== */
  const htgBrut = useMemo(() => {
    return wallet.tan_balance * TAN_TO_HTG_RATE;
  }, [wallet.tan_balance]);

  const htgNet = useMemo(() => {
    return htgBrut * (1 - WITHDRAW_FEE_RATE);
  }, [htgBrut]);

  const htgNetLabel = useMemo(() => {
    try {
      return htgNet.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return String(htgNet.toFixed(2));
    }
  }, [htgNet]);

  /* ===================== IMMERSIVE ===================== */
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBehaviorAsync("overlay-swipe");
  }, []);

  /* ===================== SWIPE ===================== */
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 15 || Math.abs(g.dy) > 15,
    onPanResponderMove: (_, g) => {
      if (g.dx < -80) router.back();
      if (g.dy < -80 && Platform.OS === "android")
        BackHandler.exitApp();
    },
  });

  /* ===================== LOAD WALLET ===================== */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const uid = session?.user?.id;

        if (!uid) {
          console.warn("Wallet load: no session yet");
          if (mounted) setLoading(false);
          return;
        }

        /* SAFE (no crash if 0 row) */
        let { data } = await supabase
          .from("wallets")
          .select("tan_balance, acset_balance")
          .eq("user_id", uid)
          .maybeSingle();

        /* auto create wallet if missing */
        if (!data) {
          await supabase.rpc("ensure_wallet");

          const { data: retry } = await supabase
            .from("wallets")
            .select("tan_balance, acset_balance")
            .eq("user_id", uid)
            .single();

          data = retry;
        }

        if (mounted && data) {
          setWallet({
            tan_balance: Number(data.tan_balance || 0),
            acset_balance: Number(data.acset_balance || 0),
          });
        }

        console.log("WALLET LOAD OK:", data);

      } catch (e) {
        console.error("Wallet load error:", e);

      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  /* ===================== REALTIME ===================== */
  useEffect(() => {
    let channel: any;

    const subscribe = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const uid = session?.user?.id;
      if (!uid) {
        console.warn("Realtime wallet: no session yet");
        return;
      }

      channel = supabase
        .channel("wallet-user-realtime")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallets",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const newTan = Number(payload.new.tan_balance || 0);
            const newAcset = Number(payload.new.acset_balance || 0);

            setWallet({
              tan_balance: newTan,
              acset_balance: newAcset,
            });

            console.log("WALLET REALTIME UPDATE:", newTan, newAcset);
          }
        )
        .subscribe();
    };

    subscribe();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /* ===================== LOADING ===================== */
  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator color={GOLD} />
        <Text
          style={{
            color: MUTED,
            marginTop: 10,
            fontWeight: "800",
          }}
        >
          Chargement du wallet…
        </Text>
      </View>
    );
  }

  /* ===================== RENDER ===================== */
return (
  <RzPinLock>

    <Animated.View
      style={[styles.container]}
      {...panResponder.panHandlers}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* HEADER */}
      <View style={styles.headerZen}>
        <View>
          <Text style={styles.titleZen}>Wallet</Text>

          <View style={styles.acsetBadge}>
            <Text style={styles.acsetBadgeText}>
              {wallet.acset_balance} ACSET disponibles pour publier
            </Text>
          </View>

          <Text style={styles.acsetRuleText}>
            🎁 Chaque contenu payé valide → +0,08 ACSET (automatique)
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.push("/user-dashboard")}>
          <Image
            source={require("../assets/images/rhazn-logo.png")}
            style={{ width: 36, height: 36 }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: 150,
          paddingBottom: 170,
        }}
      >
        {/* TAN */}
        <View style={styles.tanFloatWrap}>
          <View style={styles.tanFloatCard}>
            <Text style={styles.tanLabel}>TAN</Text>
            <Text style={styles.tanValue}>{tanLabel}</Text>
          </View>
        </View>

        {/* HTG */}
        <View style={styles.tanFloatWrap}>
          <View style={[styles.tanFloatCard, styles.htgCard]}>
            <Text style={styles.tanLabel}>≈ Solde HTG (net frais)</Text>
            <Text style={styles.htgValue}>{htgNetLabel} HTG</Text>
            <Text style={styles.htgSub}>
              1 TAN = 0.5 HTG • Frais retrait 30%
            </Text>
          </View>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          <MenuCard
            icon={<Feather name="send" size={24} color={GOLD} />}
            label="Envoyer TAN"
            onPress={() => router.push("/user-send-tan")}
          />
          <MenuCard
            icon={<MaterialIcons name="payments" size={24} color={GOLD} />}
            label="Achat / Retrait - TAN"
            onPress={() => router.push("/user-agent-access")}
          />
          <MenuCard
            icon={<Ionicons name="time-outline" size={24} color={MUTED} />}
            label="Historique"
            onPress={() => router.push("/user-history")}
          />
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal
        visible={gateOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "center" }}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Solde TAN insuffisant</Text>

                <Text style={styles.modalText}>
                  Rechargez via un Agent RHAZN.
                </Text>

                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  activeOpacity={0.9}
                  onPress={() => {
                    setGateOpen(false);
                    setTimeout(() => {
                      router.replace("/user-agent-access");
                    }, 120);
                  }}
                >
                  <Text style={styles.modalPrimaryText}>
                    Trouver un Agent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalGhostBtn}
                  activeOpacity={0.9}
                  onPress={() => setGateOpen(false)}
                >
                  <Text style={styles.modalGhostText}>Fermer</Text>
                </TouchableOpacity>

              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </Animated.View>

  </RzPinLock>
);

}

/* ===================== UI COMPONENT ===================== */
function MenuCard({

  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuCard}
      activeOpacity={0.86}
    >
      {icon}
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },

  headerZen: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    paddingTop: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  titleZen: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "700",
  },

  acsetBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    marginTop: 6,
  },
  acsetBadgeText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "900",
  },

  acsetRuleText: {
    marginTop: 6,
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },

  tanFloatWrap: {
    marginHorizontal: 20,
    marginBottom: 14,
  },

  tanFloatCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  htgCard: {},

  tanLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  tanValue: {
    color: TEXT,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },

  htgValue: {
    color: "#1C1C1E",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },

  htgSub: {
    marginTop: 6,
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  menuCard: {
    width: "48%",
    backgroundColor: CARD,
    paddingVertical: 18,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SOFT,
    alignItems: "center",
  },

  menuText: {
    color: TEXT,
    fontSize: 13,
    marginTop: 6,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SOFT,
    padding: 18,
  },
  modalTitle: {
    color: GOLD,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  modalText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  modalPrimaryBtn: {
    marginTop: 14,
    backgroundColor: "rgba(212,175,55,0.95)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 13,
  },
  modalGhostBtn: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: SOFT,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  modalGhostText: {
    color: MUTED,
    fontWeight: "900",
    fontSize: 13,
  },

  /* PIN */

pinOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  alignItems: "center",
},

pinCard: {
  backgroundColor: "#FFF",
  width: 300,
  borderRadius: 22,
  padding: 24,
  alignItems: "center",
},

pinTitle: {
  fontSize: 16,
  fontWeight: "900",
  marginBottom: 18,
  color: TEXT,
},

pinGrid: {
  width: "100%",
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},

pinKey: {
  width: 70,
  height: 58,
  borderRadius: 16,
  backgroundColor: CARD,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 10,
},

pinKeyText: {
  fontSize: 20,
  fontWeight: "900",
  color: TEXT,
},

});