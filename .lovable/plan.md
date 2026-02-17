

# תיקון בעיית הכניסה לממשק - תקוע על "טוען..."

## מה הבעיה?

זיהיתי את הבעיה המדויקת: יש **race condition** (מרוץ תזמונים) בין דף הכניסה לבין הקומפוננטה שמגינה על הדפים (`ProtectedRoute`).

**מה קורה צעד אחר צעד:**
1. המשתמש לוחץ "כניסה למועדון" - ההתחברות מצליחה (סטטוס 200)
2. הדף מנווט ל-`/dashboard`
3. `ProtectedRoute` נטען וקורא ל-`getSession()` - אבל ה-session עדיין לא מוכן לגמרי
4. התוצאה: אין session -> מפנה חזרה ל-`/login`, או נתקע על "טוען..."

**שורש הבעיה:** ב-`ProtectedRoute`, המאזין ל-`onAuthStateChange` **מתעלם לגמרי** מאירוע `SIGNED_IN`. כלומר גם כש-Supabase מודיע "המשתמש התחבר!" - הקומפוננטה לא עושה כלום עם זה.

## הפתרון

### קובץ 1: `src/components/auth/ProtectedRoute.tsx`

שינוי המאזין `onAuthStateChange` כך שגם אירוע `SIGNED_IN` ו-`TOKEN_REFRESHED` יפעילו מחדש את בדיקת ה-session:

```text
onAuthStateChange:
  SIGNED_IN / TOKEN_REFRESHED -> הפעל מחדש את check()
  SIGNED_OUT -> הפנה ל-login (כמו היום)
```

שינויים ספציפיים:
- כשמתקבל `SIGNED_IN` או `TOKEN_REFRESHED` - קריאה מחדש ל-`check()` שבודק session, approval, ו-admin
- זה פותר גם את בעיית ה-"טוען..." וגם את ההפניה חזרה ל-login
- ה-`resolvedOk` ref נשאר כדי למנוע ניתוקים מיותרים בזמן שגיאות רשת

### קובץ 2: `src/pages/Login.tsx`

הוספת המתנה קצרה אחרי התחברות מוצלחת כדי לוודא שה-session נשמר ב-storage לפני הניווט:

- לאחר `signInWithPassword` מוצלח, בדיקה ש-`getSession()` מחזיר session תקין לפני הקריאה ל-`navigate("/dashboard")`

## סיכום

שני שינויים קטנים שפותרים את הבעיה מהשורש - ProtectedRoute יקשיב לאירוע SIGNED_IN ויפעיל בדיקה מחדש, ודף הכניסה יוודא שה-session מוכן לפני הניווט.

