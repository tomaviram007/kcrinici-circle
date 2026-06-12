import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { CreditCard, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

interface EventRegistrationDialogProps {
  event: any | null;
  onClose: () => void;
  onRegistered?: (eventId: string) => void;
}

type Step = "form" | "payment" | "success";

const EMPTY_FORM = { first_name: "", last_name: "", email: "", phone: "", attendance_confirmed: false };

const EventRegistrationDialog = ({ event, onClose, onRegistered }: EventRegistrationDialogProps) => {
  const { toast } = useToast();
  const { fireRSVP } = useConfetti();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [registration, setRegistration] = useState<{ id: string; token: string; paymentLink: string | null; price: number | null } | null>(null);
  const [transactionRef, setTransactionRef] = useState("");

  // Pre-fill from the logged-in member's profile when available
  useEffect(() => {
    if (!event) return;
    setStep("form");
    setRegistration(null);
    setTransactionRef("");
    const prefill = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setForm(EMPTY_FORM);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();
      const [first = "", ...rest] = (profile?.full_name || "").split(" ");
      setForm({
        first_name: first,
        last_name: rest.join(" "),
        email: session.user.email || "",
        phone: profile?.phone || "",
        attendance_confirmed: false,
      });
    };
    prefill();
  }, [event?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!form.attendance_confirmed) {
      toast({ title: "יש לסמן אישור הגעה לאירוע", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-event", {
        body: { action: "register", event_id: event.id, ...form },
      });
      if (error) {
        const ctx = await (error as any).context?.json?.().catch(() => null);
        throw new Error(ctx?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);

      onRegistered?.(event.id);
      if (data.payment_required) {
        setRegistration({ id: data.registration_id, token: data.confirm_token, paymentLink: data.payment_link, price: data.price });
        setStep("payment");
      } else {
        fireRSVP();
        setStep("success");
      }
    } catch (err: any) {
      toast({ title: "שגיאה בהרשמה", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!registration) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-event", {
        body: {
          action: "confirm-payment",
          registration_id: registration.id,
          confirm_token: registration.token,
          transaction_ref: transactionRef.trim() || null,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      fireRSVP();
      setStep("success");
    } catch (err: any) {
      toast({ title: "שגיאה באישור התשלום", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogTitle className="font-serif text-xl text-center">
          {step === "form" && "הרשמה לאירוע"}
          {step === "payment" && "תשלום עבור האירוע"}
          {step === "success" && "ההרשמה הושלמה! 🎉"}
        </DialogTitle>
        <DialogDescription className="sr-only">טופס הרשמה ותשלום לאירוע</DialogDescription>

        {event && step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            <p className="font-serif text-center text-lg font-bold text-gold">{event.title}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="שם פרטי" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required className="bg-background font-body" />
              <Input placeholder="שם משפחה" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required className="bg-background font-body" />
            </div>
            <Input type="email" placeholder="כתובת מייל" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-background font-body" dir="ltr" />
            <Input type="tel" placeholder="מספר טלפון" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required className="bg-background font-body" dir="ltr" />
            <label className="flex items-center gap-2 font-body text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.attendance_confirmed}
                onChange={(e) => setForm({ ...form, attendance_confirmed: e.target.checked })}
                className="rounded border-border"
              />
              אני מאשר/ת הגעה לאירוע
            </label>
            {event.price ? (
              <p className="font-body text-xs text-muted-foreground text-center">
                ההשתתפות כרוכה בתשלום של <span className="text-gold font-semibold">₪{Number(event.price).toLocaleString()}</span> — לאחר שליחת הפרטים תועבר/י לתשלום.
              </p>
            ) : null}
            <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground font-body">
              {submitting ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <CheckCircle className="h-4 w-4 ml-1" />}
              {event.price ? "המשך לתשלום" : "הרשמה לאירוע"}
            </Button>
          </form>
        )}

        {event && step === "payment" && registration && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-secondary p-4 text-center space-y-1">
              <p className="font-body text-sm text-muted-foreground">סכום לתשלום עבור</p>
              <p className="font-serif text-lg font-bold text-foreground">{event.title}</p>
              <p className="font-serif text-3xl font-bold text-gold">₪{Number(registration.price).toLocaleString()}</p>
            </div>
            {registration.paymentLink ? (
              <a href={registration.paymentLink} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full gradient-gold text-primary-foreground font-body">
                  <CreditCard className="h-4 w-4 ml-1" />
                  מעבר לדף התשלום
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                </Button>
              </a>
            ) : (
              <p className="font-body text-sm text-center text-muted-foreground">פרטי התשלום יישלחו אליך על ידי המארגנים.</p>
            )}
            <div className="space-y-2">
              <Input
                placeholder="מספר עסקה / אסמכתא (לא חובה)"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="bg-background font-body"
                dir="ltr"
              />
              <Button onClick={handleConfirmPayment} disabled={submitting} variant="outline" className="w-full font-body border-gold/40 text-gold hover:bg-gold/10">
                {submitting ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <CheckCircle className="h-4 w-4 ml-1" />}
                ביצעתי את התשלום
              </Button>
            </div>
            <p className="font-body text-xs text-center text-muted-foreground leading-relaxed">
              ההרשמה תישמר גם אם התשלום לא הושלם כעת, בסטטוס "תשלום ממתין". לאחר אישור התשלום יישלח אליך מייל אישור.
            </p>
          </div>
        )}

        {event && step === "success" && (
          <div className="space-y-4 pt-2 text-center">
            <CheckCircle className="h-14 w-14 text-gold mx-auto" />
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              נרשמת בהצלחה לאירוע <span className="font-bold text-foreground">{event.title}</span>.
              <br />
              מייל אישור עם כל פרטי האירוע נשלח לכתובת שהזנת.
            </p>
            <Button onClick={onClose} className="w-full gradient-gold text-primary-foreground font-body">סגירה</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventRegistrationDialog;
