import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, fullName, role, adminCode, registrationNo } = body;

    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: "userId, email, and role are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Write base profile row (keeps role routing + FK targets intact)
    await supabase.from("profiles").upsert({
      id: userId,
      email: email.trim(),
      full_name: fullName?.trim() || null,
      role,
    });

    // Resolve admin_id from adminCode if provided (for teacher/student linkage)
    let resolvedAdminId: string | null = null;
    if (adminCode?.trim() && role !== "admin") {
      const { data: adminRow } = await supabase
        .from("admins")
        .select("id")
        .eq("admin_code", adminCode.trim())
        .maybeSingle();
      resolvedAdminId = adminRow?.id || null;
    }

    // Write role-specific row
    if (role === "admin") {
      await supabase.from("admins").upsert({
        id: userId,
        full_name: fullName?.trim() || null,
        email: email.trim(),
        admin_code: adminCode || null,
      });
    } else if (role === "teacher") {
      await supabase.from("teachers").upsert({
        id: userId,
        full_name: fullName?.trim() || null,
        email: email.trim(),
        admin_id: resolvedAdminId,
      });
    } else {
      await supabase.from("students").upsert({
        id: userId,
        full_name: fullName?.trim() || null,
        email: email.trim(),
        registration_no: registrationNo || null,
        admin_id: resolvedAdminId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error creating profile." },
      { status: 500 }
    );
  }
}