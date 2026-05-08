import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  try {
    const { videoUrl, audioUrl, startSec } = await req.json();

    // 🔥 appel vers ton worker (à créer après)
    const response = await fetch("http://localhost:3000/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl,
        audioUrl,
        startSec,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
    });
  }
});