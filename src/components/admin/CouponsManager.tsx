import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ticket, Plus, Trash2, Loader2, Power, PowerOff, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CouponsManager() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "fixed_amount">("percentage");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const addCoupon = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coupons").insert([{
        code: code.trim().toUpperCase(),
        discount_type: type,
        discount_value: Number(value),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        is_active: true
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cupón creado con éxito");
      setCode(""); setValue(""); setExpiresAt("");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any) => {
      if (err.code === '23505') toast.error("Este código de cupón ya existe.");
      else toast.error("Error al crear cupón.");
    }
  });

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value || isNaN(Number(value))) return toast.error("Datos inválidos");
    addCoupon.mutate();
  };

  return (
    <div className="rounded-[2rem] border-2 border-green-500/20 bg-card shadow-xl overflow-hidden">
      <div className="p-6 md:p-8 bg-green-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="h-6 w-6 text-green-500" />
          <h2 className="text-xl font-black uppercase tracking-tight italic">Gestor de Promociones</h2>
        </div>
        <p className="text-xs text-muted-foreground font-medium max-w-xl">
          Crea códigos de descuento para fidelizar clientes. Puedes definir si es un porcentaje (Ej. 10%) o un monto fijo (Ej. $5) y ponerle fecha límite.
        </p>

        <form onSubmit={handleAdd} className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <Input placeholder="CÓDIGO (Ej. VERANO24)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="h-12 border-2 bg-background font-bold uppercase sm:col-span-3" />
          
          <select value={type} onChange={e => setType(e.target.value as any)} className="h-12 border-2 rounded-xl bg-background px-4 font-bold outline-none focus:border-green-500 sm:col-span-3">
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed_amount">Monto Fijo ($)</option>
          </select>

          <Input placeholder={type === 'percentage' ? "Valor (Ej. 15)" : "Valor (Ej. 5.00)"} type="number" step="any" value={value} onChange={e => setValue(e.target.value)} className="h-12 border-2 bg-background font-bold sm:col-span-2" />
          
          <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="h-12 border-2 bg-background font-bold sm:col-span-2 text-xs" />

          <Button type="submit" disabled={addCoupon.isPending} className="h-12 font-black uppercase bg-green-500 hover:bg-green-600 text-white rounded-xl sm:col-span-2">
            {addCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
          </Button>
        </form>
      </div>

      <div className="p-6 md:p-8">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-green-500" /></div>
        ) : coupons?.length === 0 ? (
          <p className="text-center text-sm font-bold text-muted-foreground py-8">No hay cupones creados.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coupons?.map((coupon) => {
              const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
              
              return (
                <div key={coupon.id} className={cn("flex flex-col border-2 rounded-2xl p-4 transition-all", (coupon.is_active && !isExpired) ? "border-border bg-background" : "border-muted bg-muted/50 opacity-60")}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-lg tracking-widest text-green-600 uppercase bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{coupon.code}</span>
                    <span className="font-black shrink-0">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `-$${coupon.discount_value}`}
                    </span>
                  </div>
                  
                  {coupon.expires_at && (
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Vence: {new Date(coupon.expires_at).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-3 border-t-2 border-border/50">
                    <Badge variant={(coupon.is_active && !isExpired) ? "default" : "secondary"} className={cn("mr-auto text-[10px] uppercase font-bold", isExpired && "bg-destructive/10 text-destructive border-none")}>
                      {isExpired ? "Expirado" : (coupon.is_active ? "Activo" : "Pausado")}
                    </Badge>
                    
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toggleCoupon.mutate({ id: coupon.id, is_active: coupon.is_active })}>
                      {coupon.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => { if(confirm("¿Eliminar cupón?")) deleteCoupon.mutate(coupon.id) }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}