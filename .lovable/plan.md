

# פתיחת האתר לכולם ותיקון שגיאת forwardRef

## מה הבעיה
1. הקומפוננטה `ProtectedRoute` חוסמת גישה לעמודים למשתמשים לא מחוברים
2. יש אזהרת `forwardRef` שגורמת לשגיאות בממשק

## הפתרון
הסרה מלאה של `ProtectedRoute` מכל הנתיבים ב-`App.tsx`. במקום לעטוף עמודים ב-`ProtectedRoute`, הם יוצגו ישירות.

## שינויים טכניים

### קובץ `src/App.tsx`
- הסרת ה-import של `ProtectedRoute`
- הסרת העטיפה של `ProtectedRoute` מכל הנתיבים (dashboard, profile, admin, announcements, jobs, members, events, gallery, polls)
- כל העמודים יהיו נגישים ישירות בלי בדיקת הרשאות

לפני:
```text
<Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

אחרי:
```text
<Route path="/dashboard" element={<Dashboard />} />
```

זה יפתור גם את שגיאת ה-forwardRef כי `ProtectedRoute` כבר לא ישמש בכלל.

