import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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
  "peaceadeolu222@gmail.com",
];

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Official Google OAuth for OAU accounts ONLY
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    // 2. Email OTP via Brevo: Strictly for your 30 testers
    CredentialsProvider({
      name: "Tester Verification Code",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const email = credentials.email.toLowerCase().trim();
        const otp = credentials.otp.trim();

        // 🔒 Check whitelist
        const isWhitelisted = TESTER_WHITELIST.map((e) =>
          e.toLowerCase().trim(),
        ).includes(email);

        if (!isWhitelisted) {
          throw new Error("Unauthorized: Email not on tester whitelist.");
        }

        // Verify token in database
        const record = await prisma.verificationToken.findFirst({
          where: {
            identifier: email,
            token: otp,
            expires: { gt: new Date() },
          },
        });

        if (!record) {
          throw new Error("Invalid or expired 6-digit code.");
        }

        // Consume and delete the token
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Upsert the tester user
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: email.split("@")[0].toUpperCase() + " (Tester)",
          },
        });

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user?.email?.toLowerCase().trim() || "";

      // Allow approved credentials login
      if (account?.provider === "credentials") {
        return true;
      }

      // Google OAuth is gated strictly to OAU emails
      if (account?.provider === "google") {
        const isOau =
          email.endsWith("@student.oauife.edu.ng") ||
          email.endsWith("@oauife.edu.ng");

        if (!isOau) {
          return false;
        }

        try {
          await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name || "",
              image: user.image || "",
            },
            create: {
              email,
              name: user.name || "",
              image: user.image || "",
            },
          });
          return true;
        } catch (err) {
          console.error("Error upserting OAU Google user:", err);
          return false;
        }
      }

      return false;
    },

    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toLowerCase().trim();
      token.email = email;

      if (email) {
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id =
          token.sub as string;
      }
      return session;
    },
  },
  pages: {
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
