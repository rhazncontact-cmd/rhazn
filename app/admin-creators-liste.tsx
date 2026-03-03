import AdminProfileList from "./components/AdminProfileList";
import SecureScreen from "./components/SecureScreen";

export default function AdminCreators() {
  return (
    <SecureScreen scope="Admin-Creators">
      <AdminProfileList
        title="Utilisateurs créateurs"
        filter={{ is_creator: true }}
      />
    </SecureScreen>
  );
}
