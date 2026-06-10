import { useRegisterSW } from "virtual:pwa-register/react";
import { useState, useEffect } from "react";
import { RefreshCw, X, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function PWAUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Verifica actualizaciones cada 60 segundos en segundo plano
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh && !dismissed) {
      // Pequeño delay para no interrumpir la carga inicial
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [needRefresh, dismissed]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    // Animación de salida antes de recargar
    await new Promise((r) => setTimeout(r, 600));
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!needRefresh || dismissed) return null;

  return (
    <>
      {/* Overlay sutil de fondo */}
      <div
        className={cn(
          "fixed inset-0 z-[200] pointer-events-none transition-all duration-500",
          visible ? "bg-black/20 backdrop-blur-[1px]" : "bg-transparent"
        )}
      />

      {/* Banner principal */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[201] transition-all duration-500 ease-out",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        {/* Card del banner */}
        <div className="mx-3 mb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:mx-auto md:max-w-md md:mb-8 md:mr-8 md:ml-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">

            {/* Fondo con gradiente animado */}
            <div className="absolute inset-0 bg-[#1a1410]" />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-amber-600/10" />

            {/* Línea superior decorativa animada */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-pulse" />

            {/* Partículas decorativas */}
            <div className="absolute top-3 right-12 w-1 h-1 rounded-full bg-orange-400/60 animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="absolute top-6 right-20 w-1 h-1 rounded-full bg-amber-400/40 animate-ping" style={{ animationDelay: "0.9s" }} />
            <div className="absolute bottom-4 left-8 w-1 h-1 rounded-full bg-orange-300/50 animate-ping" style={{ animationDelay: "1.5s" }} />

            {/* Contenido */}
            <div className="relative flex items-center gap-4 p-4">

              {/* Ícono izquierdo */}
              <div className="shrink-0">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
                  <Sparkles className={cn("h-5 w-5 text-white", isUpdating && "hidden")} />
                  <RefreshCw className={cn("h-5 w-5 text-white hidden", isUpdating && "block animate-spin")} />
                  {/* Brillo del ícono */}
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-orange-400">
                    Nueva versión
                  </p>
                  <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded-full px-1.5 py-0.5">
                    <Zap className="h-2.5 w-2.5 text-orange-400" />
                    <span className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Live</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-white leading-tight">
                  {isUpdating ? "Actualizando la app..." : "¡Papa&Son se actualizó!"}
                </p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">
                  {isUpdating ? "Recargando en un momento..." : "Mejoras y novedades disponibles"}
                </p>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Botón actualizar */}
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className={cn(
                    "relative h-9 px-4 rounded-xl text-xs font-black uppercase tracking-tight text-white",
                    "bg-gradient-to-r from-orange-500 to-amber-500",
                    "shadow-lg shadow-orange-500/30",
                    "transition-all duration-200 active:scale-95",
                    "hover:shadow-orange-500/50 hover:shadow-xl",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                    "overflow-hidden group"
                  )}
                >
                  {/* Shimmer effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative">
                    {isUpdating ? "..." : "Actualizar"}
                  </span>
                </button>

                {/* Botón cerrar */}
                {!isUpdating && (
                  <button
                    onClick={handleDismiss}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Barra de progreso cuando está actualizando */}
            {isUpdating && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
                <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 animate-[loading_0.7s_ease-in-out_forwards]" />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
}