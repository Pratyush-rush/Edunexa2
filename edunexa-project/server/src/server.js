import "./configs/env.config.js";
import http from "node:http";
import { Server as SocketServer } from "socket.io";
import app from "./app.js";
import { connectDb, disconnectDb } from "./configs/db.config.js";
import env from "./configs/env.config.js";

const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: env.clientUrl, credentials: true } });

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("classroom:join", (classroomId) => socket.join(`classroom:${classroomId}`));
    socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.id}`));
});

await connectDb();
httpServer.listen(env.port, () => {
    console.log(`EduNexa API listening on http://localhost:${env.port}`);
    console.log(`API base URL: http://localhost:${env.port}/api/v1`);
});

async function shutdown(signal) {
    console.log(`${signal} received. Shutting down server...`);
    await disconnectDb();
    httpServer.close(() => process.exit(0));
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
