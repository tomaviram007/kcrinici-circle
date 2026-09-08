import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, X, HelpCircle } from "lucide-react";

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
  target: { kind: "form" | "event"; id: string; title: string } | null;
  onSaved?: () => void;
}

const FeedbackQuestionsDialog = ({ open, onOpenChange, target, onSaved }: Props) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [text, setText] = useState("");
  const [type, setType] = useState<QuestionType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);

  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    const column = target.kind === "form" ? "form_id" : "event_id";
    const { data } = await supabase
      .from("feedback_questions")
      .select("id, question_text, question_type, options, is_required, display_order")
      .eq(column, target.id)
      .order("display_order", { ascending: true });
    setQuestions((data as FeedbackQuestion[] | null) || []);
    setLoading(false);
  }, [target]);

  useEffect(() => {
    if (open) {
      setText("");
      setType("text");
      setRequired(false);
      setOptions(["", ""]);
      void load();
    }
  }, [open, load]);

  const needsOptions = type === "single" || type === "multi";

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
        <DialogHeader>
          <DialogTitle className="text-right font-serif text-lg">
            שאלות בשאלון · {target?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-background/40 p-4">
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
          </section>

          <section>
            <h4 className="mb-3 flex items-center gap-2 font-body text-sm font-bold text-foreground">
              <HelpCircle className="h-4 w-4 text-primary" /> השאלות בשאלון ({questions.length})
            </h4>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : questions.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                עדיין אין שאלות משלך. השאלון יוצג עם השאלות הקבועות בלבד.
              </p>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="icon" variant="ghost" aria-label="העלאה למעלה" onClick={() => move(i, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="הורדה למטה" onClick={() => move(i, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="מחיקת שאלה" onClick={() => removeQuestion(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-sm font-bold text-foreground">{q.question_text}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {TYPE_LABELS[q.question_type]}
                        {q.is_required && " · חובה"}
                        {q.options.length > 0 && ` · ${q.options.join(" / ")}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackQuestionsDialog;
