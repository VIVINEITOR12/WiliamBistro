import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  CalendarCheck, 
  LogOut, 
  Flame, 
  Settings, 
  Receipt, 
  MessageSquare,
  Bike
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginRoute && !loading && (!session || !isAdmin)) {
      nav({ to: "/admin/login", replace: true });
    }
  }, [loading, session, isAdmin, nav, isLoginRoute]);

  if (isLoginRoute) {
    return <Outlet />;
  }

  if (loading || !session || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando Panel...
      </div>
    );
  }

  // Lista de items de navegación actualizada (Añadido Delivery)
  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/menu", label: "Menú", icon: UtensilsCrossed },
    { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
    { to: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
    { to: "/admin/delivery", label: "Delivery", icon: Bike }, // <-- AQUI ESTA LA MAGIA
    { to: "/admin/reviews", label: "Reseñas", icon: MessageSquare },
    { to: "/admin/settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-5 py-3 backdrop-blur-xl">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-flame shadow-glow">
            <Flame className="h-4 w-4 text-flame-foreground" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">Admin</p>
            <p className="text-[10px] text-muted-foreground">Papa&Son</p>
          </div>
        </Link>
        <button
          onClick={async () => { await signOut(); nav({ to: "/" }); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </header>

      <nav className="scrollbar-none flex gap-2 overflow-x-auto border-b border-border px-5 py-2">
        {items.map((it) => {
          const active = pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
                active ? "bg-gradient-flame text-flame-foreground shadow-glow" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <it.icon className="h-3.5 w-3.5" /> {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}