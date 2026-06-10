import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomer } from "@/hooks/use-customer";
import { toast } from "sonner";
import { Phone, Lock, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/login")({
  component: CustomerLogin,
});

function CustomerLogin() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  const { customer, login, setCustomer, loading } = useCustomer();
  const navigate = useNavigate();

  // REDIRECCIÓN AUTOMÁTICA SI YA ESTÁ LOGUEADO
  useEffect(() => {
    if (!loading && customer) {
      navigate({ to: "/", replace: true });
    }
  }, [customer, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);

    try {
      if (isRegistering) {
        // VALIDACIÓN ENTERPRISE: Revisar si el número ya existe ANTES de insertar
        // Esto evita el Error 409 (Conflict) en la consola
        const { data: existingUser } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", phone.trim())
          .maybeSingle();

        if (existingUser) {
          toast.error(`El número ${phone} ya está registrado.`);
          toast.info("Por favor, inicia sesión con tu PIN.");
          setIsRegistering(false); // Lo cambiamos automáticamente a la vista de login
          setLoadingAction(false);
          return;
        }

        // Si no existe, procedemos a insertar
        const { data, error } = await supabase
          .from("customers")
          .insert([{ phone: phone.trim(), pin, name: name.trim(), points: 0, total_spent: 0 }])
          .select()
          .single();

        if (error) throw error;
        
        setCustomer(data);
        localStorage.setItem("customer_id", data.id);
        toast.success("¡Bienvenido a la familia Papa&Son!");
        navigate({ to: "/" });
      } else {
        // FLUJO DE LOGIN NORMAL
        const data = await login(phone.trim(), pin);
        setCustomer(data);
        localStorage.setItem("customer_id", data.id);
        toast.success("¡Sesión iniciada!");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      // Si llega aquí, es un error real o un PIN incorrecto en el login
      if (!isRegistering) {
        toast.error("Número o PIN incorrecto. Intenta de nuevo.");
      } else {
        toast.error("Ocurrió un error inesperado al registrar. Intenta más tarde.");
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // Prevenir parpadeo mientras verifica sesión
  if (loading || customer) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo className="h-16 w-16 mb-3" />
          <h1 className="text-3xl font-black italic uppercase">Papa&Son</h1>
          <p className="text-sm text-muted-foreground font-medium">
            {isRegistering ? "Crea tu cuenta para acumular puntos" : "Accede a tu billetera y pedidos"}
          </p>
        </div>

        {isRegistering && (
          <div className="relative">
            <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input className="pl-10 h-12 rounded-xl font-medium" placeholder="Tu nombre y apellido" value={name} onChange={e => setName(e.target.value)} required />
          </div>
        )}
        
        <div className="relative">
          <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input className="pl-10 h-12 rounded-xl font-medium" placeholder="WhatsApp (Ej. 04121234567)" value={phone} onChange={e => setPhone(e.target.value)} required />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input className="pl-10 h-12 rounded-xl font-black tracking-widest" type="password" maxLength={4} placeholder="PIN de 4 dígitos" value={pin} onChange={e => setPin(e.target.value)} required />
        </div>

        <Button className="w-full h-12 font-black uppercase italic tracking-tighter text-md rounded-xl" disabled={loadingAction}>
          {loadingAction ? <Loader2 className="animate-spin h-5 w-5" /> : (isRegistering ? "Registrarse" : "Entrar")}
        </Button>
        
        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
          {isRegistering ? "¿Ya tienes cuenta? Iniciar sesión" : "¿No tienes cuenta? Regístrate aquí"}
        </button>
      </form>
    </div>
  );
}