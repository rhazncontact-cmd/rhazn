import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";

export default function Open() {
  const { email } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (email) {
      router.replace({
        pathname: "/auth/verify-code",
        params: { email },
      });
    }
  }, [email]);

  return null;
}
