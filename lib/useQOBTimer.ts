// lib/useQOBTimer.ts
import { useEffect, useRef, useState } from "react";
import { grantQOBAndAutoSubscribe } from "./qob";

export function useQOBTimer(suspentzId: string | null, isPlaying: boolean) {
  const [qobSent, setQobSent] = useState(false);
  const elapsed = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!suspentzId) return;

    if (isPlaying && !qobSent) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(async () => {
          elapsed.current += 1;

          // 🔥 SEUIL 10 SECONDES ININTERROMPUES
          if (elapsed.current >= 10 && !qobSent) {
            setQobSent(true);
            clearInterval(intervalRef.current!);
            intervalRef.current = null;

            await grantQOBAndAutoSubscribe(suspentzId);
          }
        }, 1000);
      }
    } else {
      // pause / stop : on remet le chrono à zéro
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      elapsed.current = 0;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [suspentzId, isPlaying, qobSent]);
}
