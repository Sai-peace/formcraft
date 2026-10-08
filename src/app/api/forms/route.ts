import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Realistic OAU Academic & Institutional Template Presets
const TEMPLATES: Record<
  string,
  {
    title: string;
    description: string;
    fields: {
      id: string;
      title: string;
      type: string;
      options?: string[];
      required: boolean;
    }[];
  }
> = {
  "Course & Lecturer Evaluation": {
    title: "Course & Lecturer Evaluation Survey",
    description:
      "Official end-of-semester course feedback and teaching assessment for Obafemi Awolowo University faculties.",
    fields: [
      {
        id: "q-ce-1",
        title: "Course Code & Title (e.g. CPE 501 / EEE 301)",
        type: "short_answer",
        required: true,
      },
      {
        id: "q-ce-2",
        title: "Academic Level",
        type: "dropdown",
        options: [
          "Part 1 (100L)",
          "Part 2 (200L)",
          "Part 3 (300L)",
          "Part 4 (400L)",
          "Part 5 (500L)",
          "Postgraduate",
        ],
        required: true,
      },
      {
        id: "q-ce-3",
        title:
          "How clearly were the syllabus objectives and course materials communicated?",
        type: "multiple_choice",
        options: [
          "5 - Exceptionally Clear",
          "4 - Clear and Well-Structured",
          "3 - Satisfactory",
          "2 - Moderately Unclear",
          "1 - Very Poor / Disorganized",
        ],
        required: true,
      },
      {
        id: "q-ce-4",
        title:
          "Pacing of lectures, class punctuality, and practical demonstrations",
        type: "dropdown",
        options: [
          "Optimal pace & consistent attendance",
          "Paced too quickly for syllabus coverage",
          "Slow pacing / irregular lectures",
          "Practical sessions were insufficient",
        ],
        required: true,
      },
      {
        id: "q-ce-5",
        title:
          "What constructive recommendations would you suggest for the course lecturer?",
        type: "short_answer",
        required: false,
      },
    ],
  },
  "Departmental Clearance Verification": {
    title: "Departmental Clearance & Dues Verification",
    description:
      "Official clearance record submission for departmental association registration, dues vetting, and graduating student verification.",
    fields: [
      {
        id: "q-cl-1",
        title: "Full Student Name (Surname First)",
        type: "short_answer",
        required: true,
      },
      {
        id: "q-cl-2",
        title: "Matriculation Number (e.g., CHE/2021/045)",
        type: "short_answer",
        required: true,
      },
      {
        id: "q-cl-3",
        title: "Faculty & Department",
        type: "dropdown",
        options: [
          "Faculty of Technology - Computer Science & Engineering",
          "Faculty of Technology - Electronic & Electrical Engineering",
          "Faculty of Technology - Mechanical Engineering",
          "Faculty of Science - Physics",
          "Faculty of Science - Chemistry",
          "Faculty of Administration - Management & Accounting",
          "Other Department",
        ],
        required: true,
      },
      {
        id: "q-cl-4",
        title: "Academic Session & Current Clearance Status",
        type: "multiple_choice",
        options: [
          "Full Dues Paid - Awaiting Receipt Stamp",
          "Half Installment Paid",
          "Final Year Graduating Clearance",
          "Exempted / Scholarship Status",
        ],
        required: true,
      },
      {
        id: "q-cl-5",
        title: "Bank Remita RRR or Transaction Reference Number",
        type: "short_answer",
        required: true,
      },
    ],
  },
  "Final Year Project Research Survey": {
    title: "Undergraduate Final Year Project (FYP) Research Survey",
    description:
      "Empirical field questionnaire designed for final year students collecting primary data for chapter 3 and 4 thesis analysis.",
    fields: [
      {
        id: "q-fyp-1",
        title: "Respondent Demographic Level",
        type: "dropdown",
        options: [
          "Undergraduate Student",
          "Postgraduate Researcher",
          "Academic Staff",
          "External Participant",
        ],
        required: true,
      },
      {
        id: "q-fyp-2",
        title: "Faculty / Area of Specialization",
        type: "dropdown",
        options: [
          "Technology / Engineering",
          "Sciences",
          "Health Sciences / Basic Medical",
          "Administration / Social Sciences",
          "Arts / Education",
        ],
        required: true,
      },
      {
        id: "q-fyp-3",
        title:
          "How frequently do you utilize the proposed technology or methodology in your daily workflow?",
        type: "multiple_choice",
        options: [
          "Daily (Extremely Frequent)",
          "Weekly (Moderate)",
          "Occasionally / Rarely",
          "Never utilized before",
        ],
        required: true,
      },
      {
        id: "q-fyp-4",
        title:
          "Rate the effectiveness of the system/process based on current implementations",
        type: "multiple_choice",
        options: [
          "5 - Highly Effective",
          "4 - Moderately Effective",
          "3 - Neutral / Average",
          "2 - Ineffective",
          "1 - Critically Deficient",
        ],
        required: true,
      },
      {
        id: "q-fyp-5",
        title:
          "What key bottlenecks or limitations should this research prioritize addressing?",
        type: "short_answer",
        required: false,
      },
    ],
  },
};

// GET /api/forms
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const forms = await prisma.form.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    return NextResponse.json(forms);
  } catch (error) {
    console.error("GET /api/forms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/forms
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedTemplate = body.template || body.title;

    let formTitle = "Untitled Form";
    let formDescription = "Form description or instructions for respondents...";
    let formFields: (typeof TEMPLATES)[string]["fields"] = [
      {
        id: `q-${Date.now()}`,
        title: "Untitled Question",
        type: "multiple_choice",
        options: ["Option 1"],
        required: false,
      },
    ];

    if (requestedTemplate && TEMPLATES[requestedTemplate]) {
      const preset = TEMPLATES[requestedTemplate];
      formTitle = preset.title;
      formDescription = preset.description;
      formFields = preset.fields;
    } else if (body.title && body.title !== "Blank Form") {
      formTitle = body.title;
    }

    const newForm = await prisma.form.create({
      data: {
        userId: user.id,
        title: formTitle,
        description: formDescription,
        fields: JSON.stringify(formFields),
        published: true,
      },
    });

    return NextResponse.json(newForm, { status: 201 });
  } catch (error) {
    console.error("POST /api/forms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
