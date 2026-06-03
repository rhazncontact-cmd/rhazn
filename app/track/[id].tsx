// app/track/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

export default function TrackDeepLink() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();

  useEffect(() => {
    // Redirige vers l'écran musique avec le bon track
    if (id) {
      router.replace(`/(tabs)/music?trackId=${id}`);
    } else {
      router.replace("/");
    }
  }, [id]);

  return null;
}