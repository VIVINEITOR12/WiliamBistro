import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { 
  Star, MessageSquare, CheckCircle2, XCircle, Trash2, 
  Search, Filter, ShieldAlert, Loader2, EyeOff, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"todas" | "pendientes" | "publicadas" | "ocultas">("todas");

  // Protección de ruta
  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [session, isAdmin, authLoading, navigate]);

  // Obtener todas las reseñas
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Mutación para Cambiar Estado (Publicar/Ocultar)
  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
      return is_published;
    },
    onSuccess: (is_published) => {
      toast.success(is_published ? "Reseña publicada en el inicio" : "Reseña ocultada");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      // También invalidamos las públicas para que el Home se actualice
      queryClient.invalidateQueries({ queryKey: ["published-reviews"] }); 
    },
    onError: () => toast.error("Error al actualizar el estado"),
  });

  // Mutación para Eliminar
  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reseña eliminada permanentemente");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["published-reviews"] }); 
    },
    onError: () => toast.error("Error al eliminar la reseña"),
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("realtime-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Filtrado lógico
  const filteredReviews = reviews.filter((r: any) => {
    const matchesSearch = r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.comment?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filter === "todas" ? true :
      filter === "pendientes" ? r.is_published === null :
      filter === "publicadas" ? r.is_published === true :
      filter === "ocultas" ? r.is_published === false : true;

    return matchesSearch && matchesFilter;
  });

  if (authLoading) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Moderación de Reseñas
          </h1>
          <p className="text-muted-foreground mt-1">Controla lo que los clientes dicen sobre Papa&Son.</p>
        </div>
      </header>

      {/* BARRA DE HERRAMIENTAS (Búsqueda y Filtros) */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-2xl border-2 border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o contenido..."
            className="pl-9 h-11 rounded-xl bg-background border-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex w-full sm:w-auto overflow-x-auto gap-2 pb-1 sm:pb-0 scrollbar-hide">
          <Button 
            variant={filter === "todas" ? "default" : "outline"} 
            onClick={() => setFilter("todas")}
            className="rounded-xl font-bold text-xs"
          >
            Todas
          </Button>
          <Button 
            variant={filter === "pendientes" ? "default" : "outline"} 
            onClick={() => setFilter("pendientes")}
            className={cn("rounded-xl font-bold text-xs", filter === "pendientes" && "bg-yellow-500 text-white")}
          >
            Pendientes
          </Button>
          <Button 
            variant={filter === "publicadas" ? "default" : "outline"} 
            onClick={() => setFilter("publicadas")}
            className={cn("rounded-xl font-bold text-xs", filter === "publicadas" && "bg-green-500 text-white")}
          >
            Publicadas
          </Button>
          <Button 
            variant={filter === "ocultas" ? "default" : "outline"} 
            onClick={() => setFilter("ocultas")}
            className="rounded-xl font-bold text-xs"
          >
            Ocultas
          </Button>
        </div>
      </div>

      {/* LISTADO DE RESEÑAS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border-2 border-dashed border-border rounded-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground text-xs">Cargando opiniones...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-card border-2 border-dashed border-border rounded-3xl">
          <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="font-bold uppercase tracking-widest text-muted-foreground text-sm">No se encontraron reseñas</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReviews.map((r: any) => {
            const date = new Date(r.created_at).toLocaleDateString("es-VE", {
              day: "numeric", month: "long", year: "numeric"
            });
            
            const isPending = r.is_published === null;
            const isPublished = r.is_published === true;

            return (
              <div 
                key={r.id} 
                className={cn(
                  "flex flex-col rounded-3xl border-2 p-5 shadow-sm transition-all bg-card",
                  isPending ? "border-yellow-500/30 bg-yellow-500/5" :
                  isPublished ? "border-green-500/30" : "border-border opacity-70"
                )}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary uppercase text-lg">
                      {r.customer_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black leading-none mb-1">{r.customer_name}</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{date}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-0.5",
                    isPending ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                    isPublished ? "bg-green-500/10 text-green-600 border-green-500/20" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {isPending ? "Por Revisar" : isPublished ? "Pública" : "Oculta"}
                  </Badge>
                </div>

                {/* Estrellas y Comentario */}
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn("h-4 w-4", i < r.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted")} 
                    />
                  ))}
                  <span className="ml-2 text-xs font-black text-muted-foreground">{r.rating}/5</span>
                </div>
                
                <p className="text-sm font-medium text-foreground mb-6 flex-1 italic">
                  "{r.comment || "Sin comentarios."}"
                </p>

                {/* Botones de Acción */}
                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-border/50">
                  {isPublished ? (
                    <Button 
                      variant="outline" 
                      className="text-xs font-bold gap-2 h-10"
                      onClick={() => togglePublish.mutate({ id: r.id, is_published: false })}
                    >
                      <EyeOff className="h-3 w-3" /> Ocultar
                    </Button>
                  ) : (
                    <Button 
                      className="text-xs font-bold gap-2 h-10 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => togglePublish.mutate({ id: r.id, is_published: true })}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Aprobar y Publicar
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="text-xs font-bold gap-2 h-10 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                    onClick={() => {
                      if (window.confirm("¿Seguro que quieres eliminar esta reseña para siempre?")) {
                        deleteReview.mutate(r.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}