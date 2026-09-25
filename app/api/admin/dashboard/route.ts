import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verify this user is an admin
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Admin profile not found." }, { status: 404 });
    }

    if (profile.role && profile.role !== "admin") {
      return NextResponse.json({ error: "Not an admin account.", redirect: profile.role }, { status: 403 });
    }

    // 2. Get admin row (code lives in admins table now)
    let { data: adminRow } = await supabase
      .from("admins")
      .select("id, full_name, admin_code")
      .eq("id", userId)
      .single();

    // Auto-generate admin code if missing
    if (!adminRow?.admin_code) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newCode = "ADM-";
      for (let i = 0; i < 6; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      await supabase
        .from("admins")
        .upsert({ id: userId, full_name: profile.full_name, admin_code: newCode });
      adminRow = { id: userId, full_name: profile.full_name, admin_code: newCode };
    }

    const code = adminRow.admin_code;

    // 3. Load Teachers linked to this admin (via teachers.admin_id = admin.id)
    const { data: teacherRows } = await supabase
      .from("teachers")
      .select("id, full_name, email, admin_id")
      .eq("admin_id", userId);

    const linkedTeachers = teacherRows || [];

    const teacherMap = new Map<string, string>();
    linkedTeachers.forEach((t) => {
      teacherMap.set(t.id, t.full_name || t.email.split("@")[0]);
    });

    const teacherIds = linkedTeachers.map((t) => t.id);

    // 4. Load Classrooms for these teachers
    let loadedClassrooms: any[] = [];
    if (teacherIds.length > 0) {
      const { data: classData } = await supabase
        .from("classrooms")
        .select("id, name, subject, join_code, teacher_id")
        .in("teacher_id", teacherIds)
        .order("created_at", { ascending: false });

      loadedClassrooms = (classData || []).map((c) => ({
        ...c,
        teacher_name: teacherMap.get(c.teacher_id) || "Teacher",
      }));
    }

    // 5. Load Classroom Members (Students)
    const classroomIds = loadedClassrooms.map((c) => c.id);
    let classMemberships: { classroom_id: string; student_id: string }[] = [];
    let totalQuizzes = 0;

    if (classroomIds.length > 0) {
      const { data: members } = await supabase
        .from("class_members")
        .select("classroom_id, student_id")
        .in("classroom_id", classroomIds);

      classMemberships = members || [];

      const { count: qCount } = await supabase
        .from("quizzes")
        .select("id", { count: "exact", head: true })
        .in("classroom_id", classroomIds);

      totalQuizzes = qCount || 0;
    }

    // Aggregate student counts per classroom
    const classStudentCountMap = new Map<string, number>();
    classMemberships.forEach((m) => {
      classStudentCountMap.set(
        m.classroom_id,
        (classStudentCountMap.get(m.classroom_id) || 0) + 1
      );
    });

    loadedClassrooms = loadedClassrooms.map((c) => ({
      ...c,
      studentCount: classStudentCountMap.get(c.id) || 0,
    }));

    // Aggregate classroom and student counts per teacher
    const teacherClassCount = new Map<string, number>();
    const teacherStudentCount = new Map<string, Set<string>>();

    loadedClassrooms.forEach((c) => {
      teacherClassCount.set(
        c.teacher_id,
        (teacherClassCount.get(c.teacher_id) || 0) + 1
      );
    });

    classMemberships.forEach((m) => {
      const cls = loadedClassrooms.find((c) => c.id === m.classroom_id);
      if (cls) {
        if (!teacherStudentCount.has(cls.teacher_id)) {
          teacherStudentCount.set(cls.teacher_id, new Set());
        }
        teacherStudentCount.get(cls.teacher_id)!.add(m.student_id);
      }
    });

    const enrichedTeachers = linkedTeachers.map((t) => ({
      ...t,
      admin_code: code,
      classroomCount: teacherClassCount.get(t.id) || 0,
      studentCount: teacherStudentCount.get(t.id)?.size || 0,
    }));

    // 6. Load Enrolled Student Profiles (from students table)
    const distinctStudentIds = [...new Set(classMemberships.map((m) => m.student_id))];
    let students: any[] = [];

    if (distinctStudentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from("students")
        .select("id, full_name, email, registration_no")
        .in("id", distinctStudentIds);

      const classroomLookup = new Map(loadedClassrooms.map((c) => [c.id, c]));
      const studentClassMap = new Map<string, any[]>();
      classMemberships.forEach((m) => {
        if (!studentClassMap.has(m.student_id)) {
          studentClassMap.set(m.student_id, []);
        }
        const cls = classroomLookup.get(m.classroom_id);
        if (cls) {
          studentClassMap.get(m.student_id)!.push({
            id: cls.id,
            name: cls.name,
            subject: cls.subject,
            teacher_name: cls.teacher_name,
          });
        }
      });

      students = (studentRows || []).map((s) => ({
        ...s,
        classrooms: studentClassMap.get(s.id) || [],
      }));
    }

    // 7. Load all registered students for the dropdown (scoped to this admin via admin_id FK)
    const { data: studentsByAdmin } = await supabase
      .from("students")
      .select("id, full_name, email")
      .eq("admin_id", userId)
      .order("email");

    const seenIds = new Set<string>();
    const mergedStudents: { id: string; full_name: string | null; email: string }[] = [];

    (studentsByAdmin || []).forEach((s) => {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        mergedStudents.push(s);
      }
    });

    students.forEach((s) => {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        mergedStudents.push({ id: s.id, full_name: s.full_name, email: s.email });
      }
    });

    return NextResponse.json({
      adminName: adminRow.full_name || profile.full_name || "Administrator",
      adminCode: code,
      teachers: enrichedTeachers,
      classrooms: loadedClassrooms,
      students,
      allRegisteredStudents: mergedStudents,
      quizCount: totalQuizzes,
    });
  } catch (err: any) {
    console.error("Admin dashboard API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error loading admin dashboard." },
      { status: 500 }
    );
  }
}