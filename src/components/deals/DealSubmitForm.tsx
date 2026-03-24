import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Send } from "lucide-react";

const CATEGORIES = ["אוכל", "פנאי", "רכב", "לבית", "אופנה", "טכנולוגיה", "בריאות", "כללי"];

const emptyForm = {
  title: "",
  description: "",
  discount_label: "",
  coupon_code: "",
  business_name: "",
  business_phone: "",
  website_url: "",
  category: "כללי",
  expires_at: "",
};

const DealSubmitForm = ({ onSubmitted }: { onSubmitted?: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.business_name.trim() || !form.description.trim()) {
      toast({ title: "נא למלא שם עסק, כותרת ותיאור", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("deals").insert({
      title: form.title,
      description: form.description,
      discount_label: form.discount_label || null,
      coupon_code: form.coupon_code || null,
      business_name: form.business_name,
      business_phone: form.business_phone || null,
      website_url: form.website_url || null,
      category: form.category,
      expires_at: form.expires_at || null,
      is_active: true,
      is_approved: false,
      created_by: user?.id,
    });

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ההטבה נשלחה לאישור!", description: "ההטבה תפורסם לאחר אישור מנהל המועדון." });
      setForm(emptyForm);
      setShowForm(false);
      onSubmitted?.();
    }
    setSaving(false);
  };

  if (!showForm) {
    return (
      <div className="flex justify-center mb-6">
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="font-body border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4 ml-1" />
          הצע הטבה חדשה
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="font-serif text-lg font-bold text-foreground">
          <Send className="h-4 w-4 inline ml-2 text-primary" />
          הצע הטבה חדשה
        </p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowForm(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="font-body text-xs text-muted-foreground">
        ההטבה תפורסם לאחר אישור מנהל המועדון
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="font-body text-xs">שם העסק *</Label>
          <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="bg-background" />
        </div>
        <div>
          <Label className="font-body text-xs">כותרת ההטבה *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
        </div>
      </div>

      <div>
        <Label className="font-body text-xs">תיאור *</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={2} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label className="font-body text-xs">תגית הנחה</Label>
          <Input value={form.discount_label} onChange={(e) => setForm({ ...form, discount_label: e.target.value })} className="bg-background" placeholder="למשל: 20%" />
        </div>
        <div>
          <Label className="font-body text-xs">קוד קופון</Label>
          <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} className="bg-background" />
        </div>
        <div>
          <Label className="font-body text-xs">טלפון העסק</Label>
          <Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} className="bg-background" placeholder="972501234567" />
        </div>
        <div>
          <Label className="font-body text-xs">קטגוריה</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="font-body text-xs">לינק לאתר ההטבה</Label>
          <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="bg-background" placeholder="https://..." />
        </div>
        <div>
          <Label className="font-body text-xs">תאריך תפוגה (אופציונלי)</Label>
          <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="bg-background" />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="gradient-gold text-primary-foreground font-body">
        {saving ? "שולח..." : "שלח לאישור"}
      </Button>
    </div>
  );
};

export default DealSubmitForm;
