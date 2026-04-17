import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

export interface Credentials {
  email: string;
  password: string;
}

export interface AdminConfig {
  adminEmail: string;
  adminHash: string;
}

export async function verifyCredentials(
  creds: Credentials,
  config: AdminConfig,
): Promise<{ id: string; email: string; name: string } | null> {
  if (creds.email.toLowerCase() !== config.adminEmail.toLowerCase()) {
    return null;
  }
  const ok = await bcrypt.compare(creds.password, config.adminHash);
  if (!ok) return null;
  return { id: "admin", email: config.adminEmail, name: "Admin" };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;
        return verifyCredentials(
          { email, password },
          { adminEmail: env.ADMIN_EMAIL, adminHash: env.ADMIN_PASSWORD_HASH },
        );
      },
    }),
  ],
});
