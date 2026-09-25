"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  FileQuestion,
  Users,
  CheckCircle2,
  Lock,
  Play,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  classroom_id: string;
  title: string;
  description: string | null;
  question_count: number;
  duration_minutes: number;
  access_type: string;
  randomize_questions: boolean;
  randomize_options: boolean;
  one_attempt: boolean;
  result_release: string;
  session_code: string | null;
  is_published: boolean;
};

type Classroom = {
  id: string;
  name: string;
  subject: string | null;
};

type QuizCard = Quiz & {
  classroom?: Classroom;
  eligible: boolean;
  eligibilityReason?: string;
};

export default function StudentQuizzesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
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

      setStudentId(user.id);

      // Get classrooms joined by this student
      const { data: memberships, error: membershipError } =
        await supabase
          .from("class_members")
          .select("classroom_id")
          .eq("student_id", user.id);

      if (membershipError) {
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setQuizzes([]);
        return;
      }

      const classroomIds = memberships.map(
        (membership) => membership.classroom_id
      );

      // Get classroom information
      const { data: classrooms, error: classroomError } =
        await supabase
          .from("classrooms")
          .select("id,name,subject")
          .in("id", classroomIds);

      if (classroomError) {
        throw classroomError;
      }

      // Get published quizzes
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select(`
          id,
          classroom_id,
          title,
          description,
          question_count,
          duration_minutes,
          access_type,
          randomize_questions,
          randomize_options,
          one_attempt,
          result_release,
          session_code,
          is_published
        `)
        .in("classroom_id", classroomIds)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (quizError) {
        throw quizError;
      }

      if (!quizData || quizData.length === 0) {
        setQuizzes([]);
        return;
      }

      // Today's date for attendance eligibility
      const today = new Date().toISOString().split("T")[0];

      // Get today's attendance
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("classroom_id,student_id,status,attendance_date")
          .eq("student_id", user.id)
          .eq("attendance_date", today);

      if (attendanceError) {
        console.warn("Attendance check:", attendanceError.message);
      }

      const result: QuizCard[] = quizData.map((quiz) => {
        const classroom = classrooms?.find(
          (c) => c.id === quiz.classroom_id
        );

        let eligible = true;
        let eligibilityReason = "";

        // All enrolled students
        if (quiz.access_type === "all") {
          eligible = true;
        }

        // Present students only
        if (quiz.access_type === "present") {
          const attendance = attendanceData?.find(
            (record) =>
              record.classroom_id === quiz.classroom_id &&
              record.student_id === user.id
          );

          if (!attendance || attendance.status !== "present") {
            eligible = false;
            eligibilityReason =
              "You are not marked present for today's class.";
          }
        }

        // Selected students
        if (quiz.access_type === "selected") {
          eligible = false;
          eligibilityReason =
            "This quiz is available only to selected students.";
        }

        return {
          ...quiz,
          classroom,
          eligible,
          eligibilityReason,
        };
      });

      setQuizzes(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to load quizzes.");
    } finally {
      setLoading(false);
    }
  }

  function startQuiz(quiz: QuizCard) {
    if (!quiz.eligible) return;

    router.push(`/student/quizzes/${quiz.id}`);
  }

  function goBack() {
    router.push("/student");
  }

  if (loading) {
    return (
      <main className="quiz-page">
        <div className="loading-screen">
          <Loader2 className="spinner" size={32} />
          <p>Loading your quizzes...</p>
        </div>

        <style jsx>{`
          .quiz-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at top left,
                rgba(99, 102, 241, 0.12),
                transparent 30%
              ),
              #f8fafc;
          }

          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            color: #64748b;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="back-button" onClick={goBack}>
            <ArrowLeft size={19} />
            Dashboard
          </button>

          <div className="brand">
            <div className="brand-icon">E</div>
            <span>EduNexa</span>
          </div>

          <div className="student-label">
            Student Portal
          </div>
        </div>
      </header>

      <section className="content">
        <div className="heading-row">
          <div>
            <div className="eyebrow">ASSESSMENTS</div>
            <h1>My Quizzes</h1>
            <p>
              Attempt classroom quizzes and track your learning progress.
            </p>
          </div>

          <div className="quiz-count">
            <FileQuestion size={19} />
            <span>{quizzes.length} Quiz{quizzes.length !== 1 ? "zes" : ""}</span>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileQuestion size={34} />
            </div>

            <h2>No quizzes available</h2>

            <p>
              Your teacher has not published any quizzes for your classrooms
              yet.
            </p>

            <button onClick={goBack} className="secondary-button">
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="quiz-grid">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className={`quiz-card ${
                  !quiz.eligible ? "quiz-disabled" : ""
                }`}
              >
                <div className="card-top">
                  <div className="quiz-icon">
                    <FileQuestion size={23} />
                  </div>

                  <div
                    className={`availability ${
                      quiz.eligible ? "available" : "locked"
                    }`}
                  >
                    {quiz.eligible ? (
                      <>
                        <CheckCircle2 size={15} />
                        Available
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        Locked
                      </>
                    )}
                  </div>
                </div>

                <div className="quiz-info">
                  <h2>{quiz.title}</h2>

                  <div className="class-name">
                    {quiz.classroom?.name || "Classroom"}

                    {quiz.classroom?.subject && (
                      <span> · {quiz.classroom.subject}</span>
                    )}
                  </div>

                  {quiz.description && (
                    <p className="description">
                      {quiz.description}
                    </p>
                  )}
                </div>

                <div className="quiz-meta">
                  <div>
                    <Clock3 size={16} />
                    <span>{quiz.duration_minutes} min</span>
                  </div>

                  <div>
                    <FileQuestion size={16} />
                    <span>{quiz.question_count} questions</span>
                  </div>

                  <div>
                    <Users size={16} />
                    <span>
                      {quiz.access_type === "present"
                        ? "Present students"
                        : quiz.access_type === "selected"
                        ? "Selected students"
                        : "All students"}
                    </span>
                  </div>
                </div>

                {quiz.one_attempt && (
                  <div className="attempt-note">
                    <span className="dot"></span>
                    One attempt only
                  </div>
                )}

                {!quiz.eligible && quiz.eligibilityReason && (
                  <div className="locked-message">
                    <Lock size={16} />
                    {quiz.eligibilityReason}
                  </div>
                )}

                <button
                  className={`start-button ${
                    !quiz.eligible ? "disabled-button" : ""
                  }`}
                  disabled={!quiz.eligible}
                  onClick={() => startQuiz(quiz)}
                >
                  {quiz.eligible ? (
                    <>
                      <Play size={17} />
                      Start Quiz
                    </>
                  ) : (
                    <>
                      <Lock size={17} />
                      Not Eligible
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .quiz-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(99, 102, 241, 0.1),
              transparent 30%
            ),
            radial-gradient(
              circle at 100% 20%,
              rgba(14, 165, 233, 0.08),
              transparent 25%
            ),
            #f8fafc;
          color: #0f172a;
        }

        .topbar {
          height: 72px;
          background: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .topbar-inner {
          max-width: 1180px;
          height: 100%;
          margin: auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .back-button {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-weight: 600;
          cursor: pointer;
          padding: 10px 0;
        }

        .back-button:hover {
          color: #4f46e5;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 19px;
        }

        .brand-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
        }

        .student-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .content {
          max-width: 1180px;
          margin: auto;
          padding: 52px 24px 70px;
        }

        .heading-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 34px;
        }

        .eyebrow {
          font-size: 12px;
          letter-spacing: 0.12em;
          font-weight: 800;
          color: #6366f1;
          margin-bottom: 8px;
        }

        h1 {
          font-size: clamp(30px, 5vw, 44px);
          line-height: 1;
          margin: 0 0 12px;
          letter-spacing: -0.04em;
        }

        .heading-row p {
          margin: 0;
          color: #64748b;
          font-size: 15px;
        }

        .quiz-count {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 11px 15px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px 17px;
          border-radius: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          margin-bottom: 22px;
        }

        .quiz-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .quiz-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 23px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        .quiz-card:hover {
          transform: translateY(-5px);
          border-color: #c7d2fe;
          box-shadow: 0 20px 42px rgba(15, 23, 42, 0.09);
        }

        .quiz-disabled {
          opacity: 0.78;
        }

        .quiz-disabled:hover {
          transform: none;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .quiz-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #eef2ff;
          color: #4f46e5;
        }

        .availability {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 800;
          padding: 7px 10px;
          border-radius: 999px;
        }

        .available {
          color: #15803d;
          background: #f0fdf4;
        }

        .locked {
          color: #64748b;
          background: #f1f5f9;
        }

        .quiz-info {
          flex: 1;
        }

        .quiz-info h2 {
          margin: 0 0 8px;
          font-size: 20px;
          letter-spacing: -0.02em;
        }

        .class-name {
          font-size: 13px;
          font-weight: 700;
          color: #6366f1;
          margin-bottom: 13px;
        }

        .description {
          font-size: 14px;
          line-height: 1.6;
          color: #64748b;
          margin: 0 0 18px;
        }

        .quiz-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          padding: 16px 0;
          border-top: 1px solid #eef2f7;
          border-bottom: 1px solid #eef2f7;
          margin-top: 18px;
        }

        .quiz-meta div {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #64748b;
        }

        .attempt-note {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          margin: 14px 0;
        }

        .dot {
          width: 7px;
          height: 7px;
          background: #6366f1;
          border-radius: 50%;
        }

        .locked-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px;
          background: #f8fafc;
          border-radius: 10px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          margin: 12px 0;
        }

        .start-button {
          width: 100%;
          height: 46px;
          border: 0;
          border-radius: 12px;
          background: #4f46e5;
          color: white;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .start-button:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .disabled-button {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .disabled-button:hover {
          background: #e2e8f0;
          transform: none;
        }

        .empty-state {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 70px 25px;
          text-align: center;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
        }

        .empty-icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: #eef2ff;
          color: #4f46e5;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
        }

        .empty-state h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .empty-state p {
          color: #64748b;
          margin: 0 auto 24px;
          max-width: 460px;
          line-height: 1.6;
        }

        .secondary-button {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
          border-radius: 11px;
          padding: 11px 18px;
          font-weight: 700;
          cursor: pointer;
        }

        .secondary-button:hover {
          border-color: #6366f1;
          color: #4f46e5;
        }

        @media (max-width: 900px) {
          .quiz-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .topbar-inner {
            padding: 0 16px;
          }

          .student-label {
            display: none;
          }

          .content {
            padding: 35px 16px 50px;
          }

          .heading-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .quiz-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}