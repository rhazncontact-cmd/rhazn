// app/services/storeSignedUrl.ts
import { supabase } from "../../lib/supabase";

/**
 * 🔐 Génère une URL signée pour un fichier stocké
 */
export async function getStoreSignedUrl(
  path: string,
  expiresIn = 60
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("store")
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.warn("Signed URL error:", error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}


