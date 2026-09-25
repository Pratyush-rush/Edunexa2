"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Plus,
  LogOut,
  Users,
  Copy,
  Check,
  GraduationCap,
  Loader2,
} from "lucide-react";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  created_at: string;
};

export default function TeacherDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");

  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Load teacher classrooms
    const { data: classroomData, error: classroomError } =
      await supabase
        .from("classrooms")
        .select("id, name, subject, join_code, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

    if (classroomError) {
      console.error("Classroom error:", classroomError);
      setLoading(false);
      return;
    }

    const loadedClassrooms = classroomData || [];
    setClassrooms(loadedClassrooms);

    // If teacher has classrooms, count students
    if (loadedClassrooms.length > 0) {
      const classroomIds = loadedClassrooms.map(
        (classroom) => classroom.id
      );

      const { data: members, error: memberError } =
        await supabase
          .from("class_members")
          .select("student_id")
          .in("classroom_id", classroomIds);

      if (memberError) {
        console.error("Student count error:", memberError);
      } else {
        // Remove duplicate students if the same student
        // somehow belongs to multiple classrooms.
        const uniqueStudents = new Set(
          (members || []).map((member) => member.student_id)
        );

        setStudentCount(uniqueStudents.size);
      }
    } else {
      setStudentCount(0);
    }

    setLoading(false);
  }

  function generateJoinCode() {
    const characters =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
      code += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return code;
  }

  async function createClassroom(e: React.FormEvent) {
    e.preventDefault();

    if (!className.trim() || !subject.trim()) {
      return;
    }

    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const joinCode = generateJoinCode();

    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        teacher_id: user.id,
        name: className.trim(),
        subject: subject.trim(),
        join_code: joinCode,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      setCreating(false);
      return;
    }

    setClassrooms((previous) => [data, ...previous]);

    setClassName("");
    setSubject("");
    setShowCreate(false);
    setCreating(false);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);

    setCopiedCode(code);

    setTimeout(() => {
      setCopiedCode("");
    }, 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="teacher-loading">
        <Loader2
          className="loading-spinner"
          size={32}
        />

        <p>Loading your classrooms...</p>
      </main>
    );
  }

  return (
    <main className="teacher-dashboard">

      {/* Sidebar */}
      <aside className="teacher-sidebar">

        <div className="teacher-brand">

          <div className="teacher-brand-icon">
            <GraduationCap size={25} />
          </div>

          <div>
            <strong>EduNexa</strong>
            <span>Teacher Portal</span>
          </div>

        </div>

        <nav className="teacher-nav">

          <button className="teacher-nav-item active">
            <BookOpen size={19} />
            Dashboard
          </button>

          <button className="teacher-nav-item">
            <Users size={19} />
            Students
          </button>

        </nav>

        <button
          className="teacher-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </button>

      </aside>

      {/* Main */}
      <section className="teacher-main">

        <header className="teacher-header">

          <div>
            <p>Teacher Portal</p>

            <h1>My Classrooms</h1>

            <span>
              Create and manage your classrooms from one place.
            </span>
          </div>

          <button
            className="create-classroom-btn"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={19} />
            Create Classroom
          </button>

        </header>

        {/* Stats */}
        <div className="teacher-stats">

          <div className="teacher-stat-card">

            <div className="teacher-stat-icon">
              <BookOpen size={22} />
            </div>

            <div>
              <span>Total Classrooms</span>
              <strong>{classrooms.length}</strong>
            </div>

          </div>

          <div className="teacher-stat-card">

            <div className="teacher-stat-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Connected Students</span>
              <strong>{studentCount}</strong>
            </div>

          </div>

        </div>

        {/* Classroom List */}
        <section className="teacher-classroom-section">

          <div className="teacher-section-title">

            <div>
              <h2>Your Classrooms</h2>

              <p>
                Students can join using the unique classroom code.
              </p>
            </div>

          </div>

          {classrooms.length === 0 ? (

            <div className="teacher-empty">

              <div className="teacher-empty-icon">
                <BookOpen size={30} />
              </div>

              <h3>No classrooms yet</h3>

              <p>
                Create your first classroom and share the
                generated join code with your students.
              </p>

              <button
                onClick={() => setShowCreate(true)}
              >
                <Plus size={18} />
                Create Classroom
              </button>

            </div>

          ) : (

            <div className="teacher-classroom-grid">

              {classrooms.map((classroom) => (

                <div
                  className="teacher-classroom-card"
                  key={classroom.id}
                >

                  <div className="classroom-card-top">

                    <div className="classroom-icon">
                      <BookOpen size={22} />
                    </div>

                    <span className="classroom-subject">
                      {classroom.subject}
                    </span>

                  </div>

                  <h3>{classroom.name}</h3>

                  <div className="join-code-box">

                    <div>
                      <span>JOIN CODE</span>

                      <strong>
                        {classroom.join_code}
                      </strong>
                    </div>

                    <button
                      onClick={() =>
                        copyCode(classroom.join_code)
                      }
                      title="Copy join code"
                    >
                      {copiedCode === classroom.join_code ? (
                        <Check size={19} />
                      ) : (
                        <Copy size={19} />
                      )}
                    </button>

                  </div>

                  <button
                    className="manage-classroom-btn"
                    onClick={() =>
                      router.push(
                        `/teacher/classroom/${classroom.id}`
                      )
                    }
                  >
                    Manage Classroom
                  </button>

                </div>

              ))}

            </div>

          )}

        </section>

      </section>

      {/* Create Classroom Modal */}
      {showCreate && (

        <div
          className="teacher-modal-overlay"
          onClick={() => setShowCreate(false)}
        >

          <div
            className="teacher-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <h2>Create Classroom</h2>

            <p>
              Add the basic information for your new classroom.
            </p>

            <form onSubmit={createClassroom}>

              <label>Classroom Name</label>

              <input
                type="text"
                placeholder="e.g. BTech CSE - DBMS"
                value={className}
                onChange={(e) =>
                  setClassName(e.target.value)
                }
                required
              />

              <label>Subject</label>

              <input
                type="text"
                placeholder="e.g. Database Management System"
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
                required
              />

              <div className="teacher-modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-btn"
                  disabled={creating}
                >
                  {creating
                    ? "Creating..."
                    : "Create Classroom"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>
  );
}