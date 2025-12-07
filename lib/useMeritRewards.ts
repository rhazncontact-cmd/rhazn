// lib/useMeritRewards.ts
import { useEffect, useState } from "react";
import type { RewardsSnapshot } from "../types/rewards";
import { supabase } from "./supabase";

export function useMeritDashboard() {
  const [current, setCurrent] = useState<RewardsSnapshot | null>(null);
  const [history, setHistory] = useState<RewardsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Dernière période (snapshot le plus récent)
        const { data: lastRows, error: lastErr } = await supabase
          .from("rewards_history")
          .select("*")
          .order("period_end", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastErr) throw lastErr;

        const last = (lastRows?.[0] ?? null) as RewardsSnapshot | null;

        // Historique (les 20 derniers)
        const { data: histRows, error: histErr } = await supabase
          .from("rewards_history")
          .select("*")
          .order("period_end", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (histErr) throw histErr;

        // Parse top10 JSON si présent
        if (last && last.top10 && typeof last.top10 === "string") {
          try {
            // @ts-ignore – Supabase peut renvoyer string ou object
            last.top10 = JSON.parse(last.top10) as any;
          } catch {
            // on ignore si ce n'est pas parseable
          }
        }

        setCurrent(last);
        setHistory((histRows ?? []) as RewardsSnapshot[]);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { current, history, loading, error };
}
