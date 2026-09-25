import { addStudent, createClassroom, createTeacher } from "../services/admin.service.js";
import { failure, success } from "../utils/api-response.js";

export async function createTeacherController(req, res, next) {
    try {
        const { fullName, email, password, adminCode } = req.body;
        if (!fullName?.trim() || !email?.trim() || !password?.trim()) return failure(res, "Full name, email, and password are required.", 400);
        if (!adminCode?.trim()) return failure(res, "Admin code is required to link teacher to your administration.", 400);
        if (password.length < 6) return failure(res, "Password must be at least 6 characters long.", 400);
        return success(res, { success: true, teacher: await createTeacher(req.body) });
    } catch (error) { return next(error); }
}

export async function createClassroomController(req, res, next) {
    try {
        const { teacherId, name, subject } = req.body;
        if (!teacherId?.trim() || !name?.trim() || !subject?.trim()) return failure(res, "Teacher, class name, and subject are required.", 400);
        return success(res, { success: true, classroom: await createClassroom(req.body) });
    } catch (error) { return next(error); }
}

export async function addStudentController(req, res, next) {
    try {
        if (!req.body.classroomId?.trim()) return failure(res, "Classroom ID is required.", 400);
        const studentId = await addStudent(req.body);
        return success(res, { success: true, message: "Student successfully enrolled into classroom.", studentId });
    } catch (error) { return next(error); }
}
