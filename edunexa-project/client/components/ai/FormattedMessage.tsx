"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface FormattedMessageProps {
  content: string;
}

export function FormattedMessage({ content }: FormattedMessageProps) {
  return (
    <div className="ai-markdown-body">
      {renderBlocks(content)}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <span>{language || "code"}</span>
        <button onClick={copyCode} type="button" title="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderBlocks(rawText: string): React.ReactNode[] {
  if (!rawText) return [];

  // Split text by code blocks first
  const parts = rawText.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstLineEnd = part.indexOf("\n");
      const language = part.slice(3, firstLineEnd > 0 ? firstLineEnd : 3).trim();
      const code = firstLineEnd > 0 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);
      return <CodeBlock key={index} code={code} language={language} />;
    }

    return <TextBlock key={index} text={part} />;
  });
}

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ai-ul">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Heading 3
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="ai-h3">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    // Heading 2
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={i} className="ai-h2">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Heading 1
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={i} className="ai-h1">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote key={i} className="ai-quote">
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Bullet List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={i} className="ai-li">
          {parseInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    // Numbered List (e.g. 1. )
    const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (matchNum) {
      flushList();
      elements.push(
        <div key={i} className="ai-numbered-item">
          <span className="ai-num-badge">{matchNum[1]}</span>
          <div>{parseInline(matchNum[2])}</div>
        </div>
      );
      return;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={i} className="ai-p">
        {parseInline(line)}
      </p>
    );
  });

  flushList();

  return <>{elements}</>;
}

function parseInline(str: string): React.ReactNode[] {
  // Regex to split on bold (**text**), inline code (`code`), or italic (*text*)
  const tokens = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return (
        <strong key={idx} className="ai-bold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code key={idx} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}
