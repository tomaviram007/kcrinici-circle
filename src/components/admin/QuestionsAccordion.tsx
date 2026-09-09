import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import type { FeedbackQuestion, QuestionType } from "@/components/admin/FeedbackQuestionsDialog";

const TYPE_LABELS: Record<QuestionType, string> = {
  text: "תשובה חופשית",
  single: "בחירה אחת מתוך רשימה",
  multi: "בחירה מרובה",
  rating: "דירוג כוכבים (1 עד 5)",
};

interface Props {
  kind: "form" | "event";
  targetId: string;
  onAdd: () => void;
  onChanged?: () => void;
  refreshKey?: number;
}

const QuestionsAccordion = ({ kind, targetId, onAdd, onChanged, refreshKey = 0 }: Props) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const column = kind === "form" ? "form_id" : "event_id";
    const { data } = await supabase
      .from("feedback_questions")
      .select("id, question_text, question_type, options, is_required, display_order")
      .eq(column, targetId)
      .order("display_order", { ascending: true });
    setQuestions((data as FeedbackQuestion[] | null) || []);
    setLoading(false);
  }, [kind, targetId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const persist = async (list: FeedbackQuestion[]) => {
    await Promise.all(
      list.map((q, i) => supabase.from("feedback_questions").update({ display_order: i }).eq("id", q.id))
    );
    onChanged?.();
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const list = [...questions];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setQuestions(list);
    void persist(list);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("feedback_questions").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex justify-end p-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-2 border-t border-border/50 p-3 text-right">
      {questions.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          עדיין אין שאלות משלך בשאלון הזה. השאלון יוצג עם השאלות הקבועות בלבד.
        </p>
      ) : (
        <>
          <p className="font-body text-xs text-muted-foreground">גררו שאלה כדי לשנות את הסדר שלה</p>
          {questions.map((q, i) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={
                "flex items-center gap-2 rounded-xl border bg-background/60 p-2.5 transition-colors " +
                (overIndex === i && dragIndex !== null && dragIndex !== i
                  ? "border-primary"
                  : "border-border/60") +
                (dragIndex === i ? " opacity-50" : "")
              }
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
              <Button size="icon" variant="ghost" aria-label="מחיקת שאלה" onClick={() => remove(q.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <div className="min-w-0 flex-1 text-right">
                <p className="font-body text-sm font-bold text-foreground">
                  {i + 1}. {q.question_text}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {TYPE_LABELS[q.question_type]}
                  {q.is_required && " · חובה"}
                  {q.options.length > 0 && ` · ${q.options.join(" / ")}`}
                </p>
              </div>
            </div>
          ))}
        </>
      )}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" /> הוספת שאלה
      </Button>
    </div>
  );
};

export default QuestionsAccordion;
