import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, password, adminCode } = body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!adminCode?.trim()) {
      return NextResponse.json(
        { error: "Admin code is required to link teacher to your administration." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Resolve admin_id from the admin_code
    const { data: adminRow } = await supabase
      .from("admins")
      .select("id, admin_code")
      .eq("admin_code", adminCode.trim())
      .maybeSingle();

    if (!adminRow) {
      return NextResponse.json(
        { error: "Invalid Admin Code." },
        { status: 400 }
      );
    }

    // Create the auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          role: "teacher",
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Could not create teacher user." },
        { status: 500 }
      );
    }

    // Write base profile row
    await supabase.from("profiles").upsert({
      id: authData.user.id,
      email: email.trim(),
      full_name: fullName.trim(),
      role: "teacher",
    });

    // Write teacher-specific row with admin_id FK
    const { error: profileError } = await supabase.from("teachers").upsert({
      id: authData.user.id,
      email: email.trim(),
      full_name: fullName.trim(),
      admin_id: adminRow.id,
    });

    if (profileError) {
      console.error("Teacher profile save error:", profileError.message);
      return NextResponse.json(
        { error: `Teacher created but profile save failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: authData.user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        role: "teacher",
        admin_code: adminRow.admin_code,
      },
    });
  } catch (err: any) {
    console.error("Create Teacher Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error creating teacher account." },
      { status: 500 }
    );
  }
}