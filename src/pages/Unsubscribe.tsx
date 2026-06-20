import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MailX, CheckCircle2 } from "lucide-react";

const FN_URL =
  "https://wzbvdpgoyetmgluvhygf.supabase.co/functions/v1/handle-unsubscribe";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const initialEmail = params.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || initialEmail) return;
    fetch(`${FN_URL}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (d?.email) setEmail(d.email); })
      .catch(() => {});
  }, [token, initialEmail]);

  async function submit() {
    setError(null);
    if (!email && !token) {
      setError("נא להזין כתובת אימייל");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, email: email || undefined, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "שגיאה");
      setDone(true);
    } catch (e: any) {
      setError(e.message || "שגיאה בלתי צפויה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          {done ? (
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          ) : (
            <MailX className="w-12 h-12 text-primary" />
          )}
          <h1 className="text-2xl font-bold">
            {done ? "הוסרת מרשימת התפוצה" : "הסרה מרשימת התפוצה"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {done
              ? "בקשתך נקלטה ולא נשלח אליך עוד דיוור. מנהל המועדון קיבל הודעה."
              : "אנו מצטערים לראותך עוזב. אשר את ההסרה ולא תקבל יותר מיילים מהמועדון."}
          </p>
        </div>

        {!done && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">כתובת אימייל</Label>
              <Input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={!!token && !!initialEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">סיבה (אופציונלי)</Label>
              <Textarea
                id="reason" value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ספרו לנו למה אתם עוזבים..."
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "אשר הסרה"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
