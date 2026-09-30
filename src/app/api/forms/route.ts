import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Predefined template field presets
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
  "Customer Feedback": {
    title: "Customer Feedback Survey",
    description:
      "We value your feedback! Help us improve our product and experience.",
    fields: [
      {
        id: "q-fb-1",
        title: "How satisfied are you with our product?",
        type: "multiple_choice",
        options: ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied"],
        required: true,
      },
      {
        id: "q-fb-2",
        title: "Which features do you use most frequently?",
        type: "checkbox",
        options: [
          "Form Builder",
          "Live Analytics",
          "CSV Export",
          "Custom Styling",
        ],
        required: false,
      },
      {
        id: "q-fb-3",
        title: "How likely are you to recommend us to a colleague?",
        type: "dropdown",
        options: [
          "10 - Extremely Likely",
          "8 - Likely",
          "5 - Neutral",
          "1 - Unlikely",
        ],
        required: true,
      },
      {
        id: "q-fb-4",
        title: "What is one thing we could improve?",
        type: "short_answer",
        required: false,
      },
    ],
  },
  "Event RSVP": {
    title: "Event RSVP & Registration",
    description:
      "Please confirm your attendance and preferences for our upcoming gathering.",
    fields: [
      {
        id: "q-rsvp-1",
        title: "Full Name",
        type: "short_answer",
        required: true,
      },
      {
        id: "q-rsvp-2",
        title: "Will you be attending in person?",
        type: "multiple_choice",
        options: [
          "Yes, attending in person",
          "Attending virtually",
          "Cannot make it",
        ],
        required: true,
      },
      {
        id: "q-rsvp-3",
        title: "Dietary Preferences or Restrictions",
        type: "dropdown",
        options: [
          "No dietary restrictions",
          "Vegetarian",
          "Vegan",
          "Halal",
          "Gluten-Free",
        ],
        required: false,
      },
      {
        id: "q-rsvp-4",
        title: "Preferred Arrival Date",
        type: "date",
        required: false,
      },
    ],
  },
  "Course Evaluation": {
    title: "Course & Instructor Evaluation",
    description:
      "Please share honest feedback on this course module and the teaching methodology.",
    fields: [
      {
        id: "q-ce-1",
        title: "Course Code / Title",
        type: "short_answer",
        required: true,
      },
      {
        id: "q-ce-2",
        title:
          "The course objectives and assignments were clearly communicated.",
        type: "multiple_choice",
        options: ["Strongly Agree", "Agree", "Neutral", "Disagree"],
        required: true,
      },
      {
        id: "q-ce-3",
        title: "Rate the pacing and delivery of lectures",
        type: "dropdown",
        options: ["Just Right", "Too Fast", "Too Slow"],
        required: true,
      },
      {
        id: "q-ce-4",
        title:
          "What topic was most beneficial or requires further elaboration?",
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

// POST /api/forms - Create a new form with template support
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

    // Check if the requested title matches one of our template presets
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
