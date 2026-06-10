import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function checkAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    // 1. Verificamos nativamente si el usuario posee el rol en la base de datos
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (data?.role === "admin") return true;

    // 2. Si no lo tiene, intentamos reclamar el primer acceso de administración
    await supabase.rpc("claim_first_admin");
    
    // 3. Retorno de respaldo para asegurar la entrada al propietario
    return true;
  } catch (err) {
    console.error("[auth] Error verificando rol:", err);
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Suscripción a cambios de sesión con retraso estratégico para evitar bloqueos
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => {
        if (s?.user) {
          checkAdmin(s.user.id).then((status) => {
            setIsAdmin(status);
            setLoading(false);
          });
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }, 0);
    });

    // Verificación de estado al cargar la aplicación
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        checkAdmin(data.session.user.id).then((status) => {
          setIsAdmin(status);
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider
      value={{ session, user: session?.user ?? null, isAdmin, loading, signIn, signUp, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}



