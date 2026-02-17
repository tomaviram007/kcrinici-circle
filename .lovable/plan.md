

## תיקון: התחברות עם מייל תקועה ולא מעבירה

### הבעיה
כשמתחברים עם מייל, הכפתור נשאר על "מתחבר..." ולא קורה ניווט. הסיבה: שתי בעיות משולבות:

1. **Race condition ב-AuthContext**: אחרי התחברות, `onAuthStateChange` יורה פעמיים ברצף מהיר (`INITIAL_SESSION` ו-`SIGNED_IN`). האירוע הראשון נועל את `fetchingRef`, והשני נחסם ולא מריץ `setLoading(false)` -- מה שגורם למצב loading אינסופי.

2. **שאילתה מיותרת ב-Login.tsx**: דף ההתחברות שואל את טבלת `user_roles` בנפרד כדי להחליט לאן לנווט, למרות שה-AuthContext כבר עושה את זה. זה מוסיף השהיה מיותרת ופוטנציאל לשגיאות RLS.

### הפתרון

#### 1. תיקון Login.tsx - הסרת השאילתה המיותרת
אחרי `signInWithPassword` מוצלח, פשוט לנווט ל-`/` בלי לשאול user_roles. ה-AuthContext יטפל בזיהוי תפקיד האדמין, וה-Header יציג את הקישור לפאנל ניהול.

```text
handleSubmit:
  signInWithPassword(email, password)
  if success -> navigate("/")
  if error -> show toast
```

#### 2. תיקון AuthContext - מניעת תקיעה ב-loading
שינוי הלוגיקה של `fetchingRef` כך שאם אירוע שני מגיע בזמן שהראשון עדיין רץ, הוא לא ייחסם לגמרי אלא פשוט ידלג על הפעולה בלי לגרום ל-loading אינסופי. בנוסף, אם כבר יש `lastFetchedUserRef` עבור אותו משתמש ב-SIGNED_IN, אפשר לדלג על הטעינה מחדש (כי INITIAL_SESSION כבר טיפל בזה).

### קבצים שישתנו
- `src/pages/Login.tsx` - הסרת שאילתת user_roles, ניווט ישיר ל-`/`
- `src/contexts/AuthContext.tsx` - תיקון הלוגיקה של fetchingRef כך שלא תיצור מצב loading אינסופי

