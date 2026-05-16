import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { decryptMfaSecret } from "@/lib/mfa/crypto";
import { compareBackupCode, verifyTotp } from "@/lib/mfa/totp";

// Error codes thrown from authorize() that the login page checks for.
// NextAuth surfaces `error.message` as the `error` query param on the
// signIn callback, so the client distinguishes "wrong password" from
// "MFA code required" from "MFA code wrong".
export const AUTH_ERROR_MFA_REQUIRED = "MFA_REQUIRED";
export const AUTH_ERROR_MFA_INVALID = "MFA_INVALID";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) return null;

        // Password OK. If MFA is enabled, require a valid TOTP or backup code.
        if (user.mfaEnabledAt && user.mfaSecretCiphertext) {
          const code = (credentials.mfaCode ?? "").trim();
          if (!code) {
            throw new Error(AUTH_ERROR_MFA_REQUIRED);
          }

          const secret = decryptMfaSecret(user.mfaSecretCiphertext);
          if (verifyTotp(code, secret)) {
            return { id: user.id, email: user.email };
          }

          // Try backup codes — one-time use.
          const unused = await db.mfaBackupCode.findMany({
            where: { userId: user.id, usedAt: null },
            select: { id: true, codeHash: true },
          });
          for (const candidate of unused) {
            if (await compareBackupCode(code, candidate.codeHash)) {
              const consumed = await db.mfaBackupCode.updateMany({
                where: { id: candidate.id, usedAt: null },
                data: { usedAt: new Date() },
              });
              if (consumed.count === 1) {
                return { id: user.id, email: user.email };
              }
            }
          }

          throw new Error(AUTH_ERROR_MFA_INVALID);
        }

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
