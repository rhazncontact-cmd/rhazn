import AdminProfileList from "./components/AdminProfileList";
import SecureScreen from "./components/SecureScreen";

export default function AdminAgents() {
  return (
    <SecureScreen scope="Admin-Agents">
      <AdminProfileList title="Agents (ED)" filter={{ role: "agent" }} />
    </SecureScreen>
  );
}
