import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import env from "./configs/env.config.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "edunexa-api", timestamp: new Date().toISOString() }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
export default app;
