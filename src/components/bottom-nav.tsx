"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, Home, Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/simulator", label: "Simulator", icon: Smartphone },
  { href: "/guardian", label: "Guardian", icon: Headset },
] as const;

// Auth screens sit outside the tabbed app shell, same as the rest of the site chrome.
const HIDDEN_PREFIXES = ["/login", "/signup"];

export function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 shadow-[0_-8px_24px_rgba(23,35,41,0.06)] backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
