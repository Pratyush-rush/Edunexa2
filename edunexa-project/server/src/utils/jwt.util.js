import jwt from "jsonwebtoken";
import env from "../configs/env.config.js";

export function signAccessToken(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyAccessToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
