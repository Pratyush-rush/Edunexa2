import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, role, adminCode, registrationNo } = body;

    if (!email?.trim() || !password?.trim() || !fullName?.trim() || !role) {
      return NextResponse.json(
        { error: "Email, password, full name, and role are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedRole = ["student", "teacher", "admin"].includes(role)
      ? role
      : "student";

    const supabase = createAdminClient();

    let linkedAdminId: string | null = null;
    let linkedAdminCode: string | null = null;

    // Teachers and students must link to a valid admin (looked up via admins table)
    if (normalizedRole !== "admin") {
      const enteredCode =
        (typeof adminCode === "string" ? adminCode.trim() : "").toUpperCase();

      if (!enteredCode) {
        return NextResponse.json(
          { error: "Please enter the Admin Code to sign up." },
          { status: 400 }
        );
      }

      const { data: linkedAdmin, error: adminLookupError } = await supabase
        .from("admins")
        .select("id, admin_code")
        .eq("admin_code", enteredCode)
        .maybeSingle();

      if (adminLookupError || !linkedAdmin) {
        return NextResponse.json(
          { error: "Invalid Admin Code. Please check with your administrator and try again." },
          { status: 400 }
        );
      }

      linkedAdminId = linkedAdmin.id;
      linkedAdminCode = linkedAdmin.admin_code;
    } else {
      linkedAdminCode = adminCode?.trim() || null;
    }

    // Students are required to provide their own registration number
    if (normalizedRole === "student" && !(typeof registrationNo === "string" && registrationNo.trim())) {
      return NextResponse.json(
        { error: "Please enter your registration number." },
        { status: 400 }
      );
    }

    // Create the auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        role: normalizedRole,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Could not create account. Please try again." },
        { status: 500 }
      );
    }

    const userId = data.user.id;
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    // Create base profile row
    await supabase.from("profiles").upsert({
      id: userId,
      email: trimmedEmail,
      full_name: trimmedName,
      role: normalizedRole,
    });

    // Create role-specific row
    if (normalizedRole === "admin") {
      await supabase.from("admins").upsert({
        id: userId,
        full_name: trimmedName,
        email: trimmedEmail,
        admin_code: linkedAdminCode,
      });
    } else if (normalizedRole === "teacher") {
      await supabase.from("teachers").upsert({
        id: userId,
        full_name: trimmedName,
        email: trimmedEmail,
        admin_id: linkedAdminId,
      });
    } else {
      await supabase.from("students").upsert({
        id: userId,
        full_name: trimmedName,
        email: trimmedEmail,
        registration_no: registrationNo.trim(),
        admin_id: linkedAdminId,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: trimmedEmail,
        role: normalizedRole,
        admin_code: normalizedRole === "admin" ? linkedAdminCode : linkedAdminCode,
        registration_no:
          normalizedRole === "student" ? registrationNo.trim() : null,
      },
    });
  } catch (err: any) {
    console.error("Signup API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error during signup." },
      { status: 500 }
    );
  }
}