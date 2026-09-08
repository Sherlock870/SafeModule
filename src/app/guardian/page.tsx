import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { GuardianConsole } from "@/components/guardian-console";

export default async function GuardianPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 md:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-opacity hover:opacity-80"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to overview
        </Link>
      </div>
      <GuardianConsole />
    </div>
  );
}
