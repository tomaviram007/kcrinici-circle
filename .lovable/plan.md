

# תיקון הדשבורד התקוע על "טוען..."

## שורש הבעיה

ProtectedRoute ו-Header שניהם תלויים בשאילתות לטבלת profiles ו-user_roles. אם שאילתה נכשלת או נתקעת (שגיאת רשת, timeout, בעיית RLS), אין טיפול בשגיאות ולכן:
- ProtectedRoute נשאר על מצב "loading" לנצח (אין try-catch)
- Header לא מציג תפריט כי `loading` נשאר `true` (ה-`.then()` לא רץ אם יש שגיאה)

## תוכנית התיקון

### 1. ProtectedRoute - הוספת טיפול בשגיאות ו-timeout
- עטיפת כל הלוגיקה ב-try-catch
- אם יש שגיאה, הפניה ל-login במקום תקיעה על "טוען..."
- הוספת timeout של 10 שניות - אם לא מתקבלת תשובה, הפניה ל-login
- שימוש ב-`onAuthStateChange` כדי להאזין לשינויים בזמן אמת

### 2. Header - תיקון מצב הטעינה
- שימוש ב-`.finally()` במקום `.then()` כדי להבטיח ש-`setLoading(false)` תמיד ירוץ
- הוספת timeout - אחרי 5 שניות, הצגת התפריט בכל מקרה
- הצגת תפריט בסיסי (דף הבית + יציאה) גם אם הטעינה נכשלת

### 3. Dashboard - הוספת טיפול בשגיאות
- עטיפת הקריאה ל-profiles ב-try-catch
- שימוש ב-user_metadata כ-fallback אם הקריאה ל-DB נכשלת

---

## פרטים טכניים

### קבצים שישתנו

| קובץ | שינוי |
|---|---|
| `src/components/auth/ProtectedRoute.tsx` | try-catch, timeout 10 שניות, fallback ל-login |
| `src/components/layout/Header.tsx` | finally() במקום then(), timeout 5 שניות, תפריט בסיסי כ-fallback |
| `src/pages/Dashboard.tsx` | try-catch עם fallback ל-user_metadata |

### לוגיקת ProtectedRoute המתוקנת

```text
1. התחלה: state = "loading"
2. getSession() עם timeout 10 שניות
3. try:
   a. אם אין session -> redirect ל-login
   b. שאילתת profiles עם timeout
   c. אם לא מאושר -> redirect ל-pending
   d. (אם צריך) בדיקת admin role
   e. state = "ok"
4. catch: redirect ל-login (במקום תקיעה)
5. timeout: אחרי 10 שניות -> redirect ל-login
```

### לוגיקת Header המתוקנת

```text
1. הגדרת onAuthStateChange BEFORE getSession
2. fetchUserData עם finally(() => setLoading(false))
3. timeout 5 שניות -> setLoading(false) בכל מקרה
4. אם user קיים אבל isApproved/isAdmin נכשלו -> הצגת תפריט מינימלי
```
