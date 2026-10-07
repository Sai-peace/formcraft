import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

type FormWithSettings = {
  id: string;
  title: string;
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
      where: {
        formId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
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
        {
          error: "This form is closed and no longer accepting submissions.",
        },
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
        {
          error: "This form has reached its maximum response capacity.",
        },
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

    // One-submission-per-student check
    const studentEmail = String(parsedAnswersObj.respondent_email ?? "")
      .trim()
      .toLowerCase();

    if (form.limitOnePerStudent && studentEmail) {
      const existingSubmissions = await prisma.response.findMany({
        where: {
          formId: id,
        },
        select: {
          answers: true,
        },
      });

      const alreadySubmitted = existingSubmissions.some((submission) => {
        try {
          const parsed = JSON.parse(submission.answers) as Record<
            string,
            unknown
          >;

          return (
            String(parsed.respondent_email ?? "")
              .trim()
              .toLowerCase() === studentEmail
          );
        } catch {
          return false;
        }
      });

      if (alreadySubmitted) {
        return NextResponse.json(
          {
            error:
              "Duplicate submission rejected: This OAU account has already submitted a response to this questionnaire.",
          },
          { status: 409 },
        );
      }
    }

    const answersString = JSON.stringify(parsedAnswersObj);

    const newResponse = await prisma.response.create({
      data: {
        formId: id,
        answers: answersString,
      },
    });

    // Fire webhook to Google Sheets / Make / Zapier
    if (form.webhookUrl && /^https?:\/\//i.test(form.webhookUrl)) {
      fetch(form.webhookUrl, {
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

    // Email alert
    if (
      form.notifyEmail &&
      form.user?.email &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      const formUrl = `${baseUrl}/builder/${id}`;

      transporter
        .sendMail({
          from: `"FormCraft" <${process.env.SMTP_USER}>`,
          to: form.user.email,
          subject: `New response received for "${form.title}"`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>New Submission Recorded</h2>

              <p>
                A new response has been submitted for
                <strong>"${form.title}"</strong>.
              </p>

              <p>
                <a
                  href="${formUrl}"
                  style="
                    display: inline-block;
                    padding: 10px 16px;
                    background: #4f46e5;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 6px;
                  "
                >
                  View Responses in Dashboard →
                </a>
              </p>

              <p>
                FormCraft • Obafemi Awolowo University
              </p>
            </div>
          `,
        })
        .catch((error) => {
          console.error("Email alert failed:", error);
        });
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
