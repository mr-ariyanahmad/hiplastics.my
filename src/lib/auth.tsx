import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/hiplastics/client";
import { SITE_URL } from "@/lib/site";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        return { error: error?.message };
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) return { error: error.message };
        // If email confirmation is required, Supabase returns a user but no session yet.
        return { needsEmailConfirm: !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async resetPasswordForEmail(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${SITE_URL}/reset-password`,
        });
        return { error: error?.message };
      },
      async updatePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error?.message };
      },
      async signInWithGoogle() {
        // Custom OAuth provider configured in Supabase (NOT the built-in
        // "google" provider) — do not change this provider string.
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "custom:hiplastics-google" as never,
          options: { redirectTo: `${SITE_URL}/auth/callback` },
        });
        return { error: error?.message };
      },
    }),
    [session, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
