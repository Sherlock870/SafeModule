import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 py-12 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight">SafeModule</h1>
      <p className="max-w-md text-sm font-medium text-black/70 dark:text-white/70">
        Problem Statement #21 — AI-Based real-time women safety alert system
      </p>
      <p className="max-w-md text-black/60 dark:text-white/60">
        A wearable-first safety alert system, with a device simulator standing
        in for the physical hardware.
      </p>

      <div className="w-full max-w-2xl">
        <p className="mb-4 text-sm font-medium text-black/70 dark:text-white/70">
          Try it — both steps below are two ends of the same incident.
        </p>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/simulator"
            className="flex-1 rounded-lg border border-black/10 bg-white p-4 text-left shadow-sm dark:border-white/10 dark:bg-black"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
              Step 1
            </span>
            <div className="text-base font-semibold">Device Simulator</div>
            <p className="text-sm text-black/60 dark:text-white/60">
              Trigger an SOS as the person wearing the device.
            </p>
          </Link>

          <span className="hidden text-2xl text-black/30 dark:text-white/30 sm:inline">
            →
          </span>

          <Link
            href="/guardian"
            className="flex-1 rounded-lg border border-black/10 bg-white p-4 text-left shadow-sm dark:border-white/10 dark:bg-black"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
              Step 2
            </span>
            <div className="text-base font-semibold">Guardian Console</div>
            <p className="text-sm text-black/60 dark:text-white/60">
              Watch that same alert arrive, get risk-assessed, and respond.
            </p>
          </Link>
        </div>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          The Guardian Console requires an account — log in or sign up below.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
