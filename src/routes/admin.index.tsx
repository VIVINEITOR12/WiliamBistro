import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingBag, 
  UtensilsCrossed, 
  CalendarCheck, 
  ArrowRight,
  Loader2,
  RefreshCw,
  TrendingUp,
  Receipt,
  DollarSign,
  Star,
  Settings,
  BellRing
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshingBcv, setIsRefreshingBcv] = useState(false);

  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [session, isAdmin, authLoading, navigate]);

  // 1. TASA BCV
  const { data: bcvData, isLoading: bcvLoading } = useQuery({
    queryKey: ["admin-bcv-rate"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-bcv-rate");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, 
    refetchInterval: 30000, 
  });

  const handleRefreshBcv = async () => {
    setIsRefreshingBcv(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin-bcv-rate"] });
      await queryClient.invalidateQueries({ queryKey: ["bcv-rate"] }); 
      toast.success("Tasa BCV sincronizada con éxito");
    } catch (error) {
      toast.error("Error al sincronizar la tasa");
    } finally {
      setIsRefreshingBcv(false);
    }
  };

  // 2. MÉTRICAS EMPRESARIALES (El verdadero Dashboard)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["admin-dashboard-metrics"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: productsCount },
        { count: activeOrdersCount },
        { count: pendingResCount },
        { data: todayOrders },
        { data: allReviews }
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pendiente", "preparando"]),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
        supabase.from("orders").select("total_usd, status").gte("created_at", today.toISOString()),
        supabase.from("reviews").select("is_published")
      ]);

      // Calculamos ingresos solo de pedidos completados o verificados hoy
      const revenueToday = todayOrders
        ?.filter(o => o.status === "completado" || o.status === "pago_verificado")
        ?.reduce((sum, o) => sum + Number(o.total_usd || 0), 0) || 0;

      // Calculamos reseñas pendientes por aprobar
      const pendingReviews = allReviews?.filter(r => r.is_published === false || r.is_published === null).length || 0;

      return {
        products: productsCount || 0,
        activeOrders: activeOrdersCount || 0,
        pendingReservations: pendingResCount || 0,
        revenueToday,
        ordersToday: todayOrders?.length || 0,
        pendingReviews
      };
    },
  });

  // 3. ACTUALIZACIÓN EN TIEMPO REAL
  useEffect(() => {
    if (!session || !isAdmin) return;

    const channel = supabase
      .channel("realtime-admin-metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, isAdmin, queryClient]);

  if (authLoading || metricsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 animate-in fade-in duration-500">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Analizando métricas...</p>
      </div>
    );
  }

  // CONFIGURACIÓN DE TARJETAS
  const mainStats = [
    { title: "Ingresos Hoy", value: `$${metrics?.revenueToday.toFixed(2)}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Órdenes Hoy", value: metrics?.ordersToday, icon: Receipt, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Pedidos Activos", value: metrics?.activeOrders, icon: TrendingUp, color: "text-flame", bg: "bg-flame/10", highlight: (metrics?.activeOrders ?? 0) > 0 },
  ];

  const pendingStats = [
    { title: "Reservas Pendientes", value: metrics?.pendingReservations, icon: CalendarCheck, link: "/admin/reservas", alert: (metrics?.pendingReservations ?? 0) > 0 },
    { title: "Reseñas por Aprobar", value: metrics?.pendingReviews, icon: Star, link: "/admin/reviews", alert: (metrics?.pendingReviews ?? 0) > 0 },
    { title: "Platos en Menú", value: metrics?.products, icon: UtensilsCrossed, link: "/admin/menu", alert: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CABECERA Y WIDGET BCV */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight uppercase italic flex items-center gap-3">
            Dashboard <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          </h1>
          <p className="text-muted-foreground font-bold mt-1">Centro de Control Operativo y Financiero</p>
        </div>

        <div className="flex items-center gap-4 bg-card border-2 border-border p-3 rounded-2xl shadow-sm">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Tasa BCV Operativa</p>
            {bcvLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-xl font-black tracking-tighter text-primary">
                Bs. {bcvData?.valor ? Number(bcvData.valor).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : "0.00"}
              </p>
            )}
          </div>
          <Button variant="secondary" size="icon" onClick={handleRefreshBcv} disabled={isRefreshingBcv || bcvLoading} className="rounded-xl">
            <RefreshCw className={cn("h-4 w-4", isRefreshingBcv && "animate-spin text-primary")} />
          </Button>
        </div>
      </header>

      {/* ALERTAS GLOBALES */}
      {((metrics?.pendingReservations ?? 0) > 0 || (metrics?.pendingReviews ?? 0) > 0) && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3 text-yellow-600 animate-pulse">
          <BellRing className="h-5 w-5" />
          <p className="text-sm font-black uppercase tracking-widest">Tienes tareas pendientes que requieren tu atención.</p>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES (FINANZAS Y FLUJO) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {mainStats.map((s) => (
          <Card key={s.title} className={cn("border-2 shadow-sm transition-all hover:shadow-md", s.highlight && "border-flame/50 bg-flame/5")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</CardTitle>
              <div className={cn("p-2 rounded-xl", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black tracking-tighter">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MÉTRICAS SECUNDARIAS (TAREAS Y CATÁLOGO) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {pendingStats.map((s) => (
          <Link key={s.title} to={s.link} className="block group">
            <Card className={cn(
              "border-2 transition-all group-hover:border-primary/50 group-hover:shadow-md h-full",
              s.alert ? "bg-secondary/30" : "bg-card"
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground">{s.title}</CardTitle>
                <s.icon className={cn("h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors", s.alert && "text-primary")} />
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div className="text-3xl font-black">{s.value}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="pt-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Módulos del Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button asChild variant="outline" className="h-16 rounded-2xl border-2 font-bold justify-start px-4 hover:border-primary/50 hover:bg-primary/5">
            <Link to="/admin/pedidos"><ShoppingBag className="mr-3 h-5 w-5 text-primary"/> Gestor Pedidos</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 rounded-2xl border-2 font-bold justify-start px-4 hover:border-primary/50 hover:bg-primary/5">
            <Link to="/admin/menu"><UtensilsCrossed className="mr-3 h-5 w-5 text-primary"/> Menú & Zonas</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 rounded-2xl border-2 font-bold justify-start px-4 hover:border-primary/50 hover:bg-primary/5">
            <Link to="/admin/settings"><Settings className="mr-3 h-5 w-5 text-primary"/> Configuración</Link>
          </Button>
          <Button asChild variant="outline" className="h-16 rounded-2xl border-2 font-bold justify-start px-4 hover:border-primary/50 hover:bg-primary/5">
            <Link to="/admin/reviews"><Star className="mr-3 h-5 w-5 text-primary"/> Mod. Reseñas</Link>
          </Button>
        </div>
      </div>

    </div>
  );
}