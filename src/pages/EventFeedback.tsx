import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, Star, ArrowRight, ArrowLeft, PartyPopper } from "lucide-react";
import { getAnonId, trackAction } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import gsap from "gsap";

type EventInfo = { id: string; title: string; event_date: string };

const ATTEND_REASONS = [
  "סקרנות והיכרות עם המועדון",
  "הנושא של המפגש עניין אותי",
  "חבר הזמין אותי",
  "רציתי להכיר אנשים חדשים",
  "נטוורקינג ועסקים",
  "אחר",
];

const MEETUP_TYPES = [
  "מפגש חברתי בלתי פורמלי",
  "הרצאה או פאנל",
  "סדנה מעשית",
  "ספורט או פעילות בחוץ",
  "ערב עסקים ונטוורקינג",
  "מפגש משפחות",
  "טעימות, בישול או ברביקיו",
];

const LIKELIHOOD_LABELS = ["ממש לא", "כנראה שלא", "אולי", "סביר", "בוודאות"];

interface FormState {
  enjoyment: number | null;
  met_new_person: boolean | null;
  new_people_count: number | null;
  keep_in_touch: boolean | null;
  keep_in_touch_name: string;
  attend_reason: string;
  preferred_meetup_type: string;
  meaningful_moment: string;
  improvement: string;
  next_event_likelihood: number | null;
  nps: number | null;
}

const emptyForm: FormState = {
  enjoyment: null,
  met_new_person: null,
  new_people_count: null,
  keep_in_touch: null,
  keep_in_touch_name: "",
  attend_reason: "",
  preferred_meetup_type: "",
  meaningful_moment: "",
  improvement: "",
  next_event_likelihood: null,
  nps: null,
};

const StepShell = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-5">
    <div className="space-y-1.5 text-right">
      <h2 className="font-serif text-xl font-bold leading-snug text-foreground sm:text-2xl">{title}</h2>
      {subtitle && <p className="font-body text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const ChoiceButton = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full rounded-xl border px-4 py-3 text-right font-body text-[15px] transition-all active:scale-[0.98]",
      active
        ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
        : "border-border bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
    )}
  >
    {children}
  </button>
);

const EventFeedback = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const cardRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    document.title = "משוב על המפגש | הגברים של ק.קרניצי";
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!eventId) return;
      const { data } = await supabase.rpc("get_event_feedback_info", { _event_id: eventId });
      setEvent(((data as EventInfo[] | null) || [])[0] || null);
      setLoading(false);
    };
    load();
  }, [eventId]);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
  }, [step, started, done]);

  const steps = useMemo(() => {
    const list: Array<{ key: string; valid: boolean; render: () => React.ReactNode }> = [];

    list.push({
      key: "enjoyment",
      valid: form.enjoyment !== null,
      render: () => (
        <StepShell title="עד כמה נהנית מהמפגש היום?" subtitle="פשוט תבחר כוכבים, בלי לחשוב יותר מדי">
          <div className="flex flex-row-reverse items-center justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} כוכבים`}
                onClick={() => set("enjoyment", n)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star
                  className={cn(
                    "h-11 w-11 transition-colors",
                    form.enjoyment && n <= form.enjoyment
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
        </StepShell>
      ),
    });

    list.push({
      key: "met_new",
      valid: form.met_new_person !== null && (form.met_new_person === false || form.new_people_count !== null),
      render: () => (
        <StepShell title="הכרת לפחות אדם אחד חדש הערב?">
          <div className="grid grid-cols-2 gap-3">
            <ChoiceButton active={form.met_new_person === true} onClick={() => set("met_new_person", true)}>
              <span className="block text-center">כן</span>
            </ChoiceButton>
            <ChoiceButton
              active={form.met_new_person === false}
              onClick={() => {
                set("met_new_person", false);
                set("new_people_count", 0);
                set("keep_in_touch", false);
              }}
            >
              <span className="block text-center">לא</span>
            </ChoiceButton>
          </div>
          {form.met_new_person && (
            <div className="space-y-2 pt-1">
              <p className="font-body text-sm text-muted-foreground">עם כמה אנשים חדשים יצא לך לשוחח?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <ChoiceButton key={n} active={form.new_people_count === n} onClick={() => set("new_people_count", n)}>
                    <span className="block text-center">{n === 5 ? "5+" : n}</span>
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}
        </StepShell>
      ),
    });

    if (form.met_new_person) {
      list.push({
        key: "keep_in_touch",
        valid: form.keep_in_touch !== null,
        render: () => (
          <StepShell title="יש מישהו שהכרת היום שתרצה להמשיך איתו בקשר?">
            <div className="grid grid-cols-2 gap-3">
              <ChoiceButton active={form.keep_in_touch === true} onClick={() => set("keep_in_touch", true)}>
                <span className="block text-center">כן</span>
              </ChoiceButton>
              <ChoiceButton
                active={form.keep_in_touch === false}
                onClick={() => {
                  set("keep_in_touch", false);
                  set("keep_in_touch_name", "");
                }}
              >
                <span className="block text-center">עדיין לא</span>
              </ChoiceButton>
            </div>
            {form.keep_in_touch && (
              <Input
                dir="rtl"
                placeholder="השם שלו (לא חובה)"
                value={form.keep_in_touch_name}
                maxLength={120}
                onChange={(e) => set("keep_in_touch_name", e.target.value)}
                className="text-right"
              />
            )}
          </StepShell>
        ),
      });
    }

    list.push({
      key: "reason",
      valid: !!form.attend_reason,
      render: () => (
        <StepShell title="מה הביא אותך למפגש?">
          <div className="grid gap-2">
            {ATTEND_REASONS.map((r) => (
              <ChoiceButton key={r} active={form.attend_reason === r} onClick={() => set("attend_reason", r)}>
                {r}
              </ChoiceButton>
            ))}
          </div>
        </StepShell>
      ),
    });

    list.push({
      key: "meetup_type",
      valid: !!form.preferred_meetup_type,
      render: () => (
        <StepShell title="איזה מפגש היית הכי רוצה שנעשה בהמשך?">
          <div className="grid gap-2">
            {MEETUP_TYPES.map((r) => (
              <ChoiceButton
                key={r}
                active={form.preferred_meetup_type === r}
                onClick={() => set("preferred_meetup_type", r)}
              >
                {r}
              </ChoiceButton>
            ))}
          </div>
        </StepShell>
      ),
    });

    list.push({
      key: "free_text",
      valid: true,
      render: () => (
        <StepShell title="בכמה מילים שלך" subtitle="אפשר גם לדלג, אבל זה מה שהכי עוזר לנו">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-right font-body text-sm text-muted-foreground">
                מה היה הרגע הכי משמעותי עבורך הערב?
              </label>
              <Textarea
                dir="rtl"
                rows={3}
                maxLength={1000}
                value={form.meaningful_moment}
                onChange={(e) => set("meaningful_moment", e.target.value)}
                className="resize-none text-right"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-right font-body text-sm text-muted-foreground">
                מה אפשר לשפר במפגש הבא?
              </label>
              <Textarea
                dir="rtl"
                rows={3}
                maxLength={1000}
                value={form.improvement}
                onChange={(e) => set("improvement", e.target.value)}
                className="resize-none text-right"
              />
            </div>
          </div>
        </StepShell>
      ),
    });

    list.push({
      key: "likelihood",
      valid: form.next_event_likelihood !== null,
      render: () => (
        <StepShell title="עד כמה סביר שתגיע גם למפגש הבא?">
          <div className="grid gap-2">
            {LIKELIHOOD_LABELS.map((label, i) => (
              <ChoiceButton
                key={label}
                active={form.next_event_likelihood === i + 1}
                onClick={() => set("next_event_likelihood", i + 1)}
              >
                {label}
              </ChoiceButton>
            ))}
          </div>
        </StepShell>
      ),
    });

    list.push({
      key: "nps",
      valid: form.nps !== null,
      render: () => (
        <StepShell
          title="עד כמה תמליץ לחבר מהשכונה להצטרף למועדון?"
          subtitle="0 = ממש לא, 10 = בטוח כן"
        >
          <div dir="ltr" className="grid grid-cols-6 gap-2">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => set("nps", n)}
                className={cn(
                  "aspect-square rounded-xl border font-body text-base transition-all active:scale-95",
                  form.nps === n
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary/50"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </StepShell>
      ),
    });

    return list;
  }, [form]);

  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step === steps.length - 1;
  const progress = Math.round(((step + (current?.valid ? 1 : 0)) / steps.length) * 100);

  const handleSubmit = async () => {
    if (!eventId) return;
    setSubmitting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("submit_event_feedback", {
      _event_id: eventId,
      _anon_id: getAnonId(),
      _enjoyment: form.enjoyment!,
      _met_new_person: !!form.met_new_person,
      _new_people_count: form.new_people_count,
      _keep_in_touch: !!form.keep_in_touch,
      _keep_in_touch_name: form.keep_in_touch_name.trim() || null,
      _attend_reason: form.attend_reason || null,
      _preferred_meetup_type: form.preferred_meetup_type || null,
      _meaningful_moment: form.meaningful_moment.trim() || null,
      _improvement: form.improvement.trim() || null,
      _next_event_likelihood: form.next_event_likelihood,
      _nps: form.nps,
    });
    setSubmitting(false);
    if (rpcError) {
      setError("משהו השתבש בשליחה. נסה שוב בעוד רגע.");
      return;
    }
    trackAction("event_feedback_submit", { event_id: eventId });
    setDone(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">הקישור לא נמצא</h1>
        <p className="font-body text-muted-foreground">ייתכן שהקוד שסרקת שייך למפגש שכבר הוסר.</p>
        <Button asChild variant="outline">
          <Link to="/">חזרה לעמוד הבית</Link>
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.event_date).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div
          ref={cardRef}
          className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-xl backdrop-blur-sm sm:p-7"
        >
          {done ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <PartyPopper className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-foreground">תודה רבה!</h1>
              <p className="font-body text-muted-foreground">
                המשוב שלך נקלט, והוא בדיוק מה שעוזר לנו לעשות את המפגש הבא טוב יותר. נתראה בקרוב.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/">לאתר המועדון</Link>
              </Button>
            </div>
          ) : !started ? (
            <div className="space-y-5 text-center">
              <p className="font-body text-sm text-primary">{eventDate}</p>
              <h1 className="font-serif text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                {event.title}
              </h1>
              <p className="font-body text-muted-foreground">
                שמחנו שהיית איתנו. כמה שאלות קצרות, פחות מדקה, וזה נשאר בינינו.
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setStarted(true);
                  trackAction("event_feedback_start", { event_id: event.id });
                }}
              >
                מתחילים
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between font-body text-xs text-muted-foreground">
                  <span>
                    שאלה {step + 1} מתוך {steps.length}
                  </span>
                  <span className="truncate ps-3 text-left">{event.title}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {current.render()}

              {error && <p className="text-right font-body text-sm text-destructive">{error}</p>}

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="שאלה קודמת"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="lg"
                  className="flex-1 gap-2"
                  disabled={!current.valid || submitting}
                  onClick={() => (isLast ? handleSubmit() : setStep((s) => s + 1))}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLast ? (
                    <>
                      <Check className="h-4 w-4" /> שליחה
                    </>
                  ) : (
                    <>
                      המשך <ArrowLeft className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 text-center font-body text-xs text-muted-foreground">
          הגברים של ק.קרניצי
        </p>
      </div>
    </div>
  );
};

export default EventFeedback;
