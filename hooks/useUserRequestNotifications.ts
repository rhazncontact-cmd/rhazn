// app/hooks/useUserRequestNotifications.ts
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export type ToastFn = (message: string) => void;

export function useUserRequestNotifications(
  userUid: string | null,
  showToast: ToastFn
) {
  useEffect(() => {
    if (!userUid) return;

    const channel = supabase
      .channel("rz-user-request-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_requests",
          filter: `user_uid=eq.${userUid}`,
        },
        (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;

          if (oldStatus === newStatus) return;

          if (newStatus === "approved") {
            showToast("✅ Demande approuvée");
          }

          if (newStatus === "rejected") {
            showToast("❌ Demande refusée");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userUid, showToast]);
}
