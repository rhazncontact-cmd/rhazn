import { Stack } from "expo-router";
import AdminGuard from "../components/AdminGuard";

export default function AdminGovernanceLayout() {
  return (
    <AdminGuard>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AdminGuard>
  );
}
