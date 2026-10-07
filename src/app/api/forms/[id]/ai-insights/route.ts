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
          take: 60, // Limit sample size so payload stays small and generates fast
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
You are an executive data analyst for surveys at Obafemi Awolowo University.
Analyze these responses for the questionnaire titled: "${form.title}".

Context:
Total Responses: ${form.responses.length}
Submissions Sample:
${formattedSubmissions.join("\n")}

Respond ONLY with a valid raw JSON object (NO markdown backticks, NO markdown formatting) matching:
{
  "summary": "2 concise sentences summarizing respondent consensus.",
  "sentiment": "Neutral",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Actionable step 1", "Actionable step 2"]
}
For sentiment, pick one of: "Positive", "Neutral", "Negative", or "Mixed".
`;

    let responseText = "";
    let lastError: unknown = null;

    // Fast 2-attempt retry with short 800ms backoff to stay well inside the timeout limit
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(
          `Attempt ${attempt} failed:`,
          err instanceof Error ? err.message : err,
        );
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "AI service was slow or busy. Please try clicking the button again.",
        },
        { status: 504 },
      );
    }

    // Clean potential markdown fencing (e.g. ```json ... ```)
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
        { error: "AI output could not be formatted. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, insights });
  } catch (error: unknown) {
    console.error("AI Insights backend error:", error);
    return NextResponse.json(
      { error: "Internal error analyzing responses. Please try again." },
      { status: 500 },
    );
  }
}
