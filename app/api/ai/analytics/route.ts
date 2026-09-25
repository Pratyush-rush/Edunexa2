import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse, ChatMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, history = [], classInfo, analytics } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query is required." },
        { status: 400 }
      );
    }

    // Build comprehensive data context for the AI model
    const contextData = `
CLASS INFORMATION:
- Classroom Name: ${classInfo?.name || "Unknown Class"}
- Subject: ${classInfo?.subject || "General"}
- Total Enrolled Students: ${classInfo?.totalStudents ?? 0}

ATTENDANCE SUMMARY:
- Total Class Sessions Conducted: ${analytics?.attendance?.totalSessions ?? 0}
- Overall Class Attendance Rate: ${analytics?.attendance?.overallAttendanceRate ?? "N/A"}%
- Students with Low Attendance (<75%): ${
      analytics?.attendance?.chronicAbsentees?.length
        ? analytics.attendance.chronicAbsentees
            .map(
              (s: any) =>
                `${s.name} (Reg: ${s.registrationNo || "N/A"}) - ${s.rate}% (${s.attended}/${s.total} classes)`
            )
            .join("; ")
        : "None identified (all students >= 75%)"
    }

QUIZ & PERFORMANCE SUMMARY:
- Total Quizzes Assigned: ${analytics?.quizzes?.totalQuizzes ?? 0}
- Class Overall Quiz Average: ${analytics?.quizzes?.classAverageScorePercentage ?? "N/A"}%
- Highest Quiz Score in Class: ${analytics?.quizzes?.highestScorePercentage ?? "N/A"}%
- Lowest Quiz Score in Class: ${analytics?.quizzes?.lowestScorePercentage ?? "N/A"}%
- Total Completed Attempts: ${analytics?.quizzes?.totalAttempts ?? 0}
- Quizzes Breakdown: ${
      analytics?.quizzes?.quizBreakdown?.length
        ? analytics.quizzes.quizBreakdown
            .map(
              (q: any) =>
                `"${q.title}": Avg ${q.averageScore}% (${q.attempts} attempts)`
            )
            .join("; ")
        : "No quizzes published yet"
    }

TOPIC MASTERY & IDENTIFIED WEAK POINTS:
${
  analytics?.weakTopics?.length
    ? analytics.weakTopics
        .map(
          (t: any) =>
            `- Topic "${t.topic}": ${t.successRate}% mastery (${
              t.needsAttention ? "⚠️ NEEDS ATTENTION / REMEDIAL WORK" : "✅ Proficient"
            })`
        )
        .join("\n")
    : "No topic performance data available yet"
}

INDIVIDUAL STUDENT OVERVIEW (Top & At-Risk):
${
  analytics?.studentPerformance?.length
    ? analytics.studentPerformance
        .slice(0, 20)
        .map(
          (s: any) =>
            `- ${s.name} (Reg: ${s.registrationNo || "N/A"}): Attendance ${s.attendanceRate}%, Quiz Avg ${s.averageQuizScore}%, Status: ${s.status}`
        )
        .join("\n")
    : "No individual records loaded"
}
`;

    const systemInstruction = `You are "EduNexa AI Classroom Analytics Assistant", an elite educational data analyst and instructional consultant assisting teachers.

YOUR PURPOSE:
Help teachers understand student performance, identify learning gaps and weak topics, detect at-risk students (low attendance or failing quiz scores), and provide tailored, actionable teaching recommendations.

GUIDELINES FOR YOUR ANALYSIS:
1. Base all quantitative conclusions strictly on the classroom data provided in this prompt.
2. When asked about attendance:
   - Report the overall attendance rate and clearly identify students under 75%.
   - Explain potential impacts on learning.
3. When asked about quiz performance or average score:
   - Provide clear score distributions, class averages, and identify top performers vs students needing help.
4. When asked about weak points or learning gaps:
   - Detail the exact topics where student mastery fell below 60%.
   - Suggest concrete pedagogical interventions (e.g. 15-minute concept review, hands-on demonstration, peer study pairings, or targeted practice worksheet).
5. Formatting:
   - Use clean, professional markdown with clear headings (##, ###), bullet lists, and bold highlights for critical statistics.
   - For recommendations, provide prioritized action items: Immediate (this week), Short-Term, and Long-Term.
   - Tone: Professional, encouraging, data-driven, and highly constructive.

CLASSROOM ANALYTICS DATA:
${contextData}`;

    const cleanHistory: ChatMessage[] = (history || []).map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      content: msg.content,
    }));

    const responseText = await generateAIResponse({
      prompt: query.trim(),
      systemInstruction,
      history: cleanHistory,
      temperature: 0.6,
    });

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("AI Analytics Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while generating classroom analytics insights.",
      },
      { status: 500 }
    );
  }
}
