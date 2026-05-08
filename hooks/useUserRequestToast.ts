import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useUserRequestToast(
  userUid: string | null,
  showToast: (msg: string) => void
) {
  useEffect(() => {
    if (!userUid) return;

    const channel = supabase
      .channel("rz-user-requests")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_requests",
          filter: `user_uid=eq.${userUid}`,
        },
        (payload) => {
          const status = payload.new.status;
          if (status === "approved") {
            showToast("✅ Demande approuvée");
          }
          if (status === "rejected") {
            showToast("❌ Demande refusée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userUid]);
}
