# Project architecture decisions

- Keep questionnaire copies in the existing `feedback_forms` and `feedback_questions` tables, initially inactive, so the copy has its own link and response collection without changing the source event or copying answers.
- Keep event questionnaire title/date edits on the linked `events` record, because that record owns the event-based questionnaire identity and date.
