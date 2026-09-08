import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, PartyPopper, AlertTriangle } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import Seo from "@/components/Seo";

type Result = {
  ok: boolean;
  already?: boolean;
  returning?: boolean;
  event_title?: string;
  error?: string;
};

const EventCheckin = () => {
  const { eventId } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  const runCheckin = async (name?: string, contactValue?: string) => {
    if (!eventId) return;
    const isEmail = !!contactValue && contactValue.includes("@");
    const { data, error: rpcError } = await supabase.rpc("checkin_event", {
      _event_id: eventId,
      _full_name: name ?? null,
      _email: isEmail ? contactValue!.trim() : null,
      _phone: !isEmail && contactValue ? contactValue.trim() : null,
    });

    if (rpcError) {
      setError("משהו השתבש, נסה שוב בעוד רגע");
      return null;
    }
    const res = data as unknown as Result;
    setResult(res);
    if (res?.ok && !res.already) fireConfetti();
    return res;
  };

  useEffect(() => {
    if (authLoading || attempted.current || !eventId) return;
    attempted.current = true;

    (async () => {
      if (user) {
        await runCheckin();
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !contact.trim()) {
      setError("צריך שם וגם טלפון או אימייל");
      return;
    }
    setSubmitting(true);
    await runCheckin(fullName, contact);
    setSubmitting(false);
  };

  const success = result?.ok && result.error !== "identify_required";

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <Seo title="כניסה לאירוע | הגברים של ק.קרניצי" description="סימון נוכחות באירוע" path={`/checkin/${eventId ?? ""}`} />
      <div className="w-full max-w-sm rounded-3xl border border-gold/25 bg-card/80 p-6 text-center shadow-xl backdrop-blur">
        {checking || authLoading ? (
          <div className="py-10">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />
            <p className="mt-4 font-body text-sm text-muted-foreground">רגע, מסמנים אותך...</p>
          </div>
        ) : success ? (
          <div className="py-6">
            {result?.already ? (
              <CheckCircle2 className="mx-auto h-14 w-14 text-gold" />
            ) : (
              <PartyPopper className="mx-auto h-14 w-14 text-gold" />
            )}
            <h1 className="mt-4 font-serif text-2xl font-bold text-foreground">
              {result?.already ? "כבר סימנו אותך" : "נרשמת כנוכח באירוע. תהנה 🍻"}
            </h1>
            {result?.event_title && (
              <p className="mt-2 font-body text-sm text-muted-foreground">{result.event_title}</p>
            )}
            {result?.returning && (
              <p className="mt-4 rounded-lg bg-gold/10 px-3 py-2 font-body text-xs text-gold">
                טוב לראות אותך שוב במועדון
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-right">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold text-foreground">כניסה לאירוע</h1>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                {result?.event_title || "רק שני פרטים ואתה בפנים"}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">שם מלא</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 bg-background border-border"
                placeholder="ישראל ישראלי"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">טלפון או אימייל</label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="h-11 bg-background border-border"
                placeholder="050-0000000"
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="flex items-center gap-2 font-body text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-gold py-6 font-body text-primary-foreground"
            >
              {submitting ? "רושם..." : "סמן נוכחות"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default EventCheckin;
