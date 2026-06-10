import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/promos")({
  head: () => ({
    meta: [
      { title: "Promos — Papa&Son" },
      { name: "description", content: "Combos y promociones activas: pizzas, burgers, sushi y más." },
    ],
  }),
  component: PromosPage,
});

function PromosPage() {
  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["promos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("featured", true)
        .eq("available", true)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="pt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-flame px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-flame-foreground shadow-glow">
          <Flame className="h-3.5 w-3.5" /> Activas ahora
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Promos del momento</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aprovecha antes de que se agoten.</p>
      </header>

      <section className="grid grid-cols-1 gap-5 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && <div className="col-span-full h-40 animate-pulse rounded-2xl bg-card" />}
        {!isLoading && promos.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center">
            <Flame className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold">Pronto vendrán promos calientes</p>
            <p className="mt-1 text-xs text-muted-foreground">Mientras, explora todo el menú.</p>
            <Button asChild variant="flame" size="lg" className="mt-5">
              <Link to="/menu">Ver menú completo</Link>
            </Button>
          </div>
        )}
        {promos.map((p: any) => {
          const variants = (p.product_variants ?? []).sort((a: any, b: any) => a.position - b.position);
          return (
            <Link
              key={p.id}
              to="/menu/$productId"
              params={{ productId: p.id }}
              className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-glow active:scale-[0.99]"
            >
              <div className="relative aspect-[16/10] w-full bg-muted">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl">🔥</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/10 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-black uppercase tracking-wider text-accent-foreground">
                  Promo
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-lg font-extrabold">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {variants.map((v: any) => (
                    <span key={v.id} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold">
                      {v.label} <span className="text-primary">${Number(v.price).toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
