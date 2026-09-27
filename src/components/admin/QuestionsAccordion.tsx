import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GripVertical, Loader2, Plus } from "lucide-react";
import type { FeedbackQuestion } from "@/components/admin/FeedbackQuestionsDialog";
import { feedbackQuestionList } from "@/lib/feedback-fixed-questions";

interface Props {
  kind: "form" | "event";
  targetId: string;
  onAdd: () => void;
  onChanged?: () => void;
  refreshKey?: number;
}

const QuestionsAccordion = ({ kind, targetId, onAdd, onChanged, refreshKey = 0 }: Props) => {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const column = kind === "form" ? "form_id" : "event_id";
    const { data } = await supabase
      .from("feedback_questions")
      .select("id, legacy_key, question_text, question_type, options, is_required, display_order")
      .eq(column, targetId)
      .order("display_order", { ascending: true });
    setQuestions((data as FeedbackQuestion[] | null) || []);
    setLoading(false);
  }, [kind, targetId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-end p-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-2 border-t border-border/50 p-3 text-right">
      {feedbackQuestionList(questions).map((q, i) => (
        <Button key={q.id} variant="ghost" className="flex h-auto w-full justify-start gap-2 whitespace-normal border-b border-border/50 py-2 text-right font-body text-sm text-foreground" onClick={onAdd}>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{i + 1}. {q.question_text}</span>
        </Button>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
        <Plus className="h-4 w-4" /> הוספת שאלה
      </Button>
    </div>
  );
};

export default QuestionsAccordion;
