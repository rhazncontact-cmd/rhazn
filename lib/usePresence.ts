// lib/usePresence.ts
// ✅ Gère la présence en temps réel de l'utilisateur
// ✅ Ping toutes les 30s quand l'app est au premier plan
// ✅ Marque "hors ligne" quand l'app passe en arrière-plan

import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "./supabase";

const PING_INTERVAL = 30_000; // 30 secondes

export function usePresence() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const ping = async () => {
    try {
      await supabase.rpc("ping_presence");
    } catch {}
  };

  const setOffline = async () => {
    try {
      await supabase.rpc("set_offline");
    } catch {}
  };

  const startPing = () => {
    ping(); // ping immédiat
    intervalRef.current = setInterval(ping, PING_INTERVAL);
  };

  const stopPing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setOffline();
  };

  useEffect(() => {
    // Démarrer au mount
    startPing();

    // Écouter les changements d'état de l'app
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === "active" && prev !== "active") {
        // App revenue au premier plan → reprendre le ping
        startPing();
      } else if (nextState !== "active" && prev === "active") {
        // App passée en arrière-plan → marquer hors ligne
        stopPing();
      }
    });

    return () => {
      sub.remove();
      stopPing();
    };
  }, []);
}