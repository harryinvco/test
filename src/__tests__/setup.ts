import { vi } from "vitest";

// next-auth imports next/server at module init time, which fails in the vitest
// Node environment. Mock the NextAuth default export so auth.ts can be imported
// without triggering the next/server resolution error.
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: { GET: undefined, POST: undefined },
    auth: undefined,
    signIn: undefined,
    signOut: undefined,
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: () => ({ type: "credentials" }),
}));
