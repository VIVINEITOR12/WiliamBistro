import { useState, useEffect } from "react";
import { useCart as useCartHook } from "@/hooks/use-cart";
import { useCustomer } from "@/hooks/use-customer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag, Trash2, Plus, Minus, MapPin,
  CreditCard, Bike, Store, Clock, Navigation,
  Ticket, Map, CupSoda, X, Copy, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export function CartSheet() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, isOpen, setIsOpen, clearCart } = useCartHook();
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pagoRef, setPagoRef] = useState("");
  // Banco seleccionado por el cliente para su pago móvil
  const [clientBank, setClientBank] = useState("");

  const [deliveryType, setDeliveryType] = useState<"delivery" | "retiro">("delivery");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [addressRef, setAddressRef] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const [pickupTiming, setPickupTiming] = useState<"ahora" | "hora">("ahora");
  const [pickupTime, setPickupTime] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Estado para feedback visual al copiar
  const [copiedAll, setCopiedAll] = useState(false);

  // Auto-completar si está logueado
  useEffect(() => {
    if (customer) {
      setFullName(customer.name || "");
      setPhone(customer.phone || "");
    }
  }, [customer]);

  // Settings (banco, teléfono, rif del admin) — ahora usa las columnas pm_*
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // BCV en tiempo real
  const { data: bcvData } = useQuery({
    queryKey: ["bcv-rate"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-bcv-rate");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
    refetchInterval: 30000,
  });

  const { data: deliveryZones } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Cálculos
  const bcvRate = bcvData?.valor || 0;
  const selectedZone = deliveryZones?.find((z: any) => z.id === selectedZoneId);
  const deliveryFee = deliveryType === "delivery" && selectedZone ? Number(selectedZone.price_usd) : 0;

  let discountUsd = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discountUsd = totalPrice * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed_amount") {
      discountUsd = Number(appliedCoupon.discount_value);
    }
  }

  const finalTotalUsd = Math.max(0, totalPrice + deliveryFee - discountUsd);
  const finalTotalBs = finalTotalUsd * bcvRate;

  // Upsell bebidas
  const hasDrinks = items.some((item) =>
    ["refresco", "coca", "jugo", "bebida", "agua", "malte", "limonada"].some((k) =>
      item.name.toLowerCase().includes(k)
    )
  );

  // Datos pago móvil del negocio — usa las columnas pm_*
  const bancoCode = settings?.pm_banco || "0102";
  const bancoObj = BANCOS_VENEZUELA.find((b) => b.code === bancoCode);
  const bancoNombre = bancoObj ? `${bancoObj.code} - ${bancoObj.name}` : bancoCode;

  const pagoMovilData = {
    banco: bancoNombre,
    bancoCode: bancoCode,
    telefono: settings?.pm_telefono || "04268964164",
    rif: settings?.pm_rif || "V-12345678",
  };

  // Copia todos los datos del pago móvil en formato exacto:
  // 0134
  // J507865764
  // 04268964164
  // 2164.57
  const handleCopyAll = () => {
    const montoFormateado = finalTotalBs.toFixed(2);
    const text =
      `${pagoMovilData.bancoCode}\n` +
      `${pagoMovilData.rif}\n` +
      `${pagoMovilData.telefono}\n` +
      `${montoFormateado}`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("¡Datos de pago copiados!");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const resetFormState = () => {
    setStep("cart");
    if (!customer) { setFullName(""); setPhone(""); }
    setPagoRef("");
    setClientBank("");
    setDeliveryType("delivery");
    setSelectedZoneId("");
    setMapsLink("");
    setAddressRef("");
    setPickupTiming("ahora");
    setPickupTime("");
    setCouponCode("");
    setAppliedCoupon(null);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return toast.error("Ingresa un código");
    setIsApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) { toast.error("Cupón inválido o inactivo"); return; }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("Este cupón ha expirado"); return; }

      setAppliedCoupon(data);
      toast.success("¡Cupón aplicado con éxito!");
    } catch {
      toast.error("Error al validar cupón");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) { toast.error("Tu navegador no soporta geolocalización."); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapsLink(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`);
        setIsLocating(false);
        toast.success("¡Ubicación GPS capturada!");
      },
      () => { setIsLocating(false); toast.error("Activa el GPS y permite el acceso."); },
      { enableHighAccuracy: true }
    );
  };

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !pagoRef.trim()) {
      return toast.error("Completa los datos obligatorios");
    }
    if (!clientBank) {
      return toast.error("Selecciona el banco desde el que realizas el pago móvil");
    }
    if (deliveryType === "delivery") {
      if (!selectedZoneId) return toast.error("Selecciona tu zona de delivery.");
      // GPS ahora es OBLIGATORIO
      if (!mapsLink) return toast.error("La ubicación GPS es obligatoria para el delivery. Presiona 'Capturar Ubicación'.");
      if (!addressRef.trim()) return toast.error("Agrega una referencia de dirección.");
    }
    if (deliveryType === "retiro" && pickupTiming === "hora" && !pickupTime) {
      return toast.error("Indica a qué hora pasarás por tu pedido.");
    }

    let finalPickupTime: string | null = null;
    let retiroText = "";
    if (deliveryType === "retiro") {
      retiroText = pickupTiming === "ahora" ? "Retiro (Voy en camino 🏃)" : `Retiro (Pasaré a las ${pickupTime} ⏰)`;
      finalPickupTime = pickupTiming === "hora" ? pickupTime : "En camino";
    }

    const dbAddressRef = deliveryType === "delivery"
      ? `[Zona: ${selectedZone?.name}] ${addressRef.trim()}`
      : null;

    const orderPayload = {
      customer_id: customer?.id ?? null,
      customer_name: fullName.trim(),
      customer_phone: customer?.phone ?? phone.trim(),
      total_usd: finalTotalUsd,
      total_bs: finalTotalBs,
      bcv_rate: bcvRate,
      delivery_type: deliveryType,
      pickup_time: finalPickupTime,
      address_ref: dbAddressRef,
      maps_link: deliveryType === "delivery" ? (mapsLink || null) : null,
      pago_ref: pagoRef.trim(),
      items: JSON.parse(JSON.stringify(items)),
      status: "pendiente",
      coupon_code: appliedCoupon?.code ?? null,
      discount_usd: discountUsd,
    };

    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([orderPayload])
        .select("id")
        .single();

      if (error) {
        console.error("❌ Supabase INSERT error:", error);
        toast.error(`Error al guardar el pedido: ${error.message}`);
        return;
      }

      console.log("✅ Pedido guardado con ID:", data.id);
    } catch (err) {
      console.error("❌ Error inesperado:", err);
      toast.error("Error de conexión. Intenta de nuevo.");
      return;
    }

    const clientBancoObj = BANCOS_VENEZUELA.find((b) => b.code === clientBank);
    const clientBancoNombre = clientBancoObj ? `${clientBancoObj.code} - ${clientBancoObj.name}` : clientBank;

    const itemsSummary = items
      .map((item) => `• ${item.quantity}x ${item.name} (${item.variantLabel}) — $${(item.price * item.quantity).toFixed(2)}`)
      .join("\n");

    const text =
      `¡Hola Papa&Son! 🍔 Mi pedido:\n\n*🛒 DETALLE:*\n${itemsSummary}\n---\n` +
      `*Subtotal:* $${totalPrice.toFixed(2)}\n` +
      (deliveryFee > 0 ? `*Delivery (${selectedZone?.name}):* +$${deliveryFee.toFixed(2)}\n` : "") +
      (discountUsd > 0 ? `*Descuento (${appliedCoupon?.code}):* -$${discountUsd.toFixed(2)}\n` : "") +
      `\n*TOTAL A PAGAR:* $${finalTotalUsd.toFixed(2)}\n` +
      (bcvRate > 0 ? `*Total en Bs (Tasa ${bcvRate}):* ${finalTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs.\n` : "") +
      `\n*🚚 ENTREGA:* ${deliveryType === "delivery" ? `Delivery — Zona: ${selectedZone?.name}` : retiroText}\n` +
      (deliveryType === "delivery" ? `*📍 GPS:* ${mapsLink}\n*🏠 Ref:* ${dbAddressRef}` : "") +
      `\n\n*💳 PAGO MÓVIL:*\n• Banco: ${clientBancoNombre}\n• Referencia: ${pagoRef}\n\n*👤 CLIENTE:* ${fullName} (${phone})`;

    window.open(`https://wa.me/584268964164?text=${encodeURIComponent(text)}`, "_blank");
    clearCart();
    setIsOpen(false);
    setTimeout(() => { resetFormState(); }, 300);
    toast.success("¡Pedido enviado con éxito! 🎉");
  };

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      {!isOpen && totalItems > 0 && (
        <button
          onClick={() => { setStep("cart"); setIsOpen(true); }}
          className="fixed bottom-[95px] right-4 z-50 flex h-14 w-14 items-center justify-center bg-gradient-flame text-white rounded-full shadow-glow animate-in fade-in zoom-in duration-300 md:bottom-8 md:right-8 cursor-pointer active:scale-95"
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-black border-2 border-white">
            {totalItems}
          </span>
        </button>
      )}

      <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setTimeout(() => setStep("cart"), 300); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 bg-background z-[100] border-l-2">
          {/* HEADER */}
          <SheetHeader className="p-5 border-b bg-card/50 shrink-0">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-black italic uppercase tracking-tighter">
                {step === "cart"
                  ? <><ShoppingBag className="h-5 w-5 text-primary" /> Tu Carrito</>
                  : <><CreditCard className="h-5 w-5 text-primary" /> Pago y Envío</>
                }
              </span>
              <div className="flex items-center gap-1">
                {step === "cart" && items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8"
                    onClick={() => { clearCart(); toast.success("Carrito limpiado"); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpiar
                  </Button>
                )}
                {step === "checkout" && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("cart")} className="text-xs h-8">
                    ← Volver
                  </Button>
                )}
              </div>
            </SheetTitle>
            <SheetDescription className="hidden">Panel del carrito de compras</SheetDescription>
          </SheetHeader>

          {/* CONTENIDO */}
          <div className="flex-1 overflow-y-auto p-5">
            {step === "cart" ? (
              items.length === 0 ? (
                <div className="text-center py-20 opacity-50 font-bold italic uppercase tracking-widest text-xs">
                  El carrito está vacío
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* LISTA DE ITEMS */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantLabel}`}
                        className="p-4 flex items-center gap-3 border-2 rounded-2xl bg-card relative group"
                      >
                        <button
                          onClick={() => removeItem(item.productId, item.variantLabel)}
                          className="absolute -top-2 -right-2 bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="h-14 w-14 bg-muted rounded-xl overflow-hidden shrink-0">
                          {item.image_url
                            ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-lg">🍔</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm uppercase italic line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-bold">{item.variantLabel}</p>
                          <p className="text-xs font-black text-primary mt-0.5">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background border-2 rounded-xl p-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.variantLabel, -1)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary hover:bg-destructive hover:text-white transition-colors cursor-pointer active:scale-90"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.variantLabel, 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-white cursor-pointer active:scale-90"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* UPSELL BEBIDAS — navega a /menu con search cat=bebidas */}
                  {!hasDrinks && (
                    <div className="bg-blue-500/5 border-2 border-blue-500/20 p-4 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2.5 rounded-xl shrink-0">
                          <CupSoda className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-700 uppercase">¿Y de tomar?</p>
                          <p className="text-[10px] text-blue-600/80 font-bold">Acompaña tu pedido</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-bold border-blue-500/30 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl shrink-0"
                        onClick={() => {
                          setIsOpen(false);
                          // Navega al menú y fuerza la tab de bebidas
                          navigate({ to: "/menu", search: { cat: "bebidas" } });
                        }}
                      >
                        Ver bebidas
                      </Button>
                    </div>
                  )}

                  {/* SECCIÓN DE CUPÓN */}
                  <div className="border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" /> ¿Tienes un cupón?
                    </p>
                    <div className="flex gap-2">
                      <input
                        placeholder="Ingresa tu código"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={!!appliedCoupon}
                        className="h-11 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary disabled:opacity-50"
                      />
                      {!appliedCoupon ? (
                        <Button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode} className="h-11 font-bold shrink-0">
                          Aplicar
                        </Button>
                      ) : (
                        <Button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} variant="destructive" className="h-11 font-bold shrink-0">
                          Quitar
                        </Button>
                      )}
                    </div>
                    {appliedCoupon && (
                      <p className="text-xs font-bold text-green-600 mt-2">
                        ✓ Descuento de {appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `$${appliedCoupon.discount_value}`}
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              /* CHECKOUT */
              <form id="checkout-form" onSubmit={handleSendOrder} className="space-y-5">
                {/* TIPO ENTREGA */}
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant={deliveryType === "delivery" ? "default" : "outline"} onClick={() => setDeliveryType("delivery")} className="h-12 gap-2 font-bold">
                    <Bike className="h-5 w-5" /> Delivery
                  </Button>
                  <Button type="button" variant={deliveryType === "retiro" ? "default" : "outline"} onClick={() => setDeliveryType("retiro")} className="h-12 gap-2 font-bold">
                    <Store className="h-5 w-5" /> Retiro
                  </Button>
                </div>

                {/* OPCIONES RETIRO */}
                {deliveryType === "retiro" && (
                  <div className="space-y-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">¿Cuándo pasas por tu pedido?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={pickupTiming === "ahora" ? "default" : "outline"} onClick={() => setPickupTiming("ahora")} className={cn("h-10 text-xs font-bold gap-2", pickupTiming === "ahora" && "bg-primary text-white")}>
                        <Navigation className="h-3.5 w-3.5" /> Voy en camino
                      </Button>
                      <Button type="button" variant={pickupTiming === "hora" ? "default" : "outline"} onClick={() => setPickupTiming("hora")} className={cn("h-10 text-xs font-bold gap-2", pickupTiming === "hora" && "bg-primary text-white")}>
                        <Clock className="h-3.5 w-3.5" /> Hora específica
                      </Button>
                    </div>
                    {pickupTiming === "hora" && (
                      <input type="time" required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="h-11 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary" />
                    )}
                  </div>
                )}

                {/* DATOS CLIENTE */}
                <div className="space-y-3">
                  <input placeholder="Nombre Completo" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary" />
                  <input placeholder="Teléfono WhatsApp" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary" />
                </div>

                {/* DATOS DELIVERY — zona SIN precio, GPS obligatorio */}
                {deliveryType === "delivery" && (
                  <div className="space-y-3 p-4 bg-orange-500/5 border-2 border-orange-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-1.5">
                      <Map className="h-3.5 w-3.5" /> Tu Ubicación
                    </p>

                    {/* Selector de zona — solo muestra el nombre, sin precio */}
                    <select
                      required
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary"
                    >
                      <option value="">Selecciona tu zona de Delivery...</option>
                      {deliveryZones?.map((zone: any) => (
                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                      ))}
                    </select>

                    {/* GPS — OBLIGATORIO: botón con borde rojo si no se ha capturado */}
                    <Button
                      type="button"
                      onClick={handleCaptureLocation}
                      disabled={isLocating}
                      variant="outline"
                      className={cn(
                        "w-full h-12 rounded-xl gap-2 text-xs font-black border-2 transition-all",
                        mapsLink
                          ? "border-green-500 bg-green-50 text-green-600"
                          : "border-red-400 text-red-500 hover:bg-red-50"
                      )}
                    >
                      <MapPin className={cn("h-4 w-4", isLocating && "animate-bounce")} />
                      {isLocating
                        ? "Obteniendo ubicación..."
                        : mapsLink
                          ? "✓ Ubicación GPS Lista"
                          : "⚠️ Capturar Ubicación GPS (Obligatorio)"
                      }
                    </Button>
                    {!mapsLink && (
                      <p className="text-[10px] text-red-500 font-bold text-center -mt-1">
                        Sin ubicación GPS no podemos encontrarte.
                      </p>
                    )}

                    <textarea
                      placeholder="Referencia exacta de la dirección (Casa, color, esquina, etc)"
                      required
                      value={addressRef}
                      onChange={(e) => setAddressRef(e.target.value)}
                      className="w-full rounded-xl border-2 border-border bg-background p-4 text-sm font-bold outline-none focus:border-primary"
                      rows={2}
                    />
                  </div>
                )}

                {/* DATOS PAGO MÓVIL — un solo botón copia todo */}
                <div className="p-4 bg-secondary/50 rounded-2xl space-y-3 border-2 border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Datos Pago Móvil</p>
                    {/* BOTÓN COPIAR TODO */}
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                        copiedAll
                          ? "bg-green-500/10 border-green-500/40 text-green-600"
                          : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                      )}
                    >
                      {copiedAll
                        ? <><Check className="h-3.5 w-3.5" /> ¡Copiado!</>
                        : <><Copy className="h-3.5 w-3.5" /> Copiar datos</>
                      }
                    </button>
                  </div>

                  {/* Datos legibles — solo visualización */}
                  <div className="rounded-xl border-2 border-border bg-background px-4 py-3 space-y-1.5 font-mono text-sm">
                    <p><span className="text-[9px] font-black uppercase text-muted-foreground not-italic">Banco: </span><span className="font-black">{pagoMovilData.banco}</span></p>
                    <p><span className="text-[9px] font-black uppercase text-muted-foreground not-italic">RIF/Cédula: </span><span className="font-black">{pagoMovilData.rif}</span></p>
                    <p><span className="text-[9px] font-black uppercase text-muted-foreground not-italic">Tlf: </span><span className="font-black">{pagoMovilData.telefono}</span></p>
                    <p><span className="text-[9px] font-black uppercase text-muted-foreground not-italic">Monto: </span><span className="font-black text-primary">Bs. {finalTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span></p>
                  </div>

                  {/* Banco del cliente para el pago */}
                  <div className="pt-1 border-t border-border space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tu banco (desde dónde pagas)</p>
                    <select
                      required
                      value={clientBank}
                      onChange={(e) => setClientBank(e.target.value)}
                      className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-bold outline-none focus:border-primary"
                    >
                      <option value="">Selecciona tu banco...</option>
                      {BANCOS_VENEZUELA.map((b) => (
                        <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Referencia de pago */}
                  <input
                    placeholder="Número de Referencia del Pago"
                    required
                    value={pagoRef}
                    onChange={(e) => setPagoRef(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-border bg-background px-4 text-sm font-mono font-bold outline-none focus:border-primary"
                  />
                </div>
              </form>
            )}
          </div>

          {/* FOOTER — TOTALES + BOTÓN */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border bg-card/80 backdrop-blur-md space-y-4 shrink-0">
              {/* DESGLOSE */}
              <div className="flex flex-col gap-1 text-sm font-bold text-muted-foreground border-b-2 border-border pb-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                {deliveryType === "delivery" && selectedZone && (
                  <div className="flex justify-between text-foreground">
                    <span>Delivery ({selectedZone.name}):</span>
                    <span>+${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento ({appliedCoupon.code}):</span>
                    <span>-${discountUsd.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div className="space-y-1">
                <div className="flex justify-between items-center w-full">
                  <span className="font-black text-2xl italic uppercase">Total:</span>
                  <div className="flex items-center gap-2">
                    {bcvRate > 0 && (
                      <span className="text-[10px] font-black text-muted-foreground bg-secondary px-2 py-1 rounded-md uppercase tracking-tighter">
                        Tasa {bcvRate}
                      </span>
                    )}
                    <span className="font-black text-2xl italic text-primary">
                      ${finalTotalUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
                {bcvRate > 0 && (
                  <p className="text-right text-xs font-bold text-muted-foreground">
                    Bs. {finalTotalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* BOTÓN ACCIÓN */}
              <Button
                type={step === "cart" ? "button" : "submit"}
                form={step === "cart" ? undefined : "checkout-form"}
                variant="flame"
                size="xl"
                className="w-full font-black h-14 rounded-2xl shadow-glow uppercase italic tracking-tighter"
                onClick={() => step === "cart" && setStep("checkout")}
              >
                {step === "cart" ? "Continuar al Pago →" : "Confirmar en WhatsApp 💬"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}