# Project architecture decisions

- Keep questionnaire copies in the existing `feedback_forms` and `feedback_questions` tables, initially inactive, so the copy has its own link and response collection without changing the source event or copying answers.
- Keep event questionnaire title/date edits on the linked `events` record, because that record owns the event-based questionnaire identity and date.
- Use an event's image as its feedback entrance cover with the dedicated feedback image as fallback, so each questionnaire opens with relevant imagery without altering response storage.
- Keep original feedback answer fields intact; store per-questionnaire wording and ordering overrides in `feedback_questions.legacy_key`, so old responses and reports remain readable.
