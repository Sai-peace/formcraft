import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/forms/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        _count: { select: { responses: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("GET /api/forms/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/forms/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await prisma.form.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        fields:
          typeof body.fields === "string"
            ? body.fields
            : JSON.stringify(body.fields),
        published: body.published,
        theme: body.theme || "indigo",
        maxSubmissions:
          body.maxSubmissions !== undefined && body.maxSubmissions !== ""
            ? Number(body.maxSubmissions)
            : null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        customMessage: body.customMessage || null,
        redirectUrl: body.redirectUrl || null,
        notifyEmail: Boolean(body.notifyEmail),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/forms/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/forms/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.response.deleteMany({ where: { formId: id } });
    await prisma.form.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/forms/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
