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
    async signIn({ user }) {
      const email = user?.email || "";

      // 1. Enforce OAU student domain strictly
      if (!email.endsWith("@student.oauife.edu.ng")) {
        return false;
      }

      // 2. Ensure user record exists in Prisma/Neon DB
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
        console.error("Error upserting student user:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        // Fetch database ID so session carries the Prisma User ID
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email || "" },
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
