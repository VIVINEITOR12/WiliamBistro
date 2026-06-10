import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, Clock, Users, MapPin, CheckCircle2, 
  XCircle, MessageSquare, Phone, Filter, Loader2, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reservas")({
  component: AdminReservasPage,
});

type ReservationStatus = "pendiente" | "confirmada" | "completada" | "cancelada";

const FILTER_TABS = [
  { value: "all", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "completada", label: "Completadas (Asistió)" },
  { value: "cancelada", label: "Canceladas" },
] as const;

function AdminReservasPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("pendiente");

  // Protección estricta de ruta
  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [session, isAdmin, authLoading, navigate]);

  // Consulta de reservaciones
  const { data: reservations, isLoading } = useQuery({
    queryKey: ["admin-reservations", filterStatus],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("reservations")
        .select("*")
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Mutación para actualizar el estado
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (newStatus) => {
      toast.success(`Reserva marcada como ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
    },
    onError: (err: any) => {
      toast.error(`Error al actualizar: ${err.message}`);
    },
  });

  // Realtime
  useEffect(() => {
    if (!session || !isAdmin) return;
    const channel = supabase
      .channel("admin-res-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-reservations"] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, isAdmin, queryClient]);

  // Formateador visual de zonas
  const getZoneLabel = (zone: string) => {
    if (zone === "vip") return "Área VIP";
    if (zone === "evento") return "Evento especial 🎤";
    return "Mesa regular 🍽️";
  };

  // Flujo Inteligente: Actualizar DB y enviar WhatsApp
  const handleNotifyAndUpdate = (res: any, action: "confirmar" | "cancelar" | "completar") => {
    // 1. Si es "completar", solo actualizamos la DB (el cliente ya está en el local)
    if (action === "completar") {
      updateStatusMutation.mutate({ id: res.id, status: "completada" });
      return;
    }

    // 2. Actualizamos el estado en Supabase
    updateStatusMutation.mutate({ id: res.id, status: action === "confirmar" ? "confirmada" : "cancelada" });

    // 3. Generamos y enviamos el WhatsApp
    const date = new Date(`${res.reservation_date}T${res.reservation_time}`);
    const formattedDate = date.toLocaleDateString("es-VE", { weekday: 'long', day: 'numeric', month: 'long' });
    const formattedTime = date.toLocaleTimeString("es-VE", { hour: '2-digit', minute: '2-digit' });

    let message = "";
    if (action === "confirmar") {
      message = `¡Hola ${res.full_name}! 🎉\n\nTe escribimos de *Papa&Son* para confirmarte que tu reserva ha sido *APROBADA*.\n\n📅 *Fecha:* ${formattedDate}\n⏰ *Hora:* ${formattedTime}\n👥 *Personas:* ${res.party_size}\n📍 *Zona:* ${getZoneLabel(res.zone).toUpperCase()}\n\n¡Te esperamos con la mejor atención y sabor criollo! 🥩`;
    } else {
      message = `Hola ${res.full_name}. Te escribimos de *Papa&Son*.\n\nLamentablemente, no tenemos disponibilidad para la reserva solicitada el día ${formattedDate} a las ${formattedTime} para ${res.party_size} personas.\n\n¿Te gustaría que busquemos disponibilidad en otro horario u otra fecha? Quedamos atentos.`;
    }

    const phone = res.phone.replace(/\D/g, "");
    window.open(`https://wa.me/58${phone.replace(/^0/, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-bold">Confirmada</Badge>;
      case "completada": return <Badge className="bg-green-500/10 text-green-500 border-green-500/30 font-bold">Asistió</Badge>;
      case "cancelada": return <Badge variant="destructive" className="font-bold bg-red-500/10 text-red-500 border-red-500/30">Cancelada</Badge>;
      default: return <Badge variant="outline" className="border-amber-500/50 text-amber-500 animate-pulse font-bold bg-amber-500/5">Pendiente</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Cabecera y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" /> Control de Reservaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Administra mesas, áreas VIP y confirma asistencia vía WhatsApp.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-card border border-border rounded-2xl w-fit shadow-sm">
          <span className="text-muted-foreground pl-2 pr-1"><Filter className="h-4 w-4" /></span>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                filterStatus === tab.value 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Enterprise */}
      <div className="rounded-[2rem] border-2 border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/40 border-b-2 border-border">
              <tr>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground">Asignación</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                <th className="p-5 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="font-bold uppercase tracking-wider text-xs">Cargando reservaciones...</span>
                    </div>
                  </td>
                </tr>
              ) : reservations && reservations.length > 0 ? (
                reservations.map((res) => {
                  const resDate = new Date(`${res.reservation_date}T${res.reservation_time}`);
                  const isPast = resDate < new Date() && res.status === "pendiente";

                  return (
                    <tr key={res.id} className={cn("transition-colors group", isPast ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/20")}>
                      
                      {/* Cliente */}
                      <td className="p-5 align-top">
                        <div className="font-black text-foreground text-base">{res.full_name}</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mt-1">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          <a href={`tel:${res.phone}`} className="hover:text-primary transition-colors">{res.phone}</a>
                        </div>
                        {res.notes && (
                          <div className="mt-3 flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-xs text-muted-foreground max-w-xs">
                            <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="italic font-medium leading-tight text-foreground">"{res.notes}"</span>
                          </div>
                        )}
                      </td>

                      {/* Fecha y Zona */}
                      <td className="p-5 align-top space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <Calendar className={cn("h-4 w-4", isPast ? "text-red-500" : "text-primary")} />
                          <span className={cn(isPast && "text-red-500")}>{res.reservation_date}</span>
                          <span className="text-muted-foreground font-medium">a las</span>
                          <span className={cn("px-2 py-0.5 rounded-md border", isPast ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-primary/10 text-primary border-primary/20")}>
                            {res.reservation_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-black text-foreground bg-muted px-2 py-1 rounded-md">
                            <Users className="h-3.5 w-3.5" /> {res.party_size} px
                          </span>
                          <span className="font-bold flex items-center gap-1 text-primary">
                            <MapPin className="h-3.5 w-3.5" /> {getZoneLabel(res.zone)}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="p-5 align-top">
                        {renderStatusBadge(res.status)}
                        {isPast && <p className="text-[10px] font-black text-red-500 uppercase mt-2">Vencida</p>}
                      </td>

                      {/* Acciones Rápidas */}
                      <td className="p-5 align-top">
                        <div className="flex flex-col items-end gap-2">
                          
                          {res.status === "pendiente" && (
                            <>
                              <Button 
                                size="sm" 
                                className="w-36 justify-start font-bold bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleNotifyAndUpdate(res, "confirmar")}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Send className="h-3.5 w-3.5 mr-2" /> Confirmar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-36 justify-start font-bold text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                                onClick={() => window.confirm(`¿Rechazar reserva de ${res.full_name}?`) && handleNotifyAndUpdate(res, "cancelar")}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Rechazar
                              </Button>
                            </>
                          )}

                          {res.status === "confirmada" && (
                            <>
                              <Button 
                                size="sm" 
                                className="w-36 justify-start font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleNotifyAndUpdate(res, "completar")}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Cliente llegó
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="w-36 justify-start font-bold text-red-500 hover:bg-red-50"
                                onClick={() => window.confirm(`¿Cancelar la reserva ya confirmada de ${res.full_name}?`) && handleNotifyAndUpdate(res, "cancelar")}
                                disabled={updateStatusMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
                              </Button>
                            </>
                          )}

                          {/* Siempre mostrar opción de hablar por chat independientemente del estado */}
                          {(res.status === "completada" || res.status === "cancelada") && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-36 justify-start font-bold text-muted-foreground"
                              onClick={() => window.open(`https://wa.me/${res.phone.replace(/\D/g,'')}`, '_blank')}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-2" /> Abrir Chat
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="h-10 w-10 opacity-20 mb-2" />
                      <p className="text-lg font-black uppercase italic text-foreground">Sin Reservaciones</p>
                      <p className="text-sm font-medium">No hay registros para la pestaña: {FILTER_TABS.find(t => t.value === filterStatus)?.label}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}