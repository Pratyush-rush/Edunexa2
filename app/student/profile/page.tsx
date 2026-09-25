"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  Save,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function StudentProfile() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [email, setEmail] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("students")
      .select("full_name, registration_no")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setFullName(data?.full_name || "");
      setRegistrationNo(data?.registration_no || "");
    }

    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!registrationNo.trim()) {
      setError("Please enter your registration number.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({
        full_name: fullName.trim(),
        registration_no: registrationNo.trim(),
      })
      .eq("id", user.id);

    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      setMessage("Profile updated successfully!");

      setTimeout(() => {
        router.push("/student");
      }, 1000);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="student-profile-loading">
        <Loader2 className="loading-spinner" size={34} />
        <p>Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="student-profile-page">

      <div className="student-profile-card">

        <button
          className="profile-back-btn"
          onClick={() => router.push("/student")}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="profile-header">

          <div className="profile-avatar">
            <GraduationCap size={30} />
          </div>

          <div>
            <p>Student Portal</p>
            <h1>My Profile</h1>
            <span>
              Keep your academic information up to date.
            </span>
          </div>

        </div>

        <form
          className="student-profile-form"
          onSubmit={saveProfile}
        >

          <div className="profile-field">

            <label>
              <User size={17} />
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

          </div>

          <div className="profile-field">

            <label>
              <Mail size={17} />
              Email
            </label>

            <input
              type="email"
              value={email}
              disabled
            />

            <small>
              Email is linked to your account and cannot be changed here.
            </small>

          </div>

          <div className="profile-field">

            <label>
              <GraduationCap size={17} />
              Registration Number
            </label>

            <input
              type="text"
              placeholder="e.g. 23CSE001"
              value={registrationNo}
              onChange={(e) =>
                setRegistrationNo(e.target.value)
              }
            />

          </div>

          {error && (
            <div className="profile-message profile-error">
              {error}
            </div>
          )}

          {message && (
            <div className="profile-message profile-success">
              <CheckCircle size={18} />
              {message}
            </div>
          )}

          <button
            type="submit"
            className="profile-save-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="loading-spinner"
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Profile
              </>
            )}
          </button>

        </form>

      </div>

    </main>
  );
}