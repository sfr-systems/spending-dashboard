export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/current-spending/:path*",
    "/files/:path*",
    "/transactions/:path*",
    "/edits/:path*",
    "/hidden_edits/:path*",
    "/about/:path*",
  ],
};
