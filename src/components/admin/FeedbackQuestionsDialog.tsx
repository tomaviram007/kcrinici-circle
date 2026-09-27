import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, X, HelpCircle, Pencil } from "lucide-react";
import { FEEDBACK_FIXED_QUESTIONS } from "@/lib/feedback-fixed-questions";

export type QuestionType = "text" | "single" | "multi" | "rating";

export interface FeedbackQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  is_required: boolean;
  display_order: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "תשובה חופשית",
  single: "בחירה אחת מתוך רשימה",
  multi: "בחירה מרובה",
  rating: "דירוג כוכבים (1 עד 5)",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: { kind: "form" | "event"; id: string; title: string; date: string } | null;
  onSaved?: () => void;
  onDetailsSaved?: (title: string, date: string) => void;
}

const FeedbackQuestionsDialog = ({ open, onOpenChange, target, onSaved, onDetailsSaved }: Props) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [text, setText] = useState("");
  const [type, setType] = useState<QuestionType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const targetId = target?.id;
  const targetKind = target?.kind;

  const load = useCallback(async () => {
    if (!targetId || !targetKind) return;
    setLoading(true);
    const column = targetKind === "form" ? "form_id" : "event_id";
    const { data, error } = await supabase
      .from("feedback_questions")
      .select("id, question_text, question_type, options, is_required, display_order")
      .eq(column, targetId)
      .order("display_order", { ascending: true });
    setLoadError(!!error);
    if (!error) setQuestions((data as FeedbackQuestion[] | null) || []);
    setLoading(false);
  }, [targetId, targetKind]);

  useEffect(() => {
    if (open) {
      setText("");
      setType("text");
      setRequired(false);
      setOptions(["", ""]);
      setQuestions([]);
      setShowAdd(false);
      setEditingTitle(false);
      setDraftTitle(target?.title ?? "");
      setDraftDate(target?.date ? new Date(target.date).toLocaleDateString("en-CA") : "");
      void load();
    }
  // Only reset when opening a different questionnaire, not after updating its title/date.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, load]);

  const needsOptions = type === "single" || type === "multi";

  const saveTitle = async () => {
    if (!target || savingTitle) return;
    const title = draftTitle.trim();
    if (!title || !draftDate) {
      toast({ title: "יש למלא כותרת ותאריך לשאלון", variant: "destructive" });
      return;
    }
    const originalDate = new Date(target.date).toLocaleDateString("en-CA");
    if (title === target.title && draftDate === originalDate) {
      setEditingTitle(false);
      return;
    }
    const original = new Date(target.date);
    const [year, month, day] = draftDate.split("-").map(Number);
    if (!year || !month || !day || !Number.isFinite(original.getTime())) return;
    original.setFullYear(year, month - 1, day);
    const date = original.toISOString();
    setSavingTitle(true);
    const { error } = await supabase
      .from(target.kind === "form" ? "feedback_forms" : "events")
      .update(target.kind === "form" ? { title, form_date: date } : { title, event_date: date })
      .eq("id", target.id);
    setSavingTitle(false);
    if (error) {
      toast({ title: "שגיאה בעדכון הכותרת", description: error.message, variant: "destructive" });
      return;
    }
    setEditingTitle(false);
    onDetailsSaved?.(title, date);
    toast({ title: "פרטי השאלון עודכנו" });
  };

  const addQuestion = async () => {
    if (!target) return;
    if (!text.trim()) {
      toast({ title: "יש לכתוב את השאלה", variant: "destructive" });
      return;
    }
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (needsOptions && cleanOptions.length < 2) {
      toast({ title: "צריך לפחות שתי אפשרויות לבחירה", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback_questions").insert({
      [target.kind === "form" ? "form_id" : "event_id"]: target.id,
      question_text: text.trim(),
      question_type: type,
      options: needsOptions ? cleanOptions : [],
      is_required: required,
      display_order: questions.length,
      created_by: userData.user?.id ?? null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "שגיאה בשמירת השאלה", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
    setOptions(["", ""]);
    setRequired(false);
    setShowAdd(false);
    await load();
    onSaved?.();
    toast({ title: "השאלה נוספה לשאלון" });
  };

  const removeQuestion = async (id: string) => {
    const { error } = await supabase.from("feedback_questions").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    onSaved?.();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setQuestions(reordered);
    await Promise.all(
      reordered.map((q, i) => supabase.from("feedback_questions").update({ display_order: i }).eq("id", q.id))
    );
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[88vh] max-w-2xl overflow-y-auto text-right">
        <DialogHeader className="items-start text-right sm:text-right">
          <DialogTitle className="w-full pl-8 text-right font-serif text-lg">
            שאלות השאלון
          </DialogTitle>
          <div className="flex w-full items-center gap-2 text-right">
            {editingTitle ? (
              <div className="flex w-full flex-wrap items-center gap-2">
                <Input dir="rtl" aria-label="כותרת השאלון" className="min-w-0 flex-1 text-right" maxLength={200} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); }} />
                <Input type="date" aria-label="תאריך השאלון" className="w-full sm:w-40" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
                <Button size="sm" disabled={savingTitle || !draftTitle.trim() || !draftDate} onClick={saveTitle}>{savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setDraftTitle(target?.title ?? ""); setDraftDate(target?.date ? new Date(target.date).toLocaleDateString("en-CA") : ""); setEditingTitle(false); }}>ביטול</Button>
              </div>
            ) : (
              <>
                <span className="min-w-0 break-words font-body text-sm text-muted-foreground">{target?.title} · {target?.date && new Date(target.date).toLocaleDateString("he-IL")}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="עריכת כותרת ותאריך השאלון" title="עריכת כותרת ותאריך השאלון" onClick={() => setEditingTitle(true)}><Pencil className="h-4 w-4" /></Button>
              </>
            )}
          </div>
          {editingTitle && target?.kind === "event" && <p className="font-body text-xs text-muted-foreground">שינוי הכותרת והתאריך יעדכן גם את האירוע באתר.</p>}
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 font-body text-sm font-bold text-foreground"><HelpCircle className="h-4 w-4 text-primary" /> שאלות השאלון</h4>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAdd((v) => !v)}><Plus className="h-4 w-4" /> הוספת שאלה</Button>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : loadError ? (
              <p role="alert" className="font-body text-sm text-destructive">לא הצלחנו לטעון את השאלות. נסה לסגור ולפתוח את החלון שוב.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="font-body text-xs font-bold text-muted-foreground">שאלות קבועות ({FEEDBACK_FIXED_QUESTIONS.length})</p>
                  {FEEDBACK_FIXED_QUESTIONS.map((q, i) => (
                    <div key={q.label} className="border-b border-border/60 py-2 text-right font-body text-sm text-foreground">
                      <span className="text-muted-foreground">{i + 1}. </span>{q.label}
                      {"note" in q && <span className="block text-xs text-muted-foreground">{q.note}</span>}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="font-body text-xs font-bold text-muted-foreground">שאלות שהוספת ({questions.length})</p>
                  {questions.length === 0 ? <p className="font-body text-sm text-muted-foreground">עדיין לא נוספו שאלות נוספות.</p> : questions.map((q, i) => (
                    <div key={q.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-right">
                        <p className="font-body text-sm font-bold text-foreground">{FEEDBACK_FIXED_QUESTIONS.length + i + 1}. {q.question_text}</p>
                        <p className="font-body text-xs text-muted-foreground">{TYPE_LABELS[q.question_type]}{q.is_required && " · חובה"}{q.options.length > 0 && ` · ${q.options.join(" / ")}`}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="icon" variant="ghost" aria-label="העלאה למעלה" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="הורדה למטה" disabled={i === questions.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="מחיקת שאלה" onClick={() => removeQuestion(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {showAdd && <section className="rounded-lg border border-border bg-background/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-body text-sm font-bold text-foreground">
              <Plus className="h-4 w-4 text-primary" /> הוספת שאלה
            </h4>
            <div className="space-y-3">
              <Textarea
                dir="rtl"
                className="text-right"
                placeholder="מה תרצה לשאול?"
                value={text}
                maxLength={300}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-end gap-2 rounded-lg border border-border px-3">
                  <span className="font-body text-sm text-muted-foreground">שאלת חובה</span>
                  <Switch checked={required} onCheckedChange={setRequired} />
                </div>
              </div>

              {needsOptions && (
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        dir="rtl"
                        className="text-right"
                        placeholder={`אפשרות ${i + 1}`}
                        value={o}
                        onChange={(e) => {
                          const copy = [...options];
                          copy[i] = e.target.value;
                          setOptions(copy);
                        }}
                      />
                      {options.length > 2 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="הסרת אפשרות"
                          onClick={() => setOptions(options.filter((_, x) => x !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 8 && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOptions([...options, ""])}>
                      <Plus className="h-3.5 w-3.5" /> אפשרות נוספת
                    </Button>
                  )}
                </div>
              )}

              <Button className="w-full gap-1.5" disabled={saving} onClick={addQuestion}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                שמירת השאלה
              </Button>
            </div>
          </section>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackQuestionsDialog;
