"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { FormattedMessage } from "./FormattedMessage";
import { createClient } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api";

export type StudentDoubtAssistantProps = {
  initialPrompt?: string;
  quizContext?: {
    questionText?: string;
    options?: { key: string; text: string }[];
    selectedOption?: string;
    correctOption?: string;
    topic?: string;
  };
  classroomContext?: {
    name?: string;
    subject?: string;
  };
  forceOpen?: boolean;
  onClose?: () => void;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export function StudentDoubtAssistant({
  initialPrompt,
  quizContext,
  classroomContext: propClassroomContext,
  forceOpen = false,
  onClose,
}: StudentDoubtAssistantProps) {
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(forceOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! 👋 I'm **EduNexa AI Tutor**. Ask me any doubt from your subjects, lessons, or homework. I can explain complex concepts, solve problems step-by-step, or generate practice questions for you!",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; subject: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("general");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load enrolled classrooms for subject context
  useEffect(() => {
    async function loadEnrolledClassrooms() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: memberships } = await supabase
          .from("class_members")
          .select("classroom_id")
          .eq("student_id", user.id);

        if (memberships && memberships.length > 0) {
          const ids = memberships.map((m) => m.classroom_id);
          const { data: classData } = await supabase
            .from("classrooms")
            .select("id, name, subject")
            .in("id", ids);

          if (classData) {
            setClassrooms(classData);
          }
        }
      } catch (err) {
        console.error("Failed to load classrooms for AI assistant:", err);
      }
    }

    loadEnrolledClassrooms();
  }, []);

  // Sync forceOpen prop
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  // Handle initial prompt
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      setIsOpen(true);
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const quickPrompts = [
    { label: "💡 Explain step-by-step", text: "Can you explain this concept step-by-step with simple examples: " },
    { label: "🔢 Solve a problem", text: "Help me solve this problem step-by-step: " },
    { label: "📝 3 Practice questions", text: "Give me 3 practice multiple-choice questions to test my understanding on: " },
    { label: "⚡ Key takeaways", text: "Summarize the key formulas and concepts for: " },
  ];

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setErrorMsg(null);
    setInput("");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Determine classroom context
      let classroomCtx = propClassroomContext;
      if (!classroomCtx && selectedClassId !== "general") {
        const found = classrooms.find((c) => c.id === selectedClassId);
        if (found) {
          classroomCtx = { name: found.name, subject: found.subject };
        }
      }

      const res = await fetch(apiUrl("/ai/doubt"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          history: newMessages.slice(1, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          classroomContext: classroomCtx,
          quizContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response.");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to contact AI tutor. Please check your connection or API key.");
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared! How else can I help you with your studies today?",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setErrorMsg(null);
  }

  function handleClose() {
    setIsOpen(false);
    if (onClose) onClose();
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          className="ai-doubt-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Tutor"
          title="Ask AI Doubt Assistant"
        >
          <div className="ai-launcher-icon">
            <Sparkles size={22} className="sparkle-anim" />
          </div>
          <div className="ai-launcher-text">
            <strong>AI Tutor</strong>
            <span>Ask Doubts</span>
          </div>
          <span className="ai-launcher-badge">Free</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className={`ai-doubt-window ${isExpanded ? "expanded" : ""}`}>
          {/* Header */}
          <div className="ai-window-header">
            <div className="ai-header-left">
              <div className="ai-avatar-badge">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="ai-title-row">
                  <h3>EduNexa AI Tutor</h3>
                  <span className="ai-model-tag">Gemini Flash</span>
                </div>
                <p>Instant academic doubt clearing & study help</p>
              </div>
            </div>

            <div className="ai-header-actions">
              <button
                className="ai-icon-btn"
                onClick={handleClearChat}
                title="Clear conversation"
              >
                <RotateCcw size={16} />
              </button>

              <button
                className="ai-icon-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                className="ai-icon-btn close-btn"
                onClick={handleClose}
                title="Close AI Tutor"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Context Selector Bar */}
          <div className="ai-context-bar">
            <BookOpen size={14} />
            <span>Subject context:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="ai-context-select"
            >
              <option value="general">🌐 General / All Subjects</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  📚 {c.name} ({c.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Messages Area */}
          <div className="ai-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message-row ${msg.role === "user" ? "user-row" : "assistant-row"
                  }`}
              >
                {msg.role === "assistant" && (
                  <div className="ai-message-avatar">
                    <Sparkles size={14} />
                  </div>
                )}

                <div className="ai-message-bubble">
                  {msg.role === "user" ? (
                    <p className="ai-user-text">{msg.content}</p>
                  ) : (
                    <FormattedMessage content={msg.content} />
                  )}
                  <span className="ai-timestamp">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message-row assistant-row">
                <div className="ai-message-avatar">
                  <Sparkles size={14} />
                </div>
                <div className="ai-message-bubble thinking-bubble">
                  <div className="ai-typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span className="ai-thinking-text">EduNexa AI is thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="ai-error-banner">
                <AlertCircle size={16} />
                <div>
                  <strong>Notice:</strong> {errorMsg}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="ai-quick-chips">
            {quickPrompts.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-chip"
                onClick={() => {
                  setInput(chip.text);
                  inputRef.current?.focus();
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            className="ai-input-footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask any doubt (e.g. 'Explain Newton's laws with an example', 'How does quicksort work?')..."
              className="ai-input-field"
            />

            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || !input.trim()}
              title="Send question"
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
