import env from "../configs/env.config.js";
import { getSupabaseAdmin } from "../configs/supabase.config.js";
import { generateJoinCode } from "../utils/generate-code.js";

export async function createTeacher({ fullName, email, password, adminCode }) {
    const normalizedCode = adminCode?.trim().toUpperCase();
    if (!env.adminCode || normalizedCode !== env.adminCode) throw Object.assign(new Error("Invalid Admin Code. Please check with your administrator and try again."), { statusCode: 400 });
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { full_name: fullName.trim(), role: "teacher", admin_code: normalizedCode } });
    if (error) throw Object.assign(new Error(error.message), { statusCode: 400 });
    if (!data.user) throw new Error("Could not create teacher user.");
    const { error: profileError } = await getSupabaseAdmin().from("profiles").upsert({ id: data.user.id, email: email.trim(), full_name: fullName.trim(), role: "teacher", registration_no: normalizedCode }, { onConflict: "id" });
    if (profileError) throw new Error(`Teacher created but profile save failed: ${profileError.message}`);
    return { id: data.user.id, email: email.trim(), full_name: fullName.trim(), role: "teacher", admin_code: normalizedCode };
}

export async function createClassroom({ teacherId, name, subject }) {
    const { data, error } = await getSupabaseAdmin().from("classrooms").insert({ teacher_id: teacherId.trim(), name: name.trim(), subject: subject.trim(), join_code: generateJoinCode() }).select().single();
    if (error) throw new Error(error.message);
    return data;
}

export async function addStudent({ classroomId, studentId, studentEmail, studentName, registrationNo }) {
    let targetStudentId = studentId?.trim();
    if (!targetStudentId && studentEmail?.trim()) {
        const email = studentEmail.trim().toLowerCase();
        const { data: existing, error: lookupError } = await getSupabaseAdmin().from("profiles").select("id").eq("email", email).maybeSingle();
        if (lookupError) throw new Error(lookupError.message);
        if (existing) targetStudentId = existing.id;
        else {
            const { data, error } = await getSupabaseAdmin().auth.admin.createUser({ email, password: `Student@${Math.floor(1000 + Math.random() * 9000)}`, email_confirm: true, user_metadata: { full_name: studentName?.trim() || email.split("@")[0], role: "student" } });
            if (error || !data.user) throw new Error(error?.message || "Could not register student account.");
            targetStudentId = data.user.id;
            const { error: profileError } = await getSupabaseAdmin().from("profiles").insert({ id: targetStudentId, email, full_name: studentName?.trim() || email.split("@")[0], role: "student", registration_no: registrationNo?.trim() || null });
            if (profileError) throw new Error(`Student created but profile save failed: ${profileError.message}`);
        }
    }
    if (!targetStudentId) throw Object.assign(new Error("Please select an existing student or provide student email."), { statusCode: 400 });
    const { data: existingMember, error: memberError } = await getSupabaseAdmin().from("class_members").select("id").eq("classroom_id", classroomId).eq("student_id", targetStudentId).maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (existingMember) throw Object.assign(new Error("This student is already enrolled in this classroom."), { statusCode: 400 });
    const { error: insertError } = await getSupabaseAdmin().from("class_members").insert({ classroom_id: classroomId, student_id: targetStudentId });
    if (insertError) throw new Error(insertError.message);
    return targetStudentId;
}
