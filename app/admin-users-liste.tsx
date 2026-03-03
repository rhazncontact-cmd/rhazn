import AdminProfileList from "./components/AdminProfileList";
import SecureScreen from "./components/SecureScreen";

export default function AdminUsers() {
  return (
    <SecureScreen scope="Admin-Users">
      <AdminProfileList title="Utilisateurs" filter={{ role: "user" }} />
    </SecureScreen>
  );
}
