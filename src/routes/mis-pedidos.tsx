import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useCustomer } from "@/hooks/use-customer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Receipt, Clock, CheckCircle2, ChefHat, Star, MessageSquare, 
  Loader2, Store, Bike, User, KeyRound, LogOut, Wallet 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PointLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/mis-pedidos")({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { customer, loading, setCustomer, logout } = useCustomer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Control de pestañas
  const [activeTab, setActiveTab] = useState<"pedidos" | "seguridad">("pedidos");

  // Estados PIN
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [updatingPin, setUpdatingPin] = useState(false);

  // Estados Reseñas
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // 1. Obtener historial de pedidos
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["customer-orders", customer?.phone],
    enabled: !!customer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", customer!.phone)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Obtener IDs de pedidos ya calificados
  const { data: reviewedOrderIds = [] } = useQuery({
    queryKey: ["customer-reviews", customer?.id],
    enabled: !!customer,
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("order_id")
        .eq("customer_id", customer!.id);
      return data?.map((r) => r.order_id) ?? [];
    },
  });

  // 3. Mutación para reseñas
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!reviewOrder || !customer) return;
      const { error } = await supabase.from("reviews").insert([
        {
          order_id: reviewOrder.id,
          customer_id: customer.id,
          customer_name: customer.name,
          rating,
          comment: comment.trim(),
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Gracias por tu reseña!");
      queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
      setReviewOrder(null);
      setComment("");
      setRating(5);
    },
    onError: () => toast.error("Hubo un error al enviar tu reseña."),
  });

  // EFECTO DE REDIRECCIÓN (DEBE IR DESPUÉS DE TODOS LOS HOOKS ARRIBA)
  useEffect(() => {
    if (!loading && !customer) {
      navigate({ to: "/login", replace: true });
    }
  }, [customer, loading, navigate]);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    
    if (currentPin !== customer.pin) {
      toast.error("El PIN actual es incorrecto.");
      return;
    }
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      toast.error("El nuevo PIN debe contener exactamente 4 dígitos.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("La confirmación del nuevo PIN no coincide.");
      return;
    }

    setUpdatingPin(true);
    try {
      const { error } = await supabase.from("customers").update({ pin: newPin }).eq("id", customer.id);
      if (error) throw error;

      setCustomer({ ...customer, pin: newPin });
      toast.success("¡PIN actualizado con éxito!");
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
    } catch (err) {
      toast.error("Error al actualizar el PIN.");
    } finally {
      setUpdatingPin(false);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReview.mutate();
  };

  const handleLogoutClick = () => {
    logout();
    toast.success("Sesión cerrada");
  };

  // Prevenir renderizado si no hay cliente (después de que los hooks ya se declararon)
  if (!customer) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in duration-500">
      
      {/* TARJETA DE BIENVENIDA */}
      <div className="rounded-[2.5rem] border-2 border-border bg-card p-6 md:p-8 shadow-sm flex flex-col sm:flex-row gap-6 justify-between items-center mb-8 bg-gradient-to-br from-card to-muted/20">
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-2xl font-black text-primary uppercase">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic flex items-center gap-2 justify-center sm:justify-start">
              ¡Hola, {customer.name.split(" ")[0]}!
            </h1>
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1">
              <User className="h-3.5 w-3.5" /> WhatsApp: {customer.phone}
            </p>
          </div>
        </div>
        
        {/* BILLETERA */}
        <div className="bg-background border-2 border-border rounded-3xl p-4 flex items-center gap-4 w-full sm:w-auto justify-center shadow-inner">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left pr-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tu Billetera</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PointLogo className="h-5 w-5" />
              <span className="text-2xl font-black text-foreground tracking-tight">{customer.points || 0}</span>
              <span className="text-xs font-black uppercase italic text-primary ml-0.5">Pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN */}
      <div className="flex border-b border-border mb-6 gap-2">
        <button
          onClick={() => setActiveTab("pedidos")}
          className={cn("pb-3 text-sm font-black uppercase italic tracking-tighter transition-all border-b-2 px-4 cursor-pointer", activeTab === "pedidos" ? "border-primary text-primary scale-105" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          Mis Pedidos
        </button>
        <button
          onClick={() => setActiveTab("seguridad")}
          className={cn("pb-3 text-sm font-black uppercase italic tracking-tighter transition-all border-b-2 px-4 cursor-pointer", activeTab === "seguridad" ? "border-primary text-primary scale-105" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          Seguridad
        </button>
        <button onClick={handleLogoutClick} className="ml-auto pb-3 text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-2 cursor-pointer">
          <LogOut className="h-3.5 w-3.5" /> Salir
        </button>
      </div>

      {/* PESTAÑA: PEDIDOS */}
      {activeTab === "pedidos" && (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-border bg-card p-12 text-center shadow-sm">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h2 className="text-lg font-black uppercase italic">Aún no hay órdenes</h2>
              <p className="text-sm text-muted-foreground mt-2">Explora el menú y empieza a acumular puntos.</p>
              <Button onClick={() => navigate({ to: "/menu" })} variant="flame" className="mt-6 font-black uppercase italic">Ver Menú</Button>
            </div>
          ) : (
            orders.map((order: any) => {
              const hasReviewed = reviewedOrderIds.includes(order.id);
              const isCompleted = order.status === "completado";
              const d = new Date(order.created_at);

              return (
                <div key={order.id} className="rounded-3xl border-2 border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between border-b border-border/50 bg-muted/20">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Orden #{order.id.split("-")[0]}</span>
                        <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold">
                          {order.delivery_type === "delivery" ? <><Bike className="h-3 w-3 mr-1" /> Delivery</> : <><Store className="h-3 w-3 mr-1" /> Retiro</>}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {d.toLocaleDateString()} — {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-primary italic tracking-tighter">${order.total_usd.toFixed(2)}</p>
                      <p className="text-xs font-bold text-muted-foreground">Bs. {Number(order.total_bs).toLocaleString("es-VE")}</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="relative pt-2 pb-6">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full bg-primary transition-all duration-1000", order.status === "pendiente" ? "w-1/3" : order.status === "preparando" ? "w-2/3" : "w-full")} />
                      </div>
                      <div className="relative flex justify-between">
                        <div className={cn("flex flex-col items-center gap-1.5 transition-colors", order.status !== "pendiente" ? "text-primary" : "text-muted-foreground")}>
                          <div className="h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-sm bg-primary text-white"><Receipt className="h-3 w-3" /></div>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Recibido</span>
                        </div>
                        <div className={cn("flex flex-col items-center gap-1.5 transition-colors", order.status === "preparando" || isCompleted ? "text-primary" : "text-muted-foreground opacity-50")}>
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-sm", order.status === "preparando" || isCompleted ? "bg-primary text-white" : "bg-muted text-muted-foreground")}><ChefHat className="h-3 w-3" /></div>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Cocina</span>
                        </div>
                        <div className={cn("flex flex-col items-center gap-1.5 transition-colors", isCompleted ? "text-green-500" : "text-muted-foreground opacity-50")}>
                          <div className={cn("h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-sm", isCompleted ? "bg-green-500 text-white" : "bg-muted text-muted-foreground")}><CheckCircle2 className="h-3 w-3" /></div>
                          <span className="text-[10px] font-black uppercase tracking-tighter">Completado</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                      <div className="text-xs font-medium text-muted-foreground flex flex-wrap gap-1.5 max-w-xl">
                        {order.items?.map((i: any, idx: number) => (
                          <span key={idx} className="bg-secondary/60 px-2 py-1 rounded-md text-[10px] font-bold text-foreground">
                            <span className="text-primary">{i.quantity}x</span> {i.name}
                          </span>
                        ))}
                      </div>
                      
                      {isCompleted && !hasReviewed && (
                        <Button variant="outline" size="sm" className="rounded-xl border-2 border-primary/20 text-primary hover:bg-primary/10 font-black uppercase italic tracking-tighter w-full sm:w-auto" onClick={() => setReviewOrder(order)}>
                          <Star className="h-4 w-4 mr-1.5 fill-current" /> Calificar
                        </Button>
                      )}
                      {isCompleted && hasReviewed && (
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1 self-end sm:self-center"><CheckCircle2 className="h-3 w-3" /> Calificado</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PESTAÑA: SEGURIDAD */}
      {activeTab === "seguridad" && (
        <div className="border-2 border-border bg-card p-6 rounded-[2rem] shadow-sm max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-black uppercase tracking-tighter text-lg italic">Actualizar PIN de Acceso</h2>
          </div>
          <form onSubmit={handleUpdatePin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PIN Actual</label>
              <Input type="password" maxLength={4} placeholder="••••" className="h-12 rounded-xl border-2 font-black tracking-[0.5em] text-center text-lg" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nuevo PIN (4 dígitos)</label>
              <Input type="password" maxLength={4} placeholder="••••" className="h-12 rounded-xl border-2 font-black tracking-[0.5em] text-center text-lg" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirmar Nuevo PIN</label>
              <Input type="password" maxLength={4} placeholder="••••" className="h-12 rounded-xl border-2 font-black tracking-[0.5em] text-center text-lg" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} required />
            </div>
            <Button type="submit" variant="flame" size="xl" className="w-full font-black uppercase italic tracking-tighter h-12 rounded-xl mt-2" disabled={updatingPin || !currentPin || !newPin || !confirmPin}>
              {updatingPin ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar Nuevo PIN"}
            </Button>
          </form>
        </div>
      )}

      {/* MODAL PARA RESEÑA */}
      <Dialog open={!!reviewOrder} onOpenChange={(open) => !open && setReviewOrder(null)}>
        <DialogContent aria-describedby="review-dialog-description" className="sm:max-w-md rounded-[2rem] p-6 border-2 border-border bg-card">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Califica tu Comida</DialogTitle>
            <DialogDescription id="review-dialog-description" className="font-medium">
              ¿Qué tal estuvo tu pedido de Papa&Son? Tu reseña ayudará a otros clientes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-6 mt-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform hover:scale-110 active:scale-95 outline-none cursor-pointer">
                  <Star className={cn("h-10 w-10 transition-colors duration-300", rating >= star ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" : "fill-muted text-muted-foreground")} />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Tu Comentario (Opcional)
              </label>
              <textarea rows={3} placeholder="¡Los asados en su punto y la salsa increíble! El pedido llegó caliente..." className="w-full rounded-2xl border-2 border-border bg-background p-4 text-sm font-medium outline-none focus:border-primary resize-none" value={comment} onChange={e => setComment(e.target.value)} />
            </div>
            <Button type="submit" variant="flame" size="xl" className="w-full rounded-2xl font-black uppercase italic tracking-tighter h-14" disabled={submitReview.isPending}>
              {submitReview.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publicar Calificación"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}