import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

export interface CartItem {
  productId: string;
  name: string;
  variantLabel: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string, variantLabel: string) => void;
  updateQuantity: (productId: string, variantLabel: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("papayson_cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [isOpen, setIsOpen] = useState(false);

  // Sincronizar automáticamente con localStorage
  useEffect(() => {
    localStorage.setItem("papayson_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (item) => item.productId === newItem.productId && item.variantLabel === newItem.variantLabel
      );

      if (existingIndex > -1) {
        const updated = [...currentItems];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [...currentItems, { ...newItem, quantity: 1 }];
    });

    toast.success(`Añadido al carrito: ${newItem.name}`);
    // Abrimos el carrito para dar retroalimentación visual inmediata
    setIsOpen(true);
  };

  const removeItem = (productId: string, variantLabel: string) => {
    setItems((current) =>
      current.filter((item) => !(item.productId === productId && item.variantLabel === variantLabel))
    );
  };

  const updateQuantity = (productId: string, variantLabel: string, delta: number) => {
    setItems((current) =>
      current
        .map((item) => {
          if (item.productId === productId && item.variantLabel === variantLabel) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("papayson_cart");
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de un CartProvider");
  return context;
}