import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

export default function CADNAReview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suspentz, setSuspentz] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("suspentz")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      setSuspentz(data || []);
    }

    setLoading(false);
  };

  // ✅ APPROBATION
  const approve = async (id: string) => {
    setProcessingId(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("suspentz")
      .update({
        status: "approved",
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setProcessingId(null);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      fetchPending();
    }
  };

  // ❌ REJET
  const reject = async (id: string) => {
    setProcessingId(id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("suspentz")
      .update({
        status: "rejected",
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setProcessingId(null);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      fetchPending();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-left" size={28} color={GOLD} />
        </TouchableOpacity>
        <Text style={styles.title}>CADNA — Validation</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={GOLD} />
      ) : (
        <FlatList
          data={suspentz}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: item.thumbnail_path || undefined }}
                style={styles.thumb}
              />

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.creator}>Créateur : {item.creator_uid}</Text>
              <Text style={styles.price}>
                Exposition : {item.exposure_pric} TAN
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.approve]}
                  onPress={() => approve(item.id)}
                  disabled={processingId === item.id}
                >
                  <Text style={styles.btnText}>APPROUVER</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.reject]}
                  onPress={() => reject(item.id)}
                  disabled={processingId === item.id}
                >
                  <Text style={styles.btnText}>REJETER</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

/* =========== STYLES ============ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: GOLD, fontSize: 20, fontWeight: "900" },

  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 18,
  },

  thumb: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#000",
  },

  cardTitle: { color: GOLD, fontSize: 16, fontWeight: "800" },
  creator: { color: "#888", fontSize: 12, marginTop: 4 },
  price: { color: "#aaa", marginTop: 4 },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  approve: { backgroundColor: "#22c55e", marginRight: 10 },
  reject: { backgroundColor: "#dc2626" },

  btnText: { color: "#000", fontWeight: "900" },
});
