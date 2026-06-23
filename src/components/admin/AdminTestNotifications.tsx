import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Loader2, FlaskConical } from "lucide-react";

const DEFAULT_WHATSAPP = (name: string, origin: string) =>
  `היי ${name}! 👋🏻 שמחים לבשר לך שבקשת ההצטרפות שלך למועדון קרניצי אושרה. ברוך הבא!\n\nמעכשיו יש לך גישה מלאה לכל התכנים, ההטבות והקהילה שלנו.\nמחכים לראות אותך בפנים: ${origin}`;

const openWhatsApp = (phone: string, message: string) => {
  const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
};

const AdminTestNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setPhone(data?.phone || "");
        setName(data?.full_name || user.email?.split("@")[0] || "חבר");
      });
  }, [user]);

  useEffect(() => {
    setWaMessage(DEFAULT_WHATSAPP(name || "חבר", window.location.origin));
  }, [name]);

  const handleSendTestEmail = async () => {
    if (!user) return;
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke("notify-member", {
      body: { userId: user.id, action: "approve" },
    });
    setSendingEmail(false);
    if (error) {
      toast({ title: "שגיאה בשליחת המייל", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "המייל נשלח",
        description: `מייל בדיקה נשלח אל ${user.email}. בדוק בתיבת הדואר (כולל תיקיית קידום מכירות / ספאם).`,
      });
    }
  };

  const handleSendTestWhatsApp = () => {
    if (!phone) {
      toast({ title: "חסר מספר טלפון", description: "הוסף מספר טלפון לבדיקה", variant: "destructive" });
      return;
    }
    openWhatsApp(phone, waMessage);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">בדיקת התראות לפני שליחה</h2>
          <p className="text-xs text-muted-foreground">שלח לעצמך מייל ו-וואטסאפ לדוגמה כדי לוודא שהעיצוב והשפה תקינים בכל הספקים.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Email card */}
        <Card className="p-4 sm:p-5 bg-card/60 border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h3 className="font-serif font-bold text-foreground">מייל ברוך הבא לבדיקה</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-6">
            יישלח המייל הרשמי של אישור חברות לכתובת:{" "}
            <strong className="text-foreground">{user?.email || "—"}</strong>
            <br />
            תוכן וזהות חזותית זהים למה שיקבלו החברים החדשים.
          </p>
          <Button onClick={handleSendTestEmail} disabled={sendingEmail || !user} className="w-full gap-2">
            {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            שלח אליי מייל בדיקה
          </Button>
          <p className="text-[11px] text-muted-foreground">
            אם המייל אינו מגיע — בדוק ב-Gmail גם תיבת קידום מכירות / ספאם, ולחץ "Show original" כדי לאמת רקע ועיצוב.
          </p>
        </Card>

        {/* WhatsApp card */}
        <Card className="p-4 sm:p-5 bg-card/60 border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <h3 className="font-serif font-bold text-foreground">וואטסאפ ברוך הבא לבדיקה</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-name" className="text-xs">שם לדוגמה</Label>
            <Input id="test-name" value={name} onChange={(e) => setName(e.target.value)} dir="rtl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-phone" className="text-xs">מספר נייד שלך (לבדיקה)</Label>
            <Input
              id="test-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-wa" className="text-xs">תוכן ההודעה</Label>
            <Textarea
              id="test-wa"
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              rows={6}
              dir="rtl"
              className="text-sm leading-7"
            />
          </div>
          <Button onClick={handleSendTestWhatsApp} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="h-4 w-4" />
            פתח וואטסאפ עם הודעת בדיקה
          </Button>
          <p className="text-[11px] text-muted-foreground">
            נפתח חלון וואטסאפ אליך אישית. ודא שאימוג'י 👋🏻 מופיע כראוי (לא ריבוע) — כך זה ייראה למשתמשים.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AdminTestNotifications;
