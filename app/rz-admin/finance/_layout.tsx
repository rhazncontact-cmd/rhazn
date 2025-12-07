import { Slot } from "expo-router";
import AdminGuard from "../../components/AdminGuard";

export default function RZAdminFinanceLayout() {
  return (
    <AdminGuard>
      <Slot />
    </AdminGuard>
  );
}
