"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  Search,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Quiz = {
  id: string;
  classroom_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  question_count: number;
  duration_minutes: number;
  is_published: boolean;
  created_at: string;
};

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  topic: string | null;
  marks: number;
};

type Attempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  status: string;
};

type Answer = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
  marks_obtained: number | null;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  registration_no: string | null;
};

type Result = {
  attemptId: string;
  studentId: string;
  studentName: string;
  registrationNo: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correct: number;
  wrong: number;
  unanswered: number;
  submittedAt: string | null;
  status: string;
};

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = params.id as string;
  const quizId = params.quizId as string;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [search, setSearch] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<Result | null>(null);

  useEffect(() => {
    loadResults();
  }, [quizId]);

  async function loadResults() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // ---------------------------------------
      // LOAD QUIZ
      // ---------------------------------------

      const { data: quizData, error: quizError } =
        await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .eq("teacher_id", user.id)
          .single();

      if (quizError) {
        console.error(quizError);
        alert("Unable to load quiz.");
        router.push(
          `/teacher/classroom/${classroomId}/quizzes`
        );
        return;
      }

      setQuiz(quizData);

      // ---------------------------------------
      // LOAD QUESTIONS
      // ---------------------------------------

      const { data: questionData, error: questionError } =
        await supabase
          .from("quiz_questions")
          .select(
            `
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            topic,
            marks
          `
          )
          .eq("quiz_id", quizId)
          .order("question_order", {
            ascending: true,
          });

      if (questionError) {
        console.error(questionError);
        alert(questionError.message);
        return;
      }

      const questions: Question[] = questionData || [];

      // ---------------------------------------
      // LOAD ATTEMPTS
      // ---------------------------------------

      const { data: attemptsData, error: attemptsError } =
        await supabase
          .from("quiz_attempts")
          .select("*")
          .eq("quiz_id", quizId)
          .order("submitted_at", {
            ascending: false,
          });

      if (attemptsError) {
        console.error(attemptsError);
        alert(attemptsError.message);
        return;
      }

      const attempts: Attempt[] = attemptsData || [];

      if (attempts.length === 0) {
        setResults([]);
        return;
      }

      // ---------------------------------------
      // LOAD STUDENT PROFILES
      // ---------------------------------------

      const studentIds = [
        ...new Set(attempts.map((attempt) => attempt.student_id)),
      ];

      const { data: profilesData, error: profilesError } =
        await supabase
          .from("profiles")
          .select("id, full_name, registration_no")
          .in("id", studentIds);

      if (profilesError) {
        console.error(profilesError);
      }

      const profiles: StudentProfile[] =
        profilesData || [];

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      );

      // ---------------------------------------
      // LOAD ANSWERS
      // ---------------------------------------

      const attemptResults = await Promise.all(
        attempts.map(async (attempt) => {
          const { data: answerData, error: answerError } =
            await supabase
              .from("quiz_answers")
              .select("*")
              .eq("attempt_id", attempt.id);

          if (answerError) {
            console.error(answerError);
          }

          const answers: Answer[] = answerData || [];

          const questionMap = new Map(
            questions.map((question) => [
              question.id,
              question,
            ])
          );

          let correct = 0;
          let wrong = 0;
          let unanswered = 0;
          let score = 0;

          answers.forEach((answer) => {
            const question = questionMap.get(
              answer.question_id
            );

            if (!question) return;

            const selected = answer.selected_option;

            if (!selected) {
              unanswered++;
              return;
            }

            const isCorrect =
              answer.is_correct ??
              selected === question.correct_option;

            if (isCorrect) {
              correct++;

              score +=
                Number(
                  answer.marks_obtained ?? question.marks
                ) || 0;
            } else {
              wrong++;
            }
          });

          const totalMarks =
            Number(
              attempt.total_marks ??
                questions.reduce(
                  (sum, question) =>
                    sum + Number(question.marks || 0),
                  0
                )
            ) || 0;

          if (
            attempt.score !== null &&
            attempt.score !== undefined
          ) {
            score = Number(attempt.score);
          }

          const percentage =
            totalMarks > 0
              ? Math.round((score / totalMarks) * 100)
              : 0;

          const profile = profileMap.get(
            attempt.student_id
          );

          return {
            attemptId: attempt.id,
            studentId: attempt.student_id,
            studentName:
              profile?.full_name || "Unknown Student",
            registrationNo:
              profile?.registration_no || "—",
            score,
            totalMarks,
            percentage,
            correct,
            wrong,
            unanswered,
            submittedAt: attempt.submitted_at,
            status: attempt.status,
          };
        })
      );

      setResults(attemptResults);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while loading results.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------
  // FILTER
  // ---------------------------------------

  const filteredResults = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return results;

    return results.filter(
      (result) =>
        result.studentName
          .toLowerCase()
          .includes(value) ||
        result.registrationNo
          .toLowerCase()
          .includes(value)
    );
  }, [results, search]);

  // ---------------------------------------
  // STATISTICS
  // ---------------------------------------

  const averagePercentage =
    results.length > 0
      ? Math.round(
          results.reduce(
            (sum, result) => sum + result.percentage,
            0
          ) / results.length
        )
      : 0;

  const highestPercentage =
    results.length > 0
      ? Math.max(
          ...results.map((result) => result.percentage)
        )
      : 0;

  const passedCount = results.filter(
    (result) => result.percentage >= 40
  ).length;

  // ---------------------------------------
  // DOWNLOAD / PRINT PDF
  // ---------------------------------------

  function downloadPDF() {
    if (!quiz) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!printWindow) {
      alert("Please allow pop-ups to generate the PDF.");
      return;
    }

    const rows = results
      .map(
        (result, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(result.studentName)}</td>
            <td>${escapeHtml(result.registrationNo)}</td>
            <td>${result.score}/${result.totalMarks}</td>
            <td>${result.percentage}%</td>
            <td>${result.correct}</td>
            <td>${result.wrong}</td>
            <td>${result.unanswered}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(
            quiz.title
          )} - Quiz Results</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
            }

            h1 {
              margin: 0 0 6px;
              font-size: 24px;
            }

            .subtitle {
              color: #64748b;
              margin-bottom: 24px;
            }

            .summary {
              display: grid;
              grid-template-columns:
                repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }

            .summary-card {
              border: 1px solid #dbe3ef;
              border-radius: 8px;
              padding: 12px;
            }

            .summary-card span {
              display: block;
              font-size: 11px;
              color: #64748b;
              margin-bottom: 4px;
            }

            .summary-card strong {
              font-size: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              border: 1px solid #dbe3ef;
              padding: 9px;
              text-align: left;
              font-size: 11px;
            }

            th {
              background: #f1f5f9;
              font-weight: bold;
            }

            .footer {
              margin-top: 25px;
              font-size: 10px;
              color: #64748b;
            }

            @media print {
              body {
                padding: 10px;
              }
            }
          </style>
        </head>

        <body>
          <h1>${escapeHtml(quiz.title)}</h1>

          <div class="subtitle">
            Quiz Results Report
          </div>

          <div class="summary">
            <div class="summary-card">
              <span>Total Attempts</span>
              <strong>${results.length}</strong>
            </div>

            <div class="summary-card">
              <span>Average</span>
              <strong>${averagePercentage}%</strong>
            </div>

            <div class="summary-card">
              <span>Highest</span>
              <strong>${highestPercentage}%</strong>
            </div>

            <div class="summary-card">
              <span>Passed</span>
              <strong>${passedCount}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Registration No.</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Correct</th>
                <th>Wrong</th>
                <th>Unanswered</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="footer">
            Generated by EduNexa
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value: string | null) {
    if (!value) return "Not submitted";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // ---------------------------------------
  // LOADING
  // ---------------------------------------

  if (loading) {
    return (
      <>
        <div className="loading-page">
          <Loader2
            size={34}
            className="loading-icon"
          />

          <p>Loading quiz results...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 12px;
            background: #f8fafc;
            color: #64748b;
          }

          .loading-icon {
            color: #4f46e5;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="page">
      {/* HEADER */}

      <header className="header">
        <div className="header-left">
          <button
            className="back-button"
            onClick={() =>
              router.push(
                `/teacher/classroom/${classroomId}/quizzes`
              )
            }
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div className="eyebrow">
              TEACHER PORTAL
            </div>

            <h1>Quiz Results</h1>

            <p>
              {quiz?.title || "Quiz"} · Student
              performance
            </p>
          </div>
        </div>

        <button
          className="download-button"
          onClick={downloadPDF}
          disabled={results.length === 0}
        >
          <Download size={17} />
          Download PDF
        </button>
      </header>

      <main className="content">
        {/* QUIZ INFO */}

        <section className="quiz-info-card">
          <div className="quiz-info-icon">
            <FileText size={24} />
          </div>

          <div className="quiz-info-text">
            <h2>{quiz?.title}</h2>

            <p>
              {quiz?.description ||
                "Performance report for this classroom quiz."}
            </p>
          </div>

          <div className="quiz-info-meta">
            <div>
              <Clock3 size={15} />
              {quiz?.duration_minutes} min
            </div>

            <div>
              <FileText size={15} />
              {quiz?.question_count} Questions
            </div>
          </div>
        </section>

        {/* STATISTICS */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={20} />
            </div>

            <div>
              <span>Total Attempts</span>
              <strong>{results.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <BarChart3 size={20} />
            </div>

            <div>
              <span>Average Score</span>
              <strong>{averagePercentage}%</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Trophy size={20} />
            </div>

            <div>
              <span>Highest Score</span>
              <strong>{highestPercentage}%</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <span>Passed</span>
              <strong>{passedCount}</strong>
            </div>
          </div>
        </section>

        {/* RESULTS */}

        <section className="results-section">
          <div className="section-header">
            <div>
              <h2>Student Performance</h2>
              <p>
                View individual performance and quiz
                attempts.
              </p>
            </div>

            <div className="search-box">
              <Search size={17} />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search student..."
              />
            </div>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <BarChart3 size={28} />
              </div>

              <h3>No attempts yet</h3>

              <p>
                Student results will appear here after
                students complete this quiz.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Search size={28} />
              </div>

              <h3>No students found</h3>

              <p>
                Try searching with another name or
                registration number.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Registration No.</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Correct</th>
                    <th>Wrong</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResults.map(
                    (result, index) => (
                      <tr key={result.attemptId}>
                        <td className="rank-cell">
                          {index + 1}
                        </td>

                        <td>
                          <div className="student-cell">
                            <div className="avatar">
                              {result.studentName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {result.studentName}
                              </strong>

                              <span>
                                {result.status ===
                                "submitted"
                                  ? "Completed"
                                  : "In progress"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="registration">
                            {result.registrationNo}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {result.score}/
                            {result.totalMarks}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={
                              result.percentage >= 70
                                ? "percentage good"
                                : result.percentage >=
                                  40
                                ? "percentage average"
                                : "percentage low"
                            }
                          >
                            {result.percentage}%
                          </span>
                        </td>

                        <td>
                          <span className="correct">
                            <CheckCircle2 size={14} />
                            {result.correct}
                          </span>
                        </td>

                        <td>
                          <span className="wrong">
                            <XCircle size={14} />
                            {result.wrong}
                          </span>
                        </td>

                        <td>
                          <span className="date">
                            {formatDate(
                              result.submittedAt
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            className="view-button"
                            onClick={() =>
                              setSelectedResult(
                                result
                              )
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* STUDENT RESULT MODAL */}

      {selectedResult && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedResult(null);
            }
          }}
        >
          <div className="result-modal">
            <div className="modal-header">
              <div>
                <div className="eyebrow">
                  STUDENT RESULT
                </div>

                <h2>
                  {selectedResult.studentName}
                </h2>

                <p>
                  {selectedResult.registrationNo}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setSelectedResult(null)
                }
              >
                ×
              </button>
            </div>

            <div className="modal-score">
              <div className="score-circle">
                <strong>
                  {selectedResult.percentage}%
                </strong>

                <span>Score</span>
              </div>

              <div className="score-details">
                <div>
                  <span>Marks</span>
                  <strong>
                    {selectedResult.score}/
                    {selectedResult.totalMarks}
                  </strong>
                </div>

                <div>
                  <span>Correct</span>
                  <strong className="text-green">
                    {selectedResult.correct}
                  </strong>
                </div>

                <div>
                  <span>Wrong</span>
                  <strong className="text-red">
                    {selectedResult.wrong}
                  </strong>
                </div>

                <div>
                  <span>Unanswered</span>
                  <strong>
                    {selectedResult.unanswered}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-info">
              <div>
                <span>Status</span>
                <strong>
                  {selectedResult.status ===
                  "submitted"
                    ? "Submitted"
                    : "In Progress"}
                </strong>
              </div>

              <div>
                <span>Submitted At</span>
                <strong>
                  {formatDate(
                    selectedResult.submittedAt
                  )}
                </strong>
              </div>
            </div>

            <button
              className="modal-done-button"
              onClick={() =>
                setSelectedResult(null)
              }
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }

        /* HEADER */

        .header {
          min-height: 86px;
          padding: 18px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .back-button {
          width: 40px;
          height: 40px;
          border: 1px solid #dbe3ef;
          border-radius: 10px;
          background: #ffffff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: 0.2s ease;
        }

        .back-button:hover {
          color: #4f46e5;
          border-color: #c7d2fe;
          background: #f8fafc;
          transform: translateX(-2px);
        }

        .eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.1px;
          color: #6366f1;
          margin-bottom: 3px;
        }

        .header h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: -0.4px;
        }

        .header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .download-button {
          border: 0;
          border-radius: 10px;
          padding: 10px 15px;
          background: #4f46e5;
          color: white;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .download-button:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 7px 18px
            rgba(79, 70, 229, 0.18);
        }

        .download-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* CONTENT */

        .content {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 24px 0 60px;
        }

        /* QUIZ INFO */

        .quiz-info-card {
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: white;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .quiz-info-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quiz-info-text {
          flex: 1;
          min-width: 0;
        }

        .quiz-info-text h2 {
          margin: 0 0 4px;
          font-size: 17px;
        }

        .quiz-info-text p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        .quiz-info-meta {
          display: flex;
          gap: 14px;
          color: #64748b;
          font-size: 11px;
          flex-shrink: 0;
        }

        .quiz-info-meta div {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }

        .stat-card {
          min-height: 105px;
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: white;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: #c7d2fe;
          box-shadow: 0 8px 25px
            rgba(15, 23, 42, 0.05);
        }

        .stat-icon {
          width: 39px;
          height: 39px;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-card span {
          display: block;
          color: #64748b;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .stat-card strong {
          font-size: 23px;
        }

        /* RESULTS */

        .results-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }

        .section-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .section-header h2 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .section-header p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        .search-box {
          width: 240px;
          height: 36px;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          color: #94a3b8;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          font-family: inherit;
          font-size: 11px;
          color: #0f172a;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .results-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .results-table th {
          padding: 12px 14px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 10px;
          text-align: left;
          font-weight: 750;
          white-space: nowrap;
        }

        .results-table td {
          padding: 13px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 11px;
          white-space: nowrap;
        }

        .results-table tbody tr:hover {
          background: #fafbff;
        }

        .rank-cell {
          color: #94a3b8;
          font-weight: 700;
        }

        .student-cell {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }

        .student-cell strong {
          display: block;
          font-size: 11px;
        }

        .student-cell span {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 9px;
        }

        .registration {
          color: #475569;
          font-family: monospace;
          font-size: 10px;
        }

        .percentage {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          padding: 5px 7px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 800;
        }

        .percentage.good {
          color: #047857;
          background: #ecfdf5;
        }

        .percentage.average {
          color: #b45309;
          background: #fffbeb;
        }

        .percentage.low {
          color: #dc2626;
          background: #fef2f2;
        }

        .correct,
        .wrong {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
        }

        .correct {
          color: #059669;
        }

        .wrong {
          color: #ef4444;
        }

        .date {
          color: #64748b;
          font-size: 10px;
        }

        .view-button {
          border: 1px solid #c7d2fe;
          border-radius: 7px;
          padding: 6px 10px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .view-button:hover {
          background: #e0e7ff;
        }

        /* EMPTY */

        .empty-state {
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 14px;
          border-radius: 15px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 16px;
        }

        .empty-state p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 20px;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .result-modal {
          width: min(520px, 100%);
          background: white;
          border-radius: 17px;
          overflow: hidden;
          box-shadow: 0 30px 80px
            rgba(15, 23, 42, 0.2);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .modal-header h2 {
          margin: 2px 0 3px;
          font-size: 20px;
        }

        .modal-header p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        .close-button {
          width: 34px;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #64748b;
          font-size: 21px;
          cursor: pointer;
        }

        .modal-score {
          padding: 25px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 35px;
        }

        .score-circle {
          width: 125px;
          height: 125px;
          border-radius: 50%;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          flex-shrink: 0;
        }

        .score-circle strong {
          font-size: 28px;
        }

        .score-circle span {
          color: #64748b;
          font-size: 10px;
          margin-top: 2px;
        }

        .score-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 25px;
        }

        .score-details span,
        .modal-info span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .score-details strong,
        .modal-info strong {
          font-size: 15px;
        }

        .text-green {
          color: #059669;
        }

        .text-red {
          color: #ef4444;
        }

        .modal-info {
          margin: 0 20px 20px;
          padding: 15px;
          border-radius: 10px;
          background: #f8fafc;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .modal-done-button {
          width: calc(100% - 40px);
          margin: 0 20px 20px;
          height: 40px;
          border: 0;
          border-radius: 9px;
          background: #4f46e5;
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-done-button:hover {
          background: #4338ca;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .header {
            padding: 15px;
          }

          .content {
            width: calc(100% - 24px);
            padding-top: 16px;
          }

          .header h1 {
            font-size: 18px;
          }

          .download-button {
            font-size: 0;
            width: 40px;
            height: 40px;
            padding: 0;
            justify-content: center;
          }

          .quiz-info-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .quiz-info-meta {
            width: 100%;
            padding-left: 62px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            align-items: stretch;
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }

          .modal-score {
            flex-direction: column;
            gap: 20px;
          }

          .score-details {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}