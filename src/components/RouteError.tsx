import { Link } from "@tanstack/react-router";

export function RouteError({ error }: { error?: Error }) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-surface p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message ? error.message : "Something went wrong on our end. Please try again."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => (typeof window !== "undefined" ? window.location.reload() : undefined)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
