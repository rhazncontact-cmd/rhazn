import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAgentBadge(agentUid: string | null) {
  const [count, setCount] = useState(0);

  const refresh = async () => {
    if (!agentUid) return;

    const { count } = await supabase
      .from("agent_requests")
      .select("*", { count: "exact", head: true })
      .eq("agent_uid", agentUid)
      .eq("status", "pending");

    setCount(count || 0);
  };

  useEffect(() => {
    if (!agentUid) return;

    refresh();

    const channel = supabase
      .channel("rz-agent-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_requests",
          filter: `agent_uid=eq.${agentUid}`,
        },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentUid]);

  return count;
}
