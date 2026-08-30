import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, EyeOff, Eye, Home, CheckCircle2 } from "lucide-react";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  listing_type: string;
  property_type: string;
  rooms: number | null;
  price: number | null;
  address: string | null;
  is_active: boolean;
  is_approved: boolean;
  is_closed: boolean;
  images: string[];
  guest_name: string | null;
  guest_email: string | null;
  contact_phone: string | null;
  created_at: string;
  created_by: string | null;
}

const typeLabel = (v: string) => (v === "rent" ? "להשכרה" : "למכירה");

const AdminRealEstate = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Listing[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("realestate_listings")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as Listing[]) || [];
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

  const approve = async (id: string) => {
    const { error } = await supabase.from("realestate_listings").update({ is_approved: true }).eq("id", id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else { toast({ title: "המודעה אושרה ופורסמה" }); fetchAll(); }
  };

  const toggleActive = async (it: Listing) => {
    const { error } = await supabase.from("realestate_listings").update({ is_active: !it.is_active }).eq("id", it.id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את המודעה?")) return;
    const { error } = await supabase.from("realestate_listings").delete().eq("id", id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else { toast({ title: "נמחק" }); fetchAll(); }
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  const pending = items.filter(i => !i.is_approved);
  const approved = items.filter(i => i.is_approved);

  const Card = ({ it, isPending }: { it: Listing; isPending: boolean }) => (
    <div className={`rounded-xl border bg-card p-3 flex gap-3 ${isPending ? "border-gold/50" : "border-border"}`}>
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
        {it.images?.[0] ? (
          <img src={it.images[0]} alt={it.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-serif font-bold text-foreground truncate">{it.title}</h4>
          {it.price !== null && (
            <span className="font-serif text-sm font-bold text-gold whitespace-nowrap">
              ₪{it.price.toLocaleString("he-IL")}{it.listing_type === "rent" ? "/ח׳" : ""}
            </span>
          )}
        </div>
        <p className="font-body text-xs text-muted-foreground truncate">
          {it.created_by ? authors[it.created_by] || "חבר" : it.guest_name ? `אורח: ${it.guest_name}` : "—"} · {new Date(it.created_at).toLocaleDateString("he-IL")}
        </p>
        {isPending && (it.guest_email || it.contact_phone) && (
          <p className="font-body text-[11px] text-muted-foreground truncate" dir="ltr">
            {[it.guest_email, it.contact_phone].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-[10px]">{typeLabel(it.listing_type)}</Badge>
          <Badge variant="outline" className="text-[10px]">{it.property_type}</Badge>
          {it.is_closed && <Badge variant="destructive" className="text-[10px]">{it.listing_type === "rent" ? "הושכרה" : "נמכרה"}</Badge>}
          {!it.is_active && <Badge variant="secondary" className="text-[10px]">מוסתר</Badge>}
        </div>
        <div className="flex gap-1 mt-2">
          {isPending && (
            <Button size="sm" className="h-7 text-xs gradient-gold text-primary-foreground" onClick={() => approve(it.id)}>
              <CheckCircle2 className="h-3 w-3 ml-1" />אשר ופרסם
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(it)}>
            {it.is_active ? <><EyeOff className="h-3 w-3 ml-1" />הסתר</> : <><Eye className="h-3 w-3 ml-1" />הצג</>}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove(it.id)}>
            <Trash2 className="h-3 w-3 ml-1" />מחק
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div dir="rtl">
      <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <Home className="h-5 w-5 text-gold" />
        ניהול נדל״ן בשכונה ({items.length})
      </h3>

      {pending.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 font-body text-sm font-bold text-gold">ממתינות לאישור ({pending.length})</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {pending.map(it => <Card key={it.id} it={it} isPending />)}
          </div>
        </div>
      )}

      {approved.length === 0 && pending.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">אין מודעות.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {approved.map(it => <Card key={it.id} it={it} isPending={false} />)}
        </div>
      )}
    </div>
  );
};

export default AdminRealEstate;
