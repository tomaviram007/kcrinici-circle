

# תוכנית תיקון ושדרוג הממשק

## בעיה מרכזית: שגיאת "infinite recursion" במדיניות האבטחה

הסיבה שהדשבורד תקוע על "טוען..." היא שגיאת רקורסיה אינסופית בטבלת profiles. המדיניות "Approved members can see approved profiles" בודקת את טבלת profiles מתוך עצמה, מה שיוצר לולאה אינסופית.

### תיקון: מיגרציה חדשה של מסד הנתונים

- מחיקת המדיניות הבעייתית `Approved members can see approved profiles`
- יצירת מדיניות חדשה שמשתמשת ב-`auth.uid()` ישירות במקום subquery על profiles:
  - משתמשים יכולים לקרוא את הפרופיל שלהם (`auth.uid() = user_id`)
  - משתמשים מאושרים יכולים לראות פרופילים מאושרים אחרים (באמצעות פונקציית עזר `is_approved_user` שמשתמשת ב-SECURITY DEFINER כדי למנוע רקורסיה)
  - אדמינים רואים הכל

---

## שדרוג דף הבית: תוכן סגור עם "טעימה" לאורחים

### קונספט
דף הבית יציג תוכן מוגבל (טיזר) למי שלא מחובר, עם קריאה לפעולה להירשם. חברים מאושרים יראו את התוכן המלא.

### מבנה דף הבית החדש (Index.tsx)
1. **Hero Section** - נשאר כמו שהוא (גלוי לכולם)
2. **אזור ימי הולדת** - טיזר לאורחים (כותרת + 3 כרטיסים מטושטשים), תוכן מלא לחברים
3. **לוח מודעות** - טיזר עם blur overlay לאורחים
4. **אירועים קרובים** - טיזר עם מספר מוגבל של אירועים
5. **CTA Section** - באנר "הצטרף למועדון" (רק לאורחים)
6. **Footer**

### שינויים טכניים

**Index.tsx:**
- בדיקת סטטוס התחברות ואישור
- העברת prop `isApproved` לכל section
- הוספת sections חדשים: אירועים, הרצאות

**BirthdaysSection.tsx:**
- במצב אורח: הצגת כרטיסים עם אפקט blur וכיתוב "הצטרף כדי לראות"
- במצב חבר: תוכן מלא מ-Supabase (לפי חודש נוכחי)

**BulletinSection.tsx:**
- במצב אורח: הצגת 2-3 פריטים עם blur על התוכן
- במצב חבר: כל המודעות האחרונות

**קומפוננטה חדשה - EventsPreviewSection.tsx:**
- טיזר של אירועים קרובים בדף הבית

**קומפוננטה חדשה - CTASection.tsx:**
- באנר יוקרתי עם כפתור הרשמה (רק לאורחים)

---

## פרטים טכניים

### מיגרציית SQL

```text
1. DROP POLICY "Approved members can see approved profiles" ON profiles
2. CREATE FUNCTION is_approved_user(uid uuid) RETURNS boolean
   - SECURITY DEFINER (עוקף RLS)
   - בודק is_approved ישירות ללא RLS
3. CREATE POLICY "Approved members can see approved profiles" ON profiles
   FOR SELECT USING (is_approved = true AND is_approved_user(auth.uid()))
```

### קבצים שישתנו
| קובץ | שינוי |
|---|---|
| מיגרציה חדשה | תיקון RLS + פונקציית עזר |
| `src/pages/Index.tsx` | הוספת auth check + sections חדשים |
| `src/components/landing/BirthdaysSection.tsx` | תמיכה ב-teaser/full mode |
| `src/components/landing/BulletinSection.tsx` | תמיכה ב-teaser/full mode |
| `src/components/landing/EventsPreviewSection.tsx` | קומפוננטה חדשה |
| `src/components/landing/CTASection.tsx` | קומפוננטה חדשה |

