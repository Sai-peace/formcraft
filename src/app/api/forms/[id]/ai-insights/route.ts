import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Fallback chain in case one model encounters 503 high demand or quota
const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-3.1-pro-preview"];

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

      return `Submission #\({index + 1}:\){JSON.stringify(answersReadable)}`;
    });

    const prompt = `
You are an executive data analyst for surveys at Obafemi Awolowo University.
Analyze the following questionnaire responses for the form: "${form.title}".

Questionnaire Description: ${form.description || "N/A"}
Total Responses: ${form.responses.length}

Raw Submissions Data:
${formattedSubmissions.slice(0, 150).join("\n")}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "A concise 2-3 sentence overview of respondent sentiment and results.",
  "sentiment": "Positive",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
For sentiment, pick one: "Positive", "Neutral", "Negative", or "Mixed".
`;

    let responseText = "";
    let lastError: unknown = null;

    // Try candidate models in sequence if one throws 503 or 404
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
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
        console.warn(
          `Model ${model} failed, trying fallback:`,
          err instanceof Error ? err.message : err,
        );
        lastError = err;
      }
    }

    if (!responseText) {
      throw (
        lastError ||
        new Error(
          "All AI models are currently busy. Please retry in a few seconds.",
        )
      );
    }

    const insights = JSON.parse(responseText);
    return NextResponse.json({ success: true, insights });
  } catch (error: unknown) {
    console.error("AI Insights backend error:", error);
    const msg =
      (error instanceof Error ? error.message : undefined) ||
      "Failed to generate AI insights. Please try again shortly.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
