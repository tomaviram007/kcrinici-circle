import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CATEGORIES = ["אוכל", "פנאי", "רכב", "לבית", "אופנה", "טכנולוגיה", "בריאות", "כללי"];

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_label: string | null;
  coupon_code: string | null;
  business_name: string;
  business_logo_url: string | null;
  business_phone: string | null;
  category: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  description: "",
  discount_label: "",
  coupon_code: "",
  business_name: "",
  business_logo_url: "",
  business_phone: "",
  category: "כללי",
  is_active: true,
  expires_at: "",
};

const AdminDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    setDeals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.business_name.trim() || !form.description.trim()) {
      toast({ title: "נא למלא שם עסק, כותרת ותיאור", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title,
      description: form.description,
      discount_label: form.discount_label || null,
      coupon_code: form.coupon_code || null,
      business_name: form.business_name,
      business_logo_url: form.business_logo_url || null,
      business_phone: form.business_phone || null,
      category: form.category,
      is_active: form.is_active,
      expires_at: form.expires_at || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("deals").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("deals").insert(payload));
    }

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "ההטבה עודכנה!" : "ההטבה נוספה!" });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchDeals();
    }
    setSaving(false);
  };

  const handleEdit = (deal: Deal) => {
    setForm({
      title: deal.title,
      description: deal.description,
      discount_label: deal.discount_label || "",
      coupon_code: deal.coupon_code || "",
      business_name: deal.business_name,
      business_logo_url: deal.business_logo_url || "",
      business_phone: deal.business_phone || "",
      category: deal.category,
      is_active: deal.is_active,
      expires_at: deal.expires_at ? deal.expires_at.split("T")[0] : "",
    });
    setEditingId(deal.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ההטבה נמחקה" });
      fetchDeals();
    }
  };

  const handleToggleActive = async (deal: Deal) => {
    await supabase.from("deals").update({ is_active: !deal.is_active }).eq("id", deal.id);
    fetchDeals();
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5 text-gold" /> ניהול הטבות ({deals.length})
        </h3>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="gradient-gold text-primary-foreground font-body"
          size="sm"
        >
          <Plus className="h-4 w-4 ml-1" /> הטבה חדשה
        </Button>
      </div>

      {/* Deals list */}
      <div className="grid gap-3 md:grid-cols-2">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className={`rounded-xl border p-4 transition-all ${
              deal.is_active ? "border-border bg-card" : "border-border/30 bg-card/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-lg border border-border/40 bg-background/60 flex items-center justify-center shrink-0 overflow-hidden">
                  {deal.business_logo_url ? (
                    <img src={deal.business_logo_url} alt="" className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <Store className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-sm font-bold text-foreground truncate">{deal.title}</p>
                  <p className="font-body text-xs text-muted-foreground">{deal.business_name} · {deal.category}</p>
                </div>
              </div>
              {deal.discount_label && (
                <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  {deal.discount_label}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Switch checked={deal.is_active} onCheckedChange={() => handleToggleActive(deal)} />
              <span className="font-body text-xs text-muted-foreground">{deal.is_active ? "פעיל" : "מושהה"}</span>
              <div className="mr-auto flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(deal)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(deal.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogTitle className="font-serif text-lg">
            {editingId ? "עריכת הטבה" : "הטבה חדשה"}
          </DialogTitle>
          <DialogDescription className="text-sm font-body text-muted-foreground">
            מלא את הפרטים להוספת הטבה חדשה לחברי המועדון
          </DialogDescription>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="font-body text-xs">שם העסק *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-xs">כותרת ההטבה *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-xs">תיאור *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-xs">תגית הנחה (למשל: 20%)</Label>
                <Input value={form.discount_label} onChange={(e) => setForm({ ...form, discount_label: e.target.value })} className="bg-background" />
              </div>
              <div>
                <Label className="font-body text-xs">קוד קופון</Label>
                <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} className="bg-background" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-xs">טלפון העסק (לוואטסאפ)</Label>
                <Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} className="bg-background" placeholder="972501234567" />
              </div>
              <div>
                <Label className="font-body text-xs">קטגוריה</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="font-body text-xs">URL לוגו העסק</Label>
              <Input value={form.business_logo_url} onChange={(e) => setForm({ ...form, business_logo_url: e.target.value })} className="bg-background" placeholder="https://..." />
            </div>
            <div>
              <Label className="font-body text-xs">תאריך תפוגה (אופציונלי)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="bg-background" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="font-body text-xs">הטבה פעילה</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-gold text-primary-foreground font-body">
              {saving ? "שומר..." : editingId ? "עדכן הטבה" : "הוסף הטבה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeals;
