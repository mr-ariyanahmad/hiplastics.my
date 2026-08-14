import { RouteError } from "@/components/RouteError";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/lib/auth";
import { site } from "@/lib/site";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Sign in | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: redirect || "/account" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onGoogleClick() {
    setErr(null);
    setGoogleBusy(true);
    const r = await signInWithGoogle();
    if (r.error) { setErr(r.error); setGoogleBusy(false); }
    // On success the browser navigates away to Google/Supabase, so no further
    // state update is needed here.
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    if (mode === "forgot") {
      const r = await resetPasswordForEmail(email);
      if (r.error) setErr(r.error);
      else setInfo("If an account exists for that email, a password reset link is on its way.");
      setBusy(false);
      return;
    }
    if (mode === "login") {
      const r = await signIn(email, password);
      if (r.error) setErr(r.error);
      // success is handled by the redirect effect above once `user` updates
    } else {
      if (password.length < 6) {
        setErr("Password must be at least 6 characters.");
        setBusy(false);
        return;
      }
      const r = await signUp(email, password, name);
      if (r.error) setErr(r.error);
      else if (r.needsEmailConfirm) setInfo("Account created — please check your email to confirm before signing in.");
    }
    setBusy(false);
  }

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <SiteLayout>
      <section className="section-pad">
        <div className="container-page mx-auto max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" ? "Sign in" : mode === "register" ? "Create your account" : "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to place an order and track your orders."
              : mode === "register"
              ? "You need an account to check out and track your orders."
              : "Enter your email and we'll send you a reset link."}
          </p>

          {mode !== "forgot" && (
            <div className="mt-5 flex rounded-md border border-border p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => { setMode("login"); setErr(null); setInfo(null); }}
                className={`flex-1 rounded-md py-2 ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setErr(null); setInfo(null); }}
                className={`flex-1 rounded-md py-2 ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Register
              </button>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            {mode === "register" && (
              <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            )}
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            {mode !== "forgot" && (
              <input required type="password" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            )}
            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setErr(null); setInfo(null); }}
                className="text-xs font-semibold text-primary underline"
              >
                Forgot password?
              </button>
            )}
            {err && <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{err}</p>}
            {info && <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{info}</p>}
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? <><LogIn className="h-4 w-4" /> Sign in</> : mode === "register" ? <><UserPlus className="h-4 w-4" /> Create account</> : "Send reset link"}
            </button>
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setErr(null); setInfo(null); }}
                className="w-full text-center text-xs font-semibold text-muted-foreground underline"
              >
                Back to sign in
              </button>
            )}
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={onGoogleClick}
                disabled={googleBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">Back to home</Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.73-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}
