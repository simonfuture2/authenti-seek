import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PingResult {
  ok: boolean;
  status?: number;
  error?: string;
  ms?: number;
}

export default function DiagnosticsPage() {
  const { toast } = useToast();
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  // Decode the project ref baked into the anon JWT — proves which project the client
  // will actually talk to (not just what .env claims).
  let jwtRef: string | null = null;
  try {
    if (anonKey) {
      const payload = JSON.parse(atob(anonKey.split(".")[1]));
      jwtRef = payload.ref ?? null;
    }
  } catch {
    jwtRef = null;
  }

  const urlHost = url ? new URL(url).host.split(".")[0] : null;
  const mismatch =
    (projectId && jwtRef && projectId !== jwtRef) ||
    (urlHost && jwtRef && urlHost !== jwtRef);

  const [ping, setPing] = useState<PingResult | null>(null);
  const [session, setSession] = useState<string>("checking…");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? `signed in as ${data.session.user.email}` : "no active session");
    });
  }, []);

  const runPing = async () => {
    if (!url || !anonKey) return;
    const started = performance.now();
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
      });
      setPing({ ok: res.ok, status: res.status, ms: Math.round(performance.now() - started) });
    } catch (e) {
      setPing({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied" });
  };

  const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-sm font-mono break-all text-right">{value ?? "—"}</code>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => copy(value)} className="shrink-0">
            Copy
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Diagnostics</h1>
          <p className="text-muted-foreground">Runtime backend connection details.</p>
        </div>

        {mismatch && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="font-semibold text-destructive">⚠️ Project ID mismatch</p>
            <p className="text-sm mt-1">
              The Supabase URL, project ID env var, and anon-key JWT don't all reference the same
              project. Republish and hard-refresh.
            </p>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Supabase connection</h2>
          <Row label="VITE_SUPABASE_URL" value={url} />
          <Row label="VITE_SUPABASE_PROJECT_ID" value={projectId} />
          <Row label="Project ref (from URL host)" value={urlHost} />
          <Row label="Project ref (from anon JWT)" value={jwtRef} />
          <Row label="Anon key (first 24)" value={anonKey ? `${anonKey.slice(0, 24)}…` : null} />
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Runtime</h2>
          <Row label="Auth session" value={session} />
          <Row label="Origin" value={typeof window !== "undefined" ? window.location.origin : null} />
          <Row label="Build mode" value={import.meta.env.MODE} />
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Health check</h2>
          <div className="flex items-center gap-3">
            <Button onClick={runPing} disabled={!url}>Ping /auth/v1/health</Button>
            {ping && (
              <span className={`text-sm ${ping.ok ? "text-primary" : "text-destructive"}`}>
                {ping.ok ? `OK ${ping.status} · ${ping.ms}ms` : `FAIL ${ping.error ?? ping.status}`}
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
