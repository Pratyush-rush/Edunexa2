import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse, ChatMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history = [], classroomContext, quizContext } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    let contextualInfo = "";

    if (classroomContext?.name || classroomContext?.subject) {
      contextualInfo += `\n[Student Context: Enrolled in "${classroomContext.name || "Class"}" (Subject: ${classroomContext.subject || "General"})]`;
    }

    if (quizContext) {
      contextualInfo += `\n[Quiz Question Doubt Context:
Question: ${quizContext.questionText}
Topic: ${quizContext.topic || "General"}
Student Selected: Option ${quizContext.selectedOption || "None"}
Correct Option: Option ${quizContext.correctOption}
Options Provided:
${quizContext.options?.map((o: any) => `  ${o.key}: ${o.text}`).join("\n") || "N/A"}]`;
    }

    const systemInstruction = `You are "EduNexa AI Tutor", an expert, empathetic, and encouraging personal academic tutor for students.
Your mission is to help students resolve doubts, understand complex concepts intuitively, and master their school/college subjects.

GUIDELINES:
1. Explain concepts step-by-step using simple, clear language and relatable real-world analogies.
2. If the student has a doubt about a quiz question or problem:
   - Clearly explain WHY the correct answer is right.
   - Gently clarify why other options or the student's selected answer was incorrect without making them feel bad.
   - Provide the underlying rule, theorem, or logic.
3. Formatting:
   - Use clear markdown with bold headers, bullet points, and numbered steps.
   - Use formatted code blocks for code snippets (\`\`\`language) and math notation where appropriate.
   - Keep answers easy to read on screen (avoid giant unstructured walls of text).
4. Tone: Encouraging, friendly, academically rigorous yet approachable.
5. Conclude with a quick tip, key takeaway, or an offer to give a mini practice problem to test their understanding.
${contextualInfo ? `\nCURRENT CONTEXT FOR THIS DOUBT:\n${contextualInfo}` : ""}`;

    const cleanHistory: ChatMessage[] = (history || []).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      content: msg.content,
    }));

    const responseText = await generateAIResponse({
      prompt: prompt.trim(),
      systemInstruction,
      history: cleanHistory,
      temperature: 0.7,
    });

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("AI Doubt Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while generating a response from the AI tutor.",
      },
      { status: 500 }
    );
  }
}
