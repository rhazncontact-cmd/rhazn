console.log("SUPABASE_URL =", SUPABASE_URL);
console.log("KEY PREFIX =", SERVICE_ROLE_KEY.slice(0, 20));

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eGxjaGF5Z2Fyc3preWdteWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3ODAzOCwiZXhwIjoyMDc4OTU0MDM4fQ.5MVUwFGtTt5YhnndGKl2U_CwTOb965M7chbsggSjnLg";

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function refill() {
  console.log("⏳ Crédit du SUPREME WALLET en cours…");

  const { error } = await supabase.rpc("rz_apply_eco_transaction", {
    p_actor: "596fd84b-0c18-4d65-9c5a-afd55beffb36",
    p_target: "596fd84b-0c18-4d65-9c5a-afd55beffb36",
    p_category: "SYSTEM_SEED",
    p_context: "genesis",
    p_quantity: 5000000000,
  });

  if (error) {
    console.error("❌ ERREUR:", error);
    process.exit(1);
  }

  console.log("✅ SUCCÈS : 5 000 000 000 TAN crédités au SUPREME WALLET");
  process.exit(0);
}

refill();
