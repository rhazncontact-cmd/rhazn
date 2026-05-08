import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type SessionCtx = {
  sessionReady: boolean;
  user: {
    id: string;
    email?: string | null;
  } | null;
};

const Ctx = createContext<SessionCtx>({
  sessionReady: false,
  user: null,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState<SessionCtx["user"]>(null);

  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        if (data?.session?.user?.id) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email,
          });
          setSessionReady(true);
        } else {
          setUser(null);
          setSessionReady(true);
        }
      } catch (e) {
        console.warn("Session bootstrap error:", e);
        setUser(null);
        setSessionReady(true);
      } finally {
        inFlightRef.current = false;
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      if (session?.user?.id) {
        setUser({
          id: session.user.id,
          email: session.user.email,
        });
        setSessionReady(true);
      } else {
        setUser(null);
        setSessionReady(true);
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{ sessionReady, user }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  return useContext(Ctx);
}
