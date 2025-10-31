import React from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

type Profile = { name: string; qob: number; avatar?: any };
type Pact = { id: string; title: string; views: number; thumbnail?: any };

type Props = {
  onSearch?: (q: string) => void;
  viewed?: Profile[];      // PACT visionnés
  metrics?: { subs: number; library: number; creations: number; acset: number };
  pacts?: Pact[];          // Tous les PACT
  onOpenPact?: (id: string) => void;
};

export default function ExplorerSection({
  onSearch,
  viewed = [],
  metrics = { subs: 0, library: 0, creations: 0, acset: 0 },
  pacts = [],
  onOpenPact,
}: Props) {
  return (
    <View style={styles.wrap}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Rechercher un PACT…"
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={styles.input}
          onChangeText={onSearch}
        />
      </View>

      {/* PACT visionnés */}
      <Text style={styles.h2}>👁️ PACT visionnés</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20 }}
        style={{ paddingLeft: 20, paddingVertical: 8 }}
      >
        {viewed.map((u, i) => (
          <Animated.View key={i} entering={FadeInUp.delay(i * 80)} style={styles.profileCard}>
            <View style={styles.profileImg}>
              {u.avatar ? (
                <Image source={u.avatar} style={styles.profileImgReal} />
              ) : (
                <View style={{ flex: 1, backgroundColor: "#222", borderRadius: 12 }} />
              )}
            </View>
            <Text style={styles.profileName}>{u.name}</Text>
            <Text style={styles.profileQob}>⚡ {u.qob}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Mon Monde */}
      <Text style={styles.h2}>🌍 Mon Monde</Text>
      <View style={styles.grid}>
        <MetricCard label="Abonnements" value={metrics.subs} />
        <MetricCard label="Ma Bibliothèque" value={metrics.library} />
        <MetricCard label="Mes Créations" value={metrics.creations} />
        <MetricCard label="Mes ACSET" value={metrics.acset} active />
      </View>

      {/* Tous les PACT */}
      <Text style={styles.h2}>⭐ Tous les PACT</Text>
      <View style={styles.pactGrid}>
        {pacts.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInUp.delay(i * 70)} style={styles.pactCard}>
            <TouchableOpacity onPress={() => onOpenPact?.(p.id)} activeOpacity={0.8}>
              <View style={styles.thumb}>
                {p.thumbnail ? (
                  <Image source={p.thumbnail} style={styles.thumbReal} />
                ) : (
                  <View style={{ flex: 1, backgroundColor: "#222", borderRadius: 12 }} />
                )}
                <View style={styles.badgeTime}><Text style={styles.badgeTimeTxt}>⏱ 60s</Text></View>
              </View>
              <Text style={styles.pactTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.pactViews}>👁️ {p.views}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function MetricCard({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, active && { color: "#4ade80" }]}>{value.toString().padStart(2, "0")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#000" },

  searchBar: {
    backgroundColor: "#1a1a1a",
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "rgba(212,175,55,0.18)",
    borderWidth: 1,
  },
  searchIcon: { color: "#D4AF37", fontSize: 16 },
  input: { color: "#fff", marginLeft: 8, fontSize: 16 },

  h2: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 22, marginBottom: 10, paddingHorizontal: 20 },

  profileCard: { width: 100, marginRight: 14, alignItems: "center" },
  profileImg: { width: 100, height: 100, borderRadius: 16, borderWidth: 1, borderColor: "rgba(212,175,55,0.4)", overflow: "hidden" },
  profileImgReal: { width: "100%", height: "100%" },
  profileName: { color: "#fff", fontSize: 12, marginTop: 6 },
  profileQob: { color: "#D4AF37", fontSize: 12 },

  grid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "rgba(212,175,55,0.35)",
  },
  cardLabel: { color: "#bbb", fontSize: 12 },
  cardValue: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 6 },

  pactGrid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingBottom: 24 },
  pactCard: {
    width: "48%",
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "rgba(212,175,55,0.35)",
    overflow: "hidden",
  },
  thumb: { width: "100%", height: 120, backgroundColor: "#151515", borderBottomWidth: 1, borderBottomColor: "#222", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  thumbReal: { width: "100%", height: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  badgeTime: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 0.5, borderColor: "rgba(212,175,55,0.45)" },
  badgeTimeTxt: { color: "#D4AF37", fontSize: 12, fontWeight: "700" },
  pactTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 8, paddingHorizontal: 10 },
  pactViews: { color: "#999", fontSize: 12, paddingHorizontal: 10, marginBottom: 10 },
});
