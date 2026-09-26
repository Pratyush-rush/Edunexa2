import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const teacherId = searchParams.get("teacherId");

    if (!classroomId || !teacherId) {
      return NextResponse.json(
        { error: "classroomId and teacherId are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: classroom, error: classError } = await supabase
      .from("classrooms")
      .select("id,name,subject,join_code,teacher_id")
      .eq("id", classroomId)
      .eq("teacher_id", teacherId)
      .single();

    if (classError || !classroom) {
      return NextResponse.json(
        { error: classError?.message || "Classroom not found." },
        { status: 404 }
      );
    }

    const { data: members } = await supabase
      .from("class_members")
      .select("student_id")
      .eq("classroom_id", classroomId);

    let students: any[] = [];
    if (members && members.length > 0) {
      const studentIds = members.map((m) => m.student_id);
      const { data: studentProfiles } = await supabase
        .from("students")
        .select("id,full_name,email,registration_no")
        .in("id", studentIds);

      students = studentProfiles || [];
    }

    return NextResponse.json({
      success: true,
      classroom,
      students,
    });
  } catch (err: any) {
    console.error("Classroom details API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load classroom details." },
      { status: 500 }
    );
  }
}
