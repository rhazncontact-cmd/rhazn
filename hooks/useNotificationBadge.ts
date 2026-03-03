// hooks/useNotificationBadge.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useNotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let channel: any;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🔢 Compteur initial (non lues)
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_uid", user.id)
        .eq("is_read", false);

      setCount(count ?? 0);

      // 🔁 Temps réel
      channel = supabase
        .channel(`notif-badge-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_uid=eq.${user.id}`,
          },
          () => setCount((c) => c + 1)
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
