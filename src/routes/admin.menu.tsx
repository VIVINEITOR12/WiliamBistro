import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, X, ArrowUp, ArrowDown, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { PointLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/admin/menu")({
  component: AdminMenu,
});

type Variant = { id?: string; label: string; price: number; position: number };
type ProductForm = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  is_redeemable: boolean;
  points_cost: number;
  position: number;
  variants: Variant[];
};

const empty = (catId: string): ProductForm => ({
  category_id: catId,
  name: "",
  description: "",
  image_url: null,
  available: true,
  featured: false,
  is_redeemable: false,
  points_cost: 0,
  position: 0,
  variants: [{ label: "Único", price: 0, position: 0 }],
});

function AdminMenu() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => (await supabase.from("categories").select("*").order("position")).data ?? [],
  });

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const currentCat = activeCat ?? categories[0]?.id ?? null;

  const { data: products = [], refetch } = useQuery({
    queryKey: ["admin-products", currentCat],
    enabled: !!currentCat,
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("category_id", currentCat!)
        .order("position")).data ?? [],
  });

  const reorder = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      await supabase.from("products").update({ position }).eq("id", id);
    },
    onSuccess: () => refetch(),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= products.length) return;
    const a = products[idx], b = products[next];
    reorder.mutate({ id: a.id, position: b.position });
    reorder.mutate({ id: b.id, position: a.position });
  };

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "available" | "featured" | "is_redeemable"; value: boolean }) => {
      const patch: any = { [field]: value };
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eliminado"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Menú</h1>
          <p className="text-xs text-muted-foreground">Gestiona productos por categoría.</p>
        </div>
        <Button variant="flame" onClick={() => currentCat && setEditing(empty(currentCat))}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {categories.map((c: any) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
              c.id === currentCat
                ? "border-transparent bg-gradient-flame text-flame-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sin productos. Crea el primero.
          </div>
        )}
        {products.map((p: any, idx: number) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-3 shadow-card flex flex-col">
            <div className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-bold">{p.name}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-1 flex flex-wrap gap-1 items-center">
                  {p.product_variants?.map((v: any) => (
                    <span key={v.id} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold">
                      {v.label} ${Number(v.price).toFixed(2)}
                    </span>
                  ))}
                  {/* Etiqueta Visual de Puntos */}
                  {p.is_redeemable && (
                    <span className="rounded bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 text-[10px] font-black text-yellow-600 flex items-center gap-1">
                      <PointLogo className="h-3 w-3" /> {p.points_cost} Pts
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(idx, -1)} className="rounded p-1 text-muted-foreground hover:text-foreground"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(idx, 1)} className="rounded p-1 text-muted-foreground hover:text-foreground"><ArrowDown className="h-4 w-4" /></button>
              </div>
            </div>
            
            <div className="mt-auto pt-3">
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Toggle label="Disponible" value={p.available} onChange={(v) => toggle.mutate({ id: p.id, field: "available", value: v })} />
                <Toggle label="Promo" value={p.featured} onChange={(v) => toggle.mutate({ id: p.id, field: "featured", value: v })} />
                <Toggle label="Canjeable" value={p.is_redeemable} onChange={(v) => toggle.mutate({ id: p.id, field: "is_redeemable", value: v })} />
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing({
                    id: p.id, category_id: p.category_id, name: p.name, description: p.description ?? "",
                    image_url: p.image_url, available: p.available, featured: p.featured, position: p.position,
                    is_redeemable: p.is_redeemable || false, points_cost: p.points_cost || 0,
                    variants: (p.product_variants ?? []).map((v: any) => ({ id: v.id, label: v.label, price: Number(v.price), position: v.position })),
                  })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("¿Eliminar?")) del.mutate(p.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductEditor
          form={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-products"] }); }}
        />
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        value ? "border-primary/40 bg-gradient-flame/15 text-primary" : "border-border bg-secondary text-muted-foreground hover:bg-muted",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", value ? "bg-primary" : "bg-muted-foreground")} />
      {label}
    </button>
  );
}

function ProductEditor({
  form: initial, categories, onClose, onSaved,
}: { form: ProductForm; categories: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProductForm>(initial);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: pub.publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nombre requerido"); return; }
    if (form.is_redeemable && form.points_cost <= 0) { toast.error("Si es canjeable, el costo en puntos debe ser mayor a 0"); return; }
    
    setBusy(true);
    let productId = form.id;
    
    if (productId) {
      const { error } = await supabase.from("products").update({
        category_id: form.category_id, name: form.name, description: form.description,
        image_url: form.image_url, available: form.available, featured: form.featured, position: form.position,
        is_redeemable: form.is_redeemable, points_cost: form.points_cost,
        updated_at: new Date().toISOString(),
      }).eq("id", productId);
      if (error) { toast.error(error.message); setBusy(false); return; }
      await supabase.from("product_variants").delete().eq("product_id", productId);
    } else {
      const { data, error } = await supabase.from("products").insert({
        category_id: form.category_id, name: form.name, description: form.description,
        image_url: form.image_url, available: form.available, featured: form.featured, position: form.position,
        is_redeemable: form.is_redeemable, points_cost: form.points_cost,
      }).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Error"); setBusy(false); return; }
      productId = data.id;
    }
    
    if (form.variants.length > 0) {
      const { error: ve } = await supabase.from("product_variants").insert(
        form.variants.map((v, i) => ({ product_id: productId!, label: v.label, price: v.price, position: i })),
      );
      if (ve) { toast.error(ve.message); setBusy(false); return; }
    }
    
    toast.success("Guardado exitosamente");
    setBusy(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-card sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{form.id ? "Editar producto" : "Nuevo producto"}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Imagen</label>
            <label className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary/40">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImagePlus className="mx-auto h-6 w-6" />
                  <p className="mt-1 text-xs">{uploading ? "Subiendo..." : "Subir foto"}</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {form.image_url && (
              <button onClick={() => setForm({ ...form, image_url: null })} className="mt-1 text-xs text-destructive font-bold">Quitar imagen</button>
            )}
          </div>

          <Field label="Categoría">
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Nombre">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold" />
          </Field>

          <Field label="Descripción">
            <textarea value={form.description} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Posición">
              <input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-bold" />
            </Field>
            <div className="flex flex-col gap-2 self-end">
              <Toggle label="Disponible" value={form.available} onChange={(v) => setForm({ ...form, available: v })} />
              <Toggle label="Destacar Promos" value={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
            </div>
          </div>

          {/* MÓDULO DE PUNTOS Y FIDELIZACIÓN */}
          <div className="rounded-xl border-2 border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-yellow-600 flex items-center gap-1.5">
                <Coins className="h-4 w-4" /> Fidelización
              </label>
              <Toggle label="Activar Canje" value={form.is_redeemable} onChange={(v) => setForm({ ...form, is_redeemable: v })} />
            </div>
            
            {form.is_redeemable && (
              <div className="animate-in slide-in-from-top-2 pt-1">
                <label className="mb-1 block text-[10px] font-bold uppercase text-yellow-600/80">Costo en puntos</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="Ej. 500" 
                    value={form.points_cost || ""} 
                    onChange={(e) => setForm({...form, points_cost: Number(e.target.value)})} 
                    className="h-11 w-full rounded-xl border-2 border-yellow-500/30 bg-background px-3 text-sm font-black focus:border-yellow-500 outline-none" 
                  />
                  <PointLogo className="h-6 w-6" />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Variantes de precio</label>
              <button
                onClick={() => setForm({ ...form, variants: [...form.variants, { label: "", price: 0, position: form.variants.length }] })}
                className="text-xs font-black text-primary hover:underline"
              >
                + Añadir
              </button>
            </div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="Ej. Combo"
                    value={v.label}
                    onChange={(e) => {
                      const next = [...form.variants]; next[i] = { ...v, label: e.target.value }; setForm({ ...form, variants: next });
                    }}
                    className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm font-bold"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <input
                      type="number" step="0.01" placeholder="0.00"
                      value={v.price || ""}
                      onChange={(e) => {
                        const next = [...form.variants]; next[i] = { ...v, price: Number(e.target.value) }; setForm({ ...form, variants: next });
                      }}
                      className="h-11 w-full rounded-xl border border-border bg-card pl-7 pr-2 text-sm font-bold"
                    />
                  </div>
                  <button
                    onClick={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}
                    className="rounded-xl p-2.5 text-destructive hover:bg-destructive/10 transition-colors"
                  ><Trash2 className="h-5 w-5" /></button>
                </div>
              ))}
            </div>
          </div>

          <Button variant="flame" size="xl" className="w-full mt-2 font-black uppercase italic tracking-tighter" onClick={save} disabled={busy}>
            {busy ? "Guardando cambios..." : "Guardar Producto"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}