import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; responseId: string }>;
};

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id, responseId } = await params;
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

    await prisma.response.delete({
      where: { id: responseId, formId: id },
    });

    return NextResponse.json({ success: true, message: "Response deleted" });
  } catch (error) {
    console.error("Delete response error:", error);
    return NextResponse.json(
      { error: "Failed to delete submission record." },
      { status: 500 },
    );
  }
}
