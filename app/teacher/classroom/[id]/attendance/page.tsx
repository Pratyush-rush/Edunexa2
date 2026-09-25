"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Check,
  X,
  Save,
  Users,
  Loader2,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  teacher_id: string;
};

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  registration_no: string | null;
};

type AttendanceStatus = "present" | "absent";

type AttendanceRecord = {
  student_id: string;
  attendance_date: string;
  status: string;
};

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"mark" | "history">("mark");

  useEffect(() => {
    if (classroomId) loadAll();
  }, [classroomId]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: classData, error: ce } = await supabase
        .from("classrooms").select("id, name, subject, join_code, teacher_id")
        .eq("id", classroomId).eq("teacher_id", user.id).single();
      if (ce || !classData) { setError("Classroom not found or unauthorized."); setLoading(false); return; }
      setClassroom(classData);

      const { data: members } = await supabase
        .from("class_members").select("student_id").eq("classroom_id", classroomId);
      const studentIds = members?.map((m) => m.student_id) || [];

      if (studentIds.length === 0) { setStudents([]); setAllRecords([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("students").select("id, full_name, email, registration_no")
        .in("id", studentIds);
      const studentList = (profiles || []) as Student[];
      studentList.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
      setStudents(studentList);

      const { data: records } = await supabase
        .from("attendance").select("student_id, attendance_date, status")
        .eq("classroom_id", classroomId);
      setAllRecords(records || []);

      loadDateAttendanceLocal(studentList, records || [], selectedDate);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  function loadDateAttendanceLocal(studentList: Student[], records: AttendanceRecord[], date: string) {
    const map: Record<string, AttendanceStatus> = {};
    studentList.forEach((s) => { map[s.id] = "absent"; });
    records.filter((r) => r.attendance_date === date).forEach((r) => {
      map[r.student_id] = r.status === "present" ? "present" : "absent";
    });
    setAttendance(map);
  }

  function loadDateAttendance(date: string) {
    setSelectedDate(date);
    loadDateAttendanceLocal(students, allRecords, date);
    setMessage("");
  }

  function markStudent(studentId: string, status: AttendanceStatus) {
    setAttendance((c) => ({ ...c, [studentId]: status }));
    setMessage(""); setError("");
  }

  function markAll(status: AttendanceStatus) {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { map[s.id] = status; });
    setAttendance(map);
    setMessage(""); setError("");
  }

  async function saveAttendance() {
    setMessage(""); setError("");
    if (students.length === 0) { setError("No students in this classroom."); return; }
    setSaving(true);

    try {
      const { error: delErr } = await supabase
        .from("attendance").delete()
        .eq("classroom_id", classroomId).eq("attendance_date", selectedDate);
      if (delErr) throw delErr;

      const records = students.map((s) => ({
        classroom_id: classroomId,
        student_id: s.id,
        attendance_date: selectedDate,
        status: attendance[s.id] || "absent",
      }));

      const { error: insErr } = await supabase.from("attendance").insert(records);
      if (insErr) throw insErr;

      const newRecords = records.map((r) => ({
        student_id: r.student_id,
        attendance_date: r.attendance_date,
        status: r.status,
      }));

      setAllRecords((prev) => {
        const filtered = prev.filter((r) => r.attendance_date !== selectedDate);
        return [...filtered, ...newRecords];
      });

      setMessage(`Attendance saved for ${selectedDate}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  // --- Derived data ---
  const dates = useMemo(() => {
    const set = new Set(allRecords.map((r) => r.attendance_date));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allRecords]);

  const dateIndex = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allRecords.forEach((r) => {
      if (!map[r.attendance_date]) map[r.attendance_date] = {};
      map[r.attendance_date][r.student_id] = r.status;
    });
    return map;
  }, [allRecords]);

  const studentStats = useMemo(() => {
    return students.map((s) => {
      const total = dates.length;
      const present = dates.filter((d) => dateIndex[d]?.[s.id] === "present").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ...s, total, present, absent: total - present, rate };
    });
  }, [students, dates, dateIndex]);

  const presentCount = students.filter((s) => attendance[s.id] === "present").length;
  const absentCount = students.length - presentCount;
  const attendancePercentage = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

  // --- Export helpers ---
  function buildTableData() {
    const header = ["#", "Student Name", "Email", "Reg No.", "Present", "Absent", "Total Sessions", "Attendance %"];
    const rows = studentStats.map((s, i) => [
      i + 1,
      s.full_name || "Unnamed",
      s.email || "—",
      s.registration_no || "—",
      s.present,
      s.absent,
      s.total,
      s.rate + "%",
    ]);
    return { header, rows };
  }

  function exportCSV() {
    const { header, rows } = buildTableData();
    const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${classroom?.name || "class"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(`Attendance Report — ${classroom?.name || "Class"}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Subject: ${classroom?.subject || ""}  |  Total Sessions: ${dates.length}  |  Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    const { header, rows } = buildTableData();
    autoTable(doc, {
      startY: 28,
      head: [header],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 91, 255] },
    });

    doc.save(`attendance_${classroom?.name || "class"}_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  // --- Render ---
  if (loading) {
    return (
      <main className="attendance-loading">
        <Loader2 size={34} className="loading-spinner spin" />
        <p>Loading attendance...</p>
      </main>
    );
  }

  if (error && !classroom) {
    return (
      <main className="attendance-error-page">
        <AlertCircle size={40} />
        <h2>Unable to load classroom</h2>
        <p>{error}</p>
        <button onClick={() => router.push(`/teacher/classroom/${classroomId}`)}>Go Back</button>
      </main>
    );
  }

  return (
    <main className="attendance-page">
      {/* HEADER */}
      <header className="attendance-header">
        <button className="attendance-back" onClick={() => router.push(`/teacher/classroom/${classroomId}`)}>
          <ArrowLeft size={18} />
          Back to Classroom
        </button>

        <div className="attendance-title">
          <div>
            <span>Teacher Portal</span>
            <h1>Attendance</h1>
            <p>{classroom?.name} • {classroom?.subject}</p>
          </div>
          <div className="attendance-code">
            <span>Join Code</span>
            <strong>{classroom?.join_code}</strong>
          </div>
        </div>
      </header>

      {/* TABS */}
      <section className="attendance-controls">
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`attendance-outline-btn ${activeTab === "mark" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("mark")}
          >
            <CalendarDays size={16} />
            Mark Attendance
          </button>
          <button
            className={`attendance-outline-btn ${activeTab === "history" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FileText size={16} />
            Attendance History ({dates.length} sessions)
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button className="attendance-outline-btn" onClick={exportCSV}>
            <FileSpreadsheet size={16} />
            Export CSV
          </button>
          <button className="attendance-outline-btn" onClick={exportPDF}>
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </section>

      {message && (
        <div className="attendance-message success"><CheckCircle size={18} />{message}</div>
      )}
      {error && (
        <div className="attendance-message error"><AlertCircle size={18} />{error}</div>
      )}

      {/* =================== MARK ATTENDANCE TAB =================== */}
      {activeTab === "mark" && (
        <>
          <section className="attendance-controls">
            <div className="attendance-date">
              <CalendarDays size={19} />
              <div>
                <label>Attendance Date</label>
                <input type="date" value={selectedDate} onChange={(e) => loadDateAttendance(e.target.value)} />
              </div>
            </div>

            <div className="attendance-actions">
              <button className="attendance-outline-btn" onClick={() => markAll("present")}>
                <Check size={17} /> Mark All Present
              </button>
              <button className="attendance-outline-btn" onClick={() => markAll("absent")}>
                <X size={17} /> Mark All Absent
              </button>
              <button className="attendance-save-btn" onClick={saveAttendance} disabled={saving}>
                {saving ? <><Loader2 size={17} className="spin" /> Saving...</> : <><Save size={17} /> Save Attendance</>}
              </button>
            </div>
          </section>

          <section className="attendance-stats">
            <div className="attendance-stat-card">
              <div className="attendance-stat-icon"><Users size={21} /></div>
              <div><span>Total Students</span><strong>{students.length}</strong></div>
            </div>
            <div className="attendance-stat-card">
              <div className="attendance-stat-icon"><Check size={21} /></div>
              <div><span>Present</span><strong>{presentCount}</strong></div>
            </div>
            <div className="attendance-stat-card">
              <div className="attendance-stat-icon"><X size={21} /></div>
              <div><span>Absent</span><strong>{absentCount}</strong></div>
            </div>
            <div className="attendance-stat-card">
              <div className="attendance-stat-icon"><CheckCircle size={21} /></div>
              <div><span>Attendance Rate</span><strong>{attendancePercentage}%</strong></div>
            </div>
          </section>

          <section className="attendance-table-card">
            <div className="attendance-table-header">
              <div>
                <h2>Student Attendance</h2>
                <p>Mark attendance for {selectedDate}</p>
              </div>
              <div className="attendance-count">{presentCount} / {students.length} Present</div>
            </div>

            {students.length === 0 ? (
              <div className="attendance-empty">
                <Users size={40} />
                <h3>No students yet</h3>
                <p>Students who join this classroom will appear here.</p>
              </div>
            ) : (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Registration No.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const status = attendance[student.id] || "absent";
                      return (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="student-name-cell">
                              <div className="student-small-avatar">
                                {(student.full_name || student.email || "S").charAt(0).toUpperCase()}
                              </div>
                              <strong>{student.full_name || "Unnamed Student"}</strong>
                            </div>
                          </td>
                          <td>{student.email || "—"}</td>
                          <td>{student.registration_no || "Not added"}</td>
                          <td>
                            <div className="attendance-status-buttons">
                              <button
                                className={status === "present" ? "status-btn present active" : "status-btn present"}
                                onClick={() => markStudent(student.id, "present")}
                              >
                                <Check size={16} /> Present
                              </button>
                              <button
                                className={status === "absent" ? "status-btn absent active" : "status-btn absent"}
                                onClick={() => markStudent(student.id, "absent")}
                              >
                                <X size={16} /> Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* =================== HISTORY TAB =================== */}
      {activeTab === "history" && (
        <>
          {/* Per-student summary */}
          <section className="attendance-table-card">
            <div className="attendance-table-header">
              <div>
                <h2>Student Attendance Summary</h2>
                <p>Across {dates.length} recorded session{dates.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="attendance-empty">
                <Users size={40} />
                <h3>No students yet</h3>
              </div>
            ) : (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Reg No.</th>
                      {dates.map((d) => (
                        <th key={d} style={{ textAlign: "center", minWidth: "60px" }}>
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </th>
                      ))}
                      <th style={{ textAlign: "center" }}>Present</th>
                      <th style={{ textAlign: "center" }}>Absent</th>
                      <th style={{ textAlign: "center" }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStats.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <div className="student-name-cell">
                            <div className="student-small-avatar">
                              {(s.full_name || s.email || "S").charAt(0).toUpperCase()}
                            </div>
                            <strong>{s.full_name || "Unnamed"}</strong>
                          </div>
                        </td>
                        <td>{s.registration_no || "—"}</td>
                        {dates.map((d) => {
                          const st = dateIndex[d]?.[s.id];
                          return (
                            <td key={d} style={{ textAlign: "center" }}>
                              {st === "present" ? (
                                <span style={{ color: "#16a34a", fontWeight: 600 }}>P</span>
                              ) : (
                                <span style={{ color: "#dc2626", fontWeight: 600 }}>A</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{s.present}</td>
                        <td style={{ textAlign: "center" }}>{s.absent}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: s.rate >= 75 ? "#dcfce7" : s.rate >= 50 ? "#fef9c3" : "#fecaca",
                            color: s.rate >= 75 ? "#166534" : s.rate >= 50 ? "#854d0e" : "#991b1b",
                          }}>
                            {s.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
