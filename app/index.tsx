// ======================================================
// RHAZN — ROOT ENTRY (FINAL FINTECH ARCHITECTURE)
// ======================================================

import AuthGate from "./AuthGate";
import { AuthProvider } from "./AuthProvider";

export default function Index() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
