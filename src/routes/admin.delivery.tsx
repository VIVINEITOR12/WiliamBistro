import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bike, UserPlus, Phone, Car, ShieldCheck, Loader2, Edit2, Trash2, Activity, Ban, CheckCircle2, TrendingUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/delivery")({
  component: AdminDelivery,
});

function AdminDelivery() {
  const queryClient = useQueryClient();
  
  // Estados para creación
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  // Estados para modales de gestión
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);

  // Estados de Edición
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editVehicle, setEditVehicle] = useState("");

  // 1. Obtener Repartidores (AQUÍ SE DEFINE 'drivers')
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["delivery_drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_drivers").select("*").order("active", { ascending: false }).order("name");
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Obtener Métricas de Pedidos
  const { data: orders = [] } = useQuery({
    queryKey: ["delivery_orders_metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, status, driver_id, total_usd").not("driver_id", "is", null);
      if (error) throw error;
      return data || [];
    }
  });

  // Mutaciones
  const addDriver = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("delivery_drivers").insert([{ name, phone, vehicle }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Repartidor registrado");
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
      setName(""); setPhone(""); setVehicle("");
    }
  });

  const updateDriver = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase.from("delivery_drivers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Datos actualizados");
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
      setIsEditModalOpen(false);
    }
  });

  const deleteDriver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Repartidor eliminado");
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
      setIsEditModalOpen(false);
    }
  });

  const openEditModal = (driver: any) => {
    setSelectedDriver(driver);
    setEditName(driver.name);
    setEditPhone(driver.phone);
    setEditVehicle(driver.vehicle || "");
    setIsEditModalOpen(true);
  };

  const openMetricsModal = (driver: any) => {
    setSelectedDriver(driver);
    setIsMetricsModalOpen(true);
  };

  const getDriverMetrics = (driverId: string) => {
    const driverOrders = orders.filter((o: any) => o.driver_id === driverId);
    const completed = driverOrders.filter((o: any) => o.status === "completado");
    const moneyGenerated = completed.reduce((acc, curr: any) => acc + Number(curr.total_usd), 0);
    return {
      totalTrips: driverOrders.length,
      completedTrips: completed.length,
      moneyGenerated: moneyGenerated.toFixed(2)
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Bike className="h-8 w-8 text-primary" />
          </div>
          Centro de Logística
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          Gestión avanzada de flota, métricas de rendimiento y asignaciones.
        </p>
      </header>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-1">
          <div className="border-2 border-border bg-card p-6 rounded-[2rem] shadow-sm sticky top-6 space-y-6">
            <div className="flex items-center gap-2 border-b-2 border-border/50 pb-4">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-black uppercase tracking-widest text-sm">Nuevo Ingreso</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre Completo</label>
                <Input className="h-12 rounded-xl bg-muted/20 font-medium border-2" placeholder="Ej. Carlos Pérez" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3"/> Teléfono</label>
                <Input className="h-12 rounded-xl bg-muted/20 font-medium border-2" placeholder="Ej. 0414-1234567" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Car className="h-3 w-3"/> Vehículo</label>
                <Input className="h-12 rounded-xl bg-muted/20 font-medium border-2" placeholder="Ej. Moto Bera 2023" value={vehicle} onChange={e => setVehicle(e.target.value)} />
              </div>
            </div>

            <Button 
              variant="flame" 
              size="xl" 
              className="w-full font-black uppercase italic tracking-tighter h-14 rounded-2xl" 
              onClick={() => addDriver.mutate()} 
              disabled={!name || !phone || addDriver.isPending}
            >
              {addDriver.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar en Flota"}
            </Button>
          </div>
        </div>

        {/* COLUMNA DERECHA: DIRECTORIO */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black uppercase tracking-widest text-sm text-muted-foreground">Directorio de Personal</h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="font-bold border-green-500/30 text-green-600 bg-green-500/10">
                {drivers.filter((d:any) => d.active).length} Activos
              </Badge>
              <Badge variant="outline" className="font-bold border-red-500/30 text-red-600 bg-red-500/10">
                {drivers.filter((d:any) => !d.active).length} Inactivos
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : drivers.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-border bg-card p-12 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-16 w-16 text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-xl font-black uppercase italic">Flota Vacía</h3>
              <p className="text-sm text-muted-foreground mt-2">Registra a tu primer repartidor para empezar.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {drivers.map((driver: any) => (
                <div key={driver.id} className={cn("group relative overflow-hidden rounded-[2rem] border-2 bg-card transition-all", driver.active ? "border-border hover:border-primary/30" : "border-red-500/20 bg-red-500/5 opacity-80")}>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3 items-center">
                        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-xl font-black border-2", driver.active ? "bg-primary/10 text-primary border-primary/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-lg leading-none">{driver.name}</h3>
                          <Badge className={cn("uppercase font-black text-[9px] mt-1.5", driver.active ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : "bg-red-500/10 text-red-600 hover:bg-red-500/20")}>
                            {driver.active ? "Activo" : "Suspendido"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mt-4 mb-4 border-l-2 border-primary/20 pl-3">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {driver.phone}</p>
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Car className="h-3.5 w-3.5" /> {driver.vehicle || "N/A"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                      <Button variant="outline" size="sm" className="font-bold text-xs rounded-xl" onClick={() => openMetricsModal(driver)}>
                        <Activity className="h-3.5 w-3.5 mr-1.5" /> Métricas
                      </Button>
                      <Button variant="secondary" size="sm" className="font-bold text-xs rounded-xl" onClick={() => openEditModal(driver)}>
                        <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Gestionar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 border-2 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Perfil de {selectedDriver?.name}
            </DialogTitle>
            <DialogDescription className="sr-only">Formulario para editar repartidor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-muted-foreground">Nombre</label><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11 rounded-xl font-bold" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-muted-foreground">Teléfono</label><Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-11 rounded-xl font-bold" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black uppercase text-muted-foreground">Vehículo</label><Input value={editVehicle} onChange={e => setEditVehicle(e.target.value)} className="h-11 rounded-xl font-bold" /></div>
            
            <div className="flex gap-2 pt-4">
              <Button variant={selectedDriver?.active ? "destructive" : "default"} className="flex-1 font-bold rounded-xl h-11" onClick={() => updateDriver.mutate({ id: selectedDriver.id, updates: { active: !selectedDriver.active }})}>
                {selectedDriver?.active ? <><Ban className="h-4 w-4 mr-2" /> Suspender</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Reactivar</>}
              </Button>
              <Button variant="flame" className="flex-1 font-black italic rounded-xl h-11" onClick={() => updateDriver.mutate({ id: selectedDriver.id, updates: { name: editName, phone: editPhone, vehicle: editVehicle }})}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE MÉTRICAS */}
      <Dialog open={isMetricsModalOpen} onOpenChange={setIsMetricsModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-[2rem] p-0 overflow-hidden border-2 border-border bg-card">
          <DialogHeader className="sr-only">
            <DialogTitle>Métricas de {selectedDriver?.name}</DialogTitle>
            <DialogDescription>Estadísticas del repartidor</DialogDescription>
          </DialogHeader>
          <div className="bg-primary p-6 text-white text-center">
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3 backdrop-blur-sm border-2 border-white/30">
              {selectedDriver?.name?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tight">{selectedDriver?.name}</h2>
            <p className="text-primary-foreground/80 text-xs font-bold mt-1 tracking-widest uppercase">Reporte de Rendimiento</p>
          </div>
          
          <div className="p-6 grid gap-4">
            {selectedDriver && (
              <>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border-2 border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><MapPin className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Viajes Realizados</p>
                      <p className="text-2xl font-black">{getDriverMetrics(selectedDriver.id).totalTrips}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-500/5 rounded-2xl border-2 border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-xl text-green-600"><TrendingUp className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-green-600/80">Volumen Entregado</p>
                      <p className="text-2xl font-black text-green-600">${getDriverMetrics(selectedDriver.id).moneyGenerated}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            <Button variant="outline" className="w-full font-bold mt-2" onClick={() => setIsMetricsModalOpen(false)}>Cerrar Reporte</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}