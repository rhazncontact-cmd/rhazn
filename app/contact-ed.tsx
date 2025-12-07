import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type ED = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  lat: number;
  lon: number;
  updated_at: string;
  is_certified: boolean;
  rating: number;
};

const GOLD = "#D4AF37";

export default function ContactED() {
  const router = useRouter();

  const [eds, setEds] = useState<ED[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  // ===================== LOCALISATION UTILISATEUR =====================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
        });
      } catch {}
    })();
  }, []);

  // ===================== FETCH AGENTS (EDS) =====================
  const fetchEds = async () => {
    try {
      setLoading(true);

      let query = supabase.from("eds").select("*").order("name");

      if (cityFilter.trim()) {
        query = query.ilike("city", `%${cityFilter}%`);
      }

      const { data } = await query;
      setEds((data as ED[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEds();
  }, [cityFilter]);

  // ===================== REALTIME =====================
  useEffect(() => {
    const channel = supabase
      .channel("eds-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eds" },
        (payload) => {
          const updated = payload.new as ED;
          setEds((current) =>
            current.map((ed) => (ed.id === updated.id ? { ...ed, ...updated } : ed))
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ===================== DISTANCE =====================
  const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isOnline = (updated_at: string) => {
    const last = new Date(updated_at).getTime();
    return (Date.now() - last) / 1000 <= 60;
  };

  // ===================== FILTRAGE =====================
  const filteredEds = useMemo(() => {
    let list = [...eds];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((ed) => ed.name.toLowerCase().includes(q));
    }

    if (userLocation) {
      list = list
        .map((ed) => ({
          ...ed,
          _distance: distanceKm(userLocation.lat, userLocation.lon, ed.lat, ed.lon),
        }))
        .sort((a: any, b: any) => {
          const ao = isOnline(a.updated_at);
          const bo = isOnline(b.updated_at);
          if (ao && !bo) return -1;
          if (!ao && bo) return 1;
          return (a._distance ?? 0) - (b._distance ?? 0);
        });
    }

    return list;
  }, [eds, search, userLocation]);

  // ===================== ACTIONS CONTACT =====================
  const openWhatsApp = (number: string | null) => {
    if (number) Linking.openURL(`https://wa.me/${number.replace("+", "")}`);
  };

  const callPhone = (number: string | null) => {
    if (number) Linking.openURL(`tel:${number}`);
  };

  // ===================== UI =====================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agents RHAZN</Text>
          <Text style={styles.subtitle}>Localisation & Contact Officiel</Text>
        </View>
        <Image source={require("../assets/images/rhazn-logo.png")} style={styles.logo} />
      </View>

      {/* FILTRES */}
      <View style={styles.filtersRow}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            placeholder="Rechercher un agent..."
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.searchWrapper}>
          <MaterialIcons name="location-city" size={18} color="#999" />
          <TextInput
            placeholder="Ville"
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={cityFilter}
            onChangeText={setCityFilter}
          />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={fetchEds}>
          <Feather name="filter" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      {/* LISTE AGENTS */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>Recherche des Agents...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {filteredEds.map((ed: any) => {
            const online = isOnline(ed.updated_at);
            const distanceLabel =
              userLocation && ed._distance != null
                ? `${ed._distance.toFixed(1)} km`
                : "Distance inconnue";

            return (
              <View key={ed.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.edName}>{ed.name}</Text>

                  {ed.is_certified && (
                    <View style={styles.certifiedBadge}>
                      <Feather name="check-circle" size={14} color="#000" />
                      <Text style={styles.certifiedText}>Certifié</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.distance}>
                  {distanceLabel} • {online ? "🟢 En ligne" : "⚪ Hors ligne"}
                </Text>

                <Text style={styles.rating}>⭐ {ed.rating?.toFixed(1) || "0.0"} / 5</Text>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: "#25D366" }]}
                    onPress={() => openWhatsApp(ed.whatsapp)}
                  >
                    <Feather name="message-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: GOLD }]}
                    onPress={() => callPhone(ed.phone)}
                  >
                    <Feather name="phone" size={18} color="#000" />
                    <Text style={[styles.btnText, { color: "#000" }]}>Appeler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20, paddingTop: 70 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { color: GOLD, fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#bbb", fontSize: 13 },
  logo: { width: 42, height: 42 },

  filtersRow: { flexDirection: "row", gap: 8, marginBottom: 16 },

  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#333",
    height: 44,
  },

  searchInput: { flex: 1, marginLeft: 6, color: "#fff" },

  searchBtn: {
    backgroundColor: GOLD,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  loading: { alignItems: "center", marginTop: 40 },
  loadingText: { color: "#aaa", marginTop: 10 },

  card: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 14,
  },

  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  edName: { color: GOLD, fontSize: 18, fontWeight: "700" },

  certifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  certifiedText: { fontSize: 10, fontWeight: "700", color: "#000", marginLeft: 4 },

  distance: { color: "#aaa", marginTop: 4 },
  rating: { color: GOLD, marginTop: 4, marginBottom: 6 },

  row: { flexDirection: "row", gap: 6 },

  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  btnText: { fontWeight: "700", color: "#fff" },
});
