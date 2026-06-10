import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Map, Plus, Trash2, Loader2, Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DeliveryZonesManager() {
  const queryClient = useQueryClient();
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePrice, setNewZonePrice] = useState("");

  const { data: zones, isLoading } = useQuery({
    queryKey: ["admin-delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const addZone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("delivery_zones").insert([{
        name: newZoneName.trim(),
        price_usd: Number(newZonePrice),
        is_active: true
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zona añadida");
      setNewZoneName("");
      setNewZonePrice("");
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] }); // Cliente
    },
    onError: () => toast.error("Error al añadir zona")
  });

  const toggleZone = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from("delivery_zones").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado de zona actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
    }
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zona eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName || !newZonePrice || isNaN(Number(newZonePrice))) {
      return toast.error("Datos inválidos");
    }
    addZone.mutate();
  };

  return (
    <div className="rounded-[2rem] border-2 border-orange-500/20 bg-card shadow-xl overflow-hidden">
      <div className="p-6 md:p-8 bg-orange-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Map className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-black uppercase tracking-tight italic">Gestor de Delivery</h2>
        </div>
        <p className="text-xs text-muted-foreground font-medium max-w-xl">
          Crea las zonas a las que llega el motorizado y asígnales una tarifa en dólares. El carrito del cliente las sumará al total automáticamente.
        </p>

        <form onSubmit={handleAdd} className="mt-6 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Nombre de la zona (Ej. Tipuro)" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className="h-12 border-2 bg-background font-bold" />
          <div className="relative w-full sm:w-32 shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
            <Input placeholder="0.00" type="number" step="0.50" value={newZonePrice} onChange={e => setNewZonePrice(e.target.value)} className="h-12 border-2 bg-background font-bold pl-8" />
          </div>
          <Button type="submit" disabled={addZone.isPending} className="h-12 px-8 font-black uppercase bg-orange-500 hover:bg-orange-600 text-white shrink-0 rounded-xl">
            {addZone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Añadir</>}
          </Button>
        </form>
      </div>

      <div className="p-6 md:p-8">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
        ) : zones?.length === 0 ? (
          <p className="text-center text-sm font-bold text-muted-foreground py-8">No hay zonas configuradas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones?.map((zone) => (
              <div key={zone.id} className={cn("flex flex-col border-2 rounded-2xl p-4 transition-all", zone.is_active ? "border-border bg-background" : "border-muted bg-muted/50 opacity-60")}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-black truncate pr-2">{zone.name}</span>
                  <span className="font-black text-orange-500 shrink-0">${Number(zone.price_usd).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-3 border-t-2 border-border/50">
                  <Badge variant={zone.is_active ? "default" : "secondary"} className="mr-auto text-[10px] uppercase font-bold">
                    {zone.is_active ? "Activa" : "Pausada"}
                  </Badge>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toggleZone.mutate({ id: zone.id, is_active: zone.is_active })}>
                    {zone.is_active ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                  </Button>
                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => { if(confirm("¿Eliminar zona?")) deleteZone.mutate(zone.id) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}