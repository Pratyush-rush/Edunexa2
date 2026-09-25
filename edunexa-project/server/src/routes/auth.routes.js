import { Router } from "express";
import { logoutController, profileController, signupController } from "../controllers/auth.controllers.js";

const router = Router();
router.post("/signup", signupController);
router.post("/profile", profileController);
router.post("/logout", logoutController);
export default router;
