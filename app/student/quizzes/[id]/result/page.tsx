"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trophy,
  Clock3,
  BookOpen,
  Target,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StudentDoubtAssistant } from "@/components/ai/StudentDoubtAssistant";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  question_count: number;
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
  question_order: number | null;
};

type ReviewItem = {
  question: Question;
  answer: Answer | undefined;
};

export default function StudentQuizResultPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const quizId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);

  const [aiDoubtOpen, setAiDoubtOpen] = useState(false);
  const [aiDoubtPrompt, setAiDoubtPrompt] = useState<string | undefined>();
  const [activeDoubtQuestion, setActiveDoubtQuestion] = useState<any>(null);

  useEffect(() => {
    loadResult();
  }, [quizId]);

  async function loadResult() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      // Get quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("id, title, description, question_count")
        .eq("id", quizId)
        .single();

      if (quizError) {
        throw new Error(quizError.message);
      }

      setQuiz(quizData);

      // Get student's submitted attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .select(
          "id, quiz_id, student_id, started_at, submitted_at, score, total_marks, status"
        )
        .eq("quiz_id", quizId)
        .eq("student_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attemptError) {
        throw new Error(attemptError.message);
      }

      if (!attemptData) {
        setError("No quiz attempt was found for this quiz.");
        return;
      }

      if (attemptData.status !== "submitted") {
        setError("This quiz has not been submitted yet.");
        return;
      }

      setAttempt(attemptData);

      // Get questions
      const { data: questionData, error: questionError } = await supabase
        .from("quiz_questions")
        .select(
          "id, question_text, option_a, option_b, option_c, option_d, correct_option, topic, marks, question_order"
        )
        .eq("quiz_id", quizId)
        .order("question_order", { ascending: true });

      if (questionError) {
        throw new Error(questionError.message);
      }

      // Get answers
      const { data: answerData, error: answerError } = await supabase
        .from("quiz_answers")
        .select(
          "id, attempt_id, question_id, selected_option, is_correct, marks_obtained"
        )
        .eq("attempt_id", attemptData.id);

      if (answerError) {
        throw new Error(answerError.message);
      }

      const answers = answerData || [];
      const questions = questionData || [];

      const reviewItems: ReviewItem[] = questions.map((question) => {
        const answer = answers.find(
          (item) => item.question_id === question.id
        );

        return {
          question,
          answer,
        };
      });

      setReview(reviewItems);
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load quiz result.");
      }
    } finally {
      setLoading(false);
    }
  }

  function getOptionText(question: Question, option: string | null) {
    if (!option) return "Not answered";

    if (option === "A") return question.option_a;
    if (option === "B") return question.option_b;
    if (option === "C") return question.option_c;
    if (option === "D") return question.option_d;

    return option;
  }

  function getPercentage() {
    if (!attempt || !attempt.total_marks || attempt.total_marks === 0) {
      return 0;
    }

    return Math.round(
      ((attempt.score || 0) / attempt.total_marks) * 100
    );
  }

  function getCorrectCount() {
    return review.filter(
      (item) => item.answer?.is_correct === true
    ).length;
  }

  function getIncorrectCount() {
    return review.filter(
      (item) => item.answer?.is_correct === false
    ).length;
  }

  function getUnansweredCount() {
    return review.filter(
      (item) => !item.answer?.selected_option
    ).length;
  }

  function getPerformanceMessage() {
    const percentage = getPercentage();

    if (percentage >= 90) {
      return "Excellent performance! Keep maintaining this level.";
    }

    if (percentage >= 75) {
      return "Great performance! You are doing very well.";
    }

    if (percentage >= 60) {
      return "Good effort! A little more practice can improve your score.";
    }

    if (percentage >= 40) {
      return "You have a good starting point. Focus on your learning gaps.";
    }

    return "Keep practicing. EduNexa will help you identify the topics that need attention.";
  }

  if (loading) {
    return (
      <main className="result-loading-page">
        <div className="result-loading-box">
          <Loader2 className="result-spinner" size={34} />
          <h2>Loading your result...</h2>
          <p>Please wait while EduNexa prepares your performance report.</p>
        </div>
      </main>
    );
  }

  if (error || !quiz || !attempt) {
    return (
      <main className="result-error-page">
        <div className="result-error-card">
          <XCircle size={48} />
          <h2>Result unavailable</h2>
          <p>{error || "Unable to load the quiz result."}</p>

          <button
            className="result-primary-button"
            onClick={() => router.push("/student/quizzes")}
          >
            <ArrowLeft size={18} />
            Back to Quizzes
          </button>
        </div>
      </main>
    );
  }

  const percentage = getPercentage();
  const correct = getCorrectCount();
  const incorrect = getIncorrectCount();
  const unanswered = getUnansweredCount();

  return (
    <main className="result-page">
      {/* Header */}
      <header className="result-header">
        <div className="result-header-inner">
          <button
            className="result-back-button"
            onClick={() => router.push("/student/quizzes")}
          >
            <ArrowLeft size={19} />
            Back to Quizzes
          </button>

          <div className="result-brand">
            <div className="result-brand-icon">
              <BookOpen size={20} />
            </div>
            <span>EduNexa</span>
          </div>
        </div>
      </header>

      <section className="result-container">
        {/* Hero */}
        <div className="result-hero">
          <div className="result-trophy">
            <Trophy size={42} />
          </div>

          <div>
            <p className="result-label">QUIZ COMPLETED</p>
            <h1>{quiz.title}</h1>
            <p>{getPerformanceMessage()}</p>
          </div>
        </div>

        {/* Score Card */}
<section className="score-card">
  <div className="score-main">
    <div
      className="score-circle"
      style={{ "--score": percentage } as React.CSSProperties}
    >
      <div>
        <strong>{percentage}%</strong>
        <span>Score</span>
      </div>
    </div>

    <div className="score-details">
      <p className="score-caption">Your Score</p>

      <h2>
        {attempt.score ?? 0}{" "}
        <span>/ {attempt.total_marks ?? 0}</span>
      </h2>

              <p>
                Submitted{" "}
                {attempt.submitted_at
                  ? new Date(attempt.submitted_at).toLocaleString()
                  : "Successfully"}
              </p>
            </div>
          </div>

          <div className="score-divider" />

          <div className="score-stats">
            <div className="score-stat correct-stat">
              <div className="stat-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <strong>{correct}</strong>
                <span>Correct</span>
              </div>
            </div>

            <div className="score-stat incorrect-stat">
              <div className="stat-icon">
                <XCircle size={22} />
              </div>
              <div>
                <strong>{incorrect}</strong>
                <span>Incorrect</span>
              </div>
            </div>

            <div className="score-stat unanswered-stat">
              <div className="stat-icon">
                <MinusCircle size={22} />
              </div>
              <div>
                <strong>{unanswered}</strong>
                <span>Unanswered</span>
              </div>
            </div>

            <div className="score-stat">
              <div className="stat-icon">
                <Clock3 size={22} />
              </div>
              <div>
                <strong>{quiz.question_count}</strong>
                <span>Total Questions</span>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Overview */}
        <section className="result-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PERFORMANCE</span>
              <h2>Performance Overview</h2>
            </div>

            <Target size={24} />
          </div>

          <div className="performance-card">
            <div className="performance-top">
              <span>Overall Performance</span>
              <strong>{percentage}%</strong>
            </div>

            <div className="performance-track">
              <div
                className="performance-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <p>
              {percentage >= 75
                ? "You have demonstrated strong understanding of the assessed concepts."
                : "Your result shows areas where additional practice can improve your understanding."}
            </p>
          </div>
        </section>

        {/* Topic Performance */}
        <section className="result-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">LEARNING INSIGHT</span>
              <h2>Topic Performance</h2>
            </div>
          </div>

          {(() => {
            const topics: Record<
              string,
              { total: number; correct: number; marks: number; obtained: number }
            > = {};

            review.forEach((item) => {
              const topic = item.question.topic || "General";

              if (!topics[topic]) {
                topics[topic] = {
                  total: 0,
                  correct: 0,
                  marks: 0,
                  obtained: 0,
                };
              }

              topics[topic].total += 1;
              topics[topic].marks += Number(item.question.marks || 0);
              topics[topic].obtained += Number(
                item.answer?.marks_obtained || 0
              );

              if (item.answer?.is_correct === true) {
                topics[topic].correct += 1;
              }
            });

            const topicEntries = Object.entries(topics);

            if (topicEntries.length === 0) {
              return (
                <div className="empty-topic">
                  <BookOpen size={30} />
                  <p>No topic information is available for this quiz.</p>
                </div>
              );
            }

            return (
              <div className="topic-grid">
                {topicEntries.map(([topic, data]) => {
                  const topicPercentage =
                    data.marks > 0
                      ? Math.round((data.obtained / data.marks) * 100)
                      : Math.round((data.correct / data.total) * 100);

                  return (
                    <div className="topic-card" key={topic}>
                      <div className="topic-card-top">
                        <div>
                          <h3>{topic}</h3>
                          <span>
                            {data.correct} of {data.total} correct
                          </span>
                        </div>

                        <strong>{topicPercentage}%</strong>
                      </div>

                      <div className="topic-progress">
                        <div
                          className="topic-progress-fill"
                          style={{ width: `${topicPercentage}%` }}
                        />
                      </div>

                      <div className="topic-card-bottom">
                        <span>
                          Marks: {data.obtained} / {data.marks}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {topicPercentage < 60 ? (
                            <span className="gap-badge">
                              Needs Practice
                            </span>
                          ) : (
                            <span className="good-badge">
                              Good
                            </span>
                          )}

                          {topicPercentage < 60 && (
                            <button
                              type="button"
                              className="ai-micro-btn"
                              onClick={() => {
                                setAiDoubtPrompt(`I need help understanding the topic "${topic}". Can you explain the core concepts simply and give me 2 practice problems?`);
                                setAiDoubtOpen(true);
                              }}
                              title="Ask AI Tutor for help on this topic"
                            >
                              <Sparkles size={12} />
                              AI Help
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Question Review */}
        <section className="result-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">ANSWER REVIEW</span>
              <h2>Question-wise Review</h2>
            </div>
          </div>

          <div className="review-list">
            {review.map((item, index) => {
              const answer = item.answer;
              const isCorrect = answer?.is_correct === true;
              const isAnswered = !!answer?.selected_option;

              return (
                <article className="review-card" key={item.question.id}>
                  <div className="review-card-header">
                    <div className="review-number">
                      Q{index + 1}
                    </div>

                    <div className="review-status">
                      {isCorrect ? (
                        <span className="status-correct">
                          <CheckCircle2 size={17} />
                          Correct
                        </span>
                      ) : isAnswered ? (
                        <span className="status-incorrect">
                          <XCircle size={17} />
                          Incorrect
                        </span>
                      ) : (
                        <span className="status-unanswered">
                          <MinusCircle size={17} />
                          Not Answered
                        </span>
                      )}
                    </div>
                  </div>

                  <h3>{item.question.question_text}</h3>

                  {item.question.topic && (
                    <span className="review-topic">
                      {item.question.topic}
                    </span>
                  )}

                  <div className="review-options">
                    {["A", "B", "C", "D"].map((option) => {
                      const optionText = getOptionText(
                        item.question,
                        option
                      );

                      const isSelected =
                        answer?.selected_option === option;

                      const isCorrectOption =
                        item.question.correct_option === option;

                      let className = "review-option";

                      if (isCorrectOption) {
                        className += " correct-answer";
                      } else if (isSelected) {
                        className += " wrong-answer";
                      }

                      return (
                        <div className={className} key={option}>
                          <span className="review-option-letter">
                            {option}
                          </span>

                          <span>{optionText}</span>

                          {isCorrectOption && (
                            <CheckCircle2 size={17} />
                          )}

                          {isSelected && !isCorrectOption && (
                            <XCircle size={17} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="review-footer">
                    <div>
                      <span>
                        Your answer:{" "}
                        <strong>
                          {answer?.selected_option || "Not answered"}
                        </strong>
                      </span>

                      <span style={{ marginLeft: "14px" }}>
                        Correct answer:{" "}
                        <strong style={{ color: "#16a34a" }}>{item.question.correct_option}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      className="ai-review-explain-btn"
                      onClick={() => {
                        setActiveDoubtQuestion({
                          questionText: item.question.question_text,
                          options: [
                            { key: "A", text: item.question.option_a },
                            { key: "B", text: item.question.option_b },
                            { key: "C", text: item.question.option_c },
                            { key: "D", text: item.question.option_d },
                          ],
                          selectedOption: answer?.selected_option || undefined,
                          correctOption: item.question.correct_option,
                          topic: item.question.topic || undefined,
                        });
                        setAiDoubtPrompt(
                          `Please explain why Option ${item.question.correct_option} is the correct answer for this question: "${item.question.question_text}"${
                            answer?.selected_option && answer.selected_option !== item.question.correct_option
                              ? ` and why my selected answer (Option ${answer.selected_option}) was wrong.`
                              : "."
                          }`
                        );
                        setAiDoubtOpen(true);
                      }}
                    >
                      <Sparkles size={14} />
                      Ask AI to Explain Doubt
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="result-actions">
          <button
            className="result-primary-button"
            onClick={() => router.push("/student/quizzes")}
          >
            <ArrowLeft size={18} />
            Back to My Quizzes
          </button>
        </div>
      </section>

      {/* Embedded / Floating AI Tutor */}
      <StudentDoubtAssistant
        forceOpen={aiDoubtOpen}
        initialPrompt={aiDoubtPrompt}
        quizContext={activeDoubtQuestion}
        onClose={() => {
          setAiDoubtOpen(false);
          setAiDoubtPrompt(undefined);
          setActiveDoubtQuestion(null);
        }}
      />
    </main>
  );
}