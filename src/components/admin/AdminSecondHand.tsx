import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, EyeOff, Eye, Package } from "lucide-react";

interface Item {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  category: string;
  condition: string;
  is_active: boolean;
  is_sold: boolean;
  images: string[];
  created_at: string;
  created_by: string | null;
}

const AdminSecondHand = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("secondhand_items")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as Item[]) || [];
    setItems(list);
    const ids = [...new Set(list.map(i => i.created_by).filter(Boolean) as string[])];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      setAuthors(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleActive = async (it: Item) => {
    const { error } = await supabase.from("secondhand_items").update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הפריט?")) return;
    const { error } = await supabase.from("secondhand_items").delete().eq("id", id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else { toast({ title: "נמחק" }); fetchAll(); }
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div dir="rtl">
      <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <Package className="h-5 w-5 text-gold" />
        ניהול יד שנייה ({items.length})
      </h3>

      {items.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">אין פריטים.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(it => (
            <div key={it.id} className="rounded-xl border border-border bg-card p-3 flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                {it.images?.[0] ? (
                  <img src={it.images[0]} alt={it.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-serif font-bold text-foreground truncate">{it.title}</h4>
                  {it.price !== null && <span className="font-serif text-sm font-bold text-gold whitespace-nowrap">₪{it.price.toLocaleString("he-IL")}</span>}
                </div>
                <p className="font-body text-xs text-muted-foreground truncate">
                  {it.created_by ? authors[it.created_by] || "חבר" : "—"} · {new Date(it.created_at).toLocaleDateString("he-IL")}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">{it.category}</Badge>
                  {it.is_sold && <Badge variant="destructive" className="text-[10px]">נמכר</Badge>}
                  {!it.is_active && <Badge variant="secondary" className="text-[10px]">מוסתר</Badge>}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(it)}>
                    {it.is_active ? <><EyeOff className="h-3 w-3 ml-1" />הסתר</> : <><Eye className="h-3 w-3 ml-1" />הצג</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove(it.id)}>
                    <Trash2 className="h-3 w-3 ml-1" />מחק
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSecondHand;
