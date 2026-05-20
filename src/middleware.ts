export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/files/:path*",
    "/transactions/:path*",
    "/edits/:path*",
  ],
};
