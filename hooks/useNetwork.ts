// hooks/useNetwork.ts

import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });

    return () => sub();
  }, []);

  return isOnline;
}