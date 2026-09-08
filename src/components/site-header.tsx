import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-safe text-safe-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">SafeModule</p>
          <p className="text-xs text-muted-foreground">
            Real-time safety alerts
          </p>
        </div>
      </div>
    </header>
  );
}
