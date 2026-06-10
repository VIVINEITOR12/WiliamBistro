import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  useLocation,
  Link,
} from "@tanstack/react-router";

import { AuthProvider } from "@/hooks/use-auth";
import { CustomerProvider } from "@/hooks/use-customer";
import { CartProvider } from "@/hooks/use-cart";
import { CartSheet } from "@/components/CartSheet";
import { BottomNav } from "@/components/BottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { WhatsappFab } from "@/components/WhatsappFab";
import { PWAUpdateBanner } from "@/components/PWAUpdateBanner";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-7xl font-black text-gradient-flame">404</h1>
        <p className="mt-3 text-muted-foreground">Página no encontrada</p>
        <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gradient-flame px-5 font-semibold text-flame-foreground shadow-glow">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h2 className="text-xl font-bold">Algo salió mal</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 h-11 rounded-xl bg-gradient-flame px-5 font-semibold text-flame-foreground shadow-glow"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Papa&Son — 15 años de sabor en Maturín" },
      { name: "description", content: "Comida criolla, asados, marisquería, sushi, pizzas y burgers. Reserva, menú digital y delivery." },
      { property: "og:title", content: "Papa&Son — 15 años de sabor en Maturín" },
      { property: "og:description", content: "Comida criolla, asados, marisquería, sushi, pizzas y burgers. Reserva, menú digital y delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Papa&Son — 15 años de sabor en Maturín" },
      { name: "twitter:description", content: "Comida criolla, asados, marisquería, sushi, pizzas y burgers. Reserva, menú digital y delivery." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2603d09d-7576-4308-848d-f7b8540315d7/id-preview-4575611b--21a80ccc-5c34-4514-a8af-e926fa7396d6.lovable.app-1778628893241.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/2603d09d-7576-4308-848d-f7b8540315d7/id-preview-4575611b--21a80ccc-5c34-4514-a8af-e926fa7396d6.lovable.app-1778628893241.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function AppChrome() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <DesktopHeader />}
      <main className={isAdmin ? "min-h-screen" : "min-h-screen pb-24 md:pb-12"}>
        <Outlet />
      </main>
      {!isAdmin && (
        <>
          <WhatsappFab />
          <BottomNav />
          <CartSheet />
        </>
      )}
      {/* Banner de actualización PWA — visible en toda la app, admin incluido */}
      <PWAUpdateBanner />
      <Toaster richColors position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomerProvider>
          <CartProvider>
            <HeadContent />
            <AppChrome />
          </CartProvider>
        </CustomerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}