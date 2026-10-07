import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "FormCraft Questionnaire";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Image({ params }: Props) {
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    select: { title: true, description: true },
  });

  const formTitle = form?.title || "FormCraft Questionnaire";
  const formDescription =
    form?.description || "Obafemi Awolowo University Campus Survey";

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#020617",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            backgroundColor: "#6366f1",
            borderRadius: "16px",
            padding: "12px 20px",
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: 800,
          }}
        >
          FC
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "1px",
          }}
        >
          FORMCRAFT • OAU CAMPUS
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            color: "#ffffff",
            fontSize: "56px",
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          {formTitle.length > 70 ? `${formTitle.slice(0, 70)}...` : formTitle}
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: "24px",
            lineHeight: 1.4,
          }}
        >
          {formDescription.length > 120
            ? `${formDescription.slice(0, 120)}...`
            : formDescription}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #1e293b",
          paddingTop: "32px",
        }}
      >
        <div style={{ color: "#6366f1", fontSize: "20px", fontWeight: 600 }}>
          Tap to participate in this survey
        </div>
        <div style={{ color: "#64748b", fontSize: "18px" }}>
          Powered by Obafemi Awolowo University
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
