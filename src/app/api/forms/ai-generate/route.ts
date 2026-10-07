import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Cascading models with independent daily free quotas
const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.8-flash",
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a description or prompt for the form." },
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

    const systemPrompt = `
You are an expert academic survey designer and questionnaire architect for university students and departments at Obafemi Awolowo University (OAU).
The user wants you to generate a structured form based on this request: "${prompt.trim()}".

Available question types to use:
- "short_answer"
- "email"
- "matric_number"
- "multiple_choice"
- "checkbox"
- "dropdown"
- "date"
- "file_upload"

Return ONLY a valid JSON object matching this exact schema:
{
  "title": "A concise, professional title for the form",
  "description": "A clear 1-2 sentence description explaining the purpose to respondents",
  "theme": "indigo",
  "questions": [
    {
      "id": "q-1",
      "title": "Question text here?",
      "type": "multiple_choice",
      "options": ["Option 1", "Option 2", "Option 3"],
      "required": true
    }
  ]
}

Guidelines:
- Choose appropriate input types (e.g. use multiple_choice or checkbox for ratings/opinions, matric_number when student identification is needed, short_answer for suggestions, email for contact info).
- Only include "options" array for "multiple_choice", "checkbox", or "dropdown". For other types, set options to null or omit it.
- Ensure unique IDs like "q-1", "q-2", etc.
- Generate between 4 to 8 high-impact questions matching the prompt.
- Set the theme to one of: "indigo", "emerald", "violet", "amber", "rose", "slate".
`;

    let responseText = "";
    let lastErrorMessage = "";

    // Iterate through candidate models for instant failover
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: systemPrompt,
          config: {
            responseMimeType: "application/json",
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
          `[AI Form Gen] ${model} unavailable or quota hit: ${msg.slice(0, 150)}`,
        );
      }
    }

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "AI service is busy right now across available models. Please retry in a few moments.",
          details: lastErrorMessage.slice(0, 200),
        },
        { status: 503 },
      );
    }

    // Strip markdown code fences if wrapped
    let cleanJson = responseText;
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "");
    }

    let parsedOutput: {
      title?: string;
      description?: string;
      theme?: string;
      questions?: unknown[];
    } = {};

    try {
      parsedOutput = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse Gemini output:", responseText);
      return NextResponse.json(
        { error: "AI produced an unreadable form format. Please try again." },
        { status: 500 },
      );
    }

    const formTitle = parsedOutput.title || "Untitled AI Form";
    const formDescription = parsedOutput.description || "";
    const formTheme = parsedOutput.theme || "indigo";
    const rawQuestions = Array.isArray(parsedOutput.questions)
      ? parsedOutput.questions
      : [];

    // Sanitize question items with unique timestamp IDs
    const sanitizedQuestions = rawQuestions.map((question, idx) => {
      const q =
        typeof question === "object" && question !== null
          ? (question as Record<string, unknown>)
          : {};
      const type = typeof q.type === "string" ? q.type : "short_answer";
      const options = Array.isArray(q.options)
        ? q.options.filter(
            (option): option is string => typeof option === "string",
          )
        : [];

      return {
        id: `q-${Date.now()}-${idx}`,
        title: typeof q.title === "string" ? q.title : `Question ${idx + 1}`,
        type,
        options: ["multiple_choice", "checkbox", "dropdown"].includes(type)
          ? options.length > 0
            ? options
            : ["Option 1", "Option 2"]
          : undefined,
        required: Boolean(q.required),
      };
    });

    // Save directly into database
    const createdForm = await prisma.form.create({
      data: {
        userId: user.id,
        title: formTitle,
        description: formDescription,
        theme: formTheme,
        fields: JSON.stringify(sanitizedQuestions),
        published: true,
      },
    });

    return NextResponse.json({
      success: true,
      formId: createdForm.id,
    });
  } catch (error: unknown) {
    console.error("AI form creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate form. Please check your network and retry.",
      },
      { status: 500 },
    );
  }
}
