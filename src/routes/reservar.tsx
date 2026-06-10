import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { CalendarDays, CheckCircle2, User, Phone, MessageSquare, Clock, Users, Sparkles, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomer } from "@/hooks/use-customer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar — Papa&Son" },
      { name: "description", content: "Reserva tu mesa, área VIP o entrada a eventos con música en vivo." },
    ],
  }),
  component: ReservarPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "El nombre es muy corto").max(100),
  phone: z.string().trim().min(7, "Ingresa un número de teléfono válido").max(20),
  reservation_date: z.string().min(1, "Selecciona una fecha"),
  reservation_time: z.string().min(1, "Selecciona una hora"),
  party_size: z.coerce.number().int().min(1).max(50),
  zone: z.enum(["mesa", "vip", "evento"]),
  notes: z.string().max(500).optional(),
});

const zones = [
  { value: "mesa", label: "Mesa", emoji: "🍽️", desc: "Salón principal, ideal para familias." },
  { value: "vip", label: "Área VIP", emoji: "✨", desc: "Espacio privado y climatizado." },
  { value: "evento", label: "Eventos", emoji: "🎤", desc: "Cerca de la tarima y música en vivo." },
] as const;

function ReservarPage() {
  const { customer } = useCustomer();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    reservation_date: "",
    reservation_time: "",
    party_size: 2,
    zone: "mesa" as "mesa" | "vip" | "evento",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-completar si el usuario está logueado
  useEffect(() => {
    if (customer) {
      setForm((prev) => ({
        ...prev,
        full_name: customer.name || prev.full_name,
        phone: customer.phone || prev.phone,
      }));
    }
  }, [customer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(`${form.reservation_date}T${form.reservation_time}`);
    if (selectedDate < new Date()) {
      toast.error("No puedes reservar en una fecha u hora pasada.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("reservations").insert({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        reservation_date: parsed.data.reservation_date,
        reservation_time: parsed.data.reservation_time,
        party_size: parsed.data.party_size,
        zone: parsed.data.zone,
        notes: parsed.data.notes || null,
        status: "pendiente",
      });

      if (error) throw error;

      setLoading(false);
      setDone(true);

      const zoneLabel = zones.find((z) => z.value === form.zone)?.label ?? form.zone;
      const text = `¡Hola Papa&Son! 📅 Quisiera confirmar una reservación:\n\n*A nombre de:* ${form.full_name}\n*Teléfono:* ${form.phone}\n*Zona:* ${zoneLabel}\n*Fecha:* ${form.reservation_date}\n*Hora:* ${form.reservation_time}\n*Personas:* ${form.party_size}\n${form.notes ? `*Notas:* ${form.notes}` : ""}\n\n¿Me confirman disponibilidad por favor?`;
      
      // Abre WhatsApp
      window.open(`https://wa.me/584268964164?text=${encodeURIComponent(text)}`, "_blank");
      toast.success("¡Reserva pre-registrada!");
    } catch (err) {
      toast.error("Ocurrió un error al procesar tu reserva.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 md:pt-20 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 border-4 border-green-500/20 mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">¡Reserva Pre-registrada!</h1>
        <p className="mt-3 text-muted-foreground font-medium">
          Tus datos ya están en nuestro sistema. Hemos abierto WhatsApp para que nuestro equipo te confirme la mesa al instante.
        </p>
        
        <div className="mt-8 rounded-2xl bg-muted/30 border-2 border-border p-5 w-full text-left space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2 mb-3">Resumen de solicitud</p>
          <p className="flex justify-between items-center text-sm"><span className="text-muted-foreground">A nombre de:</span> <span className="font-bold">{form.full_name}</span></p>
          <p className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Personas:</span> <span className="font-bold">{form.party_size}</span></p>
          <p className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Fecha y Hora:</span> <span className="font-bold">{form.reservation_date} - {form.reservation_time}</span></p>
        </div>

        <Button variant="outline" size="xl" className="mt-8 w-full h-14 rounded-2xl font-black uppercase italic" onClick={() => setDone(false)}>
          Hacer otra reserva
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in duration-500">
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* COLUMNA IZQUIERDA: INFORMACIÓN */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 h-fit">
          <header className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Reservaciones Premium
            </span>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic leading-[1.1]">
              Asegura tu <br className="hidden lg:block"/> <span className="text-primary">lugar ideal</span>
            </h1>
            <p className="mt-4 text-muted-foreground font-medium text-sm md:text-base">
              Ya sea para una cena familiar, una celebración en nuestra área VIP o disfrutar de música en vivo. Prepara tu visita a Papa&Son.
            </p>
          </header>

          <div className="hidden lg:flex flex-col gap-4 mt-8">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border-2 border-border shadow-sm">
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><Clock className="h-5 w-5" /></div>
              <div>
                <p className="font-black text-sm uppercase">Confirmación Rápida</p>
                <p className="text-xs text-muted-foreground mt-1">Nuestro equipo validará tu mesa vía WhatsApp en minutos.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border-2 border-border shadow-sm">
              <div className="p-2 bg-primary/10 rounded-xl text-primary"><MapPin className="h-5 w-5" /></div>
              <div>
                <p className="font-black text-sm uppercase">Ubicación</p>
                <p className="text-xs text-muted-foreground mt-1">Av. Principal de Juanico, Maturín. Contamos con estacionamiento seguro.</p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div className="lg:col-span-7">
          <form onSubmit={submit} className="rounded-[2rem] border-2 border-border bg-card p-6 sm:p-8 shadow-sm">
            
            {/* Zonas */}
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-3">
                1. ¿Dónde te gustaría sentarte?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {zones.map((z) => (
                  <button
                    type="button"
                    key={z.value}
                    onClick={() => setForm({ ...form, zone: z.value })}
                    className={cn(
                      "flex flex-col items-start sm:items-center rounded-2xl border-2 p-4 text-left sm:text-center transition-all cursor-pointer",
                      form.zone === z.value
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/30",
                    )}
                  >
                    <span className="text-2xl mb-2">{z.emoji}</span>
                    <span className="text-sm font-black text-foreground uppercase">{z.label}</span>
                    <span className="mt-1 text-[10px] font-bold text-muted-foreground">{z.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                2. Detalles de la Reserva
              </label>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Fecha</label>
                  <Input type="date" required value={form.reservation_date} onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} className="h-12 rounded-xl border-2 font-medium bg-background [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Hora</label>
                  <Input type="time" required value={form.reservation_time} onChange={(e) => setForm({ ...form, reservation_time: e.target.value })} className="h-12 rounded-xl border-2 font-medium bg-background [color-scheme:dark]" />
                </div>
              </div>

              {/* Personas */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3"/> Acompañantes</label>
                <div className="flex items-center gap-3 rounded-xl border-2 border-border bg-background p-1.5 w-full sm:max-w-xs">
                  <button type="button" onClick={() => setForm({ ...form, party_size: Math.max(1, form.party_size - 1) })} className="flex h-10 w-12 items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-xl font-bold cursor-pointer transition-colors">−</button>
                  <span className="flex-1 text-center text-sm font-black uppercase tracking-wider">{form.party_size} {form.party_size === 1 ? "Persona" : "Personas"}</span>
                  <button type="button" onClick={() => setForm({ ...form, party_size: Math.min(50, form.party_size + 1) })} className="flex h-10 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl font-bold cursor-pointer transition-colors">+</button>
                </div>
              </div>

              <div className="border-t-2 border-border/50 pt-5 mt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-4">
                  3. Tus Datos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> Nombre Completo</label>
                    <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ej. María Cañas" className="h-12 rounded-xl border-2 font-medium bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3"/> WhatsApp</label>
                    <Input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Ej. 0414-1234567" className="h-12 rounded-xl border-2 font-medium bg-background" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3"/> Peticiones especiales (Opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Alergias, silla para bebé, decoración de cumpleaños..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-border bg-background p-3 text-sm font-medium outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <Button type="submit" variant="flame" size="xl" className="w-full mt-8 h-14 rounded-2xl font-black uppercase italic tracking-tighter text-base" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Solicitar Reserva por WhatsApp"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}