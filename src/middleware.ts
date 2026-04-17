export { auth as middleware } from "@/lib/auth-edge";

export const config = {
  matcher: ["/dashboard/:path*", "/session/:path*"],
};
