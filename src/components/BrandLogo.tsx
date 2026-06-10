import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img 
      src="/Logo-Papa&Son.svg" 
      alt="Papa&Son Logo" 
      className={cn("object-contain", className)} 
    />
  );
}

// Mini-componente para usarlo como la "monedita" en lugar del icono de Coins
export function PointLogo({ className }: { className?: string }) {
  return (
    <img 
      src="/Puntos-Papa&Son.svg" 
      alt="Puntos" 
      className={cn("object-cover rounded-full aspect-square inline-block", className)}
    />
  );
}