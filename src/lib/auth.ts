import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile }) {
      // Check both user.email and profile.email, converted to lowercase
      const userEmail = (
        user?.email ||
        (profile as { email?: string })?.email ||
        ""
      )
        .toLowerCase()
        .trim();

      console.log("NextAuth checking email:", userEmail);

      // Enforce the student domain strictly
      const isOauStudent = userEmail.endsWith("@student.oauife.edu.ng");

      if (!isOauStudent) {
        console.warn(`Access denied for non-OAU email: ${userEmail}`);
        return false; // Rejects the login immediately
      }

      // Upsert student record in Neon
      try {
        await prisma.user.upsert({
          where: { email: userEmail },
          update: {
            name: user.name || "",
            image: user.image || "",
          },
          create: {
            email: userEmail,
            name: user.name || "",
            image: user.image || "",
          },
        });
        return true;
      } catch (err) {
        console.error("Error upserting student user:", err);
        return false;
      }
    },
    async jwt({ token, user, profile }) {
      const email = (
        user?.email ||
        (profile as { email?: string })?.email ||
        token.email ||
        ""
      )
        .toLowerCase()
        .trim();

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
      if (session.user) {
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
