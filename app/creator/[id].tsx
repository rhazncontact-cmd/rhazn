import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Text,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function CreatorProfile() {
  const params = useLocalSearchParams();
  const rawId = params?.id;

  const creatorId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : null;

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.rpc(
          "get_creator_stats",
          { p_creator_id: creatorId }
        );

        if (!cancelled) {
          setStats(data ?? {});
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 26,
          fontWeight: "900",
        }}
      >
        Créateur RHAZN
      </Text>

      <Text
        style={{
          color: "#D4AF37",
          marginTop: 16,
          fontSize: 18,
          fontWeight: "800",
        }}
      >
        {stats?.followers ?? 0} abonnés
      </Text>

      <Text
        style={{
          color: "#fff",
          marginTop: 8,
          fontSize: 16,
        }}
      >
        {stats?.total_qob ?? 0} QOB cumulés
      </Text>
    </View>
  );
}
