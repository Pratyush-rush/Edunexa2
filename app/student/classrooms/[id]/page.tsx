"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
};

type QuizAttempt = {
  quiz_id: string;
  score: number;
  total_marks: number;
  status: string;
  completed_at: string | null;
  quiz_title: string;
};

type Material = {
  id: string;
  title: string;
  description: string | null;
  resource_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function PieChart({
  percentage,
  size = 120,
  strokeWidth = 14,
  color = "#4f46e5",
  trackColor = "#eef2ff",
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: size > 100 ? "22px" : "16px",
            fontWeight: 800,
            fontFamily: "Manrope, sans-serif",
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          {percentage}%
        </span>
        {label && (
          <span style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  png: FileText,
  jpg: FileText,
  jpeg: FileText,
  doc: FileText,
  docx: FileText,
  zip: FileText,
  txt: FileText,
};

export default function StudentClassroomDetail() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalSessions, setTotalSessions] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);

  const [quizzesTaken, setQuizzesTaken] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const [materials, setMaterials] = useState<Material[]>([]);

  const initialLoadDone = useRef(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: member } = await supabase
        .from("class_members").select("id")
        .eq("classroom_id", classroomId).eq("student_id", user.id)
        .maybeSingle();

      if (!member) { setError("You are not a member of this classroom."); setLoading(false); return; }

      const { data: classData } = await supabase
        .from("classrooms").select("id, name, subject, join_code")
        .eq("id", classroomId).single();

      if (!classData) { setError("Classroom not found."); setLoading(false); return; }
      setClassroom(classData);

      // Attendance
      const { data: attRecords } = await supabase
        .from("attendance").select("student_id, attendance_date, status")
        .eq("classroom_id", classroomId);

      const records = (attRecords || []) as { student_id: string; attendance_date: string; status: string }[];
      const uniqueDates = new Set(records.map((r) => r.attendance_date));
      const sessions = uniqueDates.size;
      const presents = records.filter((r) => r.status === "present" && r.student_id === user.id).length;

      setTotalSessions(sessions);
      setPresentCount(presents);
      setAttendanceRate(sessions > 0 ? Math.round((presents / sessions) * 100) : 0);

      // Quizzes
      const { data: quizList } = await supabase
        .from("quizzes").select("id, title, is_published")
        .eq("classroom_id", classroomId).eq("is_published", true);

      const quizIds = (quizList || []).map((q) => q.id);
      const quizMap = new Map((quizList || []).map((q) => [q.id, q.title]));
      setTotalQuizzes(quizIds.length);

      if (quizIds.length > 0) {
        const { data: attemptData } = await supabase
          .from("quiz_attempts").select("quiz_id, score, total_marks, status, completed_at")
          .in("quiz_id", quizIds).eq("student_id", user.id).eq("status", "submitted");

        const attemptList = (attemptData || []).map((a) => ({
          ...a,
          quiz_title: quizMap.get(a.quiz_id) || "Quiz",
        }));

        setAttempts(attemptList);
        setQuizzesTaken(attemptList.length);

        if (attemptList.length > 0) {
          const pcts = attemptList.map((a) => a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0);
          setAvgScore(Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length));
        }
      }

      // Materials
      const { data: matData } = await supabase
        .from("classroom_materials").select("*")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      setMaterials(matData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load classroom data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [classroomId, router, supabase]);

  useEffect(() => {
    if (classroomId) {
      loadData(false);
      initialLoadDone.current = true;
    }
  }, [classroomId, loadData]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && initialLoadDone.current && classroomId) {
        loadData(true);
      }
    };
    const onFocus = () => {
      if (initialLoadDone.current && classroomId) loadData(true);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [classroomId, loadData]);

  useEffect(() => {
    const onPopState = () => {
      if (initialLoadDone.current && classroomId) loadData(true);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && initialLoadDone.current && classroomId) loadData(true);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [classroomId, loadData]);

  if (loading) {
    return (
      <main className="student-loading">
        <Loader2 className="loading-spinner spin" size={32} />
        <p>Loading classroom...</p>
      </main>
    );
  }

  if (error || !classroom) {
    return (
      <main className="student-loading">
        <AlertCircle size={36} />
        <p>{error || "Classroom not found."}</p>
        <button onClick={() => router.push("/student/classrooms")} style={{ marginTop: 12 }}>
          <ArrowLeft size={16} /> Back to Classrooms
        </button>
      </main>
    );
  }

  const absentCount = totalSessions - presentCount;
  const quizzesRemaining = totalQuizzes - quizzesTaken;

  return (
    <main className="student-dashboard">
      <section className="student-content">
        {/* Header */}
        <header className="student-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <button className="classroom-back-btn" onClick={() => router.push("/student/classrooms")}>
                <ArrowLeft size={19} />
              </button>
              <span className="student-welcome">{classroom.subject}</span>
            </div>
            <h1>{classroom.name}</h1>
            <p className="student-header-subtitle">
              Class Code: <strong>{classroom.join_code}</strong>
            </p>
          </div>
          <button className="classroom-refresh-btn" onClick={() => loadData(true)} title="Refresh data">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </header>

        {/* ===== OVERVIEW CARDS ===== */}
        <div className="learning-stats-grid" style={{ marginBottom: "28px" }}>
          <div className="learning-stat-card">
            <div className="learning-stat-icon success-icon">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <span>Attendance</span>
              <strong>{attendanceRate}%</strong>
              <small>{presentCount}/{totalSessions} sessions</small>
            </div>
          </div>

          <div className="learning-stat-card">
            <div className="learning-stat-icon trophy-icon">
              <BarChart3 size={24} />
            </div>
            <div>
              <span>Quiz Average</span>
              <strong>{quizzesTaken > 0 ? `${avgScore}%` : "—"}</strong>
              <small>{quizzesTaken}/{totalQuizzes} completed</small>
            </div>
          </div>

          <div className="learning-stat-card">
            <div className="learning-stat-icon warning-icon">
              <FileText size={24} />
            </div>
            <div>
              <span>Materials</span>
              <strong>{materials.length}</strong>
              <small>Study resources</small>
            </div>
          </div>
        </div>

        {/* ===== ATTENDANCE + QUIZ PIE CHARTS ROW ===== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
            marginBottom: "28px",
          }}
          className="classroom-charts-row"
        >
          {/* Attendance Pie Card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e9f0",
              borderRadius: "16px",
              padding: "28px",
              display: "flex",
              alignItems: "center",
              gap: "28px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <PieChart
              percentage={attendanceRate}
              size={130}
              strokeWidth={14}
              color={attendanceRate >= 75 ? "#10b981" : attendanceRate >= 50 ? "#f59e0b" : "#ef4444"}
              trackColor={attendanceRate >= 75 ? "#ecfdf5" : attendanceRate >= 50 ? "#fffbeb" : "#fef2f2"}
              label="present"
            />

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#635bff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Attendance
              </span>
              <h3 style={{ margin: "4px 0 12px", fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Your Attendance Record
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Present:</span>
                  <strong style={{ color: "#0f172a" }}>{presentCount} sessions</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Absent:</span>
                  <strong style={{ color: "#0f172a" }}>{absentCount} sessions</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#635bff", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Total Sessions:</span>
                  <strong style={{ color: "#0f172a" }}>{totalSessions}</strong>
                </div>
              </div>

              {attendanceRate < 75 && totalSessions > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "#fef2f2",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    color: "#991b1b",
                    fontWeight: 500,
                  }}
                >
                  Your attendance is below 75% — try to attend more sessions.
                </div>
              )}
            </div>
          </div>

          {/* Quiz Performance Pie Card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7e9f0",
              borderRadius: "16px",
              padding: "28px",
              display: "flex",
              alignItems: "center",
              gap: "28px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            }}
          >
            <PieChart
              percentage={avgScore}
              size={130}
              strokeWidth={14}
              color={avgScore >= 60 ? "#4f46e5" : avgScore >= 40 ? "#f59e0b" : "#ef4444"}
              trackColor={avgScore >= 60 ? "#eef2ff" : avgScore >= 40 ? "#fffbeb" : "#fef2f2"}
              label="avg score"
            />

            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#635bff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Quiz Performance
              </span>
              <h3 style={{ margin: "4px 0 12px", fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Your Quiz Results
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4f46e5", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Completed:</span>
                  <strong style={{ color: "#0f172a" }}>{quizzesTaken} quiz{quizzesTaken !== 1 ? "zes" : ""}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e2e8f0", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Remaining:</span>
                  <strong style={{ color: "#0f172a" }}>{quizzesRemaining > 0 ? `${quizzesRemaining} quiz${quizzesRemaining !== 1 ? "zes" : ""}` : "None"}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: avgScore >= 60 ? "#10b981" : "#ef4444", flexShrink: 0 }} />
                  <span style={{ color: "#64748b" }}>Status:</span>
                  <strong style={{ color: avgScore >= 60 ? "#16a34a" : "#dc2626" }}>
                    {quizzesTaken === 0 ? "Not started" : avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 40 ? "Needs improvement" : "At risk"}
                  </strong>
                </div>
              </div>

              {quizzesRemaining > 0 && (
                <button
                  onClick={() => router.push("/student/quizzes")}
                  style={{
                    marginTop: "12px",
                    padding: "7px 14px",
                    background: "#4f46e5",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Take Remaining Quizzes
                </button>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .classroom-charts-row { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* ===== DETAILED QUIZ RESULTS ===== */}
        {attempts.length > 0 && (
          <section style={{ marginBottom: "28px" }}>
            <div className="learning-section-title">
              <div>
                <span className="learning-kicker">DETAILED BREAKDOWN</span>
                <h2>Quiz Attempt History</h2>
              </div>
            </div>

            <div className="weak-topics-list">
              {attempts.map((a, i) => {
                const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
                const barColor = pct >= 60 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                const bgColor = pct >= 60 ? "#ecfdf5" : pct >= 40 ? "#fffbeb" : "#fef2f2";
                const textColor = pct >= 60 ? "#166534" : pct >= 40 ? "#92400e" : "#991b1b";

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 18px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BarChart3 size={20} style={{ color: barColor }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>{a.quiz_title}</strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
                        <div
                          style={{
                            flex: 1,
                            height: "8px",
                            background: "#e2e8f0",
                            borderRadius: "999px",
                            overflow: "hidden",
                            maxWidth: "200px",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: barColor,
                              borderRadius: "999px",
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                          {a.score}/{a.total_marks}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "4px 14px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: 700,
                        fontFamily: "Manrope, sans-serif",
                        background: bgColor,
                        color: textColor,
                        flexShrink: 0,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== COURSE MATERIALS ===== */}
        <section>
          <div className="learning-section-title">
            <div>
              <span className="learning-kicker">COURSE MATERIALS</span>
              <h2>Study Resources</h2>
            </div>
          </div>

          {materials.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e7e9f0",
                borderRadius: "16px",
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  background: "#eef2ff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <FileText size={28} style={{ color: "#635bff" }} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a" }}>No Materials Yet</h3>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#667085" }}>
                Your teacher hasn&apos;t uploaded any study materials for this class yet.
              </p>
            </div>
          ) : (
            <div className="weak-topics-list">
              {materials.map((mat) => {
                const FileIcon = FILE_ICONS[mat.file_type?.split("/").pop() || ""] || FileText;
                return (
                  <div
                    key={mat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 18px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "#eef2ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileIcon size={20} style={{ color: "#4f46e5" }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: "14.5px", color: "#0f172a" }}>{mat.title}</strong>
                      <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                        {mat.file_name} &middot; {formatFileSize(mat.file_size)}
                      </div>
                      {mat.description && (
                        <div style={{ fontSize: "13px", color: "#667085", marginTop: "4px" }}>
                          {mat.description}
                        </div>
                      )}
                    </div>

                    <a
                      href={mat.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "#4f46e5",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        textDecoration: "none",
                      }}
                      title="Open / Download"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </section>
    </main>
  );
}
