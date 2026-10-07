import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

// Ensure Next.js doesn't cache and runs with max allowed serverless duration
export const dynamic = "force-dynamic";
export const maxDuration = 30; // Max allowed for Vercel functions

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        user: true,
        responses: {
          select: { answers: true, createdAt: true },
          take: 25, // Compact sample for fast processing and low token load
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.user?.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!form.responses || form.responses.length === 0) {
      return NextResponse.json(
        { error: "No responses available to analyze yet." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let parsedQuestions: Array<{ id: string; title: string; type: string }> =
      [];
    try {
      parsedQuestions = JSON.parse(form.fields || "[]");
    } catch {
      parsedQuestions = [];
    }

    const questionMap: Record<string, string> = {};
    parsedQuestions.forEach((q) => {
      questionMap[q.id] = q.title;
    });

    const formattedSubmissions = form.responses.map((r, index) => {
      let rawAnswers: Record<string, unknown> = {};
      try {
        rawAnswers =
          typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
      } catch {
        rawAnswers = {};
      }

      const answersReadable: Record<string, unknown> = {};
      Object.entries(rawAnswers).forEach(([key, val]) => {
        const questionLabel = questionMap[key] || key;
        answersReadable[questionLabel] = val;
      });

      return `Submission #${index + 1}: ${JSON.stringify(answersReadable)}`;
    });

    const prompt = `
Analyze these academic survey responses for "${form.title}".
Submissions:
${formattedSubmissions.join("\n")}

Respond ONLY with valid JSON (NO markdown backticks, NO explanation):
{
  "summary": "2 concise sentences summarizing respondent consensus.",
  "sentiment": "Neutral",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Actionable step 1", "Actionable step 2"]
}
Choose sentiment: "Positive", "Neutral", "Negative", or "Mixed".
`;

    let responseText = "";
    let lastError: unknown = null;

    // Strict 2-attempt loop on gemini-3.8-flash with tight token limits
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 400,
            temperature: 0.2,
          },
        });

        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(
          `Attempt ${attempt} on gemini-3.8-flash failed:`,
          err instanceof Error ? err.message : err,
        );
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!responseText) {
      let errorMsg =
        "The AI service is experiencing a brief traffic spike. Please tap retry in a moment.";
      if (lastError instanceof Error && lastError.message) {
        try {
          const parsed = JSON.parse(lastError.message);
          if (parsed?.error?.message) {
            errorMsg = parsed.error.message;
          }
        } catch {
          // Keep user-friendly error message if parsing fails
        }
      }
      return NextResponse.json({ error: errorMsg }, { status: 503 });
    }

    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "");
    }

    let insights;
    try {
      insights = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        { error: "AI response formatting error. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, insights });
  } catch (error: unknown) {
    console.error("AI Insights backend error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again shortly." },
      { status: 500 },
    );
  }
}
