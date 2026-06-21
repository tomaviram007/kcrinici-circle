import { useState } from "react";
import { Cake, Send, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBirthdaysToday, BirthdayMember } from "@/hooks/useBirthdaysToday";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminBirthdayWidget = () => {
  const { birthdays, loading } = useBirthdaysToday();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleWhatsApp = (person: BirthdayMember) => {
    const cleanPhone = person.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(
      `היי ${person.full_name}, בשם מועדון הגברים של קרניצי – המון מזל טוב ליום הולדתך! 🎂 מאחלים לך בריאות, שמחה והצלחה!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleEmail = async (person: BirthdayMember) => {
    setSendingId(person.user_id);
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
        toast.success(`ברכת מייל נשלחה ל${person.full_name} 🎂`);
      } else {
        toast.error(body?.error || body?.results?.[0]?.error || "שליחת המייל נכשלה");
      }
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בשליחה");
    } finally {
      setSendingId(null);
    }
  };

  if (loading || birthdays.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:p-5" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Cake className="h-5 w-5 text-gold" />
        <h3 className="font-serif text-base font-bold text-foreground">
          🎉 היום חוגגים יום הולדת
        </h3>
      </div>
      <div className="space-y-2">
        {birthdays.map((person) => (
          <div
            key={person.user_id}
            className="flex items-center justify-between gap-3 rounded-lg bg-card/80 border border-border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gold/10 border border-gold/20 overflow-hidden flex items-center justify-center">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Cake className="h-4 w-4 text-gold" />
                )}
              </div>
              <div>
                <p className="font-serif text-sm font-bold text-foreground">{person.full_name}</p>
                <p className="font-body text-xs text-muted-foreground">{person.profession}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleWhatsApp(person)}
              className="gradient-gold text-primary-foreground font-body gap-1 text-xs"
            >
              <Send className="h-3 w-3" />
              שלח ברכה
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminBirthdayWidget;
