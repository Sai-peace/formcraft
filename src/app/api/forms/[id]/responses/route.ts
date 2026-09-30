import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  redirectUrl: string | null;
  customMessage: string | null;
  user?: {
    email: string | null;
  } | null;
  _count: {
    responses: number;
  };
};

type ResponseBody = {
  answers?: unknown;
};

function getFormSettings(form: unknown): FormWithSettings {
  return form as FormWithSettings;
}

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
      where: {
        id,
      },
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

    // Only the owner of the form can view its responses.
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
      {
        error: "Failed to fetch responses",
      },
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

    // Find the form and include everything needed for
    // publishing, deadline, submission limit and notifications.
    const rawForm = await prisma.form.findUnique({
      where: {
        id,
      },
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

    /*
     * The cast keeps this route compatible when Prisma's generated
     * client has not refreshed its TypeScript types yet.
     *
     * The actual database fields remain unchanged.
     */
    const form = getFormSettings(rawForm);

    // ---------------------------------------------------------
    // FORM PUBLISHED CHECK
    // ---------------------------------------------------------
    if (!form.published) {
      return NextResponse.json(
        {
          error: "This form is closed and no longer accepting submissions.",
        },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // DEADLINE CHECK
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // MAXIMUM SUBMISSIONS CHECK
    // ---------------------------------------------------------
    if (
      form.maxSubmissions !== null &&
      form.maxSubmissions !== undefined &&
      Number(form.maxSubmissions) >= 0 &&
      form._count.responses >= Number(form.maxSubmissions)
    ) {
      return NextResponse.json(
        {
          error: "This form has reached its maximum response capacity.",
        },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // READ REQUEST BODY
    // ---------------------------------------------------------
    let body: ResponseBody;

    try {
      body = (await req.json()) as ResponseBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // VALIDATE ANSWERS
    // ---------------------------------------------------------
    if (
      body.answers !== undefined &&
      body.answers !== null &&
      typeof body.answers !== "string" &&
      typeof body.answers !== "object"
    ) {
      return NextResponse.json(
        {
          error: "Invalid answers format.",
        },
        { status: 400 },
      );
    }

    const answers =
      typeof body.answers === "string"
        ? body.answers
        : JSON.stringify(body.answers ?? {});

    // ---------------------------------------------------------
    // SAVE RESPONSE
    // ---------------------------------------------------------
    const newResponse = await prisma.response.create({
      data: {
        formId: id,
        answers,
      },
    });

    // 3. Send Email Notification if toggled on
    if (form.notifyEmail && form.user?.email && process.env.RESEND_API_KEY) {
      try {
        const formUrl = `${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/builder/${id}`;

        await resend.emails.send({
          from: "FormCraft <onboarding@resend.dev>",
          to: form.user.email,
          subject: `New response received for "${form.title}"`,
          html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b; margin-bottom: 16px;">
            New Submission Recorded
          </h2>

          <p>
            Someone just filled out your form
            <strong>"${form.title}"</strong>.
          </p>

          <p style="margin: 24px 0;">
            <a
              href="${formUrl}"
              style="
                display: inline-block;
                background: #4f46e5;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 20px;
                border-radius: 8px;
                font-weight: 600;
              "
            >
              View Responses in Dashboard
            </a>
          </p>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">
            FormCraft Notifications • You received this because email alerts
            are enabled on this form.
          </p>
        </div>
      `,
        });
      } catch (mailErr) {
        // Log the error but don't fail the submission so respondents aren't blocked.
        console.error("Failed to send email alert:", mailErr);
      }
    }

    // ---------------------------------------------------------
    // SUCCESS RESPONSE
    // ---------------------------------------------------------
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
      {
        error: "Failed to save response",
      },
      { status: 500 },
    );
  }
}
