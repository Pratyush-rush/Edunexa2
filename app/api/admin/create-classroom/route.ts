import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teacherId, name, subject } = body;

    if (!teacherId?.trim() || !name?.trim() || !subject?.trim()) {
      return NextResponse.json(
        { error: "Teacher, class name, and subject are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate unique 6-character join code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let joinCode = "";
    for (let i = 0; i < 6; i++) {
      joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        teacher_id: teacherId.trim(),
        name: name.trim(),
        subject: subject.trim(),
        join_code: joinCode,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      classroom: data,
    });
  } catch (err: any) {
    console.error("Create Classroom Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error creating classroom." },
      { status: 500 }
    );
  }
}
