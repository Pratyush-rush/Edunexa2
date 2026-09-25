import { createClient } from "@supabase/supabase-js";
import env from "./env.config.js";

export function getSupabaseAdmin() {
    if (!env.supabaseUrl || !env.supabaseSecretKey) {
        throw new Error("Supabase server credentials are not configured.");
    }

    return createClient(env.supabaseUrl, env.supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
