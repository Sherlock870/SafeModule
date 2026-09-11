import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, Headset, ShieldCheck, Smartphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader animated />

      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:pt-14">
        <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-safe motion-safe:animate-pulse" />
              Live safety demonstration
            </div>
            <h1 className="max-w-2xl text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.05em] text-foreground md:text-7xl">
              One incident.<br /><span className="text-emergency">Two ends.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              See how a deliberate signal moves from a wearable to the person
              ready to respond. Trigger the incident, then follow it through.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/20 bg-primary p-6 text-primary-foreground shadow-[8px_8px_0_#d6d1c5] md:min-h-52">
            <div className="absolute -right-8 -top-10 size-40 rounded-full border border-white/15" />
            <div className="absolute -right-1 top-7 size-24 rounded-full border border-white/15" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-center justify-between">
                <ShieldCheck className="size-7 text-[#f3c4a5]" />
                <span className="font-mono text-xs text-white/60">SM / 01</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">Signal path</p>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <Activity className="size-4 text-[#f3c4a5]" />
                  Device <ArrowRight className="size-4 text-white/40" /> Guardian
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-14 md:mt-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Problem Statement #21 — AI-Based real-time women safety alert
            system
          </p>

          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-stretch md:gap-3">
            <StepCard
              step="Step 1"
              title="Trigger an incident"
              subtitle="Device Simulator"
              description="Act as the wearable device. Raise an SOS, share live location, and stream vitals as a real alert goes out."
              href="/simulator"
              cta="Open Device Simulator"
              icon={<Smartphone className="size-5" />}
              accent="emergency"
            />

            <Connector />

            <StepCard
              step="Step 2"
              title="Respond as a guardian"
              subtitle="Guardian Console"
              description="Watch that same alert arrive with location, vitals, and the reasoning behind its risk assessment — then resolve it."
              href="/guardian"
              cta="Open Guardian Console"
              icon={<Headset className="size-5" />}
              accent="safe"
            />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            The Guardian Console requires an account — log in or sign up
            below.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-opacity hover:opacity-80"
          >
            Sign up
          </Link>
        </div>
      </main>
    </div>
  );
}

function Connector() {
  return (
    <div
      className="flex shrink-0 items-center justify-center py-1 md:px-1"
      aria-hidden="true"
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
        <ArrowDown className="size-4 md:hidden" />
        <ArrowRight className="hidden size-4 md:block" />
      </span>
    </div>
  );
}

type Accent = "emergency" | "safe";

function StepCard({
  step,
  title,
  subtitle,
  description,
  href,
  cta,
  icon,
  accent,
}: {
  step: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
  accent: Accent;
}) {
  const accentClasses =
    accent === "emergency"
      ? { chip: "bg-emergency text-emergency-foreground", link: "text-emergency" }
      : { chip: "bg-safe text-safe-foreground", link: "text-safe" };

  return (
    <div className="flex flex-1 flex-col rounded-[1.25rem] border border-border bg-card p-6 shadow-[4px_4px_0_#ddd9cf] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${accentClasses.chip}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {step}
          </p>
          <p className="text-sm font-semibold text-foreground">{subtitle}</p>
        </div>
      </div>

      <h2 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      <Link
        href={href}
        className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${accentClasses.link} transition-opacity hover:opacity-80`}
      >
        {cta}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
