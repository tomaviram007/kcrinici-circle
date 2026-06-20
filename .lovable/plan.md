## הבעיה

מיילי יום הולדת לא נשלחים אוטומטית. סקרתי את הקוד והנתונים:

- ה-cron `birthday-emails-hourly` רץ בהצלחה כל שעה (4 הרצות אחרונות הסתיימו ב-succeeded).
- אבל הפונקציה `send-birthday-emails` עדיין משתמשת ב-Resend ישירות (`RESEND_API_KEY`) ושולחת מ-`onboarding@resend.dev` כברירת מחדל — כתובת ש-Resend חוסם לכל נמען חוץ מבעל החשבון. זה בדיוק תואם לדיווח הקודם שלך ("נשלח רק אליי tomaviram2187@gmail.com").
- בנוסף, כשאין למישהו יום הולדת היום, ה-`birthday_email_log` נשאר ריק — אז קשה לראות כשלים. היום אכן אין יום הולדת אף חבר, כך שגם הצלחה וגם כשל יראו אותו דבר מבחוץ.

המערכת החדשה (`send-transactional-email`) כבר שולחת דרך הדומיין המאומת `notify.kcrinici.com` ועוקפת בדיוק את הבעיה הזו.

## הפתרון

להעביר את מיילי יום ההולדת לאותה תשתית בה השתמשנו ב-Broadcast: תבנית React Email + שליחה דרך `send-transactional-email`. ככה הם יוצאים מהדומיין המאומת, נכנסים לתור עם retries, מתועדים ב-`email_send_log`, ומכבדים את `suppressed_emails` (כולל מי שעשה Unsubscribe).

### צעדים

1. **תבנית חדשה** `supabase/functions/_shared/transactional-email-templates/birthday-greeting.tsx` — React Email, RTL עברית, בסגנון המועדון (זהב #D4AF37 על רקע לבן כפי שדורש מדריך האימייל), עם props: `firstName`, `fullName`, `clubName`, `bodyHtml` (לטקסט המותאם מ-`birthday_email_template` בטבלה).
2. **רישום בתבניות** — להוסיף `birthday-greeting` ל-`registry.ts`.
3. **שכתוב `send-birthday-emails/index.ts`** — להחליף את `sendViaResend` בלולאה שקוראת ל-`supabase.functions.invoke("send-transactional-email", { body: { templateName: "birthday-greeting", recipientEmail, idempotencyKey: \`bday-${user_id}-${year}\`, templateData: {...} } })`. לשמור את:
   - בדיקת השעה (`birthday_send_hour`) + `force=1`
   - טיפול בשנה מעוברת
   - קריאת התוכן מ-`birthday_email_template` (subject + body_html + heading + signature) והעברתו ל-`templateData` כדי שאדמין יוכל להמשיך לערוך את הטקסט מה-UI
   - רישום ל-`birthday_email_log` (pending → sent/failed) + dedupe ע"י `sent_year`
   - מצב `test=1&to=...` עדיין נתמך (קורא ל-`send-transactional-email` עם המייל הזה)
4. **אימות** — אריץ את הפונקציה עם `force=1` ידנית, אבדוק שאין נמענים היום (צפוי `sent:0`), ואז אשלח בדיקה (`test=1&to=tomaviram2187@gmail.com`) כדי לוודא שהמייל באמת נשלח דרך הצינור החדש. אבדוק `email_send_log` ולוגים של הפונקציות.

### מה לא משתנה

- ה-cron, ההגדרות ב-`site_settings`, עורך התבנית באדמין, ולוג `birthday_email_log` נשארים כפי שהם.
- מנגנון ה-WhatsApp (העתקה ללוח / מנהל / קבוצה) לא קשור ולא נוגעים בו.
- `RESEND_API_KEY` נשאר מוגדר אבל לא בשימוש ע"י הפונקציה הזו יותר.

### תוצאה צפויה

מהפעם הבאה שיש למישהו יום הולדת בשעה שנקבעה (08:00 שעון ישראל), הוא יקבל מייל מהדומיין `notify.kcrinici.com`, ויהיה ניתן לאתר את הסטטוס ב-`email_send_log` ובפאנל האדמין.