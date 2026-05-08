// hooks/useAgentPermissions.ts
import { useMemo } from "react";
import { useUser } from "../context/UserContext";

export default function useAgentPermissions() {
  const { user } = useUser();
  const isAgent = user.role === "agent";

  return useMemo(
    () => ({
      isAgent,
      canConvertTanToAcset: isAgent,
      canReceiveUserWithdrawals: isAgent,
      canBuyAcsetFromAdmin: isAgent,
      // Rappels (métier) : restrictions
      canShareTan: false,          // Agent ne peut pas partager TAN
      canPublishPact: false,       // Agent ne peut pas publier PACT
    }),
    [isAgent]
  );
}
