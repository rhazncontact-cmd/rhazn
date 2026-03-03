import AdminProfileList from "./components/AdminProfileList";
import SecureScreen from "./components/SecureScreen";

export default function AdminCad() {
  return (
    <SecureScreen scope="Admin-CAD">
      <AdminProfileList title="Conseil d’Administration (CAD)" filter={{ role: "cad" }} />
    </SecureScreen>
  );
}
