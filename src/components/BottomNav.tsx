import { Link, useLocation } from "@tanstack/react-router";
import { Home, UtensilsCrossed, Flame, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/menu", label: "Menú", icon: UtensilsCrossed },
  { to: "/promos", label: "Promos", icon: Flame },
  { to: "/reservar", label: "Reservar", icon: CalendarDays },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl safe-bottom md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5 pb-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-all",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute -top-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gradient-flame shadow-glow" />
                )}
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_var(--flame-glow)]")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
