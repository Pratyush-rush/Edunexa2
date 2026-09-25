"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck,
  Users,
  BookOpen,
  GraduationCap,
  Plus,
  Copy,
  Check,
  LogOut,
  Search,
  Loader2,
  Mail,
  UserPlus,
  FolderPlus,
  KeyRound,
  Sparkles,
  School,
  FileQuestion,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Teacher = {
  id: string;
  full_name: string | null;
  email: string;
  registration_no: string | null;
  classroomCount?: number;
  studentCount?: number;
};

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  teacher_id: string;
  teacher_name?: string;
  studentCount?: number;
};

type EnrolledStudent = {
  id: string;
  full_name: string | null;
  email: string;
  registration_no: string | null;
  classrooms: { id: string; name: string; subject: string; teacher_name?: string }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Administrator");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Data Collections
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [allRegisteredStudents, setAllRegisteredStudents] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [quizCount, setQuizCount] = useState(0);

  // Active Tab & Search
  const [activeTab, setActiveTab] = useState<"teachers" | "classrooms" | "students">("teachers");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Form States
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");

  const [newClassTeacherId, setNewClassTeacherId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassSubject, setNewClassSubject] = useState("");

  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollStudentMode, setEnrollStudentMode] = useState<"existing" | "new">("existing");
  const [enrollSelectedStudentId, setEnrollSelectedStudentId] = useState("");
  const [enrollStudentEmail, setEnrollStudentEmail] = useState("");
  const [enrollStudentName, setEnrollStudentName] = useState("");

  // Action status
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  async function loadAdminDashboard() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setAdminEmail(user.email || "");

      const res = await fetch("/api/admin/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.redirect === "teacher") {
          router.replace("/teacher");
          return;
        }
        if (data.redirect === "student") {
          router.replace("/student");
          return;
        }
        console.error("Failed to load admin dashboard:", data.error);
        return;
      }

      setAdminName(data.adminName || "Administrator");
      setAdminCode(data.adminCode || "");
      setTeachers(data.teachers || []);
      setClassrooms(data.classrooms || []);
      setStudents(data.students || []);
      setAllRegisteredStudents(data.allRegisteredStudents || []);
      setQuizCount(data.quizCount || 0);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode() {
    if (!adminCode) return;
    navigator.clipboard.writeText(adminCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // CREATE TEACHER
  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");

    try {
      const res = await fetch("/api/admin/create-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newTeacherName,
          email: newTeacherEmail,
          password: newTeacherPassword,
          adminCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create teacher account.");
      }

      setModalSuccess(`Teacher account "${newTeacherName}" created successfully!`);
      setNewTeacherName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("");

      setTimeout(() => {
        setShowTeacherModal(false);
        setModalSuccess("");
        loadAdminDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Error creating teacher.");
    } finally {
      setModalLoading(false);
    }
  }

  // CREATE CLASSROOM FOR TEACHER
  async function handleCreateClassroom(e: React.FormEvent) {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");

    try {
      const res = await fetch("/api/admin/create-classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: newClassTeacherId,
          name: newClassName,
          subject: newClassSubject,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create classroom.");
      }

      setModalSuccess(`Classroom "${newClassName}" created with join code ${data.classroom.join_code}!`);
      setNewClassName("");
      setNewClassSubject("");

      setTimeout(() => {
        setShowClassModal(false);
        setModalSuccess("");
        loadAdminDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Error creating classroom.");
    } finally {
      setModalLoading(false);
    }
  }

  // ENROLL STUDENT TO CLASSROOM
  async function handleEnrollStudent(e: React.FormEvent) {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");
    setModalSuccess("");

    try {
      const payload: any = {
        classroomId: enrollClassId,
        adminCode: adminCode || null,
      };

      if (enrollStudentMode === "existing") {
        if (!enrollSelectedStudentId) {
          throw new Error("Please select a student to enroll.");
        }
        payload.studentId = enrollSelectedStudentId;
      } else {
        if (!enrollStudentEmail.trim()) {
          throw new Error("Please enter student email.");
        }
        payload.studentEmail = enrollStudentEmail.trim();
        payload.studentName = enrollStudentName.trim();
      }

      const res = await fetch("/api/admin/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll student.");
      }

      setModalSuccess(data.message || "Student successfully enrolled!");
      setEnrollSelectedStudentId("");
      setEnrollStudentEmail("");
      setEnrollStudentName("");

      setTimeout(() => {
        setShowStudentModal(false);
        setModalSuccess("");
        loadAdminDashboard();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Error enrolling student.");
    } finally {
      setModalLoading(false);
    }
  }

  // Filtered lists based on search query
  const filteredTeachers = teachers.filter(
    (t) =>
      (t.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClassrooms = classrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.teacher_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.join_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.registration_no || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.classrooms.some((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  if (loading) {
    return (
      <main className="classroom-loading">
        <Loader2 className="loading-icon spin" size={38} />
        <p>Loading EduNexa Admin Dashboard...</p>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-brand-section">
          <div className="admin-brand-badge">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="admin-brand-kicker">INSTITUTIONAL ADMINISTRATION</div>
            <h1>EduNexa Admin Console</h1>
          </div>
        </div>

        <div className="admin-header-right">
          {/* Unique Admin Identification Code */}
          <div className="admin-code-header-badge" title="Your unique administrator code">
            <span className="code-label">ADMIN CODE</span>
            <strong className="code-value">{adminCode}</strong>
            <button onClick={handleCopyCode} className="copy-code-btn" title="Copy Admin Code">
              {copiedCode ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedCode ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="admin-profile-pill">
            <div className="admin-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-info">
              <strong>{adminName}</strong>
              <span>Super Admin</span>
            </div>
          </div>

          <button onClick={handleLogout} className="admin-logout-btn" title="Sign out">
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <section className="admin-content-wrap">
        {/* Info Banner on Admin Code Linkage */}
        <div className="admin-code-banner">
          <div className="admin-banner-left">
            <div className="admin-banner-icon">
              <KeyRound size={26} />
            </div>
            <div>
              <h2>Your Unique Administrative Code: <code>{adminCode}</code></h2>
              <p>
                Teachers created under this console are automatically bound to this code.
                Teachers and students created here belong exclusively to your administrative institution.
              </p>
            </div>
          </div>

          <div className="admin-banner-actions">
            <button
              onClick={() => {
                setModalError("");
                setModalSuccess("");
                setShowTeacherModal(true);
              }}
              className="admin-primary-action-btn"
            >
              <UserPlus size={17} />
              <span>Create Teacher Account</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <div className="kpi-icon-bubble bg-indigo">
              <Users size={24} />
            </div>
            <div className="kpi-details">
              <span>Teachers Under Admin</span>
              <strong>{teachers.length}</strong>
              <small>Managing active classrooms</small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-bubble bg-emerald">
              <School size={24} />
            </div>
            <div className="kpi-details">
              <span>Total Classrooms</span>
              <strong>{classrooms.length}</strong>
              <small>Across all subjects</small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-bubble bg-purple">
              <GraduationCap size={24} />
            </div>
            <div className="kpi-details">
              <span>Enrolled Students</span>
              <strong>{students.length}</strong>
              <small>Active in classrooms</small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon-bubble bg-amber">
              <FileQuestion size={24} />
            </div>
            <div className="kpi-details">
              <span>Class Quizzes Conducted</span>
              <strong>{quizCount}</strong>
              <small>Evaluations conducted</small>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="admin-action-bar">
          <div className="admin-tabs">
            <button
              className={`admin-tab-btn ${activeTab === "teachers" ? "active" : ""}`}
              onClick={() => setActiveTab("teachers")}
            >
              <Users size={16} />
              Teachers ({teachers.length})
            </button>

            <button
              className={`admin-tab-btn ${activeTab === "classrooms" ? "active" : ""}`}
              onClick={() => setActiveTab("classrooms")}
            >
              <School size={16} />
              Classrooms ({classrooms.length})
            </button>

            <button
              className={`admin-tab-btn ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              <GraduationCap size={16} />
              Students ({students.length})
            </button>
          </div>

          <div className="admin-search-and-actions">
            <div className="admin-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === "teachers" && (
              <button
                className="admin-btn-action"
                onClick={() => {
                  setModalError("");
                  setModalSuccess("");
                  setShowTeacherModal(true);
                }}
              >
                <Plus size={16} />
                New Teacher
              </button>
            )}

            {activeTab === "classrooms" && (
              <button
                className="admin-btn-action"
                onClick={() => {
                  if (teachers.length === 0) {
                    alert("Please create a teacher first before adding a classroom.");
                    return;
                  }
                  setNewClassTeacherId(teachers[0].id);
                  setModalError("");
                  setModalSuccess("");
                  setShowClassModal(true);
                }}
              >
                <FolderPlus size={16} />
                New Classroom
              </button>
            )}

            {activeTab === "students" && (
              <button
                className="admin-btn-action"
                onClick={() => {
                  if (classrooms.length === 0) {
                    alert("Please create a classroom first before adding students.");
                    return;
                  }
                  setEnrollClassId(classrooms[0].id);
                  setModalError("");
                  setModalSuccess("");
                  setShowStudentModal(true);
                }}
              >
                <UserPlus size={16} />
                Add Student to Class
              </button>
            )}
          </div>
        </div>

        {/* ================= TAB 1: TEACHERS ================= */}
        {activeTab === "teachers" && (
          <div className="admin-card-panel">
            <div className="panel-header-row">
              <div>
                <h3>Teachers Directory</h3>
                <p>Teachers accounts registered and managed under your administrative code.</p>
              </div>

              <button
                className="admin-btn-accent"
                onClick={() => {
                  setModalError("");
                  setModalSuccess("");
                  setShowTeacherModal(true);
                }}
              >
                <UserPlus size={16} />
                Create Teacher Account
              </button>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="admin-empty-state">
                <Users size={36} />
                <h4>No Teachers Found</h4>
                <p>
                  {searchQuery
                    ? "No teachers match your search query."
                    : "You haven't created any teachers yet. Click below to add your first teacher."}
                </p>
                <button
                  className="admin-btn-action"
                  onClick={() => setShowTeacherModal(true)}
                >
                  <Plus size={16} />
                  Add First Teacher
                </button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Teacher Name</th>
                      <th>Email</th>
                      <th>Admin Linkage</th>
                      <th>Classrooms</th>
                      <th>Students</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t, idx) => (
                      <tr key={t.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="table-user-cell">
                            <div className="table-avatar bg-indigo">
                              {(t.full_name || "T").charAt(0).toUpperCase()}
                            </div>
                            <strong>{t.full_name || "Teacher"}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="email-text">{t.email}</span>
                        </td>
                        <td>
                          <span className="admin-link-tag">
                            <ShieldCheck size={13} />
                            {adminCode}
                          </span>
                        </td>
                        <td>
                          <strong>{t.classroomCount || 0}</strong>
                        </td>
                        <td>
                          <strong>{t.studentCount || 0}</strong>
                        </td>
                        <td>
                          <button
                            className="table-action-pill"
                            onClick={() => {
                              setNewClassTeacherId(t.id);
                              setShowClassModal(true);
                            }}
                            title="Create a classroom for this teacher"
                          >
                            <Plus size={13} />
                            Add Class
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: CLASSROOMS ================= */}
        {activeTab === "classrooms" && (
          <div className="admin-card-panel">
            <div className="panel-header-row">
              <div>
                <h3>Classrooms Oversight</h3>
                <p>All active classrooms and subjects organized by your teachers.</p>
              </div>

              <button
                className="admin-btn-accent"
                onClick={() => {
                  if (teachers.length === 0) {
                    alert("Please create a teacher first.");
                    return;
                  }
                  setNewClassTeacherId(teachers[0].id);
                  setShowClassModal(true);
                }}
              >
                <FolderPlus size={16} />
                Create Classroom
              </button>
            </div>

            {filteredClassrooms.length === 0 ? (
              <div className="admin-empty-state">
                <School size={36} />
                <h4>No Classrooms Found</h4>
                <p>
                  {searchQuery
                    ? "No classrooms match your search query."
                    : "No classrooms have been created yet. Create classrooms and assign them to teachers."}
                </p>
                <button
                  className="admin-btn-action"
                  onClick={() => {
                    if (teachers.length > 0) {
                      setNewClassTeacherId(teachers[0].id);
                      setShowClassModal(true);
                    } else {
                      setShowTeacherModal(true);
                    }
                  }}
                >
                  <Plus size={16} />
                  Create Classroom
                </button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Classroom Name</th>
                      <th>Subject</th>
                      <th>Teacher in Charge</th>
                      <th>Join Code</th>
                      <th>Enrolled Students</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClassrooms.map((c, idx) => (
                      <tr key={c.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong className="class-title-text">{c.name}</strong>
                        </td>
                        <td>
                          <span className="subject-pill">{c.subject}</span>
                        </td>
                        <td>{c.teacher_name}</td>
                        <td>
                          <span className="join-code-tag">{c.join_code}</span>
                        </td>
                        <td>
                          <strong>{c.studentCount || 0} students</strong>
                        </td>
                        <td>
                          <button
                            className="table-action-pill"
                            onClick={() => {
                              setEnrollClassId(c.id);
                              setShowStudentModal(true);
                            }}
                          >
                            <UserPlus size={13} />
                            Add Student
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: STUDENTS ================= */}
        {activeTab === "students" && (
          <div className="admin-card-panel">
            <div className="panel-header-row">
              <div>
                <h3>Enrolled Students Directory</h3>
                <p>Students assigned and actively participating across your classrooms.</p>
              </div>

              <button
                className="admin-btn-accent"
                onClick={() => {
                  if (classrooms.length === 0) {
                    alert("Please create a classroom first.");
                    return;
                  }
                  setEnrollClassId(classrooms[0].id);
                  setShowStudentModal(true);
                }}
              >
                <UserPlus size={16} />
                Enroll Student in Class
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="admin-empty-state">
                <GraduationCap size={36} />
                <h4>No Enrolled Students Found</h4>
                <p>
                  {searchQuery
                    ? "No students match your search."
                    : "No students are currently enrolled in your teachers' classrooms."}
                </p>
                <button
                  className="admin-btn-action"
                  onClick={() => {
                    if (classrooms.length > 0) {
                      setEnrollClassId(classrooms[0].id);
                      setShowStudentModal(true);
                    }
                  }}
                >
                  <UserPlus size={16} />
                  Enroll First Student
                </button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Registration No.</th>
                      <th>Enrolled Classrooms</th>
                      <th>Teacher(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="table-user-cell">
                            <div className="table-avatar bg-purple">
                              {(s.full_name || s.email).charAt(0).toUpperCase()}
                            </div>
                            <strong>{s.full_name || "Student"}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="email-text">{s.email}</span>
                        </td>
                        <td>{s.registration_no || "N/A"}</td>
                        <td>
                          <div className="enrolled-classes-wrap">
                            {s.classrooms.map((c) => (
                              <span key={c.id} className="class-badge-mini">
                                {c.name} ({c.subject})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {s.classrooms.map((c) => c.teacher_name).filter(Boolean).join(", ") || "Assigned"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================= MODAL 1: CREATE TEACHER ================= */}
      {showTeacherModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div className="modal-title-left">
                <div className="modal-icon-bubble">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3>Create Teacher Account</h3>
                  <span>Bound to Admin Code: {adminCode}</span>
                </div>
              </div>

              <button
                onClick={() => setShowTeacherModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="admin-modal-form">
              <label>Teacher Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Sarah Connor"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                required
              />

              <label>Teacher Email Address</label>
              <input
                type="email"
                placeholder="teacher@institution.edu"
                value={newTeacherEmail}
                onChange={(e) => setNewTeacherEmail(e.target.value)}
                required
              />

              <label>Initial Password (min 6 characters)</label>
              <input
                type="password"
                placeholder="Set initial password for teacher"
                value={newTeacherPassword}
                onChange={(e) => setNewTeacherPassword(e.target.value)}
                required
              />

              <div className="admin-binding-note">
                <ShieldCheck size={16} />
                <span>
                  This teacher will be registered with role <strong>Teacher</strong> and automatically linked to your Admin Code <strong>{adminCode}</strong>.
                </span>
              </div>

              {modalError && (
                <div className="modal-error-banner">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="modal-success-banner">
                  <CheckCircle2 size={16} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="modal-submit-btn"
                >
                  {modalLoading ? "Creating..." : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATE CLASSROOM ================= */}
      {showClassModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div className="modal-title-left">
                <div className="modal-icon-bubble">
                  <FolderPlus size={20} />
                </div>
                <div>
                  <h3>Create Classroom</h3>
                  <span>Assign to a Teacher under your administration</span>
                </div>
              </div>

              <button
                onClick={() => setShowClassModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClassroom} className="admin-modal-form">
              <label>Assign to Teacher</label>
              <select
                value={newClassTeacherId}
                onChange={(e) => setNewClassTeacherId(e.target.value)}
                required
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || t.email} ({t.email})
                  </option>
                ))}
              </select>

              <label>Classroom Name</label>
              <input
                type="text"
                placeholder="e.g. AP Physics 101"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
              />

              <label>Subject</label>
              <input
                type="text"
                placeholder="e.g. Physics, Calculus, Computer Science"
                value={newClassSubject}
                onChange={(e) => setNewClassSubject(e.target.value)}
                required
              />

              {modalError && (
                <div className="modal-error-banner">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="modal-success-banner">
                  <CheckCircle2 size={16} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="modal-submit-btn"
                >
                  {modalLoading ? "Creating..." : "Create Classroom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ADD STUDENT TO CLASS ================= */}
      {showStudentModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <div className="modal-title-left">
                <div className="modal-icon-bubble">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3>Enroll Student in Classroom</h3>
                  <span>Assign students to teacher classrooms</span>
                </div>
              </div>

              <button
                onClick={() => setShowStudentModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className="admin-modal-form">
              <label>Select Target Classroom</label>
              <select
                value={enrollClassId}
                onChange={(e) => setEnrollClassId(e.target.value)}
                required
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject}) — Teacher: {c.teacher_name}
                  </option>
                ))}
              </select>

              <div className="enroll-mode-selector">
                <button
                  type="button"
                  className={`enroll-mode-btn ${enrollStudentMode === "existing" ? "active" : ""}`}
                  onClick={() => setEnrollStudentMode("existing")}
                >
                  Existing Registered Student
                </button>
                <button
                  type="button"
                  className={`enroll-mode-btn ${enrollStudentMode === "new" ? "active" : ""}`}
                  onClick={() => setEnrollStudentMode("new")}
                >
                  New Student by Email
                </button>
              </div>

              {enrollStudentMode === "existing" ? (
                <>
                  <label>Select Student</label>
                  {allRegisteredStudents.length === 0 ? (
                    <p className="modal-hint">No registered students found. Switch to "New Student by Email".</p>
                  ) : (
                    <select
                      value={enrollSelectedStudentId}
                      onChange={(e) => setEnrollSelectedStudentId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a Student --</option>
                      {allRegisteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name || s.email} ({s.email})
                        </option>
                      ))}
                    </select>
                  )}
                </>
              ) : (
                <>
                  <label>Student Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={enrollStudentName}
                    onChange={(e) => setEnrollStudentName(e.target.value)}
                  />

                  <label>Student Email Address</label>
                  <input
                    type="email"
                    placeholder="student@institution.edu"
                    value={enrollStudentEmail}
                    onChange={(e) => setEnrollStudentEmail(e.target.value)}
                    required
                  />
                </>
              )}

              {modalError && (
                <div className="modal-error-banner">
                  <AlertCircle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="modal-success-banner">
                  <CheckCircle2 size={16} />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="modal-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="modal-submit-btn"
                >
                  {modalLoading ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
