/// <reference types="npm:@types/react@18.3.1" />

// Default copy strings + helper to merge admin overrides for each auth email template.
// Keep these in sync with src/lib/emailDefaults.ts (the admin UI uses the same defaults).

export interface EmailCopy {
  subject: string
  preview: string
  heading: string
  intro: string
  outro: string
  ctaLabel: string
}

export type EmailTemplateId =
  | 'signup'
  | 'magiclink'
  | 'recovery'
  | 'invite'
  | 'email_change'
  | 'reauthentication'

export const EMAIL_COPY_DEFAULTS: Record<EmailTemplateId, EmailCopy> = {
  signup: {
    subject: 'אשר את כתובת האימייל שלך',
    preview: 'ברוכים הבאים — אשרו את כתובת האימייל שלכם',
    heading: 'ברוכים הבאים למועדון',
    intro:
      'אנחנו שמחים שהצטרפתם אלינו. כדי להשלים את ההרשמה ולהמשיך בתהליך האישור, אשרו את כתובת האימייל שלכם בלחיצה על הכפתור הבא:',
    outro:
      'לאחר אישור האימייל, צוות המועדון יבחן את הבקשה שלכם. תקבלו עדכון ברגע שהחשבון יאושר.',
    ctaLabel: 'אישור כתובת האימייל',
  },
  magiclink: {
    subject: 'קישור כניסה למועדון',
    preview: 'קישור כניסה למועדון',
    heading: 'הכניסה שלכם מחכה',
    intro: 'לחיצה אחת על הכפתור — וכבר אתם בפנים. אין צורך בסיסמה.',
    outro:
      'הקישור תקף לזמן קצר ולשימוש חד-פעמי בלבד. לא ביקשתם להתחבר? אפשר להתעלם מההודעה.',
    ctaLabel: 'כניסה למועדון',
  },
  recovery: {
    subject: 'איפוס סיסמה',
    preview: 'איפוס סיסמה למועדון',
    heading: 'איפוס סיסמה',
    intro:
      'התקבלה בקשה לאיפוס הסיסמה לחשבון שלכם במועדון. לחצו על הכפתור הבא כדי לבחור סיסמה חדשה. הקישור תקף ל-60 דקות.',
    outro: 'לא ביקשתם איפוס? ניתן להתעלם מההודעה — הסיסמה הנוכחית שלכם לא תשתנה.',
    ctaLabel: 'בחירת סיסמה חדשה',
  },
  invite: {
    subject: 'הוזמנת להצטרף למועדון',
    preview: 'הוזמנתם להצטרף למועדון הגברים של ק. כריניצי',
    heading: 'הוזמנתם להצטרף',
    intro:
      'קיבלתם הזמנה אישית להצטרף למועדון הגברים של קריית כריניצי — קהילה ייחודית של אנשי עסקים, יצירה ומקצוע.',
    outro: 'ההזמנה אישית ולא ניתנת להעברה. שמרו על הקישור.',
    ctaLabel: 'קבלת ההזמנה והתחלת הרשמה',
  },
  email_change: {
    subject: 'אישור החלפת אימייל',
    preview: 'אישור החלפת כתובת האימייל',
    heading: 'אישור החלפת אימייל',
    intro:
      'התקבלה בקשה להחליף את כתובת האימייל המקושרת לחשבונכם במועדון. אנא אשרו את הבקשה כדי להשלים את התהליך.',
    outro:
      'אם לא ביקשתם את ההחלפה, אנא התעלמו מהודעה זו או פנו אלינו מיד — חשבונכם לא יוחלף.',
    ctaLabel: 'אישור החלפת האימייל',
  },
  reauthentication: {
    subject: 'קוד אימות',
    preview: 'קוד אימות לחשבון שלך',
    heading: 'קוד אימות חד-פעמי',
    intro: 'להמשך הפעולה במועדון, הזינו את הקוד הבא במסך האימות:',
    outro: 'הקוד תקף ל-10 דקות בלבד. לא ביקשתם אותו? צרו איתנו קשר מיד.',
    ctaLabel: '',
  },
}

export function mergeCopy(
  id: EmailTemplateId,
  override?: Partial<EmailCopy> | null,
): EmailCopy {
  const d = EMAIL_COPY_DEFAULTS[id]
  if (!override) return d
  return {
    subject: (override.subject?.trim() || d.subject),
    preview: (override.preview?.trim() || d.preview),
    heading: (override.heading?.trim() || d.heading),
    intro: (override.intro?.trim() || d.intro),
    outro: (override.outro?.trim() || d.outro),
    ctaLabel: (override.ctaLabel?.trim() || d.ctaLabel),
  }
}
