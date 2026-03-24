

## הסתרת אזורים ריקים בדף הבית + אזור הצטרפות

### הבעיה הנוכחית
כשמשתמש מאושר מחובר ואין תוכן באזור מסוים (למשל אין מכירות, אין אירועים), האזור עדיין מוצג עם הודעת "אין תוכן" ואייקון ריק. זה יוצר חלל מיותר בדף.

### הפתרון

**1. הסתרת אזורים ריקים (4 קבצים)**
בכל אחד מהסקשנים הבאים, כשהמשתמש מאושר ואין נתונים — הרכיב יחזיר `null` במקום להציג empty state:
- `BirthdaysPreviewSection` — אם `isApproved && birthdays.length === 0` → return null
- `SalesPreviewSection` — אם `isApproved && sales.length === 0` → return null
- `EventsPreviewSection` — אם `isApproved && events.length === 0` → return null
- `JobsPreviewSection` — אם `isApproved && jobs.length === 0` → return null

למשתמשים לא מאושרים, ה-mock data ימשיך להופיע כרגיל עם ה-blur.

**2. אזור הצטרפות למועדון (CTA)**
כבר קיים רכיב `CTASection` שמוצג לגולשים לא מחוברים. אני מציע לשדרג אותו:
- להציג אותו גם למשתמשים שנרשמו אך עדיין לא אושרו, עם הודעה מותאמת: "הבקשה שלך בטיפול"
- להוסיף אנימציית GSAP (fade-in + scale) לאזור
- למקם אותו בתחתית הדף, לפני ה-footer, כפי שהוא היום

### שינויים טכניים

| קובץ | שינוי |
|---|---|
| `BirthdaysPreviewSection.tsx` | הוספת `if (isApproved && birthdays.length === 0) return null` אחרי ה-fetch |
| `SalesPreviewSection.tsx` | הוספת `if (isApproved && sales.length === 0) return null` אחרי ה-fetch |
| `EventsPreviewSection.tsx` | הוספת בדיקת empty + return null |
| `JobsPreviewSection.tsx` | הוספת `if (isApproved && jobs.length === 0) return null` אחרי ה-fetch |
| `Index.tsx` | עדכון תנאי ה-CTA: `!isLoggedIn || (isLoggedIn && !isApproved)` |
| `CTASection.tsx` | הוספת prop `isLoggedIn` עם הודעה מותאמת למשתמש שממתין לאישור |

