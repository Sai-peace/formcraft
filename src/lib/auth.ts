import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const ALLOWED_DOMAIN = "@student.oauife.edu.ng";

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
    // 1. Blocks new login attempts from unauthorized domains
    async signIn({ user, profile }) {
      const email = (
        user?.email ||
        (profile as { email?: string })?.email ||
        ""
      )
        .toLowerCase()
        .trim();

      if (!email.endsWith(ALLOWED_DOMAIN)) {
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
        console.error("Error upserting student user:", err);
        return false;
      }
    },

    // 2. Invalidate existing sessions if the email doesn't match the OAU domain
    async jwt({ token, user, profile }) {
      const email = (
        user?.email ||
        (profile as { email?: string })?.email ||
        token.email ||
        ""
      )
        .toLowerCase()
        .trim();

      if (!email.endsWith(ALLOWED_DOMAIN)) {
        return {}; // Wipes token payload for non-student accounts
      }

      token.email = email;

      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (dbUser) {
        token.sub = dbUser.id;
      }

      return token;
    },

    // 3. Prevent rendering authenticated session if domain is invalid
    async session({ session, token }) {
      const email = (session?.user?.email || token?.email || "")
        .toLowerCase()
        .trim();

      if (!email.endsWith(ALLOWED_DOMAIN) || !token.sub) {
        return {
          ...session,
          user: undefined, // Clears user from session
        };
      }

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
