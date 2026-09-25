import { generateLlmResponse } from "../configs/llm.config.js";
import { failure, success } from "../utils/api-response.js";

function normalizeHistory(history = []) {
    return history.map((message) => ({ role: message.role === "assistant" ? "model" : "user", content: message.content }));
}

export async function doubtController(req, res, next) {
    try {
        const { prompt, history = [], classroomContext, quizContext } = req.body;
        if (!prompt?.trim()) return failure(res, "Prompt is required.", 400);
        const context = [classroomContext?.name || classroomContext?.subject ? `[Student Context: Enrolled in "${classroomContext.name || "Class"}" (Subject: ${classroomContext.subject || "General"})]` : "", quizContext ? `[Quiz Question Doubt Context:\nQuestion: ${quizContext.questionText}\nTopic: ${quizContext.topic || "General"}\nStudent Selected: Option ${quizContext.selectedOption || "None"}\nCorrect Option: Option ${quizContext.correctOption}]` : ""].filter(Boolean).join("\n");
        const response = await generateLlmResponse({ prompt: prompt.trim(), history: normalizeHistory(history), temperature: 0.7, systemInstruction: `You are EduNexa AI Tutor, an expert and encouraging academic tutor. Explain concepts step by step with simple language, analogies, clear markdown, and rigorous reasoning. For quiz doubts, explain the correct answer and why other options are incorrect.${context ? `\nCURRENT CONTEXT:\n${context}` : ""}` });
        return success(res, { response });
    } catch (error) { return next(error); }
}

export async function analyticsController(req, res, next) {
    try {
        const { query, history = [], classInfo, analytics } = req.body;
        if (!query?.trim()) return failure(res, "Query is required.", 400);
        const response = await generateLlmResponse({ prompt: query.trim(), history: normalizeHistory(history), temperature: 0.6, systemInstruction: `You are EduNexa AI Classroom Analytics Assistant. Give professional, data-driven, actionable recommendations based strictly on this data:\n${JSON.stringify({ classInfo, analytics }, null, 2)}` });
        return success(res, { response });
    } catch (error) { return next(error); }
}
