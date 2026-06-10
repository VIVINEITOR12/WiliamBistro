import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Phone, Award, ChevronRight, ShoppingBag, Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Papa&Son" },
      { name: "description", content: "15 años de tradición gastronómica en Maturín. Promos, reservas y delivery." },
    ],
  }),
  component: Index,
});

function Index() {
  const { setIsOpen, totalItems } = useCart();

  // 1. Configuraciones de la tienda (Hero Image)
  const { data: storeSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("hero_image_url")
        .maybeSingle();

      if (error) {
        console.warn("Aviso: Tabla store_settings no configurada aún o sin registros.", error);
        return null;
      }
      return data;
    },
  });

  const currentHeroImg = storeSettings?.hero_image_url;

  // 2. Promociones
  const { data: promos = [], isLoading: isPromosLoading } = useQuery({
    queryKey: ["promos-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,image_url,product_variants(price)")
        .eq("featured", true)
        .eq("available", true)
        .order("position")
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Reseñas Aprobadas
  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ["published-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 animate-in fade-in duration-500">

      {/* Hero Section */}
      <section className="relative mt-5 md:mt-8">
        {isSettingsLoading ? (
          <Skeleton className="w-full h-[480px] md:h-[600px] rounded-[2.5rem] border-2 border-border shadow-2xl" />
        ) : currentHeroImg ? (
          <div className="overflow-hidden rounded-[2.5rem] border-2 border-border shadow-2xl grid md:grid-cols-2 bg-card animate-in fade-in zoom-in-95 duration-500">
            <div className="relative h-[480px] md:h-[600px]">
              <img
                src={currentHeroImg}
                alt="Asado a la parrilla Papa&Son"
                width={1024}
                height={1280}
                fetchpriority="high"
                decoding="async"
                className="h-full w-full object-cover bg-muted"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent md:bg-gradient-to-r md:from-card md:via-card/20 md:to-transparent" />

              {/* Mobile content overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 md:hidden">
                <h1 className="mt-4 text-4xl font-black leading-[0.9] tracking-tighter uppercase italic sm:text-5xl">
                  EL AUTÉNTICO <br />
                  <span className="text-primary drop-shadow-glow">Sabor Criollo</span>.
                </h1>
                <p className="mt-3 text-xs font-bold text-muted-foreground leading-relaxed">
                  Desde las mejores cachapas hasta asados premium. Una tradición que se saborea en cada bocado.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Button asChild variant="flame" size="xl" className="h-14 rounded-2xl font-black uppercase italic tracking-tighter text-base">
                    <Link to="/menu">Ver Menú</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="xl"
                    className="h-14 rounded-2xl font-black uppercase italic tracking-tighter text-base bg-background/50 backdrop-blur-sm border-2 gap-2"
                    onClick={() => setIsOpen(true)}
                  >
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Tu Pedido {totalItems > 0 && `(${totalItems})`}
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop content side */}
            <div className="hidden flex-col justify-center p-12 md:flex lg:p-16">
              <h1 className="mt-6 text-6xl font-black leading-[0.85] tracking-tighter lg:text-7xl uppercase italic">
                EL AUTÉNTICO <br />
                <span className="text-primary drop-shadow-glow">Sabor Criollo</span>.
              </h1>

              <div className="mt-10 flex gap-4">
                <Button asChild variant="flame" size="xl" className="h-16 rounded-2xl px-10 text-lg font-black uppercase italic tracking-tighter shadow-glow">
                  <Link to="/menu">Explorar Menú</Link>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="h-16 rounded-2xl border-2 px-10 text-lg font-black uppercase italic tracking-tighter gap-3 hover:bg-primary/5 transition-all"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="relative">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    {totalItems > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white border border-white">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  Tu Pedido
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center justify-center bg-card px-6 py-20 md:p-24 rounded-[2.5rem] border-2 border-border shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 p-10 opacity-5 rotate-12 scale-150">
              <Flame className="h-64 w-64 text-primary" />
            </div>
            <div className="absolute bottom-0 right-0 p-10 opacity-5 -rotate-12 scale-150">
              <Flame className="h-64 w-64 text-primary" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <h1 className="mt-6 text-5xl font-black leading-[0.85] tracking-tighter md:text-6xl lg:text-7xl uppercase italic">
                EL AUTÉNTICO <br />
                <span className="text-primary drop-shadow-glow">Sabor Criollo</span>.
              </h1>
              <p className="mt-6 max-w-lg text-sm md:text-base font-bold text-muted-foreground leading-relaxed">
                Desde las mejores cachapas hasta asados premium. Una tradición que se saborea en cada bocado, ahora directo a tu puerta.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button asChild variant="flame" size="xl" className="h-14 sm:h-16 rounded-2xl px-10 text-base sm:text-lg font-black uppercase italic tracking-tighter shadow-glow w-full sm:w-auto">
                  <Link to="/menu">Explorar Menú</Link>
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="h-14 sm:h-16 rounded-2xl border-2 px-10 text-base sm:text-lg font-black uppercase italic tracking-tighter gap-3 hover:bg-primary/5 transition-all w-full sm:w-auto bg-background/50 backdrop-blur-sm"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="relative">
                    <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    {totalItems > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white border border-white">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  Tu Pedido
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Promos */}
      <section className="mt-16">
        <div className="flex items-end justify-between border-b-2 border-primary/10 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Aprovecha hoy</p>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter md:text-4xl">Promos activas 🔥</h2>
          </div>
          <Link to="/promos" className="flex items-center text-xs font-black uppercase italic tracking-widest text-primary hover:underline">
            Ver todas <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isPromosLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[2rem] border-2 border-border bg-card p-4 space-y-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-6 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            ))
          ) : promos.length === 0 ? (
            <div className="col-span-full rounded-3xl border-2 border-dashed border-border p-12 text-center">
              <p className="text-sm font-black uppercase italic text-muted-foreground">Pronto nuevas ofertas...</p>
            </div>
          ) : (
            promos.map((p: any) => {
              const minPrice = p.product_variants?.reduce(
                (m: number | null, v: any) => (m === null || v.price < m ? v.price : m),
                null,
              );
              return (
                <Link
                  to="/menu/$productId"
                  params={{ productId: p.id }}
                  key={p.id}
                  className="group relative overflow-hidden rounded-[2rem] border-2 border-border bg-card shadow-lg transition-all hover:-translate-y-2 hover:border-primary hover:shadow-glow-sm"
                >
                  <div className="relative aspect-[16/10] w-full bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">🔥</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-60" />
                    {minPrice !== null && (
                      <span className="absolute right-3 top-3 rounded-xl bg-gradient-flame px-3 py-1.5 text-xs font-black text-white shadow-glow italic uppercase tracking-tighter">
                        desde ${minPrice}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-lg font-black uppercase italic tracking-tighter">{p.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-muted-foreground leading-tight">{p.description}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Info cards */}
      <section className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoCard icon={Clock} title="HORARIO OPERATIVO">
          <p className="font-bold">Lunes: 11:00 AM – 5:30 PM</p>
          <p className="font-bold">Mar – Dom: 11:00 AM – 10:30 PM</p>
        </InfoCard>

        <a
          href="https://www.google.com/maps/search/?api=1&query=9.737962816640048,-63.16458080365456"
          target="_blank"
          rel="noopener noreferrer"
          className="block transition-transform hover:scale-105"
        >
          <InfoCard icon={MapPin} title="UBICACIÓN" actionLabel="IR AHORA">
            <p className="font-bold">Av. Libertador, sector Juanico</p>
            <p className="text-xs font-bold text-muted-foreground uppercase">Maturín, Monagas</p>
          </InfoCard>
        </a>

        <a
          href="tel:+584268964164"
          className="block transition-transform hover:scale-105"
        >
          <InfoCard icon={Phone} title="LLÁMANOS" actionLabel="LLAMAR">
            <p className="font-black text-primary text-lg tracking-tighter">+58 426 896 4164</p>
          </InfoCard>
        </a>
      </section>

      {/* REVIEWS CAROUSEL */}
      {(!isReviewsLoading && reviews.length > 0) && (
        <section className="mt-16">
          <div className="flex items-end justify-between border-b-2 border-primary/10 pb-4">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter md:text-4xl">Reseñas</h2>
            </div>
          </div>

          <div className="mt-8 flex overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 gap-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {reviews.map((r: any) => (
              <div
                key={r.id}
                className="min-w-[280px] sm:min-w-[320px] max-w-[350px] flex-none snap-center rounded-[2.5rem] border-2 border-border bg-card p-8 shadow-lg transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn("h-5 w-5", i < r.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted")}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-muted-foreground mb-6 line-clamp-4 italic leading-relaxed">
                  "{r.comment}"
                </p>
                <div className="flex items-center gap-3 border-t-2 border-border pt-4 mt-auto">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
                    {r.customer_name.charAt(0)}
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-foreground truncate">
                    {r.customer_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Story */}
      <section className="mt-16 rounded-[2.5rem] border-2 border-border bg-card p-8 shadow-2xl md:p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12">
          <Flame className="h-64 w-64" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            El verdadero sabor <br /><span className="text-primary">de casa</span>
          </h1>
          <p className="mt-4 text-muted-foreground md:text-lg max-w-xl">
            Disfruta de la mejor comida criolla, asados al carbón y platos para compartir en familia.
            Tradición y buen servicio en Maturín, directo a tu mesa.
          </p>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
  actionLabel,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-lg transition-all hover:border-primary/50">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
        <div className="text-sm leading-tight">{children}</div>
      </div>
      {actionLabel && (
        <span className="self-center text-[10px] font-black text-primary border-b-2 border-primary pb-0.5 italic">{actionLabel}</span>
      )}
    </div>
  );
}