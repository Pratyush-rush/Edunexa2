"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StudentDoubtAssistant } from "@/components/ai/StudentDoubtAssistant";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
};

export default function StudentClassrooms() {
  const router = useRouter();
  const supabase = createClient();

  const [joinCode, setJoinCode] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadClassrooms();
  }, []);

  async function loadClassrooms() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("class_members")
        .select("classroom_id")
        .eq("student_id", user.id);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setClassrooms([]);
        return;
      }

      const classroomIds = memberships.map(
        (item) => item.classroom_id
      );

      const { data, error: classroomError } = await supabase
        .from("classrooms")
        .select("id,name,subject,join_code")
        .in("id", classroomIds)
        .order("created_at", { ascending: false });

      if (classroomError) throw classroomError;

      setClassrooms(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load classrooms.");
    } finally {
      setLoading(false);
    }
  }

  async function joinClassroom() {
    setError("");
    setMessage("");

    const code = joinCode.trim().toUpperCase();

    if (!code) {
      setError("Please enter a classroom join code.");
      return;
    }

    setJoining(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Find classroom by join code
      const { data: classroom, error: classroomError } = await supabase
        .from("classrooms")
        .select("id,name,subject,join_code")
        .eq("join_code", code)
        .single();

      if (classroomError || !classroom) {
        setError("Invalid classroom join code.");
        return;
      }

      // Check whether student already joined
      const { data: existingMember } = await supabase
        .from("class_members")
        .select("id")
        .eq("classroom_id", classroom.id)
        .eq("student_id", user.id)
        .maybeSingle();

      if (existingMember) {
        setError("You have already joined this classroom.");
        return;
      }

      // Join classroom
      const { error: joinError } = await supabase
        .from("class_members")
        .insert({
          classroom_id: classroom.id,
          student_id: user.id,
        });

      if (joinError) throw joinError;

      setMessage(`Successfully joined ${classroom.name}.`);
      setJoinCode("");

      await loadClassrooms();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to join classroom.");
    } finally {
      setJoining(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="student-classrooms-page">

      {/* Header */}
      <header className="student-classrooms-header">
        <div className="student-classrooms-title">
          <button
            className="classroom-back-btn"
            onClick={() => router.push("/student")}
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <span>EduNexa Student</span>
            <h1>My Classrooms</h1>
          </div>
        </div>

        <button className="classroom-logout-btn" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </header>

      <section className="student-classrooms-content">

        {/* Join Classroom */}
        <div className="join-classroom-card">

          <div className="join-classroom-icon">
            <Plus size={25} />
          </div>

          <div className="join-classroom-info">
            <span className="classroom-kicker">
              Join a new classroom
            </span>

            <h2>Enter Classroom Code</h2>

            <p>
              Ask your teacher for the unique classroom code.
            </p>
          </div>

          <div className="join-classroom-form">
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase())
              }
              placeholder="e.g. ABC123"
              maxLength={6}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  joinClassroom();
                }
              }}
            />

            <button
              onClick={joinClassroom}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Joining...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Join Classroom
                </>
              )}
            </button>
          </div>

          {message && (
            <div className="classroom-success-message">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          {error && (
            <div className="classroom-error-message">
              {error}
            </div>
          )}
        </div>

        {/* Classroom List */}
        <div className="my-classrooms-section">

          <div className="my-classrooms-heading">
            <div>
              <span className="classroom-kicker">
                Learning Spaces
              </span>

              <h2>Your Classrooms</h2>

              <p>
                All classrooms you have joined will appear here.
              </p>
            </div>

            <div className="classroom-count">
              <Users size={17} />
              {classrooms.length} Classroom
              {classrooms.length !== 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="student-classroom-loading">
              <Loader2 className="spin" size={30} />
              <p>Loading classrooms...</p>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="student-classroom-empty">

              <div className="empty-classroom-icon">
                <BookOpen size={30} />
              </div>

              <h3>No classrooms yet</h3>

              <p>
                Enter the join code provided by your teacher
                to join your first classroom.
              </p>

            </div>
          ) : (
            <div className="student-classroom-grid">

              {classrooms.map((classroom) => (
                <div
                  className="student-classroom-card"
                  key={classroom.id}
                  onClick={() => router.push(`/student/classrooms/${classroom.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="student-card-top">
                    <div className="student-book-icon">
                      <BookOpen size={22} />
                    </div>

                    <span className="joined-badge">
                      Joined
                    </span>
                  </div>

                  <h3>{classroom.name}</h3>

                  <p>{classroom.subject}</p>

                  <div className="student-card-code">
                    <span>Class Code</span>
                    <strong>{classroom.join_code}</strong>
                  </div>
                </div>
              ))}

            </div>
          )}

        </div>

      </section>

      {/* Floating AI Doubt Tutor */}
      <StudentDoubtAssistant />
    </main>
  );
}