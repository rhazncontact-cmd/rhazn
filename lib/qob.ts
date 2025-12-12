// lib/qob.ts
import { supabase } from "./supabase";

export async function grantQOBAndAutoSubscribe(suspentzId: string) {
  try {
    const { error } = await supabase.rpc("grant_qob_and_auto_subscribe", {
      p_suspentz_id: suspentzId,
    });

    if (error) {
      console.log("QOB RPC error", error.message);
    }
  } catch (e) {
    console.log("QOB RPC exception", e);
  }
}
