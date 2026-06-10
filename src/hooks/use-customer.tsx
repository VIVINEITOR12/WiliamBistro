import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CustomerContext = createContext<any>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Esta función es para el Login
  const login = async (phone: string, pin: string) => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .eq("pin", pin)
      .maybeSingle();
      
    if (error || !data) throw new Error("Credenciales inválidas");
    
    setCustomer(data);
    localStorage.setItem("customer_id", data.id);
    return data;
  };

  // Cargar perfil al iniciar la app
  useEffect(() => {
    const checkSession = async () => {
      const id = localStorage.getItem("customer_id");
      if (id) {
        const { data } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
        if (data) setCustomer(data);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem("customer_id");
  };

  return (
    <CustomerContext.Provider value={{ customer, login, logout, setCustomer, loading }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);