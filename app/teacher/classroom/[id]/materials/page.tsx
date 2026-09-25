"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  Archive,
  AlertCircle,
  ExternalLink,
  Check,
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClassroomMaterials() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classroomId = params.id as string;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
  }, [classroomId]);

  async function loadMaterials() {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("classroom_materials")
        .select("*")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setMaterials(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load materials.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be under 50MB.");
      return;
    }

    setSelectedFile(file);
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleUpload() {
    if (!selectedFile || !uploadTitle.trim()) return;

    setUploading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${classroomId}/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("classroom-materials")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("classroom-materials")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("classroom_materials")
        .insert({
          classroom_id: classroomId,
          teacher_id: user.id,
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          resource_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
        });

      if (insertError) throw insertError;

      setShowUploadModal(false);
      setUploadTitle("");
      setUploadDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadMaterials();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload material.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(materialId: string, resourceUrl: string) {
    try {
      const url = new URL(resourceUrl);
      const pathMatch = url.pathname.match(/\/object\/auth\/classroom-materials\/(.+)/);
      const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;

      if (filePath) {
        await supabase.storage.from("classroom-materials").remove([filePath]);
      }

      const { error: deleteError } = await supabase
        .from("classroom_materials")
        .delete()
        .eq("id", materialId);

      if (deleteError) throw deleteError;

      setDeleteConfirm(null);
      await loadMaterials();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete material.");
    }
  }

  if (loading) {
    return (
      <main className="classroom-loading">
        <Loader2 className="loading-icon spin" size={38} />
        <p>Loading materials...</p>
      </main>
    );
  }

  return (
    <main className="teacher-analytics-page">
      {/* Header */}
      <header className="classroom-header">
        <div className="classroom-header-left">
          <button
            className="back-btn"
            onClick={() => router.push(`/teacher/classroom/${classroomId}`)}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <div className="page-kicker">Classroom Resources</div>
            <h1>Course Materials</h1>
            <p>Upload and manage documents, notes, and study materials.</p>
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload size={18} />
          Upload Material
        </button>
      </header>

      <section className="analytics-container">
        <section className="analytics-data-column" style={{ width: "100%" }}>
          {error && (
            <div className="copilot-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {materials.length === 0 ? (
            <div className="analytics-card">
              <div className="analytics-empty-box">
                <FileText size={40} />
                <h3>No Materials Yet</h3>
                <p>
                  Upload PDFs, slides, notes, images, or any study material for
                  your students.
                </p>
                <button
                  className="primary-btn"
                  onClick={() => setShowUploadModal(true)}
                  style={{ marginTop: "12px" }}
                >
                  <Upload size={18} />
                  Upload First Material
                </button>
              </div>
            </div>
          ) : (
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h3>Uploaded Materials ({materials.length})</h3>
                  <p>Documents and resources available to students</p>
                </div>
              </div>

              <div className="weak-topics-list">
                {materials.map((mat) => {
                  const FileIcon = getFileIcon(mat.file_type || mat.file_name);
                  return (
                    <div key={mat.id} className="weak-topic-row">
                      <div className="topic-name-wrap" style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "10px",
                              background: "var(--bg-tertiary, #f0f0f5)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <FileIcon size={20} style={{ opacity: 0.7 }} />
                          </div>
                          <div>
                            <strong>{mat.title}</strong>
                            <span style={{ display: "block", fontSize: "0.8rem", opacity: 0.6 }}>
                              {mat.file_name} &middot; {formatFileSize(mat.file_size)} &middot; {formatDate(mat.created_at)}
                            </span>
                            {mat.description && (
                              <span style={{ display: "block", fontSize: "0.85rem", opacity: 0.7, marginTop: "4px" }}>
                                {mat.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="topic-status-tag" style={{ gap: "8px", display: "flex" }}>
                        <a
                          href={mat.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ai-icon-btn"
                          title="Open / Download"
                        >
                          <ExternalLink size={15} />
                        </a>
                        {deleteConfirm === mat.id ? (
                          <button
                            className="ai-icon-btn"
                            style={{ color: "#ef4444" }}
                            onClick={() => handleDelete(mat.id, mat.resource_url)}
                            title="Confirm delete"
                          >
                            <Check size={15} />
                          </button>
                        ) : (
                          <button
                            className="ai-icon-btn close-btn"
                            onClick={() => setDeleteConfirm(mat.id)}
                            title="Delete material"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="teacher-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="teacher-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Material</h2>
            <p>Share notes, PDFs, slides, or any document with your students.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpload();
              }}
            >
              <label>Title *</label>
              <input
                type="text"
                placeholder="e.g. Chapter 5 - Normalization Notes"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                required
              />

              <label>Description (optional)</label>
              <input
                type="text"
                placeholder="Brief description of this material..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />

              <label>File *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={handleFileSelect}
                required
                style={{
                  padding: "10px",
                  border: "1px dashed var(--border-color, #d1d5db)",
                  borderRadius: "8px",
                  background: "var(--bg-secondary, #fafafa)",
                  cursor: "pointer",
                  width: "100%",
                }}
              />

              {selectedFile && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-secondary, #f0f0f5)",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <File size={14} />
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}

              <small style={{ display: "block", marginTop: "6px", opacity: 0.6 }}>
                Max 50MB. PDF, Images, Office docs, TXT, ZIP supported.
              </small>

              <div className="teacher-modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadTitle("");
                    setUploadDescription("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-btn"
                  disabled={uploading || !selectedFile || !uploadTitle.trim()}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
