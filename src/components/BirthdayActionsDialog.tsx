import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, Mail, MessageCircle, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BirthdayPerson {
  user_id: string;
  full_name: string;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface Props {
  person: BirthdayPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: (userId: string) => void;
}

const BirthdayActionsDialog = ({ person, open, onOpenChange, onOpenProfile }: Props) => {
  const [sendingEmail, setSendingEmail] = useState(false);

  if (!person) return null;

  const firstName = person.full_name?.split(" ")[0] || "";

  const formatDate = (d?: string | null) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  };

  const handleWhatsApp = async () => {
    let phone = person.phone;
    if (!phone) {
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("user_id", person.user_id)
        .maybeSingle();
      phone = data?.phone || null;
    }
    if (!phone) {
      toast.error("לחבר זה אין מספר טלפון רשום");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(
      `היי ${firstName}, בשם מועדון הגברים של ק. קריניצי – המון מזל טוב ליום הולדתך! 🎂\nמאחלים לך בריאות, שמחה והצלחה!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    onOpenChange(false);
  };

  const handleEmail = async () => {
    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-birthday-emails?force=1&resend=1&user_id=${person.user_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            apikey: (supabase as any).supabaseKey ?? "",
          },
        }
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok && (body.sent > 0 || body.ok)) {
        toast.success(`ברכת יום הולדת נשלחה במייל ל${firstName} 🎂`);
        onOpenChange(false);
      } else {
        toast.error(body?.error || body?.results?.[0]?.error || "שליחת המייל נכשלה");
      }
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בשליחת המייל");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleProfile = () => {
    onOpenChange(false);
    onOpenProfile(person.user_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Cake className="h-5 w-5 text-gold" />
            ברכת יום הולדת
          </DialogTitle>
          <DialogDescription className="font-body">
            {person.full_name}
            {person.birth_date && <> · {formatDate(person.birth_date)}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleWhatsApp}
            className="w-full gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-body"
          >
            <MessageCircle className="h-4 w-4" />
            שלח ברכת WhatsApp
          </Button>

          <Button
            onClick={handleEmail}
            disabled={sendingEmail}
            className="w-full gap-2 gradient-gold text-primary-foreground font-body"
          >
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sendingEmail ? "שולח..." : "שלח ברכת מייל"}
          </Button>

          <Button
            onClick={handleProfile}
            variant="outline"
            className="w-full gap-2 font-body"
          >
            <User className="h-4 w-4" />
            פתח פרופיל
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthdayActionsDialog;
