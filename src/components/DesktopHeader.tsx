import { useCustomer } from "@/hooks/use-customer";
import { Link, useLocation } from "@tanstack/react-router";
import { BrandLogo, PointLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/menu", label: "Menú" },
  { to: "/promos", label: "Promos" },
] as const;

export function DesktopHeader() {
  const { pathname } = useLocation();
  const { totalItems, setIsOpen } = useCart();
  const { customer } = useCustomer();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO E IDENTIDAD */}
        <Link to="/" className="flex items-center gap-2.5 transition-transform active:scale-95">
          <BrandLogo className="h-8 w-8 md:h-9 md:w-9" />
          <div className="leading-tight">
            <p className="text-sm md:text-base font-black tracking-tighter uppercase italic">
              Papa<span className="text-primary">&</span>Son
            </p>
            <p className="hidden md:block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Maturín</p>
          </div>
        </Link>

        {/* NAVEGACIÓN CENTRAL (Solo Desktop) */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => {
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-black uppercase tracking-tighter transition-all italic",
                  active
                    ? "bg-gradient-flame text-flame-foreground shadow-glow scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* ACCIONES DERECHA */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* BOTÓN DE BILLETERA / PERFIL / LOGIN */}
          {customer ? (
            <Link to="/mis-pedidos" className="flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary rounded-full py-1.5 px-3 transition-colors border border-border active:scale-95">
              <PointLogo className="h-4 w-4" />
              <span className="text-[10px] font-black text-primary">{customer.points} Pts</span>
              <span className="hidden md:inline text-[10px] font-bold text-muted-foreground">| Mi Perfil</span>
            </Link>
          ) : (
            <Link to="/login" className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors px-3 py-1.5 rounded-full text-[10px] font-black uppercase italic shadow-sm active:scale-95">
              <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ingresar</span>
            </Link>
          )}

          {/* BOTÓN DEL CARRITO */}
          <button
            onClick={() => setIsOpen(true)}
            className="group relative p-1.5 md:p-2 text-muted-foreground hover:text-primary transition-all active:scale-90 cursor-pointer"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="h-6 w-6 md:h-6 md:w-6 transition-transform group-hover:-rotate-12" />
            <span className={cn(
              "absolute top-0 right-0 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full text-[9px] md:text-[10px] font-black border-2 border-background transition-all shadow-glow",
              totalItems > 0
                ? "bg-primary text-white scale-110"
                : "bg-muted text-muted-foreground scale-100"
            )}>
              {totalItems}
            </span>
          </button>

          {/* BOTÓN DE RESERVA (Solo Desktop) */}
          <Button asChild variant="flame" size="sm" className="hidden md:flex font-black uppercase italic tracking-tighter shadow-glow-sm">
            <Link to="/reservar">Reservar Mesa</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}