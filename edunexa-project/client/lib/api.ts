const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

export function apiUrl(path: string) {
    return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}