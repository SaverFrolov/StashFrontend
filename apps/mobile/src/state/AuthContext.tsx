import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@inbox/api-client";
import { getApiClient, initAuth, persistSession } from "../api";

interface AuthContextValue {
  session: Session | null;
  /** false until the persisted session (SecureStore / MMKV) has been restored */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** M13: set when the API reports an expired/invalid session */
  sessionExpired: boolean;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = getApiClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initAuth();
      if (!cancelled) {
        setSession(api.getSession());
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await api.signIn(email, password);
      await persistSession(s);
      setSession(s);
      setSessionExpired(false);
    },
    [api],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const s = await api.signUp(name, email, password);
      await persistSession(s);
      setSession(s);
      setSessionExpired(false);
    },
    [api],
  );

  const signOut = useCallback(async () => {
    await api.signOut();
    await persistSession(null);
    setSession(null);
  }, [api]);

  const value = useMemo(
    () => ({
      session,
      ready,
      signIn,
      signUp,
      signOut,
      sessionExpired,
      markSessionExpired: () => setSessionExpired(true),
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [session, ready, signIn, signUp, signOut, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
