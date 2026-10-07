import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidOauEmail } from "@/lib/departments";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type FormWithSettings = {
  id: string;
  title: string;
  fields: string;
  published: boolean;
  deadline: Date | string | null;
  maxSubmissions: number | null;
  notifyEmail: boolean;
  collectEmail: boolean;
  limitOnePerStudent: boolean;
  webhookUrl: string | null;
  redirectUrl: string | null;
  customMessage: string | null;
  user?: {
    email: string | null;
  } | null;
  _count: {
    responses: number;
  };
};

type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | Record<string, unknown>
  | null;

type AnswersRecord = Record<string, AnswerValue>;

type ResponseBody = {
  answers?: AnswersRecord | string;
};

// GET /api/forms/[id]/responses
export async function GET(_req: Request, { params }: RouteContext) {
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
      select: {
        id: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.user?.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const responses = await prisma.response.findMany({
      where: { formId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("GET responses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 },
    );
  }
}

// POST /api/forms/[id]/responses
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 },
      );
    }

    const rawForm = await prisma.form.findUnique({
      where: { id },
      include: {
        user: true,
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    if (!rawForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const form = rawForm as unknown as FormWithSettings;

    if (!form.published) {
      return NextResponse.json(
        { error: "This form is closed and no longer accepting submissions." },
        { status: 403 },
      );
    }

    if (form.deadline) {
      const deadline = new Date(form.deadline);
      if (!Number.isNaN(deadline.getTime()) && new Date() > deadline) {
        return NextResponse.json(
          {
            error:
              "The deadline for submitting responses to this form has passed.",
          },
          { status: 403 },
        );
      }
    }

    const maxLimit =
      form.maxSubmissions !== null ? Number(form.maxSubmissions) : null;

    if (
      maxLimit !== null &&
      !Number.isNaN(maxLimit) &&
      maxLimit > 0 &&
      form._count.responses >= maxLimit
    ) {
      return NextResponse.json(
        { error: "This form has reached its maximum response capacity." },
        { status: 403 },
      );
    }

    let body: ResponseBody;
    try {
      body = (await req.json()) as ResponseBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    let parsedAnswersObj: AnswersRecord = {};
    if (typeof body.answers === "string") {
      try {
        const parsed = JSON.parse(body.answers);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedAnswersObj = parsed as AnswersRecord;
        }
      } catch {
        parsedAnswersObj = {};
      }
    } else if (
      body.answers &&
      typeof body.answers === "object" &&
      !Array.isArray(body.answers)
    ) {
      parsedAnswersObj = body.answers as AnswersRecord;
    }

    // Extract matric question ID
    let questions: Array<{ id: string; type: string }> = [];
    try {
      questions = JSON.parse(form.fields || "[]");
    } catch {
      questions = [];
    }

    const matricQuestion = questions.find((q) => q.type === "matric_number");
    const rawMatric = matricQuestion
      ? String(parsedAnswersObj[matricQuestion.id] ?? "")
          .trim()
          .toUpperCase()
      : null;
    const submittedMatric =
      rawMatric && rawMatric.length > 0 ? rawMatric : null;

    const rawEmail = String(parsedAnswersObj.respondent_email ?? "")
      .trim()
      .toLowerCase();
    const submittedEmail = rawEmail && rawEmail.length > 0 ? rawEmail : null;

    // Institutional domain restriction
    if (
      form.collectEmail &&
      submittedEmail &&
      !isValidOauEmail(submittedEmail)
    ) {
      return NextResponse.json(
        {
          error:
            "Access restricted: Submissions require an official OAU account (@student.oauife.edu.ng or @oauife.edu.ng).",
        },
        { status: 403 },
      );
    }

    // Fast indexed SQL lookup for duplicate checks
    if (form.limitOnePerStudent) {
      if (submittedEmail) {
        const emailExists = await prisma.response.findFirst({
          where: {
            formId: id,
            respondentEmail: submittedEmail,
          },
          select: { id: true },
        });

        if (emailExists) {
          return NextResponse.json(
            {
              error:
                "Duplicate submission rejected: This email address has already submitted a response.",
            },
            { status: 409 },
          );
        }
      }

      if (submittedMatric) {
        const matricExists = await prisma.response.findFirst({
          where: {
            formId: id,
            respondentMatric: submittedMatric,
          },
          select: { id: true },
        });

        if (matricExists) {
          return NextResponse.json(
            {
              error: `Duplicate submission rejected: A response has already been recorded for matric number "${submittedMatric}".`,
            },
            { status: 409 },
          );
        }
      }
    }

    const answersString = JSON.stringify(parsedAnswersObj);

    // Save submission with first-class indexed fields
    const newResponse = await prisma.response.create({
      data: {
        formId: id,
        answers: answersString,
        respondentEmail: submittedEmail,
        respondentMatric: submittedMatric,
      },
    });

    // Fire webhook asynchronously (Google Sheets / Make)
    if (form.webhookUrl && /^https?:\/\//i.test(form.webhookUrl)) {
      void fetch(form.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: id,
          formTitle: form.title,
          responseId: newResponse.id,
          submittedAt: newResponse.createdAt,
          answers: parsedAnswersObj,
        }),
      }).catch((error) => {
        console.error("Webhook dispatch failed:", error);
      });
    }

    // High-speed non-blocking transactional email via Resend
    if (form.notifyEmail && form.user?.email && resend) {
      const baseUrl =
        process.env.NEXTAUTH_URL || "https://formcraft.vercel.app";
      const formUrl = `${baseUrl}/builder/${id}`;

      void resend.emails
        .send({
          from: "FormCraft <onboarding@resend.dev>",
          to: form.user.email,
          subject: `New submission for "${form.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
              <h2 style="color: #4f46e5;">New Submission Recorded</h2>
              <p>A new response has been submitted for <strong>"${form.title}"</strong>.</p>
              ${submittedMatric ? `<p><strong>Matric Number:</strong> ${submittedMatric}</p>` : ""}
              <p style="margin-top: 20px;">
                <a href="${formUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                  View Live Feed in Dashboard →
                </a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
              <p style="font-size: 12px; color: #64748b;">FormCraft • Obafemi Awolowo University</p>
            </div>
          `,
        })
        .catch((err) => console.error("Resend delivery failed:", err));
    }

    return NextResponse.json(
      {
        success: true,
        responseId: newResponse.id,
        redirectUrl: form.redirectUrl || null,
        customMessage: form.customMessage || null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST response error:", error);
    return NextResponse.json(
      { error: "Failed to save response" },
      { status: 500 },
    );
  }
}

// DELETE /api/forms/[id]/responses
export async function DELETE(_req: Request, { params }: RouteContext) {
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
      include: { user: true },
    });

    if (!form || form.user?.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.response.deleteMany({
      where: { formId: id },
    });

    return NextResponse.json({
      success: true,
      message: "All responses for this questionnaire have been deleted.",
    });
  } catch (error) {
    console.error("DELETE all responses error:", error);
    return NextResponse.json(
      { error: "Failed to delete responses." },
      { status: 500 },
    );
  }
}
