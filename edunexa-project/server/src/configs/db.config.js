import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectDb() {
    try {
        await prisma.$connect();
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        console.error("Set DATABASE_URL in server/.env before using database-backed APIs.");
        throw error;
    }
}

export async function disconnectDb() {
    await prisma.$disconnect();
    console.log("Database disconnected");
}
