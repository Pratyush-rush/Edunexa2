"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api";
import { ShieldCheck, Copy, Check, ArrowRight, Sparkles, BookOpen, Users } from "lucide-react";

type View = "signin" | "signup" | "admin-created";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("signin");

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up only fields
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [adminCode, setAdminCode] = useState("");

  // Post-signup admin code reveal
  const [createdAdminCode, setCreatedAdminCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [createdAdminName, setCreatedAdminName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setRole("student");
    setAdminCode("");
    setError("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Auto-detect role from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const userRole = profile?.role || "student";

    if (userRole === "admin") {
      router.push("/admin");
    } else if (userRole === "teacher") {
      router.push("/teacher");
    } else {
      router.push("/student");
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const enteredCode = adminCode.trim().toUpperCase();
    const registrationCode = role === "admin" ? null : enteredCode || null;

    // Teachers and students must provide a valid admin code
    if (role !== "admin") {
      if (!enteredCode) {
        setError("Please enter the Admin Code to sign up.");
        setLoading(false);
        return;
      }
    }

    // Create the account via the server API (uses service role,
    // confirms the email directly, avoids confirmation-email rate limits)
    const signupRes = await fetch(apiUrl("/auth/signup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
        adminCode: registrationCode,
      }),
    });

    const signupData = await signupRes.json();

    if (!signupRes.ok) {
      setError(signupData.error || "Failed to register. Please try again.");
      setLoading(false);
      return;
    }

    const userId = signupData.user?.id;
    const savedRegistrationCode = signupData.user?.admin_code || registrationCode;
    if (!userId) {
      setError("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // Save profile via server API (uses service role to bypass RLS)
    const profileRes = await fetch(apiUrl("/auth/profile"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        registrationNo: savedRegistrationCode,
      }),
    });

    if (!profileRes.ok) {
      const profileData = await profileRes.json();
      setError(profileData.error || "Failed to save user profile. Please try again.");
      setLoading(false);
      return;
    }

    // Sign the user in so their session is established before redirecting
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (role === "admin" && savedRegistrationCode) {
      // Show the admin code reveal screen
      setCreatedAdminCode(savedRegistrationCode);
      setCreatedAdminName(fullName.trim());
      setView("admin-created");
      setLoading(false);
    } else {
      // Redirect immediately for non-admin roles
      if (role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(createdAdminCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // ─── Admin Code Reveal Screen ────────────────────────────────────────────────
  if (view === "admin-created") {
    return (
      <main className="login-page">
        <div className="login-card admin-reveal-card">
          <div className="admin-reveal-badge">
            <ShieldCheck size={32} />
          </div>

          <h1 className="admin-reveal-title">Admin Account Created!</h1>
          <p className="admin-reveal-subtitle">
            Welcome, <strong>{createdAdminName}</strong>. Save your unique Admin Code — you'll need it to manage teachers and classrooms.
          </p>

          <div className="admin-code-reveal-block">
            <span className="admin-code-label">Your Unique Admin Code</span>
            <div className="admin-code-display">
              <span className="admin-code-value">{createdAdminCode}</span>
              <button
                className="admin-code-copy-btn"
                onClick={handleCopyCode}
                title="Copy to clipboard"
              >
                {copiedCode ? <Check size={17} /> : <Copy size={17} />}
                <span>{copiedCode ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <p className="admin-code-hint">
              This code links all teachers you create to your institution. It cannot be changed later.
            </p>
          </div>

          <button
            className="login-submit-btn admin-reveal-proceed-btn"
            onClick={() => router.push("/admin")}
          >
            Go to Admin Dashboard
            <ArrowRight size={18} />
          </button>
        </div>
      </main>
    );
  }

  // ─── Main Auth Card ──────────────────────────────────────────────────────────
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">E</div>

        <h1>Welcome to EduNexa</h1>
        <p className="login-subtitle">
          Smart Learning. Connected Classrooms. Institutional Oversight.
        </p>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${view === "signin" ? "active" : ""}`}
            onClick={() => { setView("signin"); resetForm(); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${view === "signup" ? "active" : ""}`}
            onClick={() => { setView("signup"); resetForm(); }}
          >
            Create Account
          </button>
        </div>

        {/* ── Sign In Form ── */}
        {view === "signin" && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="login-message error">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="login-switch-hint">
              Don't have an account?{" "}
              <button
                type="button"
                className="login-text-link"
                onClick={() => { setView("signup"); resetForm(); }}
              >
                Create one
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up Form ── */}
        {view === "signup" && (
          <form onSubmit={handleSignUp} className="login-form">
            <div className="login-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>I am signing up as a</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-btn ${role === "student" ? "active" : ""}`}
                  onClick={() => setRole("student")}
                >
                  <BookOpen size={17} />
                  Student
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "teacher" ? "active" : ""}`}
                  onClick={() => setRole("teacher")}
                >
                  <Users size={17} />
                  Teacher
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "admin" ? "active admin-role" : ""}`}
                  onClick={() => setRole("admin")}
                >
                  <ShieldCheck size={17} />
                  Admin
                </button>
              </div>
            </div>

            {/* Admin context note — only shown when admin is selected */}
            {role === "admin" ? (
              <div className="admin-signup-notice">
                <Sparkles size={15} />
                <span>
                  A unique <strong>Admin Code</strong> will be generated for your account after signup. Use it to create and manage teachers under your institution.
                </span>
              </div>
            ) : (
              <div className="login-field">
                <label>Admin Code</label>
                <input
                  type="text"
                  placeholder="Enter the Admin Code provided by your administrator"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  required
                />
              </div>
            )}

            {error && <div className="login-message error">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading
                ? "Creating Account..."
                : role === "admin"
                  ? "Create Admin Account"
                  : role === "teacher"
                    ? "Sign Up as Teacher"
                    : "Sign Up as Student"}
            </button>

            <p className="login-switch-hint">
              Already have an account?{" "}
              <button
                type="button"
                className="login-text-link"
                onClick={() => { setView("signin"); resetForm(); }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        <p className="login-footer">EduNexa • Smart Education Platform</p>
      </div>
    </main>
  );
}