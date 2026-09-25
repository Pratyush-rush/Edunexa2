import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classroomId, studentId, studentEmail, studentName, registrationNo, adminCode } = body;

    if (!classroomId?.trim()) {
      return NextResponse.json(
        { error: "Classroom ID is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Resolve admin_id from admin_code
    let adminId: string | null = null;
    if (adminCode?.trim()) {
      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("admin_code", adminCode.trim())
        .maybeSingle();
      adminId = adminRow?.id || null;
    }

    let targetStudentId = studentId?.trim();

    // If studentId not provided directly, lookup or create by email
    if (!targetStudentId && studentEmail?.trim()) {
      const email = studentEmail.trim().toLowerCase();

      // Check if student row exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingStudent) {
        targetStudentId = existingStudent.id;
      } else {
        // Create new student user via admin API
        const defaultPassword = "Student@" + Math.floor(1000 + Math.random() * 9000);
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              full_name: studentName?.trim() || email.split("@")[0],
              role: "student",
            },
          });

        if (authError || !authData.user) {
          return NextResponse.json(
            { error: authError?.message || "Could not register student account." },
            { status: 400 }
          );
        }

        targetStudentId = authData.user.id;

        // Write base profile
        await supabase.from("profiles").upsert({
          id: targetStudentId,
          email,
          full_name: studentName?.trim() || email.split("@")[0],
          role: "student",
        });

        // Write student-specific row
        const { error: profileError } = await supabase.from("students").upsert({
          id: targetStudentId,
          email,
          full_name: studentName?.trim() || email.split("@")[0],
          registration_no: registrationNo?.trim() || null,
          admin_id: adminId,
        });

        if (profileError) {
          console.error("Student profile save error:", profileError.message);
          return NextResponse.json(
            { error: `Student created but profile save failed: ${profileError.message}` },
            { status: 500 }
          );
        }
      }
    }

    if (!targetStudentId) {
      return NextResponse.json(
        { error: "Please select an existing student or provide student email." },
        { status: 400 }
      );
    }

    // Check if student is already enrolled in this classroom
    const { data: existingMember } = await supabase
      .from("class_members")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("student_id", targetStudentId)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "This student is already enrolled in this classroom." },
        { status: 400 }
      );
    }

    // Enroll student in class_members
    const { error: insertError } = await supabase
      .from("class_members")
      .insert({
        classroom_id: classroomId,
        student_id: targetStudentId,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Failed to enroll student." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student successfully enrolled into classroom.",
      studentId: targetStudentId,
    });
  } catch (err: any) {
    console.error("Add Student Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error adding student." },
      { status: 500 }
    );
  }
}