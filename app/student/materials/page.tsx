"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  Archive,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Material = {
  id: string;
  title: string;
  description: string | null;
  resource_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  classroom_name: string;
  classroom_subject: string;
};

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  doc: File,
  docx: File,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  zip: Archive,
  txt: FileText,
};

function getFileIcon(type: string) {
  const ext = type?.split("/").pop()?.split(".").pop() || "";
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentMaterials() {
  const router = useRouter();
  const supabase = createClient();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: memberships } = await supabase
        .from("class_members")
        .select("classroom_id")
        .eq("student_id", user.id);

      if (!memberships || memberships.length === 0) {
        setMaterials([]);
        return;
      }

      const classroomIds = memberships.map((m) => m.classroom_id);

      const { data: classData } = await supabase
        .from("classrooms")
        .select("id, name, subject")
        .in("id", classroomIds);

      const classMap = new Map(
        (classData || []).map((c) => [c.id, { name: c.name, subject: c.subject }])
      );

      const { data: mats, error: matError } = await supabase
        .from("classroom_materials")
        .select("*")
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: false });

      if (matError) throw matError;

      const enriched = (mats || []).map((m) => {
        const cls = classMap.get(m.classroom_id);
        return {
          ...m,
          classroom_name: cls?.name || "Unknown Class",
          classroom_subject: cls?.subject || "",
        };
      });

      setMaterials(enriched);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load materials.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="student-loading">
        <Loader2 className="loading-spinner spin" size={32} />
        <p>Loading course materials...</p>
      </main>
    );
  }

  return (
    <main className="student-dashboard">
      <section className="student-content">
        <header className="student-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <button
                className="classroom-back-btn"
                onClick={() => router.push("/student")}
              >
                <ArrowLeft size={19} />
              </button>
              <span className="student-welcome">EduNexa Resources</span>
            </div>
            <h1>Course Materials</h1>
            <p className="student-header-subtitle">
              Notes, PDFs, and study resources from your teachers
            </p>
          </div>
        </header>

        {error && (
          <div className="copilot-error-banner" style={{ marginBottom: "16px" }}>
            <span>{error}</span>
          </div>
        )}

        {materials.length === 0 ? (
          <div className="student-empty-card">
            <div className="empty-icon">
              <BookOpen size={30} />
            </div>
            <h2>No Materials Yet</h2>
            <p>
              Your teachers haven&apos;t uploaded any course materials yet.
              Check back later!
            </p>
            <button onClick={() => router.push("/student")}>
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="student-section">
            <div className="student-section-heading">
              <div>
                <h2>All Materials ({materials.length})</h2>
                <p>From your enrolled classrooms</p>
              </div>
            </div>

            <div className="student-feature-grid" style={{ gridTemplateColumns: "1fr" }}>
              {materials.map((mat) => {
                const FileIcon = getFileIcon(mat.file_type || mat.file_name);
                return (
                  <a
                    key={mat.id}
                    href={mat.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="material-file-card"
                    title={`Open ${mat.file_name}`}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "var(--bg-tertiary, #f0f0f5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileIcon size={22} style={{ opacity: 0.7, color: "#635bff" }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>{mat.title}</h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.8rem", opacity: 0.6, color: "#64748b" }}>
                        {mat.classroom_name} &middot; {mat.file_name} &middot; {formatFileSize(mat.file_size)}
                      </p>
                      {mat.description && (
                        <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7, color: "#667085" }}>
                          {mat.description}
                        </p>
                      )}
                      <span style={{ fontSize: "0.75rem", opacity: 0.5, color: "#94a3b8" }}>
                        Uploaded {formatDate(mat.created_at)}
                      </span>
                    </div>

                    <span className="material-open-btn" aria-hidden="true">
                      <ExternalLink size={16} />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
