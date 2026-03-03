import AdminProfileList from "./components/AdminProfileList";
import SecureScreen from "./components/SecureScreen";

export default function AdminCadna() {
  return (
    <SecureScreen scope="Admin-CADNA">
      <AdminProfileList title="CADNA" filter={{ role: "cadna" }} />
    </SecureScreen>
  );
}
