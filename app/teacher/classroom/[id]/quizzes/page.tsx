"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Clock3,
  Users,
  Shuffle,
  CheckCircle2,
  FileText,
  Loader2,
  X,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Question = {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  topic: string;
  marks: number;
  question_order?: number;
};

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
  created_at: string;
};

const emptyQuestion: Question = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  topic: "",
  marks: 1,
};

function generateSessionCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

export default function ClassroomQuizzesPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classroom, setClassroom] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(15);

  const [accessType, setAccessType] = useState("all");
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [oneAttempt, setOneAttempt] = useState(true);
  const [resultRelease, setResultRelease] = useState("later");

  const [questions, setQuestions] = useState<Question[]>([
    { ...emptyQuestion },
  ]);

  useEffect(() => {
    loadData();
  }, [classroomId]);

  async function loadData() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: classroomData, error: classroomError } =
        await supabase
          .from("classrooms")
          .select("*")
          .eq("id", classroomId)
          .eq("teacher_id", user.id)
          .single();

      if (classroomError) {
        console.error(classroomError);
        router.push("/teacher");
        return;
      }

      setClassroom(classroomData);

      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("classroom_id", classroomId)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (quizError) {
        console.error(quizError);
        return;
      }

      setQuizzes(quizData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setDuration(15);
    setAccessType("all");
    setRandomizeQuestions(true);
    setRandomizeOptions(false);
    setOneAttempt(true);
    setResultRelease("later");
    setQuestions([{ ...emptyQuestion }]);
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { ...emptyQuestion }]);
  }

  function removeQuestion(index: number) {
    if (questions.length === 1) return;

    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(
    index: number,
    field: keyof Question,
    value: string | number
  ) {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  }

  async function createQuiz(publish = false) {
    if (!title.trim()) {
      alert("Please enter a quiz title.");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (
        !q.question_text.trim() ||
        !q.option_a.trim() ||
        !q.option_b.trim() ||
        !q.option_c.trim() ||
        !q.option_d.trim()
      ) {
        alert(`Please complete Question ${i + 1}.`);
        return;
      }
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const sessionCode = generateSessionCode();

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          classroom_id: classroomId,
          teacher_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          question_count: questions.length,
          duration_minutes: duration,
          access_type: accessType,
          randomize_questions: randomizeQuestions,
          randomize_options: randomizeOptions,
          one_attempt: oneAttempt,
          result_release: resultRelease,
          session_code: sessionCode,
          is_published: publish,
        })
        .select()
        .single();

      if (quizError) {
        console.error(quizError);
        alert(quizError.message);
        return;
      }

      const questionRows = questions.map((question, index) => ({
        quiz_id: quiz.id,
        question_text: question.question_text.trim(),
        option_a: question.option_a.trim(),
        option_b: question.option_b.trim(),
        option_c: question.option_c.trim(),
        option_d: question.option_d.trim(),
        correct_option: question.correct_option,
        topic: question.topic.trim() || null,
        marks: Number(question.marks) || 1,
        question_order: index + 1,
      }));

      const { error: questionsError } = await supabase
        .from("quiz_questions")
        .insert(questionRows);

      if (questionsError) {
        console.error(questionsError);

        await supabase
          .from("quizzes")
          .delete()
          .eq("id", quiz.id);

        alert(questionsError.message);
        return;
      }

      alert(
        publish
          ? "Quiz created and published successfully!"
          : "Quiz saved as draft successfully!"
      );

      setShowCreateModal(false);
      resetForm();

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(quiz: Quiz) {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({
          is_published: !quiz.is_published,
        })
        .eq("id", quiz.id);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      await loadData();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteQuiz(quizId: string) {
    const confirmed = confirm(
      "Are you sure you want to delete this quiz? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      await loadData();
    } catch (error) {
      console.error(error);
    }
  }

  function openCreateModal() {
    resetForm();
    setShowCreateModal(true);
  }

  const publishedCount = quizzes.filter(
    (quiz) => quiz.is_published
  ).length;

  const draftCount = quizzes.filter(
    (quiz) => !quiz.is_published
  ).length;

  if (loading) {
    return (
      <>
        <div className="loading-page">
          <Loader2 className="loading-icon" size={34} />
          <p>Loading quizzes...</p>
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
            animation: spin 1s linear infinite;
            color: #4f46e5;
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
              router.push(`/teacher/classroom/${classroomId}`)
            }
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div className="eyebrow">TEACHER PORTAL</div>

            <h1>Classroom Quizzes</h1>

            <p>{classroom?.name || "Classroom"}</p>
          </div>
        </div>

        <button className="create-button" onClick={openCreateModal}>
          <Plus size={18} />
          Create Quiz
        </button>
      </header>

      <main className="content">
        {/* STATISTICS */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={21} />
            </div>

            <div>
              <span>Total Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <span>Published</span>
              <strong>{publishedCount}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Save size={21} />
            </div>

            <div>
              <span>Drafts</span>
              <strong>{draftCount}</strong>
            </div>
          </div>
        </section>

        {/* QUIZZES */}
        <section className="quiz-section">
          <div className="section-heading">
            <div>
              <h2>Your Quizzes</h2>
              <p>Manage your classroom quizzes and results.</p>
            </div>

            <button
              className="small-create-button"
              onClick={openCreateModal}
            >
              <Plus size={17} />
              New Quiz
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FileText size={28} />
              </div>

              <h3>No quizzes yet</h3>

              <p>
                Create your first classroom quiz to assess your
                students.
              </p>

              <button
                className="create-button empty-button"
                onClick={openCreateModal}
              >
                <Plus size={18} />
                Create Your First Quiz
              </button>
            </div>
          ) : (
            <div className="quiz-grid">
              {quizzes.map((quiz) => (
                <article className="quiz-card" key={quiz.id}>
                  <div className="quiz-card-top">
                    <div className="quiz-title-area">
                      <div className="quiz-icon">
                        <FileText size={21} />
                      </div>

                      <div>
                        <h3>{quiz.title}</h3>

                        <span className="quiz-date">
                          Created{" "}
                          {new Date(
                            quiz.created_at
                          ).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>

                    <span
                      className={
                        quiz.is_published
                          ? "status published"
                          : "status draft"
                      }
                    >
                      {quiz.is_published ? "Published" : "Draft"}
                    </span>
                  </div>

                  {quiz.description && (
                    <p className="quiz-description">
                      {quiz.description}
                    </p>
                  )}

                  <div className="quiz-meta">
                    <div>
                      <FileText size={15} />
                      <span>
                        {quiz.question_count} Questions
                      </span>
                    </div>

                    <div>
                      <Clock3 size={15} />
                      <span>
                        {quiz.duration_minutes} min
                      </span>
                    </div>

                    <div>
                      <Users size={15} />
                      <span>
                        {quiz.access_type === "present"
                          ? "Present Students"
                          : quiz.access_type === "selected"
                          ? "Selected Students"
                          : "All Students"}
                      </span>
                    </div>

                    {quiz.randomize_questions && (
                      <div>
                        <Shuffle size={15} />
                        <span>Randomized</span>
                      </div>
                    )}
                  </div>

                  {quiz.session_code && (
                    <div className="session-box">
                      <span>Session Code</span>
                      <strong>{quiz.session_code}</strong>
                    </div>
                  )}

                  <div className="quiz-actions">
                    <button
                      className="results-button"
                      onClick={() =>
                        router.push(
                          `/teacher/classroom/${classroomId}/quizzes/${quiz.id}/results`
                        )
                      }
                    >
                      <BarChart3 size={16} />
                      Results
                    </button>

                    <button
                      className="publish-button"
                      onClick={() => togglePublish(quiz)}
                    >
                      {quiz.is_published ? (
                        <>
                          <X size={16} />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Publish
                        </>
                      )}
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => deleteQuiz(quiz.id)}
                      aria-label="Delete quiz"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* CREATE QUIZ MODAL */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="eyebrow">CREATE ASSESSMENT</div>
                <h2>Create Quiz</h2>
                <p>
                  Create questions and configure quiz access.
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* BASIC DETAILS */}
              <section className="form-section">
                <div className="form-section-title">
                  <span>1</span>
                  <div>
                    <h3>Basic Details</h3>
                    <p>Give your quiz a title and description.</p>
                  </div>
                </div>

                <div className="field">
                  <label>Quiz Title *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: Unit 1 Quiz"
                  />
                </div>

                <div className="field">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    placeholder="Enter a short description..."
                    rows={3}
                  />
                </div>
              </section>

              {/* SETTINGS */}
              <section className="form-section">
                <div className="form-section-title">
                  <span>2</span>
                  <div>
                    <h3>Quiz Settings</h3>
                    <p>Configure time and student access.</p>
                  </div>
                </div>

                <div className="two-columns">
                  <div className="field">
                    <label>Duration (minutes)</label>

                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={duration}
                      onChange={(e) =>
                        setDuration(Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="field">
                    <label>Student Access</label>

                    <select
                      value={accessType}
                      onChange={(e) =>
                        setAccessType(e.target.value)
                      }
                    >
                      <option value="all">All Students</option>
                      <option value="present">
                        Present Students Only
                      </option>
                      <option value="selected">
                        Selected Students
                      </option>
                    </select>
                  </div>
                </div>

                <div className="settings-grid">
                  <label className="setting-option">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={(e) =>
                        setRandomizeQuestions(e.target.checked)
                      }
                    />

                    <div>
                      <strong>Randomize Questions</strong>
                      <span>
                        Show questions in a different order.
                      </span>
                    </div>
                  </label>

                  <label className="setting-option">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={(e) =>
                        setRandomizeOptions(e.target.checked)
                      }
                    />

                    <div>
                      <strong>Randomize Options</strong>
                      <span>
                        Shuffle answer options for students.
                      </span>
                    </div>
                  </label>

                  <label className="setting-option">
                    <input
                      type="checkbox"
                      checked={oneAttempt}
                      onChange={(e) =>
                        setOneAttempt(e.target.checked)
                      }
                    />

                    <div>
                      <strong>One Attempt</strong>
                      <span>
                        Students can submit the quiz only once.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="field">
                  <label>Result Release</label>

                  <select
                    value={resultRelease}
                    onChange={(e) =>
                      setResultRelease(e.target.value)
                    }
                  >
                    <option value="later">
                      Release Results Later
                    </option>

                    <option value="immediate">
                      Release Immediately
                    </option>
                  </select>
                </div>
              </section>

              {/* QUESTIONS */}
              <section className="form-section">
                <div className="questions-heading">
                  <div className="form-section-title">
                    <span>3</span>
                    <div>
                      <h3>Questions</h3>
                      <p>
                        Add multiple-choice questions to your quiz.
                      </p>
                    </div>
                  </div>

                  <div className="question-count">
                    {questions.length}{" "}
                    {questions.length === 1
                      ? "Question"
                      : "Questions"}
                  </div>
                </div>

                <div className="questions-list">
                  {questions.map((question, index) => (
                    <div
                      className="question-editor"
                      key={index}
                    >
                      <div className="question-editor-header">
                        <div>
                          <span className="question-number">
                            {index + 1}
                          </span>

                          <strong>
                            Question {index + 1}
                          </strong>
                        </div>

                        {questions.length > 1 && (
                          <button
                            className="remove-question"
                            onClick={() =>
                              removeQuestion(index)
                            }
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="field">
                        <label>Question *</label>

                        <textarea
                          rows={3}
                          value={question.question_text}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "question_text",
                              e.target.value
                            )
                          }
                          placeholder="Write your question..."
                        />
                      </div>

                      <div className="options-grid">
                        <div className="field">
                          <label>Option A *</label>
                          <input
                            value={question.option_a}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "option_a",
                                e.target.value
                              )
                            }
                            placeholder="Option A"
                          />
                        </div>

                        <div className="field">
                          <label>Option B *</label>
                          <input
                            value={question.option_b}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "option_b",
                                e.target.value
                              )
                            }
                            placeholder="Option B"
                          />
                        </div>

                        <div className="field">
                          <label>Option C *</label>
                          <input
                            value={question.option_c}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "option_c",
                                e.target.value
                              )
                            }
                            placeholder="Option C"
                          />
                        </div>

                        <div className="field">
                          <label>Option D *</label>
                          <input
                            value={question.option_d}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "option_d",
                                e.target.value
                              )
                            }
                            placeholder="Option D"
                          />
                        </div>
                      </div>

                      <div className="three-columns">
                        <div className="field">
                          <label>Correct Answer</label>

                          <select
                            value={question.correct_option}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "correct_option",
                                e.target.value
                              )
                            }
                          >
                            <option value="A">
                              Option A
                            </option>

                            <option value="B">
                              Option B
                            </option>

                            <option value="C">
                              Option C
                            </option>

                            <option value="D">
                              Option D
                            </option>
                          </select>
                        </div>

                        <div className="field">
                          <label>Topic</label>

                          <input
                            value={question.topic}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "topic",
                                e.target.value
                              )
                            }
                            placeholder="Example: DBMS"
                          />
                        </div>

                        <div className="field">
                          <label>Marks</label>

                          <input
                            type="number"
                            min={1}
                            value={question.marks}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "marks",
                                Number(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="add-question-button"
                  onClick={addQuestion}
                >
                  <Plus size={18} />
                  Add Another Question
                </button>
              </section>
            </div>

            {/* MODAL FOOTER */}
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <div className="footer-actions">
                <button
                  className="draft-button"
                  onClick={() => createQuiz(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="button-spinner" size={17} />
                  ) : (
                    <Save size={17} />
                  )}

                  Save Draft
                </button>

                <button
                  className="publish-main-button"
                  onClick={() => createQuiz(true)}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="button-spinner" size={17} />
                  ) : (
                    <Send size={17} />
                  )}

                  Publish Quiz
                </button>
              </div>
            </div>
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
          transition: 0.2s ease;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: #f8fafc;
          color: #4f46e5;
          border-color: #c7d2fe;
          transform: translateX(-2px);
        }

        .eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          color: #6366f1;
          margin-bottom: 3px;
        }

        .header h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -0.4px;
        }

        .header p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .create-button,
        .small-create-button {
          border: 0;
          background: #4f46e5;
          color: #ffffff;
          border-radius: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .create-button {
          padding: 10px 16px;
          font-size: 13px;
        }

        .create-button:hover,
        .small-create-button:hover {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 7px 18px rgba(79, 70, 229, 0.18);
        }

        /* CONTENT */

        .content {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          padding: 24px 0 60px;
        }

        /* STATISTICS */

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 30px;
        }

        .stat-card {
          min-height: 112px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 13px;
          transition: 0.2s ease;
        }

        .stat-card:hover {
          border-color: #c7d2fe;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
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
          font-size: 12px;
          margin-bottom: 3px;
        }

        .stat-card strong {
          font-size: 25px;
          line-height: 1;
          font-weight: 750;
        }

        /* QUIZ SECTION */

        .quiz-section {
          width: 100%;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 750;
        }

        .section-heading p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .small-create-button {
          padding: 9px 13px;
          font-size: 12px;
        }

        /* QUIZ GRID */

        .quiz-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(300px, 1fr)
          );
          gap: 18px;
          width: 100%;
        }

        .quiz-card {
          width: 100%;
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          transition: 0.22s ease;
        }

        .quiz-card:hover {
          transform: translateY(-3px);
          border-color: #c7d2fe;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
        }

        .quiz-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .quiz-title-area {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }

        .quiz-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quiz-title-area h3 {
          margin: 1px 0 4px;
          font-size: 15px;
          font-weight: 750;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .quiz-date {
          color: #94a3b8;
          font-size: 10px;
        }

        .status {
          flex-shrink: 0;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .status.published {
          background: #ecfdf5;
          color: #047857;
        }

        .status.draft {
          background: #f1f5f9;
          color: #64748b;
        }

        .quiz-description {
          margin: 15px 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .quiz-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px 14px;
          padding: 14px 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }

        .quiz-meta div {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 11px;
        }

        .quiz-meta svg {
          color: #64748b;
          flex-shrink: 0;
        }

        .session-box {
          margin-top: 13px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .session-box span {
          color: #64748b;
          font-size: 10px;
        }

        .session-box strong {
          letter-spacing: 2px;
          color: #4338ca;
          font-size: 14px;
        }

        .quiz-actions {
          display: grid;
          grid-template-columns: 1fr 1fr 40px;
          gap: 8px;
          margin-top: 14px;
        }

        .quiz-actions button {
          min-height: 36px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: 0.18s ease;
        }

        .results-button {
          border: 1px solid #c7d2fe;
          color: #4f46e5;
          background: #eef2ff;
        }

        .results-button:hover {
          background: #e0e7ff;
        }

        .publish-button {
          border: 1px solid #dbe3ef;
          color: #475569;
          background: #ffffff;
        }

        .publish-button:hover {
          border-color: #c7d2fe;
          color: #4f46e5;
          background: #f8fafc;
        }

        .delete-button {
          border: 1px solid #fecaca;
          color: #ef4444;
          background: #fffafa;
        }

        .delete-button:hover {
          background: #fef2f2;
        }

        /* EMPTY */

        .empty-state {
          background: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 16px;
          padding: 55px 25px;
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
          font-size: 17px;
        }

        .empty-state p {
          margin: 7px 0 18px;
          color: #64748b;
          font-size: 12px;
        }

        .empty-button {
          display: inline-flex;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(4px);
          padding: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal {
          width: min(900px, 100%);
          max-height: calc(100vh - 50px);
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.2);
        }

        .modal-header {
          padding: 20px 22px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .modal-header h2 {
          margin: 2px 0 4px;
          font-size: 20px;
        }

        .modal-header p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .close-button {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .close-button:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .modal-body {
          overflow-y: auto;
          padding: 22px;
        }

        .form-section {
          padding-bottom: 28px;
          margin-bottom: 28px;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-section:last-child {
          margin-bottom: 0;
          border-bottom: 0;
        }

        .form-section-title {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 18px;
        }

        .form-section-title > span {
          width: 27px;
          height: 27px;
          border-radius: 8px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .form-section-title h3 {
          margin: 0 0 3px;
          font-size: 14px;
        }

        .form-section-title p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }

        .field {
          margin-bottom: 15px;
        }

        .field:last-child {
          margin-bottom: 0;
        }

        .field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 11px;
          font-weight: 700;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          border: 1px solid #dbe3ef;
          border-radius: 9px;
          padding: 10px 11px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          font-family: inherit;
          font-size: 12px;
          transition: 0.18s ease;
        }

        .field textarea {
          resize: vertical;
          min-height: 75px;
        }

        .field input:focus,
        .field textarea:focus,
        .field select:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px #eef2ff;
        }

        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .three-columns {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 17px;
        }

        .setting-option {
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 12px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .setting-option:hover {
          border-color: #c7d2fe;
          background: #fafaff;
        }

        .setting-option input {
          margin-top: 2px;
          accent-color: #4f46e5;
        }

        .setting-option strong {
          display: block;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .setting-option span {
          display: block;
          color: #64748b;
          font-size: 9px;
          line-height: 1.4;
        }

        .questions-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .question-count {
          background: #f1f5f9;
          color: #475569;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .questions-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .question-editor {
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #fafbff;
        }

        .question-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }

        .question-editor-header > div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .question-number {
          width: 25px;
          height: 25px;
          border-radius: 7px;
          background: #4f46e5;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }

        .question-editor-header strong {
          font-size: 12px;
        }

        .remove-question {
          border: 0;
          background: transparent;
          color: #ef4444;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }

        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 14px;
        }

        .add-question-button {
          width: 100%;
          min-height: 42px;
          margin-top: 14px;
          border: 1px dashed #a5b4fc;
          border-radius: 10px;
          background: #f8faff;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .add-question-button:hover {
          background: #eef2ff;
        }

        /* FOOTER */

        .modal-footer {
          padding: 15px 22px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: #ffffff;
        }

        .cancel-button,
        .draft-button,
        .publish-main-button {
          min-height: 38px;
          border-radius: 9px;
          padding: 0 14px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
        }

        .cancel-button {
          border: 1px solid #dbe3ef;
          background: #ffffff;
          color: #475569;
        }

        .draft-button {
          border: 1px solid #c7d2fe;
          background: #eef2ff;
          color: #4f46e5;
        }

        .publish-main-button {
          border: 0;
          background: #4f46e5;
          color: #ffffff;
        }

        .publish-main-button:hover {
          background: #4338ca;
        }

        .footer-actions {
          display: flex;
          gap: 8px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .button-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .quiz-grid {
            grid-template-columns: repeat(
              auto-fill,
              minmax(270px, 1fr)
            );
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .header {
            padding: 15px;
          }

          .header h1 {
            font-size: 18px;
          }

          .create-button {
            padding: 9px 11px;
          }

          .content {
            width: min(100% - 24px, 1180px);
            padding-top: 16px;
          }

          .section-heading {
            align-items: flex-start;
          }

          .quiz-grid {
            grid-template-columns: 1fr;
          }

          .two-columns,
          .three-columns,
          .options-grid {
            grid-template-columns: 1fr;
          }

          .modal-overlay {
            padding: 10px;
          }

          .modal {
            max-height: calc(100vh - 20px);
            border-radius: 14px;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding-left: 15px;
            padding-right: 15px;
          }

          .modal-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .footer-actions {
            width: 100%;
          }

          .cancel-button,
          .draft-button,
          .publish-main-button {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .header {
            align-items: flex-start;
          }

          .header-left {
            align-items: flex-start;
          }

          .header .create-button {
            font-size: 0;
            width: 40px;
            height: 40px;
            padding: 0;
          }

          .header .create-button svg {
            margin: 0;
          }

          .section-heading .small-create-button {
            font-size: 0;
            width: 38px;
            height: 38px;
            padding: 0;
          }

          .quiz-actions {
            grid-template-columns: 1fr 1fr 38px;
          }

          .status {
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}