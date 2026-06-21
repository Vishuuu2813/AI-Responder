import type { NextAuthConfig } from "next-auth";

// This config is Edge Runtime safe — NO Node.js imports (no mongoose, bcrypt, etc.)
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role ?? "user";
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id || token.sub) as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role ?? "user";
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [], // providers are added in auth.ts (Node.js only)
  session: { strategy: "jwt" },
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "7bc8cb9a7146522bb3d81b899aef34f1",
  trustHost: true,
};
