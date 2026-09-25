import { Router } from "express";
import { addStudentController, createClassroomController, createTeacherController } from "../controllers/admin.controllers.js";

const router = Router();
router.post("/create-teacher", createTeacherController);
router.post("/create-classroom", createClassroomController);
router.post("/add-student", addStudentController);
export default router;
