"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  TrendingUp,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StudentDoubtAssistant } from "@/components/ai/StudentDoubtAssistant";

type TopicStat = {
  topic: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  needsPractice: boolean;
};

export default function StudentLearningPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);
  const [quizCount, setQuizCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // AI Doubt State
  const [aiDoubtOpen, setAiDoubtOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>();

  useEffect(() => {
    loadLearningData();
  }, []);

  async function loadLearningData() {
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

      // 1. Get student quiz attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, total_marks, status")
        .eq("student_id", user.id)
        .eq("status", "submitted");

      if (attemptsError) throw attemptsError;

      if (!attempts || attempts.length === 0) {
        setQuizCount(0);
        setTopicStats([]);
        setLoading(false);
        return;
      }

      setQuizCount(attempts.length);

      // Average score
      const totalScore = attempts.reduce(
        (sum, a) =>
          sum + (a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0),
        0
      );
      setAvgScore(Math.round(totalScore / attempts.length));

      const attemptIds = attempts.map((a) => a.id);

      // 2. Get all answers by student
      const { data: answers, error: answersError } = await supabase
        .from("quiz_answers")
        .select("question_id, is_correct")
        .in("attempt_id", attemptIds);

      if (answersError) throw answersError;

      // 3. Get corresponding questions to identify topics
      const questionIds = [
        ...new Set((answers || []).map((ans) => ans.question_id)),
      ];

      if (questionIds.length === 0) {
        setTopicStats([]);
        setLoading(false);
        return;
      }

      const { data: questions, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("id, topic")
        .in("id", questionIds);

      if (questionsError) throw questionsError;

      const questionTopicMap = new Map<string, string>();
      (questions || []).forEach((q) => {
        questionTopicMap.set(q.id, q.topic || "General Knowledge");
      });

      // Aggregate topic stats
      const aggregated: Record<string, { total: number; correct: number }> = {};

      (answers || []).forEach((ans) => {
        const topic = questionTopicMap.get(ans.question_id) || "General Knowledge";
        if (!aggregated[topic]) {
          aggregated[topic] = { total: 0, correct: 0 };
        }
        aggregated[topic].total += 1;
        if (ans.is_correct) {
          aggregated[topic].correct += 1;
        }
      });

      const stats: TopicStat[] = Object.entries(aggregated).map(
        ([topic, data]) => {
          const pct = Math.round((data.correct / data.total) * 100);
          return {
            topic,
            totalQuestions: data.total,
            correctCount: data.correct,
            percentage: pct,
            needsPractice: pct < 60,
          };
        }
      );

      // Sort by lowest percentage first (weak points first)
      stats.sort((a, b) => a.percentage - b.percentage);
      setTopicStats(stats);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load learning insights.");
    } finally {
      setLoading(false);
    }
  }

  const weakTopics = topicStats.filter((t) => t.needsPractice);
  const masteredTopics = topicStats.filter((t) => !t.needsPractice);

  return (
    <main className="student-learning-page">
      {/* Header */}
      <header className="student-learning-header">
        <div className="learning-header-left">
          <button
            className="classroom-back-btn"
            onClick={() => router.push("/student")}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <span className="learning-kicker">EduNexa Adaptive Learning</span>
            <h1>My Learning & Knowledge Hub</h1>
          </div>
        </div>

        <button
          className="learning-ai-header-btn"
          onClick={() => {
            setAiPrompt("Help me analyze my learning gaps and suggest what topics I should study today.");
            setAiDoubtOpen(true);
          }}
        >
          <Sparkles size={18} />
          <span>Ask AI Study Coach</span>
        </button>
      </header>

      {/* Content */}
      <section className="student-learning-content">
        {/* KPI Cards */}
        <div className="learning-stats-grid">
          <div className="learning-stat-card">
            <div className="learning-stat-icon trophy-icon">
              <Trophy size={24} />
            </div>
            <div>
              <span>Average Quiz Score</span>
              <strong>{avgScore}%</strong>
              <small>Across {quizCount} completed quizzes</small>
            </div>
          </div>

          <div className="learning-stat-card">
            <div className="learning-stat-icon warning-icon">
              <AlertTriangle size={24} />
            </div>
            <div>
              <span>Weak Topics</span>
              <strong>{weakTopics.length}</strong>
              <small>Scoring below 60% mastery</small>
            </div>
          </div>

          <div className="learning-stat-card">
            <div className="learning-stat-icon success-icon">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span>Mastered Topics</span>
              <strong>{masteredTopics.length}</strong>
              <small>Scoring 60% or higher</small>
            </div>
          </div>
        </div>

        {/* AI Banner */}
        <div className="learning-ai-banner">
          <div className="learning-ai-banner-content">
            <div className="ai-banner-icon">
              <Sparkles size={28} />
            </div>
            <div>
              <h2>Got Doubts? Your Personal AI Tutor is Ready</h2>
              <p>
                Query the AI on any subject doubt, get step-by-step problem breakdowns,
                or request customized practice quizzes tailored to your weak points.
              </p>
            </div>
          </div>
          <button
            className="ai-banner-cta"
            onClick={() => {
              setAiPrompt(
                weakTopics.length > 0
                  ? `Can you explain the concepts of "${weakTopics[0].topic}" and provide 2 practice problems?`
                  : "Can you give me a quick quiz to test my subject knowledge?"
              );
              setAiDoubtOpen(true);
            }}
          >
            <Sparkles size={16} />
            Ask AI Doubt Tutor
          </button>
        </div>

        {loading ? (
          <div className="learning-loading">
            <Loader2 className="spin" size={36} />
            <p>Analyzing your learning performance...</p>
          </div>
        ) : error ? (
          <div className="learning-error">
            <p>{error}</p>
          </div>
        ) : topicStats.length === 0 ? (
          <div className="learning-empty">
            <BookOpen size={40} />
            <h3>No Quiz Data Yet</h3>
            <p>Take classroom quizzes to see your personalized learning gaps and topic mastery here.</p>
            <button
              onClick={() => router.push("/student/quizzes")}
              className="learning-cta-btn"
            >
              Browse Quizzes <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="learning-topics-section">
            <div className="learning-section-title">
              <div>
                <span className="learning-kicker">DETAILED BREAKDOWN</span>
                <h2>Topic Mastery & Learning Gaps</h2>
              </div>
              <span className="learning-topic-count">
                {topicStats.length} Topics Analyzed
              </span>
            </div>

            <div className="learning-topic-grid">
              {topicStats.map((item) => (
                <div
                  key={item.topic}
                  className={`learning-topic-card ${
                    item.needsPractice ? "needs-practice" : "mastered"
                  }`}
                >
                  <div className="topic-card-header">
                    <div>
                      <h3>{item.topic}</h3>
                      <span>
                        {item.correctCount} of {item.totalQuestions} questions correct
                      </span>
                    </div>
                    <strong className="topic-score-badge">
                      {item.percentage}%
                    </strong>
                  </div>

                  <div className="topic-bar-track">
                    <div
                      className={`topic-bar-fill ${
                        item.needsPractice ? "fill-warning" : "fill-success"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>

                  <div className="topic-card-footer">
                    {item.needsPractice ? (
                      <span className="gap-badge">Needs Practice</span>
                    ) : (
                      <span className="good-badge">Proficient</span>
                    )}

                    <button
                      className="topic-ai-ask-btn"
                      onClick={() => {
                        setAiPrompt(
                          `I have doubts regarding the topic "${item.topic}". Could you please explain this concept step-by-step with simple examples and give me a practice problem?`
                        );
                        setAiDoubtOpen(true);
                      }}
                      title="Clear doubts on this topic with AI"
                    >
                      <Sparkles size={14} />
                      Clear Doubts
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Floating / Triggered AI Doubt Assistant */}
      <StudentDoubtAssistant
        forceOpen={aiDoubtOpen}
        initialPrompt={aiPrompt}
        onClose={() => {
          setAiDoubtOpen(false);
          setAiPrompt(undefined);
        }}
      />
    </main>
  );
}
