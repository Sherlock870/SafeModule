import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight">SafeModule</h1>
      <p className="max-w-md text-black/60 dark:text-white/60">
        A wearable-first safety alert system, with a device simulator standing
        in for the physical hardware.
      </p>
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
        <Link
          href="/simulator"
          className="rounded border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Device Simulator
        </Link>
        <Link
          href="/guardian"
          className="rounded border border-black/20 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          Guardian Console
        </Link>
      </div>
    </div>
  );
}
