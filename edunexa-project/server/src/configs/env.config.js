import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(currentDir, "../..");
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(serverRoot, ".env") });

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    clientUrl: process.env.CLIENT_URL || "http://localhost:3001",
    adminCode: process.env.ADMIN_CODE?.trim().toUpperCase(),
    jwtSecret: process.env.JWT_SECRET || "change-this-jwt-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    supabaseJwksUrl: process.env.SUPABASE_JWKS_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
};

export default env;
