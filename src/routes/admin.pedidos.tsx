import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Receipt, Search, Bike, Store, MapPin, Phone,
  Clock, Calendar as CalendarIcon, CheckCircle2, ChefHat,
  Eye, CreditCard, Copy, User, Coins, Send, Truck, ChevronDown, Lock, X, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/pedidos")({
  component: AdminPedidos,
});

// Colores por estado
function statusClass(status: string) {
  const map: Record<string, string> = {
    pendiente: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600",
    pago_verificado: "border-blue-500/40 bg-blue-500/10 text-blue-500",
    preparando: "border-orange-500/40 bg-orange-500/10 text-orange-500",
    en_camino: "border-purple-500/40 bg-purple-500/10 text-purple-500",
    completado: "border-green-500/40 bg-green-500/10 text-green-500",
  };
  return map[status] ?? "border-border text-muted-foreground";
}

// Jerarquía de estados para saber si se está retrocediendo
const STATUS_LEVELS: Record<string, number> = {
  pendiente: 0,
  pago_verificado: 1,
  preparando: 2,
  en_camino: 3,
  completado: 4
};

function AdminPedidos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  // Estados para el PIN de Retroceso
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{ id: string, status: string, order: any } | null>(null);

  // Ref para hacer scroll hasta la sección de asignar repartidor
  const assignSectionRef = useRef<HTMLDivElement>(null);

  // Configuraciones de la tienda (Para obtener el PIN)
  const { data: settings } = useQuery({
    queryKey: ["admin-settings-pin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("admin_pin").maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Pedidos
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Repartidores activos
  const { data: workers = [] } = useQuery({
    queryKey: ["delivery-workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Mutación de estado
  const processOrder = useMutation({
    mutationFn: async ({ id, status, order }: { id: string; status: string; order?: any }) => {
      let updates: any = { status };

      // IDEMPOTENCIA DOBLE: Verificamos en la DB también antes de sumar puntos
      // para evitar el bug si el estado local no estaba sincronizado
      if (status === "pago_verificado" && order?.customer_phone) {
        // Re-fetch del estado real del pedido en la DB para verificar points_awarded
        const { data: freshOrder } = await supabase
          .from("orders")
          .select("points_awarded")
          .eq("id", id)
          .maybeSingle();

        // Solo sumamos puntos si la DB confirma que NO se han dado antes
        if (!freshOrder?.points_awarded && !order?.points_awarded) {
          const pointsToAdd = Math.floor(order.total_usd * 10);

          const { data: customer } = await supabase
            .from("customers")
            .select("id, points, total_spent")
            .eq("phone", order.customer_phone)
            .maybeSingle();

          if (customer) {
            await supabase.from("customers").update({
              points: (customer.points || 0) + pointsToAdd,
              total_spent: Number(customer.total_spent || 0) + Number(order.total_usd),
            }).eq("id", customer.id);
          }

          // Marcamos la orden para que NUNCA vuelva a sumar puntos
          updates.points_awarded = true;
        }
      }

      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;
      return updates;
    },
    onSuccess: (updates, { status, order }) => {
      const labels: Record<string, string> = {
        pago_verificado: updates.points_awarded ? "✅ Pago verificado y puntos asignados" : "✅ Estado actualizado a Pago Verificado",
        preparando: "👨‍🍳 Orden en cocina",
        en_camino: "🛵 Pedido en camino",
        completado: "✔️ Pedido completado",
        pendiente: "⚠️ Orden devuelta a Pendiente"
      };
      toast.success(labels[status] ?? "Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      // Actualizar localmente la vista sin cerrar el sheet
      if (selectedOrder?.id === order?.id || selectedOrder?.id) {
        setSelectedOrder((prev: any) => prev ? { ...prev, ...updates } : null);
      }
    },
    onError: () => toast.error("Error al actualizar"),
  });

  // Controlador inteligente de Cambio de Estado con validación de Delivery
  const handleStatusChange = (order: any, newStatus: string) => {
    // REGLA: No puede ir a "en_camino" si es delivery y no tiene repartidor.
    // En lugar de bloquear, hacemos scroll a la sección de asignar.
    if (newStatus === "en_camino" && order.delivery_type === "delivery" && !order.driver_id) {
      toast.warning("⚠️ Asigna un repartidor primero para marcar como 'En Camino'.");
      // Scroll suave hacia la sección de asignar repartidor
      setTimeout(() => {
        assignSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    const currentLevel = STATUS_LEVELS[order.status] ?? 0;
    const newLevel = STATUS_LEVELS[newStatus] ?? 0;

    if (newLevel < currentLevel) {
      setPendingAction({ id: order.id, status: newStatus, order });
      setPinInput("");
      setIsPinDialogOpen(true);
    } else {
      processOrder.mutate({ id: order.id, status: newStatus, order });
    }
  };

  const confirmPinAndExecute = () => {
    const correctPin = settings?.admin_pin || "1234";
    if (pinInput === correctPin) {
      if (pendingAction) {
        processOrder.mutate(pendingAction);
      }
      setIsPinDialogOpen(false);
      setPinInput("");
      setPendingAction(null);
    } else {
      toast.error("PIN de administrador incorrecto");
    }
  };

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("realtime-orders-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filteredOrders = orders.filter((o: any) =>
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_phone?.includes(searchTerm) ||
    o.pago_ref?.includes(searchTerm)
  );

  // BOTÓN 1: Solo asignar el repartidor (sin WhatsApp)
  const handleAssignDriver = async () => {
    if (!selectedOrder) return;
    if (!selectedWorkerId) return toast.error("Selecciona un repartidor primero");

    let fee = 0;
    try {
      if (selectedOrder.zone_id) {
        const { data: rpcFee, error: rpcError } = await supabase.rpc('calculate_delivery_fee', {
          p_zone_id: selectedOrder.zone_id
        });
        if (!rpcError && rpcFee) fee = Number(rpcFee);
      }

      const { error } = await supabase
        .from("orders")
        .update({
          driver_id: selectedWorkerId,
          driver_fee: fee
        })
        .eq("id", selectedOrder.id);

      if (error) {
        toast.error("Error al asignar el repartidor en el sistema");
        return;
      }

      toast.success(`✅ Repartidor asignado (Comisión: $${fee.toFixed(2)})`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      // Actualizar localmente
      setSelectedOrder((prev: any) => prev ? { ...prev, driver_id: selectedWorkerId, driver_fee: fee } : null);

      // Auto-avanzar a "en_camino" tras asignar
      const updatedOrder = { ...selectedOrder, driver_id: selectedWorkerId, driver_fee: fee };
      processOrder.mutate({ id: selectedOrder.id, status: "en_camino", order: updatedOrder });

    } catch (err) {
      toast.error("Hubo un problema al asignar el repartidor");
    }
  };

  // BOTÓN 2: Solo enviar por WhatsApp (requiere repartidor ya asignado)
  const handleSendWhatsApp = async () => {
    if (!selectedOrder) return;

    const driverIdToUse = selectedOrder.driver_id || selectedWorkerId;
    if (!driverIdToUse) return toast.error("Asigna un repartidor antes de enviar por WhatsApp");

    const worker = workers.find((w: any) => w.id === driverIdToUse);
    if (!worker) return toast.error("No se encontró el repartidor asignado");

    const fee = selectedOrder.driver_fee ?? 0;

    const itemsText = selectedOrder.items
      ?.map((i: any) => `  • ${i.quantity}x ${i.name} (${i.variantLabel})`)
      .join("\n");

    const message =
      `🛵 *PEDIDO PAPA&SON — ${worker.name.toUpperCase()}*\n\n` +
      `*📦 Orden:* #${selectedOrder.id.split("-")[0].toUpperCase()}\n` +
      `*📅 Hora:* ${new Date(selectedOrder.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}\n\n` +
      `*🍔 COMANDA:*\n${itemsText}\n\n` +
      `*💵 Pago de Delivery:* $${Number(fee).toFixed(2)}\n\n` +
      `*📍 DIRECCIÓN:*\n${selectedOrder.address_ref ?? "—"}\n` +
      (selectedOrder.maps_link ? `*🗺️ GPS:* ${selectedOrder.maps_link}\n` : "") +
      `\n*👤 Cliente:* ${selectedOrder.customer_name}\n` +
      `*📞 Teléfono:* ${selectedOrder.customer_phone}`;

    const phone = worker.phone.replace(/\D/g, "");
    window.open(`https://wa.me/58${phone.replace(/^0/, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Receipt className="h-8 w-8 text-primary" /> Pedidos
          </h1>
          <p className="text-muted-foreground mt-1">Control en tiempo real de todas las órdenes.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, teléfono o ref..."
            className="pl-9 h-11 rounded-xl bg-card border-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* TABLA */}
      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs uppercase font-black text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground font-bold">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground font-bold">
                    No hay pedidos registrados
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => {
                  const d = new Date(order.created_at);
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3" />
                          {d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" })}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-foreground">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={
                          order.delivery_type === "delivery"
                            ? "bg-orange-500/10 text-orange-600 border-orange-500/20 font-bold uppercase text-[10px]"
                            : "bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold uppercase text-[10px]"
                        }>
                          {order.delivery_type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-primary">
                        ${Number(order.total_usd).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={cn("font-bold uppercase text-[10px]", statusClass(order.status))}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedWorkerId(order.driver_id || "");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIÁLOGO DE PIN PARA RETROCESO DE ESTADO */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive uppercase italic tracking-tighter">
              <Lock className="h-5 w-5" /> Acción Protegida
            </DialogTitle>
            <DialogDescription className="font-bold">
              Estás intentando retroceder el estado de este pedido a <span className="uppercase text-foreground">"{pendingAction?.status}"</span>. Ingresa el PIN de Administrador para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Input
              type="password"
              placeholder="••••"
              value={pinInput}
              autoComplete="off"
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="h-12 text-center text-xl tracking-[1em] font-black focus:border-red-500"
              autoFocus
              maxLength={4}
              onKeyDown={(e) => e.key === 'Enter' && confirmPinAndExecute()}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsPinDialogOpen(false); setPinInput(""); }}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmPinAndExecute} className="font-black">Autorizar Cambio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHEET DE DETALLE */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-card border-l-2 p-0 flex flex-col">
          {selectedOrder && (
            <>
              {/* HEADER CON BOTÓN DE CERRAR */}
              <SheetHeader className="p-6 border-b bg-background/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <SheetTitle className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Orden #{selectedOrder.id.split("-")[0].toUpperCase()}
                    </span>
                    <span className="text-2xl font-black italic uppercase">Detalle del Pedido</span>
                  </SheetTitle>
                  {/* BOTÓN CERRAR — Visible siempre, especialmente útil en mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full shrink-0 -mr-1 -mt-1"
                    onClick={() => setSelectedOrder(null)}
                  >
                    <X className="h-5 w-5" />
                    <span className="sr-only">Cerrar</span>
                  </Button>
                </div>
                <DialogDescription className="sr-only">Detalles y acciones del pedido</DialogDescription>
              </SheetHeader>

              <div className="p-6 space-y-6 flex-1">

                {/* CONTROL DE ESTADOS */}
                <div className="bg-card border-2 border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Coins className="h-4 w-4 text-yellow-500" /> Flujo del Pedido
                    </p>
                    {selectedOrder.points_awarded && (
                      <Badge variant="outline" className="text-[8px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        🌟 PUNTOS OTORGADOS
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedOrder.status === "pendiente" ? "default" : "outline"}
                      className={cn("h-10 text-xs font-bold gap-1.5", selectedOrder.status === "pendiente" && "bg-yellow-500/20 border-yellow-500/50 text-yellow-600")}
                      onClick={() => handleStatusChange(selectedOrder, "pendiente")}
                    >
                      <Clock className="h-3.5 w-3.5" /> Pendiente
                    </Button>
                    <Button
                      variant={selectedOrder.status === "pago_verificado" ? "default" : "outline"}
                      className={cn("h-10 text-xs font-bold gap-1.5", selectedOrder.status === "pago_verificado" ? "bg-blue-500 text-white" : "bg-blue-500/5 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white")}
                      onClick={() => handleStatusChange(selectedOrder, "pago_verificado")}
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pago OK
                    </Button>
                    <Button
                      variant={selectedOrder.status === "preparando" ? "default" : "outline"}
                      className={cn("h-10 text-xs font-bold gap-1.5", selectedOrder.status === "preparando" ? "bg-orange-500 text-white" : "bg-orange-500/5 text-orange-600 border-orange-500/20 hover:bg-orange-500 hover:text-white")}
                      onClick={() => handleStatusChange(selectedOrder, "preparando")}
                    >
                      <ChefHat className="h-3.5 w-3.5" /> En Cocina
                    </Button>
                    <Button
                      variant={selectedOrder.status === "en_camino" ? "default" : "outline"}
                      className={cn("h-10 text-xs font-bold gap-1.5", selectedOrder.status === "en_camino" ? "bg-purple-500 text-white" : "bg-purple-500/5 text-purple-600 border-purple-500/20 hover:bg-purple-500 hover:text-white")}
                      onClick={() => handleStatusChange(selectedOrder, "en_camino")}
                    >
                      <Truck className="h-3.5 w-3.5" /> En Camino
                    </Button>
                    <Button
                      variant={selectedOrder.status === "completado" ? "default" : "outline"}
                      className={cn("h-10 text-xs font-bold gap-1.5 col-span-2", selectedOrder.status === "completado" ? "bg-green-500 text-white" : "bg-green-500/5 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white")}
                      onClick={() => handleStatusChange(selectedOrder, "completado")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completado
                    </Button>
                  </div>
                  <div className="pt-1">
                    <Badge variant="outline" className={cn("text-[10px] font-black uppercase w-full justify-center py-1.5", statusClass(selectedOrder.status))}>
                      Estado actual: {selectedOrder.status}
                    </Badge>
                  </div>
                </div>

                {/* ASIGNAR REPARTIDOR — ref para scroll automático desde "En Camino" */}
                {selectedOrder.delivery_type === "delivery" && (
                  <div
                    ref={assignSectionRef}
                    className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Send className="h-4 w-4" /> Asignar Repartidor
                      </p>
                      {selectedOrder.driver_id && (
                        <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-600 border-green-500/20 uppercase font-black">
                          Asignado ✓
                        </Badge>
                      )}
                    </div>
                    {workers.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-medium">
                        No hay repartidores activos. Ve a <span className="font-black text-primary">Admin → Equipo Delivery</span> para agregar uno.
                      </p>
                    ) : (
                      <>
                        <div className="relative">
                          <select
                            value={selectedWorkerId}
                            onChange={(e) => setSelectedWorkerId(e.target.value)}
                            className="h-12 w-full appearance-none rounded-xl border-2 border-border bg-background px-4 pr-10 text-sm font-bold outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="">Selecciona un repartidor...</option>
                            {workers.map((w: any) => (
                              <option key={w.id} value={w.id}>
                                {w.name} — {w.phone}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* DOS BOTONES SEPARADOS */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* BOTÓN 1: Asignar (y auto-pasa a En Camino) */}
                          <Button
                            onClick={handleAssignDriver}
                            disabled={!selectedWorkerId || processOrder.isPending}
                            className="h-12 font-black gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <UserCheck className="h-4 w-4" />
                            Asignar
                          </Button>

                          {/* BOTÓN 2: Enviar por WhatsApp (requiere repartidor asignado) */}
                          <Button
                            onClick={handleSendWhatsApp}
                            disabled={!selectedOrder.driver_id && !selectedWorkerId}
                            className="h-12 font-black gap-2 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        </div>

                        {/* Indicador: si ya hay repartidor asignado, muestra quién es */}
                        {selectedOrder.driver_id && (() => {
                          const assignedWorker = workers.find((w: any) => w.id === selectedOrder.driver_id);
                          return assignedWorker ? (
                            <p className="text-xs text-center text-muted-foreground font-bold">
                              🛵 Asignado a: <span className="text-foreground">{assignedWorker.name}</span>
                            </p>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* CLIENTE */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Cliente
                  </p>
                  <div className="border-2 rounded-2xl p-4 space-y-1">
                    <p className="font-black text-lg">{selectedOrder.customer_name}</p>
                    <p className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {selectedOrder.customer_phone}
                    </p>
                  </div>
                </div>

                {/* LOGÍSTICA */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Logística
                  </p>
                  <div className={cn(
                    "border-2 rounded-2xl p-4 space-y-3",
                    selectedOrder.delivery_type === "delivery"
                      ? "border-orange-500/20 bg-orange-500/5"
                      : "border-purple-500/20 bg-purple-500/5"
                  )}>
                    <Badge className={selectedOrder.delivery_type === "delivery" ? "bg-orange-500 text-white" : "bg-purple-500 text-white"}>
                      {selectedOrder.delivery_type === "delivery"
                        ? <><Bike className="h-3 w-3 mr-1" />DELIVERY</>
                        : <><Store className="h-3 w-3 mr-1" />RETIRO</>
                      }
                    </Badge>
                    {selectedOrder.delivery_type === "retiro" && (
                      <p className="text-sm font-bold flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Pasará: <span className="text-primary">{selectedOrder.pickup_time}</span>
                      </p>
                    )}
                    {selectedOrder.delivery_type === "delivery" && (
                      <>
                        <p className="text-sm font-medium">{selectedOrder.address_ref}</p>
                        {selectedOrder.maps_link && (
                          <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold gap-2">
                            <a href={selectedOrder.maps_link} target="_blank" rel="noopener noreferrer">
                              <MapPin className="h-3 w-3 text-orange-500" /> Abrir GPS
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* COMANDA */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> Comanda
                  </p>
                  <div className="border-2 rounded-2xl p-4 space-y-3">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div>
                          <p className="font-black"><span className="text-primary mr-1">{item.quantity}x</span>{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                        </div>
                        <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    {selectedOrder.coupon_code && (
                      <div className="flex justify-between text-sm text-green-600 font-bold border-t pt-2">
                        <span>Descuento ({selectedOrder.coupon_code})</span>
                        <span>-${Number(selectedOrder.discount_usd ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t-2 pt-3 mt-1 flex justify-between items-end">
                      <div>
                        <p className="text-xl font-black uppercase italic">Total:</p>
                        <p className="text-xs font-bold text-muted-foreground">Tasa BCV: {selectedOrder.bcv_rate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">${Number(selectedOrder.total_usd).toFixed(2)}</p>
                        <p className="text-sm font-bold text-muted-foreground">Bs. {Number(selectedOrder.total_bs).toLocaleString("es-VE")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* REFERENCIA DE PAGO */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Referencia de Pago
                  </p>
                  <div className="border-2 border-green-500/20 bg-green-500/5 rounded-2xl p-4 flex items-center justify-between">
                    <p className="font-mono font-black text-lg text-green-600 tracking-widest">{selectedOrder.pago_ref}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { navigator.clipboard.writeText(selectedOrder.pago_ref); toast.success("Copiado"); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}