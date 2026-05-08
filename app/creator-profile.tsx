import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SecureScreen from "../components/SecureScreen";
import { supabase } from "../lib/supabase";

const GOLD = "#D4AF37";

type Suspentz = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  qob_total: number;
  created_at: string;
};

export default function CreatorProfile() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const [creator, setCreator] = useState<any>(null);
  const [items, setItems] = useState<Suspentz[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);

  const channelRef = useRef<any>(null);

  // ---------- LOAD CREATOR ----------
  useEffect(() => {
    const load = async () => {
      if (!uid) return;

      const { data: creatorData } = await supabase
        .from("users")
        .select("uid, first_name, last_name, avatar_url, qob")
        .eq("uid", uid)
        .single();

      const { data: susData } = await supabase
        .from("suspentz")
        .select("id, title, thumbnail_url, qob_total, created_at")
        .eq("creator_uid", uid)
        .order("qob_total", { ascending: false });

      setCreator(creatorData);
      setItems(susData || []);
      setLoading(false);
    };

    load();
  }, [uid]);

  // ---------- REALTIME SUSPENTZ ----------
  useEffect(() => {
    channelRef.current = supabase
      .channel("creator-suspentz")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suspentz" },
        (payload) => {
          const s = payload.new as any;
          if (s.creator_uid !== uid) return;

          setItems((prev) => {
            const exists = prev.find((x) => x.id === s.id);
            if (exists) return prev.map((x) => (x.id === s.id ? s : x));
            return [s, ...prev].sort(
              (a, b) => b.qob_total - a.qob_total
            );
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current)
        supabase.removeChannel(channelRef.current);
    };
  }, [uid]);

  // ---------- FOLLOW ----------
  const toggleFollow = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userUid = auth?.user?.id;
    if (!userUid || !uid) return;

    if (followed) {
      await supabase
        .from("creator_followers")
        .delete()
        .eq("user_uid", userUid)
        .eq("creator_uid", uid);
    } else {
      await supabase
        .from("creator_followers")
        .insert({ user_uid: userUid, creator_uid: uid });
    }

    setFollowed(!followed);
  };

  if (loading)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );

  return (
    <SecureScreen scope="Créateur">
      <ScrollView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {creator.first_name} {creator.last_name}
          </Text>

          <TouchableOpacity onPress={toggleFollow}>
            <View style={[styles.followBtn, followed && styles.followed]}>
              <Text style={styles.followText}>
                {followed ? "Abonné" : "S’abonner"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* AVATAR */}
        <View style={styles.avatarBox}>
          <Image
            source={
              creator.avatar_url
                ? { uri: creator.avatar_url }
                : require("../assets/images/avatar7.png")
            }
            style={styles.avatar}
          />
          <Text style={styles.qob}>{creator.qob} QOB</Text>
        </View>

        {/* CREATIONS */}
        <Text style={styles.section}>Créations</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/banq?id=${item.id}`)}
            >
              <Image
                source={{
                  uri:
                    item.thumbnail_url ||
                    "https://via.placeholder.com/400",
                }}
                style={styles.image}
              />
              <View style={styles.overlay}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardQob}>
                  {item.qob_total} QOB
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SecureScreen>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 20 },

  boot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: { fontSize: 22, fontWeight: "900", color: GOLD },

  followBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  followed: {
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: GOLD,
  },

  followText: { fontWeight: "900", color: "#000" },

  avatarBox: { alignItems: "center", marginVertical: 20 },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: GOLD,
  },

  qob: { color: GOLD, marginTop: 8, fontWeight: "800" },

  section: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "800",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    height: 220,
    backgroundColor: "#111",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },

  image: { width: "100%", height: "100%" },

  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
  },

  cardTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  cardQob: { color: GOLD, fontSize: 12 },
});
