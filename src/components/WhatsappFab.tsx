import { MessageCircle } from "lucide-react";

export const WHATSAPP_NUMBER = "584268964164"; 

export function WhatsappFab({ message = "¡Hola Papa&Son! Quisiera hacer un pedido para delivery." }: { message?: string }) {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pedir delivery por WhatsApp"
      /* MODIFICACIÓN DE UX: 
         Subimos a bottom-[165px] para evitar colisión con la burbuja del carrito 
         que estará en bottom-24 (aprox 95px).
      */
      className="fixed bottom-[165px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-flame shadow-glow ring-4 ring-background transition-transform active:scale-95 md:bottom-24 md:right-6"
    >
      <MessageCircle className="h-6 w-6 text-flame-foreground" />
      <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-primary/30" />
    </a>
  );
}