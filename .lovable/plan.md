
# תיקון: יציאה מהטאב גורמת להתנתקות וטעינה אינסופית

## מה קורה בפועל

כשגולש עוזב את הטאב (למשל עובר לטאב אחר או מצמצם את הדפדפן) ואז חוזר, מתרחש התהליך הבא:

1. בזמן שהטאב לא פעיל, ה-Access Token פג תוקף (בד"כ אחרי שעה)
2. כשהגולש חוזר לטאב, המערכת מנסה לרענן את הטוקן
3. **בעיה קריטית:** לפני שהרענון מספיק להסתיים, האירוע `INITIAL_SESSION` נשלח עם Session שהטוקן שלו כבר פג תוקף
4. הקוד מנסה לשלוף נתוני פרופיל מהדאטאבייס עם הטוקן הפגום -- השאילתא נכשלת
5. השגיאה מתפרשת כ-"no-session" -- ומופיע מסך "תוכן בלעדי לחברי המועדון"
6. גם אם `TOKEN_REFRESHED` מגיע אחר כך עם טוקן תקין, לפעמים ה-state כבר התעדכן ל-"no-session" והקומפוננטה לא מתאוששת

## הפתרון

### קובץ: `src/components/auth/ProtectedRoute.tsx`

שלושה שינויים מרכזיים:

### 1. טיפול בשגיאות DB כ-"נסה שוב" ולא כ-"אין חיבור"
כרגע, כל שגיאה בשאילתת פרופיל (`profileError`) גורמת ל-`setResolved("no-session")`. במקום זה, אם יש session קיים אבל השאילתא נכשלה (כי הטוקן פג), נחכה לאירוע `TOKEN_REFRESHED` שיתן טוקן חדש ונריץ את הבדיקה שוב -- במקום להניח מיד שהגולש לא מחובר.

### 2. הוספת מאזין `visibilitychange`
כשהטאב חוזר להיות פעיל (visible), נבצע בדיקה מחדש עם `getSession()` -- בשלב הזה הרענון כבר הסתיים והטוקן תקין. זה מכסה מצבים שבהם אירועי Auth הוחמצו בזמן שהטאב היה ברקע.

### 3. לא לאפס ל-loading על TOKEN_REFRESHED
כשמגיע `TOKEN_REFRESHED`, להריץ את הבדיקה ברקע בלי להראות ספינר טעינה. אם הגולש כבר במצב "ok", הוא ישאר ב-"ok" עד שהבדיקה תסתיים.

## פירוט טכני

```text
לפני:
  INITIAL_SESSION(expired token) -> query DB -> error -> "no-session" (BUG!)
  profileError -> setResolved("no-session") (always)

אחרי:
  INITIAL_SESSION(expired token) -> query DB -> error -> stay in "loading", wait for TOKEN_REFRESHED
  TOKEN_REFRESHED(valid token) -> query DB -> success -> "ok"
  visibilitychange(visible) -> getSession() -> check(session) -> handles tab-return gracefully
  profileError + session exists -> don't resolve to "no-session", wait for refresh
```

### שינויים בקוד:

1. **פונקציית `check`**: אם יש session אבל שאילתת הפרופיל נכשלה, לא לקרוא ל-`setResolved("no-session")` -- במקום זה, פשוט להחזיר (return) בלי לעדכן state, כדי שה-`TOKEN_REFRESHED` יטפל בזה
2. **הוספת `visibilitychange` listener** ב-useEffect: כשהדף חוזר להיות visible, לקרוא ל-`supabase.auth.getSession()` ולהריץ `check` עם התוצאה
3. **ניקוי ה-listener** ב-cleanup function של ה-useEffect
