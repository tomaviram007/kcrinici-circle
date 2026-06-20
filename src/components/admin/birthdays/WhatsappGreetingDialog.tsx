import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Save, MessageCircle, X, AlertCircle } from "lucide-react";

interface Member {
  name: string;
  fullName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: number;
  monthName: string;
  members: Member[];
}

const DEFAULT_TEMPLATE = `מזל טוב לחוגגי חודש {{month_name}} 🎉
{{birthday_names}},
מאחלים לכם המון בריאות, שמחה, הצלחה ורגעים טובים.
באהבה, {{club_name}} ❤️`;

const formatNames = (names: string[]) => {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ו${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;
};

const render = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

const WhatsappGreetingDialog = ({ open, onOpenChange, monthName, members }: Props) => {
  const { toast } = useToast();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [message, setMessage] = useState("");
  const [clubName, setClubName] = useState("מועדון הגברים");
  const [targetType, setTargetType] = useState<string>("clipboard");
  const [managerPhone, setManagerPhone] = useState("");
  const [groupUrl, setGroupUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", [
          "birthday_whatsapp_template",
          "club_name",
          "birthday_whatsapp_target_type",
          "birthday_whatsapp_manager_phone",
          "birthday_whatsapp_group_url",
        ]);
      const map: Record<string, string> = {};
      for (const r of (data || []) as any[]) map[r.key] = r.value || "";
      const tpl = map.birthday_whatsapp_template || DEFAULT_TEMPLATE;
      const cn = map.club_name || "מועדון הגברים";
      setTemplate(tpl);
      setClubName(cn);
      setTargetType(map.birthday_whatsapp_target_type || "clipboard");
      setManagerPhone(map.birthday_whatsapp_manager_phone || "");
      setGroupUrl(map.birthday_whatsapp_group_url || "");

      const names = members.map((m) => m.name);
      setMessage(
        render(tpl, {
          month_name: monthName,
          birthday_names: formatNames(names),
          birthday_count: String(names.length),
          club_name: cn,
        })
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, monthName, members.length]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "הברכה הועתקה בהצלחה", description: "אפשר להדביק בקבוצה" });
    } catch {
      toast({ title: "העתקה נכשלה", variant: "destructive" });
    }
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(message);
    let url = "";
    if (targetType === "group_url" && groupUrl) {
      // Open the group link directly + copy text to clipboard
      navigator.clipboard.writeText(message).catch(() => {});
      window.open(groupUrl, "_blank");
      toast({ title: "הברכה הועתקה והקבוצה נפתחה", description: "הדבק את הטקסט בצ׳אט" });
      return;
    }
    if (targetType === "manager_phone" && managerPhone) {
      const clean = managerPhone.replace(/[^0-9]/g, "").replace(/^0/, "972");
      url = `https://wa.me/${clean}?text=${text}`;
    } else if (targetType === "clipboard") {
      navigator.clipboard.writeText(message).catch(() => {});
      toast({ title: "הברכה הועתקה ללוח" });
      return;
    } else {
      url = `https://wa.me/?text=${text}`;
    }
    window.open(url, "_blank");
    toast({ title: "WhatsApp נפתח בהצלחה" });
  };

  const handleSaveTemplate = async () => {
    // Save the textarea content back as the template (so admin can refine the boilerplate).
    // The user's current message may contain hardcoded names; we save it as-is to allow custom phrasing.
    const { error } = await supabase
      .from("site_settings")
      .update({ value: message, updated_at: new Date().toISOString() })
      .eq("key", "birthday_whatsapp_template");
    if (error) {
      // try insert
      await supabase.from("site_settings").insert({ key: "birthday_whatsapp_template", value: message });
    }
    toast({ title: "התבנית נשמרה" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>ברכת WhatsApp לחוגגי חודש {monthName}</DialogTitle>
          <DialogDescription>
            ערוך את הטקסט לפי הצורך, ואז פתח ב-WhatsApp או העתק ללוח.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="font-body text-base leading-relaxed"
            dir="rtl"
          />
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              שים לב: WhatsApp לא מאפשר אזכור אמיתי (@) של חברי קבוצה אוטומטית. השמות מופיעים כטקסט בלבד בתוך ההודעה.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            יעד נוכחי: <span className="font-bold">
              {targetType === "manager_phone" ? `מנהל המועדון (${managerPhone || "לא הוגדר"})` :
               targetType === "group_url" ? "קישור לקבוצה" :
               targetType === "open" ? "פתיחת WhatsApp ללא יעד" :
               "העתקה ללוח בלבד"}
            </span>
            {" "}, ניתן לשנות בהגדרות תזמון.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" /> ביטול
          </Button>
          <Button variant="outline" onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 ml-1" /> שמור כתבנית
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 ml-1" /> העתק
          </Button>
          <Button onClick={handleOpenWhatsApp} className="gradient-gold text-primary-foreground">
            <MessageCircle className="h-4 w-4 ml-1" /> פתח ב-WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsappGreetingDialog;
