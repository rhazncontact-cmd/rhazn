// supabase/functions/send-rz-communication-push/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { title, body, target_audience } = await req.json().catch(() => ({}));

  if (!title || !body) {
    return new Response("Missing title or body", { status: 400 });
  }

  const audience =
    target_audience === "agents" || target_audience === "users"
      ? target_audience
      : "all";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN") || "";

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1️⃣ Récupérer tous les tokens
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_uid, expo_push_token");

  if (subsError || !subs || subs.length === 0) {
    return new Response(JSON.stringify({ ok: false, reason: "no-subs" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2️⃣ Récupérer les utilisateurs qui sont Agents (APPROVED)
  const { data: agents, error: agentsError } = await supabase
    .from("agent_applications")
    .select("user_uid")
    .eq("status", "APPROVED");

  if (agentsError) {
    console.log("AGENTS_ERROR:", agentsError);
  }

  const agentSet = new Set((agents || []).map((a: any) => a.user_uid));

  // 3️⃣ Filtrer selon la cible
  const filtered = subs.filter((s) => {
    if (audience === "all") return true;
    const isAgent = agentSet.has(s.user_uid);
    if (audience === "agents") return isAgent;
    if (audience === "users") return !isAgent;
    return true;
  });

  if (filtered.length === 0) {
    return new Response(JSON.stringify({ ok: false, reason: "no-target" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = filtered.map((s) => ({
    to: s.expo_push_token,
    sound: "default",
    title,
    body,
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ ok: true, count: filtered.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
