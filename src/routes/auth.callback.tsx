import { RouteError } from "@/components/RouteError";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/hiplastics/client";
import { site } from "@/lib/site";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: `Signing you in… | ${site.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error as Error} />,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // The Supabase client (detectSessionInUrl: true by default) parses the
    // OAuth redirect (code/tokens) on load and fires this event once the
    // session from our custom "custom:hiplastics-google" provider is ready.
    // We don't change how the session itself is created or stored — this
    // page only waits for it, then routes the user onward.
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setErr(oauthError);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigate({ to: "/account" });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) finish();
      else if (event === "SIGNED_OUT") setErr("Sign-in was cancelled or failed.");
    });

    const timeout = setTimeout(() => {
      if (!done) setErr("Sign-in is taking longer than expected. Please try again.");
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      {err ? (
        <>
          <p className="text-sm font-semibold text-destructive">{err}</p>
          <a href="/login" className="text-sm font-semibold text-primary underline">Back to sign in</a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </>
      )}
    </div>
  );
}
