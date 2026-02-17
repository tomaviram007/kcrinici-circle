

## תיקון: סנכרון מצב התחברות בין Header ל-ProtectedRoute

### הבעיה
ה-Header וה-ProtectedRoute מנהלים כל אחד מצב אימות (auth state) בנפרד. כשחוזרים מטאב אחר, ProtectedRoute עלול לקבוע "no-session" (ולהציג מסך נעילה) בעוד שה-Header עדיין מראה שהמשתמש מחובר. זה קורה כי יש שני מאזינים נפרדים שלא מסונכרנים ביניהם.

### הפתרון
יצירת **AuthContext** משותף שמנהל את מצב ההתחברות במקום אחד. גם Header וגם ProtectedRoute יצרכו ממנו את אותו מצב -- מה שמבטיח שלעולם לא יהיה פער ביניהם.

### שלבי ביצוע

1. **יצירת קובץ `src/contexts/AuthContext.tsx`**
   - Context שמחזיק: session, user, isApproved, isAdmin, loading
   - מאזין אחד ל-`onAuthStateChange` (מקור אמת יחיד)
   - בדיקת פרופיל ותפקידים פעם אחת כשיש session
   - מאזין `visibilitychange` אחד (סנכרון שקט בחזרה מטאב)

2. **עדכון `src/App.tsx`**
   - עטיפת ה-`AppLayout` ב-`AuthProvider`

3. **עדכון `src/components/layout/Header.tsx`**
   - הסרת כל הלוגיקה העצמאית של auth state
   - שימוש ב-`useAuth()` מה-context במקום

4. **עדכון `src/components/auth/ProtectedRoute.tsx`**
   - הסרת כל הלוגיקה העצמאית של auth state
   - שימוש ב-`useAuth()` מה-context
   - שמירת הלוגיקה של `requireApproval` ו-`requireAdmin` כבדיקות מקומיות מעל ה-context

### פרטים טכניים

**AuthContext** ינהל:
- `onAuthStateChange` כמקור אמת יחיד
- שאילתות profiles ו-user_roles רק כשיש session תקין
- מאזין visibilitychange שרק בודק שה-session קיים (בלי לאפס state ל-loading)
- timeout בטיחותי של 5 שניות

**ProtectedRoute** יהפוך לקומפוננטה פשוטה:
```text
const { user, isApproved, isAdmin, loading } = useAuth();
if (loading) -> spinner
if (!user) -> teaser "no-session"
if (requireApproval && !isApproved) -> teaser "not-approved"
if (requireAdmin && !isAdmin) -> redirect to /dashboard
else -> render children
```

**Header** ישתמש באותם ערכים:
```text
const { user, isApproved, isAdmin, loading } = useAuth();
// canAccess = user && isApproved (same as before, but from shared state)
```

### יתרונות
- מצב אימות אחד ומסונכרן לכל האפליקציה
- אין יותר מצב שה-Header מראה "מחובר" אבל התוכן מראה "לא מחובר"
- קוד פשוט ונקי יותר בשני הקומפוננטים
- מאזין אחד במקום שניים -- פחות עומס על Supabase

