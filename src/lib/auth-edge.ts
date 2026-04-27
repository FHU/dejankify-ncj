import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Edge-compatible auth config — no Prisma adapter (not available in edge runtime).
// Used only by middleware for route protection. Full auth with DB adapter is in auth.ts.
export const { auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      // disable auth in development
      //if (process.env.NODE_ENV === "development") return true;

      const isLoggedIn = !!session?.user;
      const isOnDashboard =
        !nextUrl.pathname.startsWith("/login") &&
        nextUrl.pathname !== "/";

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
});
