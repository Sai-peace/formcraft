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
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token.sub) {
        // Ensure user exists in our SQLite database
        const user = await prisma.user.upsert({
          where: { email: session.user.email! },
          update: {
            name: session.user.name,
            image: session.user.image,
          },
          create: {
            id: token.sub,
            email: session.user.email!,
            name: session.user.name,
            image: session.user.image,
          },
        });
        (session.user as { id: string }).id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
