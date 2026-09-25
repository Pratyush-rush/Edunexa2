import { verifyAccessToken } from "../utils/jwt.util.js";

export function authenticate(req, res, next) {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Authentication required." });
    try {
        req.user = verifyAccessToken(token);
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired access token." });
    }
}

export function optionalAuthenticate(req, _res, next) {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
        try { req.user = verifyAccessToken(token); } catch { req.user = null; }
    }
    next();
}
