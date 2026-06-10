import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { PointLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú — Papa&Son" },
      { name: "description", content: "Explora nuestro menú: asados, mariscos, sushi, pizzas y bebidas." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [search, setSearch] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const currentCat = activeCat ?? categories[0]?.id ?? null;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", currentCat],
    enabled: !!currentCat,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("category_id", currentCat!)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p: any) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-20 -mx-4 bg-background/85 px-4 pt-5 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:top-16">
        <h1 className="text-3xl font-black md:text-4xl">Menú</h1>
        <p className="text-xs text-muted-foreground">Toca una categoría para explorar</p>

        <div className="relative mt-3 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plato..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {categories.map((c: any) => {
            const active = c.id === currentCat;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                  active
                    ? "border-transparent bg-gradient-flame text-flame-foreground shadow-glow"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && <SkeletonList />}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No hay productos en esta categoría todavía.
          </div>
        )}
        {filtered.map((p: any) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const variants = (product.product_variants ?? []).slice().sort((a: any, b: any) => a.position - b.position);
  const sold = !product.available;
  const { addItem } = useCart();
  const navigate = useNavigate();
  
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (sold) return;

    if (variants.length > 1) {
      navigate({ to: "/menu/$productId", params: { productId: product.id } });
    } else {
      const variant = variants[0];
      addItem({
        id: product.id,
        name: product.name,
        price: variant ? Number(variant.price) : Number(product.base_price || 0),
        quantity: 1,
        image_url: product.image_url,
        is_redeemable: product.is_redeemable,
        points_cost: product.points_cost,
        variantLabel: variant ? variant.label : "Regular",
      });
      toast.success("¡Agregado al carrito!");
    }
  };

  return (
    <Link
      to="/menu/$productId"
      params={{ productId: product.id }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-glow active:scale-[0.98]",
        sold && "opacity-60",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🍽️</div>
        )}
        
        {/* ETIQUETA DE PUNTOS CON LOGO */}
        {product.is_redeemable && (
          <div className="absolute right-2 top-2 rounded-full bg-yellow-500/90 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black flex items-center gap-1 shadow-sm backdrop-blur-md">
            <PointLogo className="h-3 w-3" /> {product.points_cost} Pts
          </div>
        )}

        {/* BOTÓN DE AGREGADO RÁPIDO SUTIL */}
        {!sold && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-primary hover:text-white"
          >
            {variants.length > 1 ? <ChevronRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}

        {product.featured && !product.is_redeemable && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-foreground">PROMO</span>
        )}
        
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-bold uppercase tracking-wider text-destructive">
            Agotado
          </div>
        )}
      </div>
      
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-bold leading-tight">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {variants.length === 0 && (
              <span className="text-xs text-muted-foreground font-bold">
                ${Number(product.base_price || 0).toFixed(2)}
              </span>
            )}
            {variants.map((v: any) => (
              <span key={v.id} className="rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground">
                {v.label} <span className="text-primary">${Number(v.price).toFixed(2)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </>
  );
}