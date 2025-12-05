import { Feather, MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";
import AgentGuard from "./components/AgentGuard";

const GOLD = "#D4AF37";
const ACSET_RATE = 250;

export default function AgentDirectSale() {
  const router = useRouter();

  const [userUid, setUserUid] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [sending, setSending] = useState(false);

  const [scanVisible, setScanVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // ✅ Permissions caméra
  const [permission, requestPermission] = useCameraPermissions();

  // ------------------------------------------------------
  // QR SCAN AVEC EXPO-CAMERA
  // ------------------------------------------------------
  const handleScan = ({ data }: { data: string }) => {
    setUserUid(data);
    setScanVisible(false);
  };

  // ------------------------------------------------------
  // CONFIRMATION → APPEL RPC
  // ------------------------------------------------------
  const confirmSale = async () => {
    const acset = parseInt(amount);

    if (!userUid || !acset || acset <= 0 || pin.length < 4) {
      Alert.alert(
        "Erreur",
        "ID utilisateur, quantité ACSET et PIN sont requis."
      );
      return;
    }

    setConfirmVisible(false);
    setSending(true);

    const { data, error } = await supabase.rpc("process_agent_direct_sale", {
      p_user_uid: userUid.trim(),
      p_amount_acset: acset,
      p_agent_pin: pin,
    });

    setSending(false);

    if (error) {
      Alert.alert("Erreur", error.message);
      return;
    }

    Alert.alert(
      "Vente réussie ✅",
      `ACSET : ${acset}\nCoût : ${acset * ACSET_RATE} TAN\nUtilisateur : ${userUid}`,
      [{ text: "OK", onPress: () => resetForm() }]
    );
  };

  const resetForm = () => {
    setUserUid("");
    setAmount("");
    setPin("");
  };

  return (
    <AgentGuard>
      <View style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={28} color={GOLD} />
          </TouchableOpacity>
          <Text style={styles.title}>Vente Présentielle ACSET</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* UTILISATEUR */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>ID / QR Utilisateur</Text>

          <View style={styles.row}>
            <TextInput
              value={userUid}
              onChangeText={setUserUid}
              placeholder="UID utilisateur"
              placeholderTextColor="#777"
              style={[styles.input, { flex: 1 }]}
            />

            <TouchableOpacity
              style={styles.scanBtn}
              onPress={async () => {
                if (!permission?.granted) {
                  const res = await requestPermission();
                  if (!res.granted) {
                    Alert.alert(
                      "Permission requise",
                      "Autorisez l'accès à la caméra pour scanner."
                    );
                    return;
                  }
                }
                setScanVisible(true);
              }}
            >
              <MaterialIcons name="qr-code-scanner" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* MONTANT */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>Quantité ACSET</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="ex: 5"
            placeholderTextColor="#777"
            style={styles.input}
          />

          {amount && (
            <Text style={styles.cost}>
              Coût : {parseInt(amount || "0") * ACSET_RATE} TAN
            </Text>
          )}
        </View>

        {/* PIN */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>PIN Agent (confirmation)</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            secureTextEntry
            placeholder="****"
            placeholderTextColor="#777"
            style={styles.input}
          />
        </View>

        {/* BOUTON */}
        <TouchableOpacity
          style={[styles.sellButton, sending && { opacity: 0.5 }]}
          onPress={() => setConfirmVisible(true)}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.sellText}>CONFIRMER LA VENTE</Text>
          )}
        </TouchableOpacity>

        {/* MODAL CONFIRMATION */}
        <Modal transparent visible={confirmVisible} animationType="fade">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setConfirmVisible(false)}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                Confirmer la vente ?{"\n\n"}
                Utilisateur : {userUid}{"\n"}
                ACSET : {amount}{"\n"}
                Coût : {parseInt(amount || "0") * ACSET_RATE} TAN
              </Text>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={confirmSale}
              >
                <Text style={styles.modalBtnText}>OUI, CONFIRMER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#444" }]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalBtnText}>ANNULER</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* ✅ MODAL SCAN AVEC EXPO-CAMERA */}
        <Modal transparent visible={scanVisible} animationType="fade">
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <CameraView
              style={{ flex: 1 }}
              onBarcodeScanned={({ data }) => handleScan({ data })}
            />

            <TouchableOpacity
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                backgroundColor: "#000",
                padding: 10,
                borderRadius: 20,
              }}
              onPress={() => setScanVisible(false)}
            >
              <Feather name="x" size={22} color={GOLD} />
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </AgentGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 18 },

  header: {
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  inputBox: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 14,
    borderColor: "#222",
    borderWidth: 1,
    marginBottom: 16,
  },

  label: { color: GOLD, marginBottom: 8, fontWeight: "700" },

  input: {
    backgroundColor: "#000",
    borderColor: "#333",
    borderWidth: 1,
    color: "#fff",
    borderRadius: 10,
    padding: 12,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },

  scanBtn: {
    backgroundColor: GOLD,
    padding: 12,
    borderRadius: 10,
  },

  cost: { color: GOLD, marginTop: 6 },

  sellButton: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  sellText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
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

  modalText: { color: "#fff", marginBottom: 20, textAlign: "center" },

  modalBtn: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  modalBtnText: { textAlign: "center", fontWeight: "800", color: "#000" },
});
