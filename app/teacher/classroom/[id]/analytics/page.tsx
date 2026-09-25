"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  ClipboardCheck,
  BarChart3,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  BookOpen,
  RotateCcw,
  Calendar,
  GraduationCap,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FormattedMessage } from "@/components/ai/FormattedMessage";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  registration_no: string | null;
};

type StudentAnalytics = {
  studentId: string;
  name: string;
  registrationNo: string;
  email: string;
  attendedSessions: number;
  totalSessions: number;
  attendanceRate: number;
  averageQuizScore: number;
  quizCount: number;
  status: "Excellence" | "Good" | "Needs Help" | "At Risk";
};

type WeakTopic = {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
  needsAttention: boolean;
};

type AIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export default function TeacherClassroomAnalytics() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classroom, setClassroom] = useState<Classroom | null>(null);

  // Computed Analytics
  const [students, setStudents] = useState<Student[]>([]);
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [overallAttendanceRate, setOverallAttendanceRate] = useState(0);
  const [classQuizAverage, setClassQuizAverage] = useState(0);
  const [highestQuizScore, setHighestQuizScore] = useState(0);
  const [lowestQuizScore, setLowestQuizScore] = useState(0);
  const [totalQuizzesCount, setTotalQuizzesCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "students">("overview");

  // AI Analytics Copilot State
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello Professor! 👋 I am your **AI Classroom Analytics Copilot**. I have analyzed your classroom's attendance logs, quiz results, and student performance data.\n\nAsk me anything about this class—like identifying struggling students, breaking down topic weak points, or drafting remedial teaching plans!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadClassroomAnalytics();
  }, [classroomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiLoading]);

  async function loadClassroomAnalytics() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 1. Get Classroom
      const { data: classData, error: classError } = await supabase
        .from("classrooms")
        .select("id, name, subject, join_code")
        .eq("id", classroomId)
        .eq("teacher_id", user.id)
        .single();

      if (classError || !classData) {
        throw new Error("Classroom not found or unauthorized access.");
      }

      setClassroom(classData);

      // 2. Get Enrolled Students
      const { data: members, error: membersError } = await supabase
        .from("class_members")
        .select("student_id")
        .eq("classroom_id", classroomId);

      if (membersError) throw membersError;

      const studentIds = (members || []).map((m) => m.student_id);

      let studentProfiles: Student[] = [];
      if (studentIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from("students")
          .select("id, full_name, email, registration_no")
          .in("id", studentIds);

        if (profError) throw profError;
        studentProfiles = profiles || [];
      }
      setStudents(studentProfiles);

      // 3. Get Attendance Records
      const { data: attendanceRecords, error: attError } = await supabase
        .from("attendance")
        .select("student_id, attendance_date, status")
        .eq("classroom_id", classroomId);

      if (attError) throw attError;

      const records = attendanceRecords || [];
      const distinctDates = [...new Set(records.map((r) => r.attendance_date))];
      const sessionCount = distinctDates.length;
      setTotalSessions(sessionCount);

      // Compute attendance per student
      const studentAttMap = new Map<string, { attended: number; total: number }>();
      studentProfiles.forEach((s) => {
        studentAttMap.set(s.id, { attended: 0, total: sessionCount });
      });

      records.forEach((r) => {
        if (r.status === "present" && studentAttMap.has(r.student_id)) {
          const current = studentAttMap.get(r.student_id)!;
          current.attended += 1;
        }
      });

      const totalPossibleSlots = studentProfiles.length * sessionCount;
      const totalPresents = records.filter((r) => r.status === "present").length;
      const computedOverallAtt =
        totalPossibleSlots > 0
          ? Math.round((totalPresents / totalPossibleSlots) * 100)
          : sessionCount > 0
          ? 100
          : 0;
      setOverallAttendanceRate(computedOverallAtt);

      // 4. Get Quizzes & Attempts
      const { data: quizzesData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, question_count")
        .eq("classroom_id", classroomId);

      if (quizError) throw quizError;

      const quizList = quizzesData || [];
      setTotalQuizzesCount(quizList.length);
      const quizIds = quizList.map((q) => q.id);

      let attemptsList: any[] = [];
      let questionsList: any[] = [];
      let answersList: any[] = [];

      if (quizIds.length > 0) {
        // Attempts
        const { data: attData } = await supabase
          .from("quiz_attempts")
          .select("id, quiz_id, student_id, score, total_marks, status")
          .in("quiz_id", quizIds)
          .eq("status", "submitted");

        attemptsList = attData || [];

        // Questions
        const { data: qData } = await supabase
          .from("quiz_questions")
          .select("id, quiz_id, topic")
          .in("quiz_id", quizIds);

        questionsList = qData || [];

        // Answers
        if (attemptsList.length > 0) {
          const attemptIds = attemptsList.map((a) => a.id);
          const { data: ansData } = await supabase
            .from("quiz_answers")
            .select("question_id, is_correct")
            .in("attempt_id", attemptIds);

          answersList = ansData || [];
        }
      }

      // Compute Quiz Averages
      if (attemptsList.length > 0) {
        const percentages = attemptsList.map((a) =>
          a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0
        );
        const avg = Math.round(
          percentages.reduce((a, b) => a + b, 0) / percentages.length
        );
        setClassQuizAverage(avg);
        setHighestQuizScore(Math.round(Math.max(...percentages)));
        setLowestQuizScore(Math.round(Math.min(...percentages)));
      } else {
        setClassQuizAverage(0);
        setHighestQuizScore(0);
        setLowestQuizScore(0);
      }

      // Compute Topic Mastery & Weak Points
      const questionTopicMap = new Map<string, string>();
      questionsList.forEach((q) => {
        questionTopicMap.set(q.id, q.topic || "General Concepts");
      });

      const topicAggregation: Record<string, { total: number; correct: number }> = {};
      answersList.forEach((ans) => {
        const topic = questionTopicMap.get(ans.question_id) || "General Concepts";
        if (!topicAggregation[topic]) {
          topicAggregation[topic] = { total: 0, correct: 0 };
        }
        topicAggregation[topic].total += 1;
        if (ans.is_correct) {
          topicAggregation[topic].correct += 1;
        }
      });

      const computedWeakTopics: WeakTopic[] = Object.entries(topicAggregation).map(
        ([topic, data]) => {
          const rate = Math.round((data.correct / data.total) * 100);
          return {
            topic,
            totalQuestions: data.total,
            correctAnswers: data.correct,
            successRate: rate,
            needsAttention: rate < 60,
          };
        }
      );
      computedWeakTopics.sort((a, b) => a.successRate - b.successRate);
      setWeakTopics(computedWeakTopics);

      // 5. Individual Student Analytics Aggregation
      const studentMapScore = new Map<string, number[]>();
      attemptsList.forEach((a) => {
        const pct = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
        if (!studentMapScore.has(a.student_id)) {
          studentMapScore.set(a.student_id, []);
        }
        studentMapScore.get(a.student_id)!.push(pct);
      });

      const aggregatedStudentStats: StudentAnalytics[] = studentProfiles.map((s) => {
        const att = studentAttMap.get(s.id) || { attended: 0, total: sessionCount };
        const attRate =
          att.total > 0 ? Math.round((att.attended / att.total) * 100) : 100;

        const scores = studentMapScore.get(s.id) || [];
        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        let status: StudentAnalytics["status"] = "Good";
        if (attRate < 75 || (scores.length > 0 && avgScore < 50)) {
          status = "At Risk";
        } else if (scores.length > 0 && avgScore < 65) {
          status = "Needs Help";
        } else if (attRate >= 90 && avgScore >= 85) {
          status = "Excellence";
        }

        return {
          studentId: s.id,
          name: s.full_name || s.email.split("@")[0],
          registrationNo: s.registration_no || "N/A",
          email: s.email,
          attendedSessions: att.attended,
          totalSessions: att.total,
          attendanceRate: attRate,
          averageQuizScore: avgScore,
          quizCount: scores.length,
          status,
        };
      });

      // Sort with At-Risk first
      aggregatedStudentStats.sort((a, b) => {
        if (a.status === "At Risk" && b.status !== "At Risk") return -1;
        if (b.status === "At Risk" && a.status !== "At Risk") return 1;
        return a.attendanceRate - b.attendanceRate;
      });

      setStudentAnalytics(aggregatedStudentStats);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load classroom analytics.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Teacher AI Query
  async function handleAIQuery(text?: string) {
    const query = (text || aiInput).trim();
    if (!query || aiLoading || !classroom) return;

    setAiError(null);
    setAiInput("");

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [...aiMessages, userMessage];
    setAiMessages(updated);
    setAiLoading(true);

    try {
      const payload = {
        query,
        history: updated.slice(1, -1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        classInfo: {
          name: classroom.name,
          subject: classroom.subject,
          totalStudents: students.length,
        },
        analytics: {
          attendance: {
            totalSessions,
            overallAttendanceRate,
            chronicAbsentees: studentAnalytics
              .filter((s) => s.attendanceRate < 75)
              .map((s) => ({
                name: s.name,
                registrationNo: s.registrationNo,
                rate: s.attendanceRate,
                attended: s.attendedSessions,
                total: s.totalSessions,
              })),
          },
          quizzes: {
            totalQuizzes: totalQuizzesCount,
            classAverageScorePercentage: classQuizAverage,
            highestScorePercentage: highestQuizScore,
            lowestScorePercentage: lowestQuizScore,
            totalAttempts: studentAnalytics.reduce((sum, s) => sum + s.quizCount, 0),
          },
          weakTopics: weakTopics.map((t) => ({
            topic: t.topic,
            successRate: t.successRate,
            totalQuestions: t.totalQuestions,
            needsAttention: t.needsAttention,
          })),
          studentPerformance: studentAnalytics.map((s) => ({
            name: s.name,
            registrationNo: s.registrationNo,
            attendanceRate: s.attendanceRate,
            averageQuizScore: s.averageQuizScore,
            status: s.status,
          })),
        },
      };

      const res = await fetch("/api/ai/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI analytics.");
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setAiMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to communicate with AI model.");
    } finally {
      setAiLoading(false);
    }
  }

  const presetQueries = [
    { label: "📊 Class Health & Attendance Summary", prompt: "Give me an executive summary of this class's overall performance, attendance health, and main trends." },
    { label: "🚨 Identify At-Risk Students", prompt: "List all at-risk students in this class based on their attendance and quiz scores, and explain where they are falling behind." },
    { label: "🎯 Weak Points & Remedial Plan", prompt: "What are the primary weak points and topics where students struggled the most? Provide a concrete remedial action plan for next class." },
    { label: "✉️ Low Attendance Message Draft", prompt: "Draft a firm but encouraging email/announcement to students who have under 75% attendance regarding upcoming class requirements." },
    { label: "💡 3 Recommended Practice Questions", prompt: "Based on our weakest topic, generate 3 practice multiple-choice questions with answer explanations that I can assign as homework." },
  ];

  const atRiskStudents = studentAnalytics.filter((s) => s.status === "At Risk");
  const criticalWeakTopics = weakTopics.filter((w) => w.needsAttention);

  if (loading) {
    return (
      <main className="classroom-loading">
        <Loader2 className="loading-icon spin" size={38} />
        <p>Analyzing class metrics and student records...</p>
      </main>
    );
  }

  if (error || !classroom) {
    return (
      <main className="classroom-error">
        <div className="error-card">
          <h2>Analytics Unavailable</h2>
          <p>{error || "Classroom not found."}</p>
          <button
            className="primary-btn"
            onClick={() => router.push(`/teacher/classroom/${classroomId}`)}
          >
            <ArrowLeft size={18} />
            Back to Classroom
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="teacher-analytics-page">
      {/* Header */}
      <header className="classroom-header">
        <div className="classroom-header-left">
          <button
            className="back-btn"
            onClick={() => router.push(`/teacher/classroom/${classroomId}`)}
            title="Back to Classroom Workspace"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <div className="page-kicker">EduNexa AI Analytics</div>
            <h1>{classroom.name} Analytics</h1>
            <p>Subject: {classroom.subject} • Join Code: {classroom.join_code}</p>
          </div>
        </div>

        <div className="analytics-header-badge">
          <Sparkles size={16} />
          <span>AI Insights Active</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="analytics-container">
        {/* Left Column: Data Metrics & Breakdowns */}
        <section className="analytics-data-column">
          {/* KPI Cards */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="kpi-icon-wrap kpi-blue">
                <Users size={22} />
              </div>
              <div className="kpi-info">
                <span>Total Enrolled</span>
                <strong>{students.length}</strong>
                <small>{atRiskStudents.length} requiring intervention</small>
              </div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-icon-wrap kpi-green">
                <ClipboardCheck size={22} />
              </div>
              <div className="kpi-info">
                <span>Class Attendance</span>
                <strong>{overallAttendanceRate}%</strong>
                <small>{totalSessions} recorded sessions</small>
              </div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-icon-wrap kpi-purple">
                <BarChart3 size={22} />
              </div>
              <div className="kpi-info">
                <span>Quiz Average</span>
                <strong>{classQuizAverage}%</strong>
                <small>High: {highestQuizScore}% • Low: {lowestQuizScore}%</small>
              </div>
            </div>

            <div className="analytics-kpi-card">
              <div className="kpi-icon-wrap kpi-amber">
                <AlertTriangle size={22} />
              </div>
              <div className="kpi-info">
                <span>Weak Topics</span>
                <strong>{criticalWeakTopics.length}</strong>
                <small>Below 60% mastery</small>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="analytics-tab-bar">
            <button
              className={`analytics-tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview & Gaps
            </button>
            <button
              className={`analytics-tab-btn ${activeTab === "topics" ? "active" : ""}`}
              onClick={() => setActiveTab("topics")}
            >
              Topic Breakdown ({weakTopics.length})
            </button>
            <button
              className={`analytics-tab-btn ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              Student Roster ({studentAnalytics.length})
            </button>
          </div>

          {/* TAB 1: Overview & Weak Points */}
          {activeTab === "overview" && (
            <div className="analytics-overview-panel">
              {/* Weak Points Card */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h3>Identified Learning Gaps & Weak Topics</h3>
                    <p>Topics where students answered incorrectly most frequently</p>
                  </div>
                  <button
                    className="ai-card-action-btn"
                    onClick={() =>
                      handleAIQuery(
                        "Analyze our weak topics in detail and recommend instructional adjustments for next lecture."
                      )
                    }
                  >
                    <Sparkles size={14} />
                    Analyze Weak Points with AI
                  </button>
                </div>

                {weakTopics.length === 0 ? (
                  <div className="analytics-empty-box">
                    <BookOpen size={30} />
                    <p>No quiz questions or topic data available yet for this class.</p>
                  </div>
                ) : (
                  <div className="weak-topics-list">
                    {weakTopics.slice(0, 5).map((topic) => (
                      <div key={topic.topic} className="weak-topic-row">
                        <div className="topic-name-wrap">
                          <strong>{topic.topic}</strong>
                          <span>
                            {topic.correctAnswers} of {topic.totalQuestions} answers correct
                          </span>
                        </div>

                        <div className="topic-rate-bar">
                          <div
                            className={`topic-rate-fill ${
                              topic.needsAttention ? "fill-alert" : "fill-pass"
                            }`}
                            style={{ width: `${topic.successRate}%` }}
                          />
                        </div>

                        <div className="topic-status-tag">
                          <strong>{topic.successRate}%</strong>
                          {topic.needsAttention ? (
                            <span className="badge-alert">Weak Point</span>
                          ) : (
                            <span className="badge-pass">Proficient</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* At-Risk Students Summary */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h3>At-Risk Students Watchlist</h3>
                    <p>Students with attendance below 75% or quiz scores below 50%</p>
                  </div>
                  <button
                    className="ai-card-action-btn"
                    onClick={() =>
                      handleAIQuery(
                        "Please list every at-risk student, specify their exact weak areas, and propose an intervention strategy."
                      )
                    }
                  >
                    <Sparkles size={14} />
                    Generate Intervention Plan
                  </button>
                </div>

                {atRiskStudents.length === 0 ? (
                  <div className="analytics-empty-box success">
                    <CheckCircle2 size={30} />
                    <p>Great news! No students currently fall into the at-risk category.</p>
                  </div>
                ) : (
                  <div className="at-risk-table-wrap">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Reg No.</th>
                          <th>Attendance</th>
                          <th>Quiz Avg</th>
                          <th>Risk Factor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atRiskStudents.map((s) => (
                          <tr key={s.studentId}>
                            <td>
                              <strong>{s.name}</strong>
                              <small>{s.email}</small>
                            </td>
                            <td>{s.registrationNo}</td>
                            <td>
                              <span
                                className={
                                  s.attendanceRate < 75
                                    ? "text-alert"
                                    : "text-pass"
                                }
                              >
                                {s.attendanceRate}% ({s.attendedSessions}/{s.totalSessions})
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  s.averageQuizScore < 50
                                    ? "text-alert"
                                    : "text-pass"
                                }
                              >
                                {s.averageQuizScore}%
                              </span>
                            </td>
                            <td>
                              <span className="badge-danger">
                                {s.attendanceRate < 75 && s.averageQuizScore < 50
                                  ? "Attendance & Scores"
                                  : s.attendanceRate < 75
                                  ? "Low Attendance"
                                  : "Failing Scores"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: All Topics */}
          {activeTab === "topics" && (
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3>Comprehensive Topic Mastery</h3>
                  <p>All topics evaluated through classroom assessments</p>
                </div>
              </div>

              {weakTopics.length === 0 ? (
                <div className="analytics-empty-box">
                  <p>No topic assessment data available yet.</p>
                </div>
              ) : (
                <div className="weak-topics-list">
                  {weakTopics.map((t) => (
                    <div key={t.topic} className="weak-topic-row">
                      <div className="topic-name-wrap">
                        <strong>{t.topic}</strong>
                        <span>
                          {t.correctAnswers} / {t.totalQuestions} questions correct
                        </span>
                      </div>

                      <div className="topic-rate-bar">
                        <div
                          className={`topic-rate-fill ${
                            t.needsAttention ? "fill-alert" : "fill-pass"
                          }`}
                          style={{ width: `${t.successRate}%` }}
                        />
                      </div>

                      <div className="topic-status-tag">
                        <strong>{t.successRate}%</strong>
                        {t.needsAttention ? (
                          <span className="badge-alert">Needs Attention</span>
                        ) : (
                          <span className="badge-pass">Mastered</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Student Roster */}
          {activeTab === "students" && (
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3>Student Roster & Performance Matrix</h3>
                  <p>Full academic standing of each enrolled student</p>
                </div>
              </div>

              <div className="at-risk-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Reg No.</th>
                      <th>Attendance</th>
                      <th>Quiz Average</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAnalytics.map((s) => (
                      <tr key={s.studentId}>
                        <td>
                          <strong>{s.name}</strong>
                          <small>{s.email}</small>
                        </td>
                        <td>{s.registrationNo}</td>
                        <td>
                          {s.attendanceRate}% ({s.attendedSessions}/{s.totalSessions})
                        </td>
                        <td>{s.quizCount > 0 ? `${s.averageQuizScore}%` : "No attempts"}</td>
                        <td>
                          <span
                            className={`badge-${
                              s.status === "Excellence"
                                ? "pass"
                                : s.status === "At Risk"
                                ? "danger"
                                : s.status === "Needs Help"
                                ? "alert"
                                : "info"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: AI Classroom Analytics Copilot */}
        <section className="analytics-copilot-column">
          <div className="ai-copilot-card">
            {/* Copilot Header */}
            <div className="copilot-header">
              <div className="copilot-title-box">
                <div className="copilot-avatar">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3>AI Analytics Copilot</h3>
                  <span>Google Gemini Flash Engine</span>
                </div>
              </div>

              <button
                className="ai-icon-btn"
                onClick={() =>
                  setAiMessages([
                    {
                      id: "reset",
                      role: "assistant",
                      content:
                        "Chat cleared! What other analytics insights can I produce for this class?",
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    },
                  ])
                }
                title="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Quick Queries Pills */}
            <div className="copilot-pills-bar">
              <span className="pills-kicker">Quick Queries:</span>
              <div className="copilot-pills">
                {presetQueries.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="copilot-pill"
                    onClick={() => handleAIQuery(item.prompt)}
                    disabled={aiLoading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="copilot-messages">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`copilot-msg-row ${
                    msg.role === "user" ? "user-row" : "assistant-row"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="copilot-bot-avatar">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div className="copilot-bubble">
                    {msg.role === "user" ? (
                      <p>{msg.content}</p>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}
                    <span className="copilot-time">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="copilot-msg-row assistant-row">
                  <div className="copilot-bot-avatar">
                    <Sparkles size={14} />
                  </div>
                  <div className="copilot-bubble copilot-thinking">
                    <div className="ai-typing-indicator">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                    <span>Analyzing class data...</span>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="copilot-error-banner">
                  <AlertTriangle size={16} />
                  <span>{aiError}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form
              className="copilot-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAIQuery();
              }}
            >
              <textarea
                ref={inputRef}
                rows={2}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAIQuery();
                  }
                }}
                placeholder="Ask AI about attendance, test averages, weak topics, or remediation..."
                className="copilot-textarea"
              />

              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="copilot-send-btn"
                title="Send query"
              >
                {aiLoading ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
