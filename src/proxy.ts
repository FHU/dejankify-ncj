export { auth as proxy } from "@/lib/auth-edge";

export const config = {
  matcher: ["/dashboard/:path*", "/session/:path*"],
};
