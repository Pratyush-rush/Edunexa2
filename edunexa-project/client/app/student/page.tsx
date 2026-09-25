"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  ClipboardCheck,
  LogOut,
  User,
  Users,
  Loader2,
  GraduationCap,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { StudentDoubtAssistant } from "@/components/ai/StudentDoubtAssistant";

type Profile = {
  full_name: string | null;
  email: string | null;
  registration_no: string | null;
  role: string;
};

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiDoubtOpen, setAiDoubtOpen] = useState(false);

  useEffect(() => {
    loadStudent();
  }, []);

  async function loadStudent() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, registration_no, role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Profile loading error:", error);
    }

    setProfile(
      data || {
        full_name: null,
        email: user.email || null,
        registration_no: null,
        role: "student",
      }
    );

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="student-loading">
        <Loader2 className="loading-spinner" size={32} />
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  const displayName =
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Student";

  return (
    <main className="student-dashboard">

      {/* ================= SIDEBAR ================= */}

      <aside className="student-sidebar">

        <div className="student-brand">

          <div className="student-brand-icon">
            <GraduationCap size={25} />
          </div>

          <div>
            <strong>EduNexa</strong>
            <span>Student Portal</span>
          </div>

        </div>

        <nav className="student-nav">

          {/* Dashboard */}
          <button
            className="student-nav-item active"
            onClick={() => router.push("/student")}
          >
            <BookOpen size={19} />
            Dashboard
          </button>

          {/* Classrooms */}
          <button
            className="student-nav-item"
            onClick={() =>
              router.push("/student/classrooms")
            }
          >
            <Users size={19} />
            My Classrooms
          </button>

          {/* Quizzes */}
          <button
            className="student-nav-item"
            onClick={() =>
              router.push("/student/quizzes")
            }
          >
            <ClipboardCheck size={19} />
            Quizzes
          </button>

          {/* Profile */}
          <button
            className="student-nav-item"
            onClick={() =>
              router.push("/student/profile")
            }
          >
            <User size={19} />
            My Profile
          </button>

          {/* AI Doubt Tutor */}
          <button
            className="student-nav-item ai-nav-glow"
            onClick={() => setAiDoubtOpen(true)}
            style={{ color: "#635bff" }}
          >
            <Sparkles size={19} />
            AI Doubt Tutor
          </button>
        </nav>

        {/* Logout */}
        <button
          className="student-logout"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Logout
        </button>

      </aside>

      {/* ================= MAIN CONTENT ================= */}

      <section className="student-main">

        {/* Header */}

        <header className="student-header">

          <div>

            <p className="student-welcome">
              Welcome back 👋
            </p>

            <h1>{displayName}</h1>

            <p className="student-header-subtitle">
              Your learning dashboard
            </p>

          </div>

          {/* Top Profile */}

          <button
            className="student-profile"
            onClick={() =>
              router.push("/student/profile")
            }
          >

            <div className="student-avatar">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Student</span>
            </div>

          </button>

        </header>

        {/* ================= PROFILE CARD ================= */}

        <section
          className="student-profile-card"
          onClick={() =>
            router.push("/student/profile")
          }
          style={{ cursor: "pointer" }}
        >

          <div className="profile-card-icon">
            <User size={24} />
          </div>

          <div className="profile-card-info">

            <div className="profile-card-title">

              <div>
                <h2>My Profile</h2>

                <p>
                  Your academic information
                </p>
              </div>

              <ArrowRight size={20} />

            </div>

            <div className="profile-details">

              {/* Name */}

              <div>
                <span>Name</span>

                <strong>
                  {profile?.full_name ||
                    "Not added yet"}
                </strong>
              </div>

              {/* Email */}

              <div>
                <span>Email</span>

                <strong>
                  {profile?.email ||
                    "Not available"}
                </strong>
              </div>

              {/* Registration */}

              <div>
                <span>Registration No.</span>

                <strong>
                  {profile?.registration_no ||
                    "Not added yet"}
                </strong>
              </div>

            </div>

          </div>

        </section>

        {/* ================= LEARNING CENTER ================= */}

        <section className="student-section">

          <div className="student-section-heading">

            <div>

              <h2>Learning Center</h2>

              <p>
                Everything you need for your
                classroom learning.
              </p>

            </div>

          </div>

          <div className="student-feature-grid">

            {/* Classrooms */}

            <div className="student-feature-card">

              <div className="feature-icon">
                <Users size={24} />
              </div>

              <h3>My Classrooms</h3>

              <p>
                Join classrooms using the unique
                code provided by your teacher.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/student/classrooms"
                  )
                }
              >
                Open Classrooms
                <ArrowRight size={16} />
              </button>

            </div>

            {/* Quizzes */}

            <div className="student-feature-card">

              <div className="feature-icon">
                <ClipboardCheck size={24} />
              </div>

              <h3>Classroom Quizzes</h3>

              <p>
                Take quizzes assigned to you and
                check your learning performance.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/student/quizzes"
                  )
                }
              >
                View Quizzes
                <ArrowRight size={16} />
              </button>

            </div>

            {/* Learning */}

            <div className="student-feature-card">

              <div className="feature-icon">
                <BookOpen size={24} />
              </div>

              <h3>My Learning</h3>

              <p>
                Track learning gaps and receive
                personalized recommendations.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/student/learning"
                  )
                }
              >
                View Learning
                <ArrowRight size={16} />
              </button>

            </div>

            {/* AI Doubt Tutor Card */}
            <div className="student-feature-card ai-feature-card">

              <div className="feature-icon ai-icon-accent">
                <Sparkles size={24} />
              </div>

              <h3>AI Doubt Assistant</h3>

              <p>
                Query the AI tutor anytime to explain tough concepts, solve doubts, and get practice.
              </p>

              <button
                onClick={() => setAiDoubtOpen(true)}
                className="ai-card-btn"
              >
                Ask AI Tutor
                <ArrowRight size={16} />
              </button>

            </div>

          </div>

        </section>

        {/* ================= PROFILE SETUP ================= */}

        {(!profile?.full_name ||
          !profile?.registration_no) && (

          <section className="student-empty-card">

            <div className="empty-icon">
              <Settings size={30} />
            </div>

            <h2>Complete your profile</h2>

            <p>
              Add your full name and registration
              number so your teachers can identify
              you correctly in their classrooms.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/student/profile"
                )
              }
            >
              Complete Profile
              <ArrowRight size={17} />
            </button>

          </section>

        )}

        {/* ================= LEARNING JOURNEY ================= */}

        <section className="student-empty-card">

          <div className="empty-icon">
            <GraduationCap size={30} />
          </div>

          <h2>
            Your learning journey starts here
          </h2>

          <p>
            Join a classroom to see your
            attendance, quizzes, results,
            learning gaps and personalized
            recommendations.
          </p>

          <button
            onClick={() =>
              router.push(
                "/student/classrooms"
              )
            }
          >
            Join a Classroom
            <ArrowRight size={17} />
          </button>

        </section>

      </section>

      {/* Persistent AI Doubt Assistant Widget */}
      <StudentDoubtAssistant
        forceOpen={aiDoubtOpen}
        onClose={() => setAiDoubtOpen(false)}
      />

    </main>
  );
}