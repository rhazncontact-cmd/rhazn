import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { readFileSync } from "fs";

const configText = readFileSync("./app.config.ts", "utf-8");
const versionMatch = configText.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
const buildMatch   = configText.match(/APP_BUILD\s*=\s*(\d+)/);

if (!versionMatch || !buildMatch) { console.error("Version introuvable"); process.exit(1); }

const version     = versionMatch[1];
const buildNumber = parseInt(buildMatch[1], 10);
console.log("Version : " + version + " (build " + buildNumber + ")");

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: current } = await supabase.from("app_config").select("latest_version").eq("app", "rhazn").single();
if (current?.latest_version === version) { console.log("Deja a jour : " + version); process.exit(0); }

const { error } = await supabase.from("app_config").update({ latest_version: version, updated_at: new Date().toISOString() }).eq("app", "rhazn");
if (error) { console.error("Erreur : " + error.message); process.exit(1); }
console.log("Mis a jour : " + current?.latest_version + " vers " + version);