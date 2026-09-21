import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calculator,
  LayoutDashboard,
  LogOut,
  Map,
  MessageCircle,
  Newspaper,
  Settings,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { LocationSwitcher } from "./LocationSwitcher";
import { Button } from "./ui/button";
import { useLanguage } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard" as const, key: "dashboard", icon: LayoutDashboard },
  { to: "/calculations" as const, key: "calculations", icon: Calculator },
  { to: "/feed" as const, key: "feed", icon: Newspaper },
  { to: "/heatmap" as const, key: "heatmap", icon: Map },
  { to: "/assistant" as const, key: "assistant", icon: MessageCircle },
  { to: "/profile" as const, key: "profile", icon: UserRound },
  { to: "/settings" as const, key: "settings", icon: Settings },
];

const mobileLinks = [
  {
    to: "/calculations" as const,
    label: "Calculate",
    ariaLabel: "Run a Calculation",
    icon: Calculator,
  },
  { to: "/feed" as const, label: "Feed", ariaLabel: "Business Feed", icon: Newspaper },
  { to: "/heatmap" as const, label: "Risk Map", ariaLabel: "Lohegaon Risk Map", icon: Map },
  { to: "/assistant" as const, label: "Ask Sahiti", ariaLabel: "Ask Sahiti", icon: MessageCircle },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/" });
  }

  function navClass(to: string) {
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return cn(
      "flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium",
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-secondary hover:text-primary",
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 sm:px-6">
          <Link to="/dashboard" aria-label="Sahiti dashboard">
            <BrandLogo compact invert />
          </Link>
          <div className="flex min-w-0 justify-center">
            <LocationSwitcher />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              className="hidden border-white/30 bg-transparent text-white hover:bg-white/10 lg:inline-flex"
              onClick={handleSignOut}
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t("logout")}
            </Button>
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 lg:hidden">
              <Link to="/profile" aria-label={t("profile")}>
                <UserRound aria-hidden="true" className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="sahiti-saffron-bar" />
        <nav
          className="mx-auto hidden max-w-7xl items-center justify-center gap-1 bg-background px-4 py-2 text-foreground lg:flex sm:px-6"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={navClass(link.to)}>
              <link.icon aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">{t(link.key)}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:pb-8">{children}</main>
      <nav
        className="sahiti-mobile-nav fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Primary mobile navigation"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
          {mobileLinks.map((link) => {
            const active = pathname === link.to || pathname.startsWith(`${link.to}/`);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-label={link.ariaLabel}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <link.icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="w-full truncate text-center">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
