import { createAccount, saveProfile } from "../services/auth.service.js";
import { success, failure } from "../utils/api-response.js";
import env from "../configs/env.config.js";

export async function signupController(req, res, next) {
    try {
        const result = await createAccount(req.body);
        res.cookie("accessToken", result.token, { httpOnly: true, sameSite: "lax", secure: env.nodeEnv === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
        return success(res, { success: true, user: result.user });
    } catch (error) { return next(error); }
}

export async function profileController(req, res, next) {
    try {
        const { userId, email, fullName, role, registrationNo } = req.body;
        if (!userId || !email || !role) return failure(res, "userId, email, and role are required.", 400);
        return success(res, { success: true, profile: await saveProfile({ userId, email, fullName, role, registrationNo }) });
    } catch (error) { return next(error); }
}

export function logoutController(_req, res) {
    res.clearCookie("accessToken");
    return success(res, { success: true });
}
