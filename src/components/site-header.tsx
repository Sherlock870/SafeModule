import { Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function SiteHeader({ animated = false }: { animated?: boolean }) {
  return (
    <header className="border-b border-border/80 bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_5px_0_#d6d1c5]",
            animated && "motion-safe:animate-breathe"
          )}
        >
          <ShieldCheck className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">
            SafeModule
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Safety, in motion.</p>
        </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:flex">
          <Activity className="size-3.5 text-safe" aria-hidden="true" />
          <span>System online</span>
        </div>
      </div>
    </header>
  );
}
