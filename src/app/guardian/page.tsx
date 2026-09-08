import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GuardianConsole } from "@/components/guardian-console";

export default async function GuardianPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <GuardianConsole />;
}
