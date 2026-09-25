export function notFoundHandler(req, res) {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
    console.error("Unhandled server error:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Internal server error." });
}
