// app/services/storeSignedUrl.ts

import { supabase } from "../../lib/supabase";

type Kind = "preview" | "full" | "text";

export async function getStoreSignedUrl(
  productId: string,
  kind: Kind
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;

  if (!jwt) {
    throw new Error("Utilisateur non authentifié");
  }

  const res = await fetch(
    "https://<PROJECT_REF>.functions.supabase.co/signed-store-url",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        product_id: productId,
        kind,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Erreur Edge Function");
  }

  const json = await res.json();

  if (!json.allowed || !json.signed_url) {
    throw new Error("Accès refusé");
  }

  return json.signed_url;
}
