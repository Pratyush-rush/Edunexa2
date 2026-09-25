"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
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
  access_type: string;
  randomize_questions: boolean;
  randomize_options: boolean;
  one_attempt: boolean;
  result_release: string;
  session_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_published: boolean;
};

type Question = {
  id: string;
  quiz_id: string;
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

type Option = {
  key: string;
  text: string;
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

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    const temp = result[i];
    result[i] = result[randomIndex];
    result[randomIndex] = temp;
  }

  return result;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();

  const quizId = String(params.id || "");

  const supabase = useMemo(() => {
    return createClient();
  }, []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [optionsMap, setOptionsMap] = useState<
    Record<string, Option[]>
  >({});

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [error, setError] = useState("");

  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!quizId) {
      setError("Invalid quiz ID.");
      setLoading(false);
      return;
    }

    loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    setLoading(true);
    setError("");

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      const user = userData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      /*
       * LOAD QUIZ
       */

      const {
        data: quizData,
        error: quizError,
      } = await supabase
        .from("quizzes")
        .select(
          "id, classroom_id, teacher_id, title, description, question_count, duration_minutes, access_type, randomize_questions, randomize_options, one_attempt, result_release, session_code, starts_at, ends_at, is_published"
        )
        .eq("id", quizId)
        .eq("is_published", true)
        .maybeSingle();

      if (quizError) {
        throw new Error(quizError.message);
      }

      if (!quizData) {
        throw new Error(
          "Quiz not found or the quiz has not been published."
        );
      }

      /*
       * CHECK CLASS MEMBERSHIP
       */

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("class_members")
        .select("classroom_id")
        .eq("classroom_id", quizData.classroom_id)
        .eq("student_id", user.id)
        .maybeSingle();

      if (membershipError) {
        throw new Error(membershipError.message);
      }

      if (!membership) {
        throw new Error(
          "You are not a member of this classroom."
        );
      }

      /*
       * CHECK START TIME
       */

      const now = new Date();

      if (quizData.starts_at) {
        const start = new Date(quizData.starts_at);

        if (now < start) {
          throw new Error(
            "This quiz has not started yet. It starts at " +
              start.toLocaleString() +
              "."
          );
        }
      }

      /*
       * CHECK END TIME
       */

      if (quizData.ends_at) {
        const end = new Date(quizData.ends_at);

        if (now > end) {
          throw new Error(
            "This quiz is no longer available."
          );
        }
      }

      /*
       * ATTENDANCE CHECK
       */

      if (quizData.access_type === "present") {
        const today = new Date();

        const year = today.getFullYear();

        const month = String(
          today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
          today.getDate()
        ).padStart(2, "0");

        const todayString =
          year + "-" + month + "-" + day;

        const {
          data: attendance,
          error: attendanceError,
        } = await supabase
          .from("attendance")
          .select("status")
          .eq(
            "classroom_id",
            quizData.classroom_id
          )
          .eq("student_id", user.id)
          .eq("attendance_date", todayString)
          .maybeSingle();

        if (attendanceError) {
          throw new Error(
            attendanceError.message
          );
        }

        if (
          !attendance ||
          attendance.status !== "present"
        ) {
          throw new Error(
            "You are not eligible for this quiz because you are not marked present today."
          );
        }
      }

      /*
       * SELECTED STUDENTS CHECK
       */

      if (quizData.access_type === "selected") {
        const {
          data: allowedStudent,
          error: allowedError,
        } = await supabase
          .from("quiz_allowed_students")
          .select("student_id")
          .eq("quiz_id", quizData.id)
          .eq("student_id", user.id)
          .maybeSingle();

        if (allowedError) {
          throw new Error(
            allowedError.message
          );
        }

        if (!allowedStudent) {
          throw new Error(
            "You are not selected for this quiz."
          );
        }
      }

      /*
       * LOAD QUESTIONS
       */

      const {
        data: questionData,
        error: questionError,
      } = await supabase
        .from("quiz_questions")
        .select(
          "id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, topic, marks, question_order"
        )
        .eq("quiz_id", quizData.id)
        .order("question_order", {
          ascending: true,
        });

      if (questionError) {
        throw new Error(
          questionError.message
        );
      }

      if (
        !questionData ||
        questionData.length === 0
      ) {
        throw new Error(
          "This quiz does not contain any questions."
        );
      }

      /*
       * QUESTION RANDOMIZATION
       */

      let finalQuestions = [...questionData];

      if (quizData.randomize_questions) {
        finalQuestions =
          shuffleArray(finalQuestions);
      }

      /*
       * OPTION RANDOMIZATION
       */

      const newOptionsMap: Record<
        string,
        Option[]
      > = {};

      finalQuestions.forEach((question) => {
        let questionOptions: Option[] = [
          {
            key: "A",
            text: question.option_a,
          },
          {
            key: "B",
            text: question.option_b,
          },
          {
            key: "C",
            text: question.option_c,
          },
          {
            key: "D",
            text: question.option_d,
          },
        ];

        if (quizData.randomize_options) {
          questionOptions =
            shuffleArray(questionOptions);
        }

        newOptionsMap[question.id] =
          questionOptions;
      });

      /*
       * SAVE QUIZ DATA TO STATE
       */

      setQuiz(quizData);
      setQuestions(finalQuestions);
      setOptionsMap(newOptionsMap);

      /*
       * CHECK EXISTING ATTEMPT
       */

      const {
        data: attemptData,
        error: attemptError,
      } = await supabase
        .from("quiz_attempts")
        .select(
          "id, quiz_id, student_id, started_at, submitted_at, score, total_marks, status"
        )
        .eq("quiz_id", quizData.id)
        .eq("student_id", user.id)
        .maybeSingle();

      if (attemptError) {
        throw new Error(
          attemptError.message
        );
      }

      /*
       * IMPORTANT:
       * IF ALREADY SUBMITTED,
       * OPEN RESULT PAGE.
       */

      if (
        attemptData &&
        attemptData.status === "submitted"
      ) {
        router.replace(
          "/student/quizzes/" +
            quizData.id +
            "/result"
        );

        return;
      }

      /*
       * RESUME EXISTING ATTEMPT
       */

      if (attemptData) {
        setAttempt(attemptData);

        const startedAt = new Date(
          attemptData.started_at
        ).getTime();

        const totalSeconds =
          Number(
            quizData.duration_minutes
          ) * 60;

        const elapsed = Math.floor(
          (Date.now() - startedAt) / 1000
        );

        const remaining = Math.max(
          0,
          totalSeconds - elapsed
        );

        setRemainingSeconds(remaining);

        /*
         * IF TIME ALREADY FINISHED
         */

        if (remaining <= 0) {
          setRemainingSeconds(0);
        }
      } else {
        /*
         * CREATE NEW ATTEMPT
         */

        const totalMarks =
          finalQuestions.reduce(
            (total, question) => {
              return (
                total +
                Number(question.marks || 0)
              );
            },
            0
          );

        const {
          data: newAttempt,
          error: newAttemptError,
        } = await supabase
          .from("quiz_attempts")
          .insert({
            quiz_id: quizData.id,
            student_id: user.id,
            status: "in_progress",
            total_marks: totalMarks,
          })
          .select(
            "id, quiz_id, student_id, started_at, submitted_at, score, total_marks, status"
          )
          .single();

        if (newAttemptError) {
          /*
           * SOMETIMES AN ATTEMPT MAY HAVE BEEN
           * CREATED BUT THE RESPONSE CAN FAIL.
           * TRY LOADING IT AGAIN.
           */

          const {
            data: retryAttempt,
            error: retryError,
          } = await supabase
            .from("quiz_attempts")
            .select(
              "id, quiz_id, student_id, started_at, submitted_at, score, total_marks, status"
            )
            .eq("quiz_id", quizData.id)
            .eq("student_id", user.id)
            .maybeSingle();

          if (retryError) {
            throw new Error(
              retryError.message
            );
          }

          if (!retryAttempt) {
            throw new Error(
              newAttemptError.message
            );
          }

          /*
           * IF RETRY ATTEMPT IS ALREADY SUBMITTED,
           * OPEN RESULT PAGE.
           */

          if (
            retryAttempt.status ===
            "submitted"
          ) {
            router.replace(
              "/student/quizzes/" +
                quizData.id +
                "/result"
            );

            return;
          }

          setAttempt(retryAttempt);

          const startedAt = new Date(
            retryAttempt.started_at
          ).getTime();

          const elapsed = Math.floor(
            (Date.now() - startedAt) / 1000
          );

          const totalSeconds =
            Number(
              quizData.duration_minutes
            ) * 60;

          setRemainingSeconds(
            Math.max(
              0,
              totalSeconds - elapsed
            )
          );
        } else if (newAttempt) {
          setAttempt(newAttempt);

          setRemainingSeconds(
            Number(
              quizData.duration_minutes
            ) * 60
          );
        }
      }
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load the quiz."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * TIMER
   */

  useEffect(() => {
    if (
      !attempt ||
      finished ||
      loading ||
      remainingSeconds <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds(
        (previous) => {
          if (previous <= 1) {
            window.clearInterval(timer);

            submitQuiz(true);

            return 0;
          }

          return previous - 1;
        }
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    attempt,
    finished,
    loading,
    remainingSeconds,
  ]);

  /*
   * SELECT ANSWER
   */

  function selectAnswer(
    questionId: string,
    optionKey: string
  ) {
    setAnswers((previous) => {
      return {
        ...previous,
        [questionId]: optionKey,
      };
    });
  }

  /*
   * SUBMIT QUIZ
   */

  async function submitQuiz(
    autoSubmitted: boolean
  ) {
    if (
      !attempt ||
      !quiz ||
      submitting ||
      finished
    ) {
      return;
    }

    if (!autoSubmitted) {
      const confirmed =
        window.confirm(
          "Are you sure you want to submit the quiz? You cannot attempt it again."
        );

      if (!confirmed) {
        return;
      }
    }

    setSubmitting(true);

    try {
      let score = 0;
      let totalMarks = 0;

      /*
       * CREATE ANSWER ROWS
       */

      const answerRows = questions.map(
        (question) => {
          const selectedOption =
            answers[question.id] || null;

          const correctOption =
            String(
              question.correct_option
            ).toUpperCase();

          const selectedUpper =
            selectedOption
              ? String(
                  selectedOption
                ).toUpperCase()
              : "";

          const isCorrect =
            selectedOption !== null &&
            selectedUpper ===
              correctOption;

          const marksObtained =
            isCorrect
              ? Number(
                  question.marks || 0
                )
              : 0;

          totalMarks =
            totalMarks +
            Number(
              question.marks || 0
            );

          if (isCorrect) {
            score =
              score + marksObtained;
          }

          return {
            attempt_id: attempt.id,
            question_id: question.id,
            selected_option:
              selectedOption,
            is_correct: isCorrect,
            marks_obtained:
              marksObtained,
          };
        }
      );

      /*
       * REMOVE OLD ANSWERS
       */

      const {
        error: deleteError,
      } = await supabase
        .from("quiz_answers")
        .delete()
        .eq(
          "attempt_id",
          attempt.id
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      /*
       * SAVE ANSWERS
       */

      if (answerRows.length > 0) {
        const {
          error: answerError,
        } = await supabase
          .from("quiz_answers")
          .insert(answerRows);

        if (answerError) {
          throw new Error(
            answerError.message
          );
        }
      }

      /*
       * UPDATE ATTEMPT
       */

      const {
        error: updateError,
      } = await supabase
        .from("quiz_attempts")
        .update({
          submitted_at:
            new Date().toISOString(),
          score: score,
          total_marks: totalMarks,
          status: "submitted",
        })
        .eq("id", attempt.id)
        .eq(
          "student_id",
          attempt.student_id
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      setFinished(true);

      /*
       * ALWAYS GO TO RESULT PAGE
       *
       * We are doing this for the current prototype
       * so the student immediately sees the result.
       */

      router.push(
        "/student/quizzes/" +
          quiz.id +
          "/result"
      );
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        window.alert(err.message);
      } else {
        window.alert(
          "Unable to submit the quiz."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * LOADING SCREEN
   */

  if (loading) {
    return (
      <main className="quiz-page loading-page">
        <div className="loading-box">
          <Loader2
            size={34}
            className="spin"
          />

          <p>
            Loading quiz...
          </p>
        </div>
      </main>
    );
  }

  /*
   * ERROR SCREEN
   */

  if (
    error ||
    !quiz ||
    questions.length === 0
  ) {
    return (
      <main className="quiz-page error-page">
        <div className="error-card">
          <div className="error-icon">
            <AlertCircle
              size={30}
            />
          </div>

          <h1>
            Quiz unavailable
          </h1>

          <p>
            {error ||
              "We could not load this quiz."}
          </p>

          <button
            onClick={() =>
              router.push(
                "/student/quizzes"
              )
            }
          >
            <ArrowLeft
              size={18}
            />

            Back to Quizzes
          </button>
        </div>
      </main>
    );
  }

  /*
   * CURRENT QUESTION
   */

  const currentQuestion =
    questions[currentIndex];

  const selectedAnswer =
    answers[currentQuestion.id];

  const currentOptions =
    optionsMap[
      currentQuestion.id
    ] || [];

  const answeredCount =
    Object.keys(answers).length;

  const progress =
    ((currentIndex + 1) /
      questions.length) *
    100;

  return (
    <main className="quiz-page">
      <header className="quiz-header">
        <div className="header-left">
          <button
            className="back-button"
            onClick={() =>
              router.push(
                "/student/quizzes"
              )
            }
          >
            <ArrowLeft
              size={19}
            />
          </button>

          <div>
            <h1>
              {quiz.title}
            </h1>

            <p>
              Question{" "}
              {currentIndex + 1} of{" "}
              {questions.length}
            </p>
          </div>
        </div>

        <div
          className={
            remainingSeconds <= 60
              ? "timer danger"
              : "timer"
          }
        >
          <Clock3
            size={19}
          />

          <span>
            {formatTime(
              remainingSeconds
            )}
          </span>
        </div>
      </header>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{
            width:
              progress + "%",
          }}
        />
      </div>

      <section className="quiz-content">
        <div className="question-card">
          <div className="question-top">
            <span className="question-number">
              Question{" "}
              {currentIndex + 1}
            </span>

            <span className="marks">
              {currentQuestion.marks}{" "}
              {Number(
                currentQuestion.marks
              ) === 1
                ? "mark"
                : "marks"}
            </span>
          </div>

          <h2>
            {
              currentQuestion.question_text
            }
          </h2>

          {currentQuestion.topic && (
            <div className="topic">
              Topic:{" "}
              {
                currentQuestion.topic
              }
            </div>
          )}

          <div className="options">
            {currentOptions.map(
              (option) => {
                const isSelected =
                  selectedAnswer ===
                  option.key;

                return (
                  <button
                    key={
                      option.key
                    }
                    className={
                      isSelected
                        ? "option selected"
                        : "option"
                    }
                    onClick={() =>
                      selectAnswer(
                        currentQuestion.id,
                        option.key
                      )
                    }
                  >
                    <span className="option-letter">
                      {
                        option.key
                      }
                    </span>

                    <span className="option-text">
                      {
                        option.text
                      }
                    </span>

                    {isSelected && (
                      <CheckCircle2
                        className="selected-icon"
                        size={21}
                      />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <aside className="question-sidebar">
          <div className="sidebar-card">
            <h3>
              Quiz Progress
            </h3>

            <div className="progress-info">
              <strong>
                {answeredCount}/
                {questions.length}
              </strong>

              <span>
                Answered
              </span>
            </div>

            <div className="question-grid">
              {questions.map(
                (
                  question,
                  index
                ) => {
                  const isAnswered =
                    answers[
                      question.id
                    ] !== undefined;

                  let className =
                    "question-dot";

                  if (
                    index ===
                    currentIndex
                  ) {
                    className =
                      className +
                      " current";
                  }

                  if (
                    isAnswered
                  ) {
                    className =
                      className +
                      " answered";
                  }

                  return (
                    <button
                      key={
                        question.id
                      }
                      className={
                        className
                      }
                      onClick={() =>
                        setCurrentIndex(
                          index
                        )
                      }
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>

            <div className="legend">
              <span>
                <i className="current-dot" />
                Current
              </span>

              <span>
                <i className="answered-dot" />
                Answered
              </span>

              <span>
                <i className="unanswered-dot" />
                Not answered
              </span>
            </div>
          </div>
        </aside>
      </section>

      <footer className="quiz-footer">
        <button
          className="navigation secondary"
          disabled={
            currentIndex === 0
          }
          onClick={() =>
            setCurrentIndex(
              (index) =>
                Math.max(
                  0,
                  index - 1
                )
            )
          }
        >
          <ChevronLeft
            size={18}
          />

          Previous
        </button>

        <div className="footer-status">
          {answeredCount} of{" "}
          {questions.length}{" "}
          answered
        </div>

        {currentIndex <
        questions.length - 1 ? (
          <button
            className="navigation primary"
            onClick={() =>
              setCurrentIndex(
                (index) =>
                  Math.min(
                    questions.length - 1,
                    index + 1
                  )
              )
            }
          >
            Next

            <ChevronRight
              size={18}
            />
          </button>
        ) : (
          <button
            className="navigation submit"
            disabled={submitting}
            onClick={() =>
              submitQuiz(false)
            }
          >
            {submitting ? (
              <>
                <Loader2
                  size={18}
                  className="spin"
                />

                Submitting...
              </>
            ) : (
              <>
                <Send
                  size={18}
                />

                Submit Quiz
              </>
            )}
          </button>
        )}
      </footer>
    </main>
  );
}