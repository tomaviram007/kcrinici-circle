

## תוכנית: מערכת התראות מייל + וואטסאפ (Green API) לאדמין

### רקע
כרגע המערכת שולחת התראות טלגרם על אירועים (חבר חדש, מודעה, משרה, אירוע). הבקשה היא להוסיף גם מייל (דרך Resend שכבר מוגדר) וגם וואטסאפ דרך Green API.

### דרישות מוקדמות
- **Green API**: צריך להגדיר שני secrets חדשים:
  - `GREEN_API_INSTANCE_ID` — מזהה ה-Instance שלך ב-Green API
  - `GREEN_API_TOKEN` — ה-API Token של ה-Instance

### שלב 1: Edge Function חדשה — `admin-notify`

יצירת Edge Function מרכזית חדשה `admin-notify` שמקבלת event_type + data ושולחת 3 ערוצים במקביל:

1. **טלגרם** — אותה לוגיקה שקיימת היום (העתקה מ-telegram-notify)
2. **מייל** — שליחה דרך Resend API לכתובת `tomaviram2187@gmail.com` עם HTML מעוצב בסגנון המועדון
3. **וואטסאפ** — שליחה דרך Green API (`https://api.green-api.com/waInstance{ID}/sendMessage/{TOKEN}`) עם טקסט מפורמט

הפונקציה תטפל בכל ערוץ בנפרד (כשל בערוץ אחד לא חוסם את האחרים).

### שלב 2: עדכון הקריאות הקיימות

החלפת כל הקריאות ל-`telegram-notify` בקריאות ל-`admin-notify`:
- `src/lib/telegram-notify.ts` — שינוי שם הפונקציה ל-Edge Function החדשה
- כל שאר הקבצים (Register, AdminMembers, AdminJobs, AdminEvents, AdminAnnouncements) כבר משתמשים בפונקציה הזו אז ייהנו מהשינוי אוטומטית

### שלב 3: הגדרת Secrets

בקשה מהמשתמש להזין:
- `GREEN_API_INSTANCE_ID`
- `GREEN_API_TOKEN`

### אירועים שמפעילים התראה
- חבר חדש נרשם (new_member)
- חבר אושר (member_approved)
- מודעה חדשה (new_announcement)
- משרה חדשה (new_job)
- אירוע חדש (new_event)
- הטבה חדשה שהוגשה לאישור (new_deal — צריך להוסיף)

### פרטים טכניים

**מבנה Edge Function:**
```
supabase/functions/admin-notify/index.ts
├── formatMessage() — פורמט הודעה לטלגרם (HTML) ולוואטסאפ (טקסט רגיל)
├── sendTelegram() — שליחה לטלגרם (כולל כפתורי אישור/דחייה לחברים חדשים)
├── sendEmail() — שליחה דרך Resend עם HTML מעוצב
└── sendWhatsApp() — שליחה דרך Green API
```

**Green API endpoint:**
```
POST https://api.green-api.com/waInstance{ID}/sendMessage/{TOKEN}
Body: { chatId: "972XXXXXXXXX@c.us", message: "..." }
```

**מייל Resend:**
```
POST https://api.resend.com/emails
Body: { from: "...", to: ["tomaviram2187@gmail.com"], subject: "...", html: "..." }
```

