// context/UserContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

type Role = "user" | "agent";

type User = {
  id: string;
  name: string;
  role: Role;
};

type Ctx = {
  user: User;
  setRole: (r: Role) => void;
};

const UserContext = createContext<Ctx | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    id: "123",
    name: "Utilisateur",
    role: "agent", // 👉 mets "agent" pour tester le module Agent (sinon "user")
  });

  const value = useMemo(
    () => ({
      user,
      setRole: (r: Role) => setUser((u) => ({ ...u, role: r })),
    }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within <UserProvider>");
  return ctx;
};
