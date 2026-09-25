import { Router } from "express";
import { analyticsController, doubtController } from "../controllers/ai.controllers.js";

const router = Router();
router.post("/doubt", doubtController);
router.post("/analytics", analyticsController);
export default router;
