import env from "../configs/env.config.js";
import { getSupabaseAdmin } from "../configs/supabase.config.js";
import { signAccessToken } from "../utils/jwt.util.js";
import { validatePassword } from "./password.service.js";

export async function createAccount({ email, password, fullName, role, adminCode }) {
    if (!email?.trim() || !fullName?.trim() || !role || !validatePassword(password)) {
        throw Object.assign(new Error("Email, password, full name, and a password of at least 6 characters are required."), { statusCode: 400 });
    }
    const normalizedRole = ["student", "teacher", "admin"].includes(role) ? role : "student";
    if (!env.adminCode) throw new Error("ADMIN_CODE is not configured in server/.env.");
    const registrationCode = normalizedRole === "admin" ? env.adminCode : adminCode?.trim().toUpperCase();
    if (normalizedRole !== "admin" && registrationCode !== env.adminCode) {
        throw Object.assign(new Error("Invalid Admin Code. Please check with your administrator and try again."), { statusCode: 400 });
    }
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
        email: email.trim(), password, email_confirm: true,
        user_metadata: { full_name: fullName.trim(), role: normalizedRole, admin_code: registrationCode },
    });
    if (error) {
        const duplicate = error.message?.toLowerCase().includes("already registered") || error.code === "email_exists";
        throw Object.assign(new Error(duplicate ? "An account with this email already exists. Please sign in instead." : error.message), { statusCode: 400 });
    }
    if (!data.user) throw new Error("Could not create account. Please try again.");
    return {
        token: signAccessToken({ userId: data.user.id, role: normalizedRole, email: data.user.email }),
        user: { id: data.user.id, email: data.user.email, role: normalizedRole, admin_code: registrationCode },
    };
}

export async function saveProfile({ userId, email, fullName, role, registrationNo }) {
    const { data, error } = await getSupabaseAdmin().from("profiles").upsert({
        id: userId, email: email.trim(), full_name: fullName?.trim() || null, role, registration_no: registrationNo || null,
    }, { onConflict: "id" }).select().single();
    if (error) throw new Error(`Failed to save profile: ${error.message}`);
    return data;
}
