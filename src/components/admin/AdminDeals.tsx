import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag, Store, X, Link as LinkIcon, MousePointerClick, ExternalLink, CheckCircle, Clock } from "lucide-react";
import BenefitFields from "@/components/deals/BenefitFields";
import { logAuditAction } from "@/lib/audit-log";
import CreatorBadge from "@/components/admin/CreatorBadge";

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
  website_url: string | null;
  category: string;
  is_active: boolean;
  is_approved: boolean;
  expires_at: string | null;
  created_at: string;
  claim_count: number;
  website_click_count: number;
  created_by: string | null;
}

const emptyForm = {
  title: "",
  description: "",
  benefit_type: "percent",
  benefit_value: "",
  coupon_code: "",
  business_name: "",
  business_logo_url: "",
  business_phone: "",
  website_url: "",
  category: "כללי",
  is_active: true,
  expires_at: "",
};

const buildDiscountLabel = (type: string, value: string) => {
  if (!value && type === "percent") return null;
  if (type === "percent") return `${value}% הנחה`;
  if (type === "consultation") return "שעת ייעוץ";
  return null;
};

const AdminDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const cardsRef = useRef<HTMLDivElement>(null);

  const fetchDeals = async () => {
    const { data } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    setDeals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  // GSAP staggered card entrance
  useEffect(() => {
    if (!cardsRef.current || deals.length === 0) return;
    const cards = cardsRef.current.querySelectorAll(".deal-card");
    gsap.fromTo(cards, 
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: "power3.out" }
    );
  }, [deals]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.business_name.trim() || !form.description.trim()) {
      toast({ title: "נא למלא שם עסק, כותרת ותיאור", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title,
      description: form.description,
      discount_label: buildDiscountLabel(form.benefit_type, form.benefit_value),
      benefit_type: form.benefit_type,
      benefit_value: form.benefit_value ? parseInt(form.benefit_value) : null,
      coupon_code: form.coupon_code || null,
      business_name: form.business_name,
      business_logo_url: form.business_logo_url || null,
      business_phone: form.business_phone || null,
      website_url: form.website_url || null,
      category: form.category,
      is_active: form.is_active,
      is_approved: true,
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
      logAuditAction(editingId ? "update" : "create", "deal", editingId || undefined, form.title);
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
      benefit_type: (deal as any).benefit_type || "percent",
      benefit_value: (deal as any).benefit_value?.toString() || "",
      coupon_code: deal.coupon_code || "",
      business_name: deal.business_name,
      business_logo_url: deal.business_logo_url || "",
      business_phone: deal.business_phone || "",
      website_url: deal.website_url || "",
      category: deal.category,
      is_active: deal.is_active,
      expires_at: deal.expires_at ? deal.expires_at.split("T")[0] : "",
    });
    setEditingId(deal.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const deal = deals.find(d => d.id === id);
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ההטבה נמחקה" });
      logAuditAction("delete", "deal", id, deal?.title);
      fetchDeals();
    }
  };

  const handleToggleActive = async (deal: Deal) => {
    await supabase.from("deals").update({ is_active: !deal.is_active }).eq("id", deal.id);
    fetchDeals();
  };

  const handleApprove = async (deal: Deal) => {
    await supabase.from("deals").update({ is_approved: true }).eq("id", deal.id);
    toast({ title: "ההטבה אושרה!" });
    logAuditAction("approve", "deal", deal.id, deal.title);
    fetchDeals();
  };

  const pendingDeals = deals.filter((d) => !d.is_approved);
  const approvedDeals = deals.filter((d) => d.is_approved);

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
         <Tag className="h-5 w-5 text-gold shrink-0" /> ניהול הטבות ({deals.length})
          {pendingDeals.length > 0 && (
            <Badge variant="destructive" className="font-body text-xs">{pendingDeals.length} ממתינות</Badge>
          )}
        </h3>
        <Button
          onClick={() => {
            if (showForm && !editingId) {
              setShowForm(false);
            } else {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }
          }}
          className="gradient-gold text-primary-foreground font-body w-full sm:w-auto"
          size="sm"
        >
          {showForm && !editingId ? (
            <><X className="h-4 w-4 ml-1" /> סגור</>
          ) : (
            <><Plus className="h-4 w-4 ml-1" /> הטבה חדשה</>
          )}
        </Button>
      </div>

      {/* Inline form - full width, no scroll */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4" dir="rtl">
          <div className="flex items-center justify-between">
            <p className="font-serif text-lg font-bold text-foreground">
              {editingId ? "עריכת הטבה" : "הטבה חדשה"}
            </p>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowForm(false); setEditingId(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 1: business name + title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="font-body text-xs">שם העסק *</Label>
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="bg-background" autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-xs">כותרת ההטבה *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" autoComplete="off" />
            </div>
          </div>

          {/* Row 2: description */}
          <div>
            <Label className="font-body text-xs">תיאור *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={2} />
          </div>

          {/* Row 3: benefit type + value + coupon + category */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BenefitFields
              benefitType={form.benefit_type}
              benefitValue={form.benefit_value}
              onTypeChange={(v) => setForm({ ...form, benefit_type: v })}
              onValueChange={(v) => setForm({ ...form, benefit_value: v })}
            />
            <div>
              <Label className="font-body text-xs">קוד קופון</Label>
              <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} className="bg-background" autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-xs">טלפון העסק (לוואטסאפ)</Label>
              <Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} className="bg-background" placeholder="972501234567" autoComplete="off" />
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

          {/* Row 4: logo URL + website URL + expiry */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="font-body text-xs">URL לוגו העסק</Label>
              <Input value={form.business_logo_url} onChange={(e) => setForm({ ...form, business_logo_url: e.target.value })} className="bg-background" placeholder="https://..." autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-xs flex items-center gap-1"><LinkIcon className="h-3 w-3" /> לינק לאתר ההטבה</Label>
              <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="bg-background" placeholder="https://..." autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-xs">תאריך תפוגה (אופציונלי)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="bg-background" />
            </div>
          </div>

          {/* Row 5: active switch - separate row */}
          <div className="flex items-center justify-end gap-3 p-3 rounded-lg border border-border/50 bg-background/50">
            <Label className="font-body text-sm cursor-pointer" htmlFor="deal-active-switch">הטבה פעילה</Label>
            <Switch id="deal-active-switch" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} className="shrink-0" />
          </div>

          {/* Save button */}
          <Button onClick={handleSave} disabled={saving} className="gradient-gold text-primary-foreground font-body">
            {saving ? "שומר..." : editingId ? "עדכן הטבה" : "הוסף הטבה"}
          </Button>
        </div>
      )}

      {/* Pending deals */}
      {pendingDeals.length > 0 && (
        <>
          <h4 className="font-serif text-sm font-bold text-destructive flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4" /> ממתינות לאישור ({pendingDeals.length})
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingDeals.map((deal) => (
              <div key={deal.id} className="deal-card rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 transition-all">
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
                  <Badge variant="outline" className="text-[10px] font-body border-amber-500/50 text-amber-600">ממתינה</Badge>
                </div>
                <p className="font-body text-xs text-muted-foreground mt-2 line-clamp-2">{deal.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-body" onClick={() => handleApprove(deal)}>
                    <CheckCircle className="h-3.5 w-3.5 ml-1" /> אשר
                  </Button>
                  <Button size="sm" variant="ghost" className="font-body" onClick={() => handleEdit(deal)}>
                    <Pencil className="h-3.5 w-3.5 ml-1" /> ערוך
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(deal.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Approved deals */}
      <div ref={cardsRef} className="grid gap-3 md:grid-cols-2">
        {approvedDeals.map((deal) => (
          <div
            key={deal.id}
            className={`deal-card rounded-xl border p-4 transition-all ${
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
                  <CreatorBadge entityType="deal" entityId={deal.id} createdBy={deal.created_by} />
                </div>
              </div>
              {deal.discount_label && (
                <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                  {deal.discount_label}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 border border-border/50" onClick={() => handleDelete(deal.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 border border-primary/30" onClick={() => handleEdit(deal)}>
                  <Pencil className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-body text-xs text-muted-foreground" title="לחיצות על קבל הטבה">
                  <MousePointerClick className="h-3 w-3" /> {deal.claim_count || 0}
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-muted-foreground" title="לחיצות על עבור לאתר">
                  <ExternalLink className="h-3 w-3" /> {deal.website_click_count || 0}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">{deal.is_active ? "פעיל" : "מושהה"}</span>
                <Switch checked={deal.is_active} onCheckedChange={() => handleToggleActive(deal)} className="shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDeals;
