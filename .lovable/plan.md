

# תיקון טופס הרישום + תצוגת טיזר לעמודים מוגנים

## בעיה 1: טופס הרישום - הקלדה מבטלת את עצמה

**הסיבה:** הקומפוננטה `Field` מוגדרת **בתוך** קומפוננטת `Register`. כל פעם שמקלידים אות, ה-state משתנה, React מייצר מחדש את `Field` כפונקציה חדשה, וזה גורם ל-unmount/remount של ה-input - מה שמוחק את הפוקוס ומפריע להקלדה.

**פתרון:** להוציא את `Field` מחוץ לקומפוננטת `Register` ולהעביר את ה-props הנדרשים (form, errors, handleChange) כפרמטרים. בנוסף, להוסיף `autoComplete="off"` לכל השדות כדי למנוע התערבות של הדפדפן.

## בעיה 2: עמודים מוגנים - תצוגת טיזר במקום הפניה

כרגע `ProtectedRoute` מפנה ל-login. במקום זה, ליצור מצב חדש שמציג את התוכן מטושטש (blur) עם שכבת "הצטרף למועדון" מעליו.

**פתרון:** להוסיף ל-`ProtectedRoute` מצב `teaser` - כשאין session, במקום להפנות ל-login, להציג את ה-children עם:
- אפקט blur על התוכן
- שכבת overlay עם כפתור הצטרפות/כניסה
- המשתמש רואה את העמוד אבל לא יכול לגשת לתוכן

## בעיה 3: שגיאות Console (404)

שגיאות ה-404 בתמונה הן WebSocket errors של סביבת הפיתוח (dev-server) - לא משפיעות על האתר בפרודקשן. אין צורך בתיקון קוד.

## בעיה 4: פונט עקבי

הפונט "Tel Aviv" כבר מוגדר נכון ב-CSS. נוודא שכל הכותרות והטקסטים משתמשים ב-classes הנכונים (`font-body`, `font-serif`) ולא ב-`font-serif` הגנרי של Tailwind.

---

## פירוט טכני

### קובץ 1: `src/pages/Register.tsx`
- להוציא את קומפוננטת `Field` מחוץ ל-`Register` ולהפוך אותה לקומפוננטה נפרדת שמקבלת props: `form`, `errors`, `onChange`
- להוסיף `autoComplete="off"` לטופס ולכל שדה
- לתקן `font-serif` ל-`font-serif-display` בכותרת (שורה 131) כדי להבטיח שימוש בפונט Tel Aviv

### קובץ 2: `src/components/auth/ProtectedRoute.tsx`
- להוסיף מצב `teaser` ל-state
- כשאין session: במקום `Navigate to="/login"` - להציג את ה-children עטופים ב-div עם:
  - `filter: blur(8px)` + `pointer-events: none`
  - overlay מעליו עם כפתורי "הצטרף" / "כניסה"
- כשאין approval: אותו דבר עם הודעה "ממתין לאישור"

