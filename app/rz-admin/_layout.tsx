import { Slot } from "expo-router";
import AdminGuard from "../components/AdminGuard";

export default function AdminLayout() {
  return (
    <AdminGuard>
      <Slot />
    </AdminGuard>
  );
}
