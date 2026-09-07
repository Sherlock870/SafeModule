import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight">
        Next.js + Prisma + NextAuth
      </h1>
      <p className="max-w-md text-black/60 dark:text-white/60">
        A minimal scaffold with a SQLite database and an email/password auth
        flow.
      </p>
      <div className="flex gap-3">
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
