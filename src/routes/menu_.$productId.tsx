import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PRODUCT_INGREDIENTS } from "@/lib/product-ingredients";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/menu_/$productId")({
  head: () => ({
    meta: [
      { title: "Detalle — Papa&Son" },
      { name: "description", content: "Detalle de producto Papa&Son." },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const { addItem } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*), categories(name, slug)")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-sm font-bold text-muted-foreground uppercase">Plato no disponible</p>
        <Button asChild variant="flame">
          <Link to="/menu">Volver al menú</Link>
        </Button>
      </div>
    );
  }

  const variants = (data.product_variants ?? []).slice().sort((a: any, b: any) => a.position - b.position);
  const activeVariant = variants[selectedVariantIndex] ?? variants[0];
  const displayPrice = activeVariant?.price ?? 0;
  
  const ingredients = PRODUCT_INGREDIENTS[data.name] ?? [
    "Ingredientes seleccionados", 
    "Toque de la casa Papa&Son", 
    "Frescura garantizada"
  ];

  const handleAddToCart = () => {
    addItem({
      productId: data.id,
      name: data.name,
      variantLabel: activeVariant?.label || "Único",
      price: Number(displayPrice),
      imageUrl: data.image_url,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-0 pb-56 sm:px-6 lg:px-8 md:pb-16 animate-in fade-in duration-500">
      <div className="grid gap-8 md:mt-6 md:grid-cols-2 md:gap-12">
        {/* IMAGEN Y BOTÓN VOLVER */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted md:rounded-[2.5rem] md:border-2 md:border-border md:shadow-2xl">
          {data.image_url ? (
            <img src={data.image_url} alt={data.name} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl">🍽️</div>
          )}
          
          <button
            onClick={() => navigate({ to: "/menu" })}
            className="absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-white/20 shadow-lg active:scale-90 transition-all"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          {data.featured && (
            <span className="absolute right-4 top-4 rounded-full bg-primary px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-glow italic">
              RECOMENDADO
            </span>
          )}
        </div>

        {/* CONTENIDO DETALLADO */}
        <div className="px-6 pt-4 sm:px-0 md:flex md:flex-col md:justify-center md:pt-0">
          <div className="flex items-center gap-2">
             {data.categories?.name && (
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter text-primary">
                {data.categories.name}
              </span>
            )}
          </div>
          
          <h1 className="mt-4 text-4xl font-black leading-none tracking-tighter md:text-6xl italic uppercase">{data.name}</h1>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-foreground md:text-5xl tracking-tighter italic">
              ${Number(displayPrice).toFixed(2)}
            </span>
          </div>

          {/* SELECTOR DE VARIANTES */}
          {variants.length > 1 && (
            <div className="mt-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Opciones disponibles</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v: any, index: number) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIndex(index)}
                    className={cn(
                      "rounded-2xl border-2 px-4 py-3 text-xs font-black transition-all duration-300",
                      selectedVariantIndex === index 
                        ? "border-primary bg-primary text-white shadow-glow-sm scale-105" 
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="mt-8 space-y-6">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Descripción</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80 md:text-base font-medium">
                {data.description || "Receta tradicional de la casa preparada al momento."}
              </p>
            </div>

            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Ingredientes Principales</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-extrabold text-foreground/80 bg-secondary/40 p-2.5 rounded-xl border border-border/50 uppercase">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* BOTÓN DESKTOP (Oculto en móvil) */}
          <div className="mt-10 hidden md:block">
            <Button
              variant="flame"
              size="xl"
              className="w-full md:w-auto md:px-16 font-black h-16 text-lg rounded-2xl shadow-glow italic uppercase tracking-tighter"
              onClick={handleAddToCart}
              disabled={!data.available}
            >
              <ShoppingBag className="h-6 w-6 mr-2" />
              {data.available ? `Añadir al Pedido` : "Agotado"}
            </Button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY CTA - Ajustado para flotar SOBRE el BottomNav */}
      <div className="fixed inset-x-0 bottom-[80px] z-40 border-t border-border bg-background/90 px-6 py-4 backdrop-blur-xl md:hidden">
        <div className="mx-auto max-w-md">
          <Button
            variant="flame"
            size="xl"
            className="w-full font-black h-14 rounded-2xl shadow-glow text-base italic uppercase tracking-tighter"
            onClick={handleAddToCart}
            disabled={!data.available}
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            {data.available ? `Añadir — $${Number(displayPrice).toFixed(2)}` : "Agotado"}
          </Button>
        </div>
      </div>
    </div>
  );
}