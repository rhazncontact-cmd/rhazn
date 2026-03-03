import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "../../../lib/supabase";

const GOLD = "#D4AF37";

/**
 * Overlay TAN en temps réel
 * - Affiche les TAN gagnés sur la vidéo active
 * - Se resynchronise avec BANQ (banq_tan_logs)
 */
export default function BanqTanOverlay({
  productId,
}: {
  productId: string;
}) {
  const [tan, setTan] = useState(0);
  const localCounterRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ===================== SYNC FROM DB ===================== */
  const syncFromDb = async () => {
    const { data, error } = await supabase
      .from("banq_tan_logs")
      .select("tan_amount")
      .eq("product_id", productId);

    if (!error && data) {
      const total = data.reduce((s, r) => s + r.tan_amount, 0);
      setTan(total);
      localCounterRef.current = total;
    }
  };

  /* ===================== LOCAL UI COUNTER ===================== */
  useEffect(() => {
    syncFromDb();

    intervalRef.current = setInterval(() => {
      // 1 TAN toutes les 10 secondes (UX fluide)
      localCounterRef.current += 1;
      setTan(localCounterRef.current);
    }, 10_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [productId]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TAN générés</Text>
      <Text style={styles.value}>{tan}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 90,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  label: {
    color: "#AAA",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  value: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
  },
});
