import { RouteError } from "@/components/RouteError";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/hiplastics/client";
import { site } from "@/lib/site";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: `Reset Password | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  // The Supabase client parses the recovery link's tokens from the URL on
  // load (detectSessionInUrl). Until that finishes we don't know yet whether
  // this is a valid recovery session, so show a brief loading state first.
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let finished = false;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      setValidLink(ok);
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) finish(true);
    });
    const timeout = setTimeout(() => finish(false), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (password !== confirm) return setErr("Passwords don't match.");
    setBusy(true);
    const r = await updatePassword(password);
    setBusy(false);
    if (r.error) return setErr(r.error);
    setDone(true);
    setTimeout(() => navigate({ to: "/account" }), 1500);
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <SiteLayout>
      <section className="section-pad">
        <div className="container-page mx-auto max-w-sm">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <KeyRound className="h-6 w-6 text-primary" /> Reset your password
          </h1>

          {!ready && (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </p>
          )}

          {ready && !validLink && !done && (
            <p className="mt-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              This reset link is invalid or has expired. Please request a new one from the sign-in page.
            </p>
          )}

          {ready && validLink && !done && (
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <input required type="password" minLength={6} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
              <input required type="password" minLength={6} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
              {err && <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
              <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
              </button>
            </form>
          )}

          {done && (
            <p className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
              Password updated! Taking you to your account…
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
