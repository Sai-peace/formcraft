import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI();

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

    // Format submissions into clean readable text for Gemini
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
You are an executive data analyst for academic and administrative surveys at Obafemi Awolowo University.
Analyze the following questionnaire responses for the form: "${form.title}".

Questionnaire Description: ${form.description || "N/A"}
Total Responses: ${form.responses.length}

Raw Submissions Data:
${formattedSubmissions.slice(0, 150).join("\n")}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "A concise 2-3 sentence overview of respondent sentiment and results.",
  "sentiment": "Positive" | "Neutral" | "Negative" | "Mixed",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "{}";
    const insights = JSON.parse(responseText);

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    console.error("AI Insights generation error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to generate AI insights. Please check your Gemini configuration.",
      },
      { status: 500 },
    );
  }
}
