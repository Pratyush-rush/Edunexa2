import bcrypt from "bcrypt";

export function validatePassword(password) {
    return typeof password === "string" && password.trim().length >= 6;
}

export function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

export function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
