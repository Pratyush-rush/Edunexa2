export function success(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
}

export function failure(res, message, statusCode = 500) {
    return res.status(statusCode).json({ error: message });
}
