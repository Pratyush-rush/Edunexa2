import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId query parameter is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: classrooms, error: classError } = await supabase
      .from("classrooms")
      .select("id, name, subject, join_code, created_at")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (classError) {
      return NextResponse.json({ error: classError.message }, { status: 400 });
    }

    const loadedClassrooms = classrooms || [];
    let studentCount = 0;

    if (loadedClassrooms.length > 0) {
      const classroomIds = loadedClassrooms.map((c) => c.id);
      const { data: members, error: memberError } = await supabase
        .from("class_members")
        .select("student_id")
        .in("classroom_id", classroomIds);

      if (!memberError && members) {
        const uniqueStudents = new Set(members.map((m) => m.student_id));
        studentCount = uniqueStudents.size;
      }
    }

    return NextResponse.json({
      success: true,
      classrooms: loadedClassrooms,
      studentCount,
    });
  } catch (err: any) {
    console.error("Get Classrooms API Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load classrooms." },
      { status: 500 }
    );
  }
}
