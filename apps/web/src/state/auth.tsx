import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@inbox/api-client";
import { useApi } from "./api";

interface AuthContextValue {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sessionExpired: boolean;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [session, setSession] = useState<Session | null>(() => api.getSession());
  const [sessionExpired, setSessionExpired] = useState(false);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await api.signIn(email, password);
      setSession(s);
      setSessionExpired(false);
    },
    [api],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const s = await api.signUp(name, email, password);
      setSession(s);
      setSessionExpired(false);
    },
    [api],
  );

  const signOut = useCallback(async () => {
    await api.signOut();
    setSession(null);
  }, [api]);

  const value = useMemo(
    () => ({
      session,
      signIn,
      signUp,
      signOut,
      sessionExpired,
      markSessionExpired: () => setSessionExpired(true),
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [session, signIn, signUp, signOut, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
