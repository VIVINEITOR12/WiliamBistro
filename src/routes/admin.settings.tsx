import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Settings, Image as ImageIcon, Save, Loader2, Link as LinkIcon, Sparkles, Map, Ticket, Shield, Lock, KeyRound, EyeOff, Eye, CreditCard, Phone, Hash
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryZonesManager } from "@/components/admin/DeliveryZonesManager";
import { CouponsManager } from "@/components/admin/CouponsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

// Todos los bancos de Venezuela
const BANCOS_VENEZUELA = [
  { code: "0102", name: "Banco de Venezuela" },
  { code: "0104", name: "Banco Venezolano de Crédito" },
  { code: "0105", name: "Banco Mercantil" },
  { code: "0108", name: "BBVA Provincial" },
  { code: "0114", name: "Bancaribe" },
  { code: "0115", name: "Banco Exterior" },
  { code: "0128", name: "Banco Caroní" },
  { code: "0134", name: "Banesco" },
  { code: "0137", name: "Banco Sofitasa" },
  { code: "0138", name: "Banco Plaza" },
  { code: "0146", name: "Bangente" },
  { code: "0151", name: "Banco Fondo Común (BFC)" },
  { code: "0156", name: "100% Banco" },
  { code: "0157", name: "DelSur Banco Universal" },
  { code: "0163", name: "Banco del Tesoro" },
  { code: "0166", name: "Banco Agrícola de Venezuela" },
  { code: "0168", name: "Bancrecer" },
  { code: "0169", name: "R4 Banco Microfinanciero" },
  { code: "0171", name: "Banco Activo" },
  { code: "0172", name: "Bancamiga" },
  { code: "0173", name: "Banco Internacional de Desarrollo" },
  { code: "0174", name: "Banplus" },
  { code: "0175", name: "Banco Digital de los Trabajadores" },
  { code: "0177", name: "BANFANB" },
  { code: "0178", name: "N58 Banco Digital" },
  { code: "0191", name: "BNC (Banco Nacional de Crédito)" },
];

function AdminSettingsPage() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados para General
  const [heroUrlInput, setHeroUrlInput] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Estados para Pago Móvil
  const [pmBanco, setPmBanco] = useState<string>("0102");
  const [pmTelefono, setPmTelefono] = useState<string>("");
  const [pmRif, setPmRif] = useState<string>("");

  // Estados para Seguridad
  const [pinInput, setPinInput] = useState<string>("");
  const [showPin, setShowPin] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && (!session || !isAdmin)) {
      navigate({ to: "/admin/login", replace: true });
    }
  }, [session, isAdmin, authLoading, navigate]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-store-settings"],
    enabled: !!session && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      if (settings.hero_image_url) setHeroUrlInput(settings.hero_image_url);
      if (settings.admin_pin) setPinInput(settings.admin_pin);
      if (settings.admin_password) setPasswordInput(settings.admin_password);
      // Pago Móvil — columnas pm_*
      if (settings.pm_banco) setPmBanco(settings.pm_banco);
      if (settings.pm_telefono) setPmTelefono(settings.pm_telefono);
      if (settings.pm_rif) setPmRif(settings.pm_rif);
    }
  }, [settings]);

  // Mutación: General (Imagen)
  const saveSettingsMutation = useMutation({
    mutationFn: async (newUrl: string) => {
      if (settings?.id) {
        const { error } = await supabase.from("store_settings").update({ hero_image_url: newUrl, updated_at: new Date().toISOString() }).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert([{ hero_image_url: newUrl }]);
        if (error) throw error;
      }
      return newUrl;
    },
    onSuccess: () => {
      toast.success("¡Imagen principal actualizada con éxito!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: (err: any) => toast.error(`Error al guardar: ${err.message}`),
  });

  // Mutación: Pago Móvil
  const savePagoMovilMutation = useMutation({
    mutationFn: async ({ banco, telefono, rif }: { banco: string; telefono: string; rif: string }) => {
      if (!settings?.id) throw new Error("No hay configuración inicial en la base de datos.");
      const { error } = await supabase
        .from("store_settings")
        .update({
          pm_banco: banco,
          pm_telefono: telefono,
          pm_rif: rif,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Datos de Pago Móvil actualizados!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });

  // Mutación: Seguridad (PIN y Contraseña)
  const saveSecurityMutation = useMutation({
    mutationFn: async ({ pin, password }: { pin: string, password: string }) => {
      if (!settings?.id) throw new Error("Aún no hay configuración inicial creada en la base de datos.");
      const { error } = await supabase
        .from("store_settings")
        .update({
          admin_pin: pin,
          admin_password: password,
          updated_at: new Date().toISOString()
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Credenciales de seguridad actualizadas con éxito!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-settings"] });
    },
    onError: (err: any) => toast.error(`Error de seguridad: ${err.message}`),
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(filePath);
      setHeroUrlInput(publicUrlData.publicUrl);
      toast.success("Imagen subida a Storage. Presiona 'Guardar Cambios' para aplicar.");
    } catch (error: any) {
      toast.error(`Error subiendo archivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate(heroUrlInput.trim());
  };

  const handlePagoMovilSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmBanco) return toast.error("Selecciona un banco.");
    if (!pmTelefono.trim()) return toast.error("El teléfono es obligatorio.");
    if (!pmRif.trim()) return toast.error("El RIF/Cédula es obligatorio.");
    savePagoMovilMutation.mutate({ banco: pmBanco, telefono: pmTelefono.trim(), rif: pmRif.trim() });
  };

  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 4) return toast.error("El PIN debe tener exactamente 4 dígitos.");
    if (passwordInput.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
    saveSecurityMutation.mutate({ pin: pinInput, password: passwordInput });
  };

  // Banco seleccionado para la vista previa
  const bancoSeleccionado = BANCOS_VENEZUELA.find((b) => b.code === pmBanco);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <Settings className="h-8 w-8 text-primary" />
          Centro de Control
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona el aspecto visual, logística, promociones y seguridad de Papa&Son.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        {/* NAVEGACIÓN DE TABS */}
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-2xl border-2 border-border mb-6 flex-wrap gap-1">
          <TabsTrigger value="general" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Sparkles className="h-4 w-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="pagomovil" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-green-600 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-2" /> Pago Móvil
          </TabsTrigger>
          <TabsTrigger value="logistica" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Map className="h-4 w-4 mr-2" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="cupones" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Ticket className="h-4 w-4 mr-2" /> Cupones
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="rounded-xl font-bold py-2 px-4 data-[state=active]:bg-red-500 data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" /> Seguridad
          </TabsTrigger>
        </TabsList>

        {/* TAB: GENERAL (Imagen) */}
        <TabsContent value="general">
          <div className="rounded-[2rem] border-2 border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black uppercase tracking-tight italic">Imagen Principal (Inicio)</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6 font-medium">
              Esta imagen es lo primero que ven tus clientes al entrar a la web. Puedes pegar un enlace directo o subir un archivo desde tu dispositivo.
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleGeneralSubmit} className="space-y-6">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
                        Subir nueva imagen
                      </label>
                      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading || saveSettingsMutation.isPending} className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer file:transition-colors cursor-pointer" />
                      {isUploading && (
                        <span className="text-[10px] text-primary font-bold flex items-center gap-1 mt-1.5 animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" /> Subiendo y optimizando...
                        </span>
                      )}
                    </div>
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-border"></div>
                      <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-muted-foreground">O URL Directa</span>
                      <div className="flex-grow border-t border-border"></div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
                        Enlace de la imagen (URL)
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input type="url" placeholder="https://ejemplo.com/imagen.jpg" value={heroUrlInput} onChange={(e) => setHeroUrlInput(e.target.value)} className="h-11 w-full rounded-xl border-2 border-border bg-background pl-9 pr-3 text-xs font-medium outline-none focus:border-primary" />
                      </div>
                    </div>
                    <Button type="submit" variant="flame" size="lg" disabled={saveSettingsMutation.isPending || isUploading} className="w-full h-12 rounded-xl font-black uppercase italic tracking-tighter text-sm shadow-glow mt-2">
                      {saveSettingsMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
                    </Button>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
                      Vista Previa Actual
                    </label>
                    <div className="relative aspect-[4/5] w-full max-w-xs mx-auto overflow-hidden rounded-2xl border-2 border-border bg-muted flex items-center justify-center">
                      {heroUrlInput ? (
                        <img src={heroUrlInput} alt="Vista previa de inicio" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-4">
                          <ImageIcon className="h-8 w-8 opacity-40" />
                          <span className="text-[11px] font-bold">No hay imagen configurada.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </TabsContent>

        {/* TAB: PAGO MÓVIL */}
        <TabsContent value="pagomovil">
          <div className="rounded-[2rem] border-2 border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-black uppercase tracking-tight italic">Datos de Pago Móvil</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6 font-medium">
              Estos datos aparecen en el carrito de compras para que tus clientes puedan realizar el pago móvil. Cada campo tiene un botón para copiar.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2">
                {/* FORMULARIO */}
                <form onSubmit={handlePagoMovilSubmit} className="space-y-5">

                  {/* Banco */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Banco Receptor
                    </label>
                    <select
                      value={pmBanco}
                      onChange={(e) => setPmBanco(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-green-500 cursor-pointer"
                    >
                      <option value="">Selecciona el banco...</option>
                      {BANCOS_VENEZUELA.map((b) => (
                        <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Teléfono Pago Móvil
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej: 04268964164"
                      value={pmTelefono}
                      onChange={(e) => setPmTelefono(e.target.value.replace(/\D/g, ""))}
                      maxLength={11}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-green-500"
                    />
                  </div>

                  {/* RIF */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" /> RIF / Cédula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: V-12345678"
                      value={pmRif}
                      onChange={(e) => setPmRif(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-green-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={savePagoMovilMutation.isPending}
                    className="w-full h-12 rounded-xl font-black uppercase italic tracking-tighter text-sm bg-green-600 hover:bg-green-700 text-white"
                  >
                    {savePagoMovilMutation.isPending
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <><Save className="mr-2 h-4 w-4" /> Guardar Datos de Pago</>
                    }
                  </Button>
                </form>

                {/* VISTA PREVIA — como lo ve el cliente */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-3">
                    Así lo verán tus clientes
                  </label>
                  <div className="bg-secondary/50 border-2 border-border rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Datos Pago Móvil
                    </p>

                    {/* Banco */}
                    <div className="flex items-center justify-between rounded-xl border-2 border-border bg-background px-4 py-2.5">
                      <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Banco</p>
                        <p className="text-sm font-black">
                          {bancoSeleccionado ? `${bancoSeleccionado.code} - ${bancoSeleccionado.name}` : "—"}
                        </p>
                      </div>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-center justify-between rounded-xl border-2 border-border bg-background px-4 py-2.5">
                      <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Teléfono</p>
                        <p className="text-sm font-black">{pmTelefono || "—"}</p>
                      </div>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* RIF */}
                    <div className="flex items-center justify-between rounded-xl border-2 border-border bg-background px-4 py-2.5">
                      <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground">RIF / Cédula</p>
                        <p className="text-sm font-black">{pmRif || "—"}</p>
                      </div>
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <p className="text-[10px] text-muted-foreground font-bold text-center pt-1">
                      Cada campo tendrá un botón de copiar para el cliente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: SEGURIDAD */}
        <TabsContent value="seguridad">
          <div className="rounded-[2rem] border-2 border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-black uppercase tracking-tight italic">Seguridad y Accesos</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6 font-medium">
              Gestiona el PIN de autorización para retroceder pedidos y la contraseña principal del panel de administración.
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSecuritySubmit} className="space-y-6 max-w-2xl">
                {/* Bloque PIN */}
                <div className="bg-red-500/5 border-2 border-red-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-500" />
                    <h3 className="font-black text-sm uppercase tracking-widest">PIN de Autorización</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Este código de 4 dígitos es requerido en el Gestor de Pedidos para deshacer acciones críticas (ej: devolver un pedido a "Pendiente").</p>
                  <div className="flex gap-2">
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={4}
                      placeholder="Ej: 1234"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className="h-12 w-32 rounded-xl border-2 border-border bg-background px-4 text-center text-xl font-black tracking-[0.5em] outline-none focus:border-red-500 transition-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-12 rounded-xl border-2 border-border bg-background"
                      onClick={() => {
                        if (showPin) {
                          setShowPin(false);
                        } else {
                          setShowUnlockModal(true);
                        }
                      }}
                    >
                      {showPin ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                {/* Bloque Password */}
                <div className="bg-secondary/30 border-2 border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-foreground" />
                    <h3 className="font-black text-sm uppercase tracking-widest">Contraseña del Panel</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">La contraseña principal que utilizas para iniciar sesión en `/admin/login`.</p>
                  <div className="relative max-w-sm">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nueva contraseña"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background pl-4 pr-12 text-sm font-bold outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="destructive" size="lg" disabled={saveSecurityMutation.isPending} className="h-12 rounded-xl font-black uppercase italic tracking-tighter text-sm px-8">
                    {saveSecurityMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Shield className="mr-2 h-4 w-4" /> Actualizar Seguridad</>}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </TabsContent>

        {/* OTROS TABS */}
        <TabsContent value="logistica">
          <DeliveryZonesManager />
        </TabsContent>

        <TabsContent value="cupones">
          <CouponsManager />
        </TabsContent>

        {/* MODAL DE SEGURIDAD PARA VER EL PIN */}
        <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
          <DialogContent className="sm:max-w-xs rounded-[2rem] p-6 text-center border-2 border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-black italic uppercase text-red-500 flex justify-center gap-2 items-center">
                <Shield className="h-5 w-5" /> Seguridad
              </DialogTitle>
              <DialogDescription className="font-medium mt-2">
                Ingresa tu contraseña de administrador para ver o editar el PIN.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <input
                type="password"
                placeholder="Tu contraseña principal"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-center text-sm font-bold outline-none focus:border-red-500"
              />
              <Button
                className="w-full h-12 uppercase font-black italic rounded-xl bg-red-500 hover:bg-red-600 text-white"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithPassword({
                    email: session?.user?.email || "",
                    password: unlockPassword
                  });
                  if (error) {
                    toast.error("Contraseña incorrecta");
                  } else {
                    setShowPin(true);
                    setShowUnlockModal(false);
                    setUnlockPassword("");
                    toast.success("PIN desbloqueado");
                  }
                }}
              >
                Desbloquear PIN
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
}