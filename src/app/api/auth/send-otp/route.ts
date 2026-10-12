import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mail";

// Your exact approved tester list (tester 1 to 30)
const TESTER_WHITELIST: string[] = [
  "tester1@gmail.com",
  "tester2@gmail.com",
  "tester3@gmail.com",
  "tester4@gmail.com",
  "tester5@gmail.com",
  "tester6@gmail.com",
    "tester7@gmail.com",
    "tester8@gmail.com",
    "tester9@gmail.com",
    "tester10@gmail.com",
    "tester11@gmail.com",
    "tester12@gmail.com",
    "tester13@gmail.com",
    "tester14@gmail.com",
    "tester15@gmail.com",
    "tester16@gmail.com",
    "tester17@gmail.com",
    "tester18@gmail.com",
    "tester19@gmail.com",
    "tester20@gmail.com",
    "tester21@gmail.com",
    "tester22@gmail.com",
    "tester23@gmail.com",
    "tester24@gmail.com",
    "tester25@gmail.com",
    "tester26@gmail.com",
    "tester27@gmail.com",
    "tester28@gmail.com",
    "tester29@gmail.com",
    "peaceadeolu222@gmail.com"
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 🔒 STRICT CHECK: Only allow approved testers from your whitelist
    const isWhitelisted = TESTER_WHITELIST.map((e) =>
      e.toLowerCase().trim(),
    ).includes(cleanEmail);

    if (!isWhitelisted) {
      return NextResponse.json(
        {
          error:
            "Access restricted: This personal email is not on the authorized tester whitelist.",
        },
        { status: 403 },
      );
    }

    // Generate 6-digit code with 10-minute validity
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Clean out old tokens for this tester
    await prisma.verificationToken.deleteMany({
      where: { identifier: cleanEmail },
    });

    // Store new verification code
    await prisma.verificationToken.create({
      data: {
        identifier: cleanEmail,
        token: otp,
        expires,
      },
    });

    // Send the code through Brevo
    await sendOtpEmail(cleanEmail, otp);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error sending Brevo OTP:", err);
    return NextResponse.json(
      { error: "Failed to dispatch verification code. Please try again." },
      { status: 500 },
    );
  }
}
