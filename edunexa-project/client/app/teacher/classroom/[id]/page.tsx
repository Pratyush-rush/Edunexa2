"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  ClipboardCheck,
  FileQuestion,
  BarChart3,
  Copy,
  Check,
  UserPlus,
  Loader2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  teacher_id: string;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  registration_no: string | null;
};

export default function ClassroomManagement() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadClassroom();
  }, [classroomId]);

  async function loadClassroom() {
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

      // Get classroom
      const { data: classroomData, error: classroomError } =
        await supabase
          .from("classrooms")
          .select("id,name,subject,join_code,teacher_id")
          .eq("id", classroomId)
          .eq("teacher_id", user.id)
          .single();

      if (classroomError) {
        throw classroomError;
      }

      setClassroom(classroomData);

      // Get students in classroom
      const { data: members, error: membersError } = await supabase
        .from("class_members")
        .select("student_id")
        .eq("classroom_id", classroomId);

      if (membersError) {
        throw membersError;
      }

      if (!members || members.length === 0) {
        setStudents([]);
        return;
      }

      const studentIds = members.map((member) => member.student_id);

      const { data: studentProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,email,registration_no")
        .in("id", studentIds);

      if (profileError) {
        throw profileError;
      }

      setStudents(studentProfiles || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load classroom.");
    } finally {
      setLoading(false);
    }
  }

  async function copyJoinCode() {
    if (!classroom) return;

    await navigator.clipboard.writeText(classroom.join_code);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  if (loading) {
    return (
      <main className="classroom-loading">
        <Loader2 className="loading-icon" size={38} />
        <p>Loading classroom...</p>
      </main>
    );
  }

  if (error || !classroom) {
    return (
      <main className="classroom-error">
        <div className="error-card">
          <h2>Unable to open classroom</h2>
          <p>{error || "Classroom not found."}</p>

          <button
            className="primary-btn"
            onClick={() => router.push("/teacher")}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="classroom-page">
      {/* Header */}
      <header className="classroom-header">
        <div className="classroom-header-left">
          <button
            className="back-btn"
            onClick={() => router.push("/teacher")}
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <div className="page-kicker">Teacher Workspace</div>
            <h1>{classroom.name}</h1>
            <p>{classroom.subject}</p>
          </div>
        </div>

        <div className="join-code-box">
          <span>JOIN CODE</span>

          <strong>{classroom.join_code}</strong>

          <button onClick={copyJoinCode} title="Copy join code">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </header>

      {/* Main */}
      <section className="classroom-content">

        {/* Quick Stats */}
        <div className="classroom-stats">

          <div className="classroom-stat-card">
            <div className="stat-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Students</span>
              <strong>{students.length}</strong>
            </div>
          </div>

          <div className="classroom-stat-card">
            <div className="stat-icon">
              <ClipboardCheck size={22} />
            </div>

            <div>
              <span>Attendance</span>
              <strong>Manage</strong>
            </div>
          </div>

          <div className="classroom-stat-card">
            <div className="stat-icon">
              <FileQuestion size={22} />
            </div>

            <div>
              <span>Quizzes</span>
              <strong>Manage</strong>
            </div>
          </div>

          <div
            className="classroom-stat-card clickable-stat"
            onClick={() =>
              router.push(`/teacher/classroom/${classroom.id}/analytics`)
            }
            style={{ cursor: "pointer" }}
            title="View AI Classroom Analytics"
          >
            <div className="stat-icon ai-stat-icon">
              <BarChart3 size={22} />
            </div>

            <div>
              <span>AI Analytics</span>
              <strong style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                Explore <Sparkles size={14} color="#635bff" />
              </strong>
            </div>
          </div>

        </div>

        {/* AI Analytics Copilot Banner */}
        <div className="classroom-ai-banner">
          <div className="ai-banner-left">
            <div className="ai-banner-icon-bubble">
              <Sparkles size={24} />
            </div>
            <div>
              <h3>AI Student Analytics & Learning Gaps</h3>
              <p>
                Query the AI model for deep class insights: attendance trends, weak topic mastery, at-risk students, and remedial intervention plans.
              </p>
            </div>
          </div>
          <button
            className="ai-banner-button"
            onClick={() =>
              router.push(`/teacher/classroom/${classroom.id}/analytics`)
            }
          >
            <Sparkles size={16} />
            Query AI Analytics
          </button>
        </div>

        {/* Actions */}
        <div className="classroom-actions">

          <button
            className="action-card"
            onClick={() =>
              router.push(`/teacher/classroom/${classroom.id}/attendance`)
            }
          >
            <div className="action-icon">
              <ClipboardCheck size={24} />
            </div>

            <div>
              <h3>Attendance</h3>
              <p>Upload and manage student attendance.</p>
            </div>
          </button>

          <button
            className="action-card"
            onClick={() =>
              router.push(`/teacher/classroom/${classroom.id}/quizzes`)
            }
          >
            <div className="action-icon">
              <FileQuestion size={24} />
            </div>

            <div>
              <h3>Quizzes</h3>
              <p>Create classroom quizzes and assessments.</p>
            </div>
          </button>

          <button
            className="action-card"
            onClick={() =>
              router.push(`/teacher/classroom/${classroom.id}/analytics`)
            }
          >
            <div className="action-icon">
              <BarChart3 size={24} />
            </div>

            <div>
              <h3>Performance Analytics</h3>
              <p>Track class performance and learning gaps.</p>
            </div>
          </button>

        </div>

        {/* Students */}
        <section className="students-section">

          <div className="section-heading">
            <div>
              <div className="page-kicker">Classroom Members</div>
              <h2>Students</h2>
              <p>
                Students who have joined using the classroom code.
              </p>
            </div>

            <button className="secondary-btn">
              <UserPlus size={18} />
              Add Student
            </button>
          </div>

          {students.length === 0 ? (
            <div className="empty-students">
              <div className="empty-icon">
                <GraduationCap size={32} />
              </div>

              <h3>No students yet</h3>

              <p>
                Share the classroom join code with your students.
              </p>

              <div className="empty-code">
                <strong>{classroom.join_code}</strong>

                <button onClick={copyJoinCode}>
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </div>
            </div>
          ) : (
            <div className="students-table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Registration No.</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="student-name">
                          <div className="student-avatar">
                            {(student.full_name || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {student.full_name || "Student"}
                          </strong>
                        </div>
                      </td>

                      <td>{student.email}</td>

                      <td>
                        {student.registration_no || "Not added"}
                      </td>

                      <td>
                        <span className="status-pill">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

      </section>
    </main>
  );
}