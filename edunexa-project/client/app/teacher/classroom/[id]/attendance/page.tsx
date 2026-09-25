"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

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

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (classroomId) {
      loadAttendancePage();
    }
  }, [classroomId]);

  async function loadAttendancePage() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    // Load classroom
    const { data: classroomData, error: classroomError } =
      await supabase
        .from("classrooms")
        .select("id, name, subject, join_code, teacher_id")
        .eq("id", classroomId)
        .eq("teacher_id", user.id)
        .single();

    if (classroomError || !classroomData) {
      console.error(classroomError);

      setError(
        "Classroom not found or you do not have permission to access it."
      );

      setLoading(false);
      return;
    }

    setClassroom(classroomData);

    // Load classroom members
    const { data: members, error: membersError } = await supabase
      .from("class_members")
      .select("student_id")
      .eq("classroom_id", classroomId);

    if (membersError) {
      console.error(membersError);
      setError(membersError.message);
      setLoading(false);
      return;
    }

    const studentIds =
      members?.map((member) => member.student_id) || [];

    if (studentIds.length === 0) {
      setStudents([]);
      setAttendance({});
      setLoading(false);
      return;
    }

    // Load student profiles
    const { data: profileData, error: profileError } =
      await supabase
        .from("profiles")
        .select("id, full_name, email, registration_no")
        .in("id", studentIds)
        .eq("role", "student");

    if (profileError) {
      console.error(profileError);
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const studentList = (profileData as Student[]) || [];

    studentList.sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );

    setStudents(studentList);

    // Load existing attendance
    const { data: existingAttendance, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("classroom_id", classroomId)
        .eq("attendance_date", selectedDate);

    if (attendanceError) {
      console.error(attendanceError);
      setError(attendanceError.message);
      setLoading(false);
      return;
    }

    const attendanceMap: Record<
      string,
      AttendanceStatus
    > = {};

    studentList.forEach((student) => {
      attendanceMap[student.id] = "absent";
    });

    existingAttendance?.forEach((record) => {
      attendanceMap[record.student_id] =
        record.status === "present" ? "present" : "absent";
    });

    setAttendance(attendanceMap);

    setLoading(false);
  }

  async function loadDateAttendance(date: string) {
    setSelectedDate(date);
    setMessage("");
    setError("");

    const { data, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("classroom_id", classroomId)
      .eq("attendance_date", date);

    if (attendanceError) {
      console.error(attendanceError);
      setError(attendanceError.message);
      return;
    }

    const attendanceMap: Record<
      string,
      AttendanceStatus
    > = {};

    students.forEach((student) => {
      attendanceMap[student.id] = "absent";
    });

    data?.forEach((record) => {
      attendanceMap[record.student_id] =
        record.status === "present" ? "present" : "absent";
    });

    setAttendance(attendanceMap);
  }

  function markStudent(
    studentId: string,
    status: AttendanceStatus
  ) {
    setAttendance((current) => ({
      ...current,
      [studentId]: status,
    }));

    setMessage("");
    setError("");
  }

  function markAll(status: AttendanceStatus) {
    const newAttendance: Record<
      string,
      AttendanceStatus
    > = {};

    students.forEach((student) => {
      newAttendance[student.id] = status;
    });

    setAttendance(newAttendance);

    setMessage("");
    setError("");
  }

  async function saveAttendance() {
    setMessage("");
    setError("");

    if (students.length === 0) {
      setError("There are no students in this classroom.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Delete existing attendance for this classroom/date
      // so the teacher can edit attendance.
      const { error: deleteError } = await supabase
        .from("attendance")
        .delete()
        .eq("classroom_id", classroomId)
        .eq("attendance_date", selectedDate);

      if (deleteError) {
        throw deleteError;
      }

      // Create new attendance records
      const records = students.map((student) => ({
        classroom_id: classroomId,
        student_id: student.id,
        attendance_date: selectedDate,
        status: attendance[student.id] || "absent",
      }));

      const { error: insertError } = await supabase
        .from("attendance")
        .insert(records);

      if (insertError) {
        throw insertError;
      }

      setMessage(
        `Attendance saved successfully for ${selectedDate}.`
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message || "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  }

  const presentCount = students.filter(
    (student) => attendance[student.id] === "present"
  ).length;

  const absentCount = students.length - presentCount;

  const attendancePercentage =
    students.length > 0
      ? Math.round((presentCount / students.length) * 100)
      : 0;

  if (loading) {
    return (
      <main className="attendance-loading">
        <Loader2
          size={34}
          className="loading-spinner"
        />
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

        <button
          onClick={() =>
            router.push(
              `/teacher/classroom/${classroomId}`
            )
          }
        >
          Go Back
        </button>
      </main>
    );
  }

  return (
    <main className="attendance-page">

      {/* HEADER */}

      <header className="attendance-header">

        <button
          className="attendance-back"
          onClick={() =>
            router.push(
              `/teacher/classroom/${classroomId}`
            )
          }
        >
          <ArrowLeft size={18} />
          Back to Classroom
        </button>

        <div className="attendance-title">

          <div>
            <span>Teacher Portal</span>

            <h1>Attendance</h1>

            <p>
              {classroom?.name} •{" "}
              {classroom?.subject}
            </p>
          </div>

          <div className="attendance-code">

            <span>Join Code</span>

            <strong>
              {classroom?.join_code}
            </strong>

          </div>

        </div>

      </header>

      {/* CONTROLS */}

      <section className="attendance-controls">

        <div className="attendance-date">

          <CalendarDays size={19} />

          <div>

            <label>
              Attendance Date
            </label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) =>
                loadDateAttendance(
                  e.target.value
                )
              }
            />

          </div>

        </div>

        <div className="attendance-actions">

          <button
            className="attendance-outline-btn"
            onClick={() =>
              markAll("present")
            }
          >
            <Check size={17} />
            Mark All Present
          </button>

          <button
            className="attendance-outline-btn"
            onClick={() =>
              markAll("absent")
            }
          >
            <X size={17} />
            Mark All Absent
          </button>

          <button
            className="attendance-save-btn"
            onClick={saveAttendance}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="loading-spinner"
                />
                Saving...
              </>
            ) : (
              <>
                <Save size={17} />
                Save Attendance
              </>
            )}
          </button>

        </div>

      </section>

      {/* MESSAGES */}

      {message && (
        <div className="attendance-message success">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="attendance-message error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* STATS */}

      <section className="attendance-stats">

        <div className="attendance-stat-card">

          <div className="attendance-stat-icon">
            <Users size={21} />
          </div>

          <div>
            <span>Total Students</span>
            <strong>
              {students.length}
            </strong>
          </div>

        </div>

        <div className="attendance-stat-card">

          <div className="attendance-stat-icon">
            <Check size={21} />
          </div>

          <div>
            <span>Present</span>
            <strong>
              {presentCount}
            </strong>
          </div>

        </div>

        <div className="attendance-stat-card">

          <div className="attendance-stat-icon">
            <X size={21} />
          </div>

          <div>
            <span>Absent</span>
            <strong>
              {absentCount}
            </strong>
          </div>

        </div>

        <div className="attendance-stat-card">

          <div className="attendance-stat-icon">
            <CheckCircle size={21} />
          </div>

          <div>
            <span>Attendance Rate</span>
            <strong>
              {attendancePercentage}%
            </strong>
          </div>

        </div>

      </section>

      {/* STUDENT TABLE */}

      <section className="attendance-table-card">

        <div className="attendance-table-header">

          <div>

            <h2>
              Student Attendance
            </h2>

            <p>
              Mark attendance for{" "}
              {selectedDate}
            </p>

          </div>

          <div className="attendance-count">
            {presentCount} / {students.length}{" "}
            Present
          </div>

        </div>

        {students.length === 0 ? (

          <div className="attendance-empty">

            <Users size={40} />

            <h3>
              No students yet
            </h3>

            <p>
              Students who join this classroom
              will appear here.
            </p>

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

                {students.map(
                  (student, index) => {

                    const status =
                      attendance[student.id] ||
                      "absent";

                    return (

                      <tr key={student.id}>

                        <td>
                          {index + 1}
                        </td>

                        <td>

                          <div className="student-name-cell">

                            <div className="student-small-avatar">

                              {(student.full_name ||
                                student.email ||
                                "S")
                                .charAt(0)
                                .toUpperCase()}

                            </div>

                            <strong>
                              {student.full_name ||
                                "Unnamed Student"}
                            </strong>

                          </div>

                        </td>

                        <td>
                          {student.email || "—"}
                        </td>

                        <td>
                          {student.registration_no ||
                            "Not added"}
                        </td>

                        <td>

                          <div className="attendance-status-buttons">

                            <button
                              className={
                                status === "present"
                                  ? "status-btn present active"
                                  : "status-btn present"
                              }
                              onClick={() =>
                                markStudent(
                                  student.id,
                                  "present"
                                )
                              }
                            >
                              <Check size={16} />
                              Present
                            </button>

                            <button
                              className={
                                status === "absent"
                                  ? "status-btn absent active"
                                  : "status-btn absent"
                              }
                              onClick={() =>
                                markStudent(
                                  student.id,
                                  "absent"
                                )
                              }
                            >
                              <X size={16} />
                              Absent
                            </button>

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </main>
  );
}