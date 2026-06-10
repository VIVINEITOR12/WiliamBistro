import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Acceso Admin — Papa&Son" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const { session, isAdmin, signIn, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session && isAdmin) {
      nav({ to: "/admin", replace: true });
    }
  }, [loading, session, isAdmin, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
    const { error } = await signIn(email, password);
    if (error) { 
      setBusy(false); 
      toast.error("Credenciales inválidas"); 
      return; 
    }
    
    toast.success("¡Bienvenido al panel!");
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link to="/" className="mb-8 self-start text-xs font-bold text-muted-foreground hover:text-primary">
        ← Volver al inicio
      </Link>
      
      <div className="flex items-center gap-3 mb-8">
        <BrandLogo className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-black uppercase italic">Panel Admin</h1>
          <p className="text-xs text-muted-foreground font-semibold">Papa&Son</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border-2 border-border bg-card px-3 outline-none focus:border-primary font-medium"
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Contraseña</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border-2 border-border bg-card px-3 outline-none focus:border-primary font-medium"
          />
        </div>
        <Button type="submit" variant="flame" size="xl" className="w-full font-black uppercase italic tracking-tighter" disabled={busy}>
          {busy ? "Verificando..." : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}