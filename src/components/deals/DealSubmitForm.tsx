import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Send, Upload, ImageIcon } from "lucide-react";
import BenefitFields from "./BenefitFields";
import { sendTelegramNotification } from "@/lib/telegram-notify";

const CATEGORIES = ["אוכל", "פנאי", "רכב", "לבית", "אופנה", "טכנולוגיה", "בריאות", "כללי"];

const emptyForm = {
  title: "",
  description: "",
  benefit_type: "percent",
  benefit_value: "",
  coupon_code: "",
  business_name: "",
  business_phone: "",
  website_url: "",
  category: "כללי",
  expires_at: "",
};

const buildDiscountLabel = (type: string, value: string) => {
  if (!value) return null;
  if (type === "percent") return `${value}% הנחה`;
  if (type === "consultation") return "שעת ייעוץ";
  return null;
};

const DealSubmitForm = ({ onSubmitted }: { onSubmitted?: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "הקובץ גדול מדי", description: "גודל מקסימלי 2MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user?.id) return null;
    const ext = logoFile.name.split(".").pop();
    const path = `deal-logos/${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("deals").upload(path, logoFile, { upsert: true });
    if (error) {
      console.error("Logo upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("deals").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.business_name.trim() || !form.description.trim()) {
      toast({ title: "נא למלא שם עסק, כותרת ותיאור", variant: "destructive" });
      return;
    }
    setSaving(true);

    const logoUrl = await uploadLogo();

    const { error } = await supabase.from("deals").insert({
      title: form.title,
      description: form.description,
      discount_label: buildDiscountLabel(form.benefit_type, form.benefit_value),
      benefit_type: form.benefit_type,
      benefit_value: form.benefit_value ? parseInt(form.benefit_value) : null,
      coupon_code: form.coupon_code || null,
      business_name: form.business_name,
      business_phone: form.business_phone || null,
      website_url: form.website_url ? (form.website_url.startsWith("http") ? form.website_url : `https://${form.website_url}`) : null,
      category: form.category,
      expires_at: form.expires_at || null,
      is_active: true,
      is_approved: false,
      created_by: user?.id,
      business_logo_url: logoUrl,
    } as any);

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ההטבה נשלחה לאישור!", description: "ההטבה תפורסם לאחר אישור מנהל המועדון." });
      sendTelegramNotification("new_deal", {
        title: form.title,
        business_name: form.business_name,
        description: form.description,
        category: form.category,
        discount_label: buildDiscountLabel(form.benefit_type, form.benefit_value),
      });
      setForm(emptyForm);
      setLogoFile(null);
      setLogoPreview(null);
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
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
        <Label className="font-body text-xs">לוגו בית העסק</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoSelect}
        />
        <div className="flex items-center gap-3 mt-1">
          {logoPreview ? (
            <div className="relative">
              <img src={logoPreview} alt="לוגו" className="h-14 w-14 rounded-lg object-contain border border-primary/20 bg-background p-1" />
              <button
                type="button"
                onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px]"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-14 w-14 rounded-lg border border-dashed border-primary/30 bg-background flex flex-col items-center justify-center gap-0.5 hover:border-primary/60 transition-colors"
            >
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">העלאה</span>
            </button>
          )}
          {logoPreview && (
            <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3 w-3 ml-1" />
              החלף
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label className="font-body text-xs">תיאור *</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={2} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BenefitFields
          benefitType={form.benefit_type}
          benefitValue={form.benefit_value}
          onTypeChange={(v) => setForm({ ...form, benefit_type: v })}
          onValueChange={(v) => setForm({ ...form, benefit_value: v })}
        />
        <div>
          <Label className="font-body text-xs">קוד קופון</Label>
          <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} className="bg-background" />
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="font-body text-xs">טלפון העסק</Label>
          <Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} className="bg-background" placeholder="972501234567" />
        </div>
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
