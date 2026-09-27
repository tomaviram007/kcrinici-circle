// Questions that are part of every event feedback form (separate from admin-added questions).
export const FEEDBACK_FIXED_QUESTIONS = [
  { key: "enjoyment", label: "עד כמה נהנית מהמפגש היום?", question_type: "rating" },
  { key: "met_new", label: "הכרת לפחות אדם אחד חדש הערב?", question_type: "single" },
  { key: "keep_in_touch", label: "יש מישהו שהכרת היום שתרצה להמשיך איתו בקשר?", question_type: "single", note: "מופיעה רק למי שהכיר אדם חדש" },
  { key: "reason", label: "מה הביא אותך למפגש?", question_type: "single" },
  { key: "meetup_type", label: "איזה מפגש היית הכי רוצה שנעשה בהמשך?", question_type: "single" },
  { key: "meaningful_moment", label: "מה היה הרגע הכי משמעותי עבורך הערב?", question_type: "text" },
  { key: "improvement", label: "מה אפשר לשפר במפגש הבא?", question_type: "text" },
  { key: "likelihood", label: "עד כמה סביר שתגיע גם למפגש הבא?", question_type: "single" },
  { key: "nps", label: "עד כמה תמליץ לחבר מהשכונה להצטרף למועדון?", question_type: "rating" },
  { key: "membership_interest", label: "האם היית שוקל להצטרף כחבר במועדון בתשלום שנתי?", question_type: "single" },
  { key: "membership_price", label: "מה לדעתך יהיה סכום שנתי הוגן לחברות במועדון?", question_type: "single" },
] as const;

export type FeedbackQuestionRow = {
  id: string;
  legacy_key: string | null;
  question_text: string;
  question_type: "text" | "single" | "multi" | "rating";
  options: string[];
  is_required: boolean;
  display_order: number;
};

export const feedbackQuestionList = (rows: FeedbackQuestionRow[]) => {
  const legacy = FEEDBACK_FIXED_QUESTIONS.map((q, i) => {
    const override = rows.find((row) => row.legacy_key === q.key);
    return { ...q, id: override?.id ?? q.key, legacy_key: q.key, question_text: override?.question_text ?? q.label, question_type: q.question_type, options: override?.options ?? [], is_required: override?.is_required ?? false, display_order: override?.display_order ?? i * 100, note: "note" in q ? q.note : undefined };
  });
  return [...legacy, ...rows.filter((row) => !row.legacy_key)].sort((a, b) => a.display_order - b.display_order);
};