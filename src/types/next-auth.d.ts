import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    firstName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    firstName?: string | null;
  }
}
