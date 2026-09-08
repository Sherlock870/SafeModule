import Link from "next/link";
import { ArrowDown, ArrowRight, Headset, Smartphone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader animated />

      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            One incident, two ends
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Follow a safety alert from the moment a device raises it to the
            moment a guardian responds. Start by triggering an incident, then
            switch sides and resolve it.
          </p>
        </section>

        <div className="mt-10 md:mt-14">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Problem Statement #21 — AI-Based real-time women safety alert
            system
          </p>

          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:gap-2">
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
      <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
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
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-lg ${accentClasses.chip}`}
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

      <h2 className="mt-5 text-xl font-semibold text-foreground">{title}</h2>
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
