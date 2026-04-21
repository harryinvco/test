import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { loginMobile } from "@/api/client";

const TOKEN_KEY = "innovaco.notes.mobile.token";
const EMAIL_KEY = "innovaco.notes.mobile.email";
const EXPIRY_KEY = "innovaco.notes.mobile.expiresAt";

type AuthState = {
  status: "loading" | "authenticated" | "anonymous";
  token: string | null;
  email: string | null;
  expiresAt: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, e, x] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(EMAIL_KEY),
          SecureStore.getItemAsync(EXPIRY_KEY),
        ]);
        const exp = x ? parseInt(x, 10) : null;
        const nowSec = Math.floor(Date.now() / 1000);
        if (t && e && exp && exp > nowSec) {
          setToken(t);
          setEmail(e);
          setExpiresAt(exp);
          setStatus("authenticated");
        } else {
          await clearPersisted();
          setStatus("anonymous");
        }
      } catch {
        setStatus("anonymous");
      }
    })();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      token,
      email,
      expiresAt,
      async signIn(emailInput: string, password: string) {
        const res = await loginMobile(emailInput, password);
        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, res.token),
          SecureStore.setItemAsync(EMAIL_KEY, res.email),
          SecureStore.setItemAsync(EXPIRY_KEY, String(res.expiresAt)),
        ]);
        setToken(res.token);
        setEmail(res.email);
        setExpiresAt(res.expiresAt);
        setStatus("authenticated");
      },
      async signOut() {
        await clearPersisted();
        setToken(null);
        setEmail(null);
        setExpiresAt(null);
        setStatus("anonymous");
      },
    }),
    [status, token, email, expiresAt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function clearPersisted() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(EMAIL_KEY),
    SecureStore.deleteItemAsync(EXPIRY_KEY),
  ]);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
