import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classroomId, studentEmail } = body;

    if (!classroomId?.trim() || !studentEmail?.trim()) {
      return NextResponse.json(
        { error: "Classroom ID and student email are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const email = studentEmail.trim().toLowerCase();

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, email")
      .eq("email", email)
      .maybeSingle();

    if (studentError) throw studentError;

    if (!student) {
      return NextResponse.json(
        { error: "No student account found with this email. The student must sign up first." },
        { status: 404 }
      );
    }

    const { data: existing } = await supabase
      .from("class_members")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("student_id", student.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This student is already enrolled in this classroom." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("class_members")
      .insert({ classroom_id: classroomId, student_id: student.id });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `${student.full_name || student.email} has been enrolled.`,
      student: { id: student.id, full_name: student.full_name, email: student.email },
    });
  } catch (err: any) {
    console.error("Enroll Student Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to enroll student." },
      { status: 500 }
    );
  }
}
