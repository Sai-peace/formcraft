import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.8-flash",
];

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
          take: 25,
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

Respond ONLY with valid JSON (no surrounding markdown text, no intro, no outro):
{
  "summary": "2 concise sentences summarizing respondent consensus.",
  "sentiment": "Neutral",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Actionable step 1", "Actionable step 2"]
}
Choose sentiment: "Positive", "Neutral", "Negative", or "Mixed".
`;

    let responseText = "";
    let lastErrorMessage = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
            temperature: 0.2,
          },
        });

        if (response.text) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErrorMessage = msg;
        console.warn(
          `[AI Failover] Model ${model} failed, trying next candidate:`,
          msg.slice(0, 150),
        );
      }
    }

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "All candidate models are temporarily unavailable. Please retry shortly.",
          details: lastErrorMessage.slice(0, 200),
        },
        { status: 503 },
      );
    }

    // Strip markdown code fences if present
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
    }

    // Isolate the outermost JSON object if any preamble leaked through
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    let insights;
    try {
      insights = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json(
        {
          error:
            "AI output could not be formatted into JSON. Please try again.",
        },
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
