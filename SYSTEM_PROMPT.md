# פרומפט מערכת – "הגברים של ק. קריניצי"

## סקירה כללית

**שם הפרויקט:** הגברים של ק. קריניצי – מועדון חברים אקסקלוסיבי  
**כתובת:** https://kcrinici-circle.lovable.app  
**טכנולוגיה:** React + TypeScript + Vite + Tailwind CSS + Supabase (Lovable Cloud)  
**כיוון טקסט:** RTL (עברית)  
**פונט:** Tel Aviv Modernist (Regular 400, Bold 700)

---

## ארכיטקטורה

### Frontend
- **React 18** עם React Router v6
- **Tailwind CSS** עם עיצוב מותאם (דארק מוד בלבד, ללא Light mode)
- **shadcn/ui** – קומפוננטות UI מבוססות Radix
- **TanStack Query** לניהול state מרחוק
- **Zod** לוולידציה
- **react-hook-form** לטפסים

### Backend (Lovable Cloud / Supabase)
- **Authentication:** Email + Password (דורש אישור מייל)
- **Database:** PostgreSQL עם RLS policies
- **Storage:** 3 buckets – `avatars`, `gallery`, `events` (כולם public)
- **Edge Functions:** `notify-member` (התראות)

---

## מבנה עמודים וניתובים

| נתיב | עמוד | הגנה |
|-------|-------|------|
| `/` | דף הבית (Index) | ציבורי |
| `/login` | כניסה | ציבורי |
| `/register` | הרשמה | ציבורי |
| `/pending` | ממתין לאישור | ציבורי |
| `/reset-password` | איפוס סיסמה | ציבורי |
| `/announcements` | לוח מודעות | מוגן (ProtectedRoute) |
| `/jobs` | דרושים | מוגן |
| `/members` | חברי המועדון | מוגן |
| `/events` | לוח אירועים | מוגן |
| `/gallery` | גלריית תמונות | מוגן |
| `/profile` | פרופיל אישי | מוגן |
| `/admin` | שולחן המנהל | מוגן + requireAdmin |

---

## מערכת הרשאות

### תפקידים (app_role enum)
- **user** – חבר רגיל (ברירת מחדל)
- **moderator** – מנחה
- **admin** – מנהל (מוגדר אוטומטית ל-`tomaviram2187@gmail.com`)

### זרימת הרשמה
1. משתמש ממלא טופס הרשמה (שם, טלפון, כתובת, מקצוע, תאריך לידה, אימייל, סיסמה)
2. נשלח מייל אימות
3. Trigger `handle_new_user` יוצר רשומה ב-profiles עם `is_approved = false`
4. Trigger `handle_admin_role` מוסיף תפקיד admin לאימייל הספציפי
5. מנהל מאשר את המשתמש מ-Admin Dashboard
6. לאחר אישור – למשתמש יש גישה מלאה

### ProtectedRoute
- משתמש `onAuthStateChange` כמקור אמת יחיד
- בודק approval ו-admin role
- מציג TeaserOverlay (תוכן מטושטש + הודעת "תוכן בלעדי") למשתמשים לא מחוברים
- Timeout בטיחות של 5 שניות
- בודק מחדש בחזרה לטאב (visibilitychange)

---

## טבלאות Database

### profiles
שדות עיקריים: `user_id`, `full_name`, `phone`, `address`, `profession`, `expertise`, `bio`, `birth_date`, `avatar_url`, `is_approved`
- RLS: משתמש רואה את עצמו, חברים מאושרים רואים חברים מאושרים, אדמין רואה הכל

### announcements
שדות: `title`, `content`, `is_approved`, `created_by`
- RLS: אדמין מנהל, משתמשים מאומתים שולחים ורואים מודעות מאושרות

### events
שדות: `title`, `description`, `event_date`, `location`, `image_url`, `created_by`
- RLS: אדמין מנהל, משתמשים מאומתים צופים

### event_rsvps
שדות: `event_id`, `user_id`, `status`
- RLS: משתמשים יכולים לצפות, ליצור ולעדכן RSVP שלהם

### jobs
שדות: `title`, `description`, `company_name`, `contact_name`, `contact`, `location`, `job_type`, `category`, `salary`, `requirements`, `is_approved`, `is_active`
- RLS: אדמין מנהל, משתמשים שולחים ורואים משרות מאושרות

### polls / poll_options / poll_votes / poll_popup_views
מערכת סקרים עם תמיכה ב-popup, הגבלת הצגות, בחירה מרובה, תאריך תפוגה

### gallery_albums / gallery_photos
מערכת גלריה עם אלבומים, תמונות, תמונת קאבר, ניהול ע"י יוצר או אדמין

### user_roles
תפקידי משתמש (admin/moderator/user)

---

## עיצוב (Design System)

### צבעים (HSL)
```
--background: 20 10% 8%         (רקע כהה)
--foreground: 40 30% 88%        (טקסט בהיר)
--card: 20 12% 12%              (כרטיסים)
--primary / --gold: 43 72% 52%  (זהב – צבע ראשי)
--secondary: 20 35% 18%         (משני)
--muted: 20 15% 15%             (מושתק)
--destructive: 0 62% 50%        (אדום)
--border: 30 15% 20%            (גבולות)
```

### Utilities
- `.text-gold` – צבע זהב
- `.gradient-gold` – רקע gradient זהוב
- `.gradient-dark` – רקע gradient כהה
- `.text-shadow-luxury` – צל טקסט זהוב
- `.border-gold` – גבול זהוב
- `.glow-gold` – זוהר זהוב
- `.font-serif-display` – Tel Aviv Bold
- `.font-body` – Tel Aviv Regular

### כללים
- **אין Light mode** – העיצוב כולו דארק
- כל הצבעים חייבים להיות tokens סמנטיים (לא `text-white`, `bg-black` ישירות)
- שימוש ב-RTL direction בכל הממשק

---

## קומפוננטות מרכזיות

### Header (`src/components/layout/Header.tsx`)
- Navigation responsive (desktop + mobile hamburger)
- מציג קישורי ניווט לכל העמודים
- כפתורי התחברות/הצטרפות למשתמשים לא מחוברים
- כפתור התנתקות למשתמשים מחוברים
- Badge ימי הולדת

### PageHero (`src/components/PageHero.tsx`)
- Hero banner עם תמונת רקע לכל עמוד

### ClubAboutSection (`src/components/ClubAboutSection.tsx`)
- סקשן "אודות המועדון"

### PollPopup (`src/components/PollPopup.tsx`)
- Popup סקרים שקופץ בעמוד הבית

### AvatarUpload (`src/components/AvatarUpload.tsx`)
- העלאת תמונת פרופיל עם ולידציה ו-preview

---

## דף הבית (Index)

### מבנה:
1. **HeroSection** – באנר ראשי עם כפתורי CTA
2. **BirthdaysSection** – ימי הולדת השבוע (מוצג רק לחברים מאושרים)
3. **BulletinSection** – לוח מודעות (מוצג רק לחברים מאושרים)
4. **EventsPreviewSection** – תצוגה מקדימה של אירועים
5. **CTASection** – קריאה להצטרפות (רק למשתמשים לא מחוברים)
6. **PollPopup** – סקר popup
7. **Footer**

---

## Admin Dashboard

### טאבים:
1. **AdminAnnouncements** – ניהול מודעות (אישור/דחייה)
2. **AdminEvents** – ניהול אירועים (יצירה, עריכה, מחיקה)
3. **AdminJobs** – ניהול דרושים (אישור/דחייה)
4. **AdminPolls** – ניהול סקרים

---

## גלריה (Gallery)

### תכונות:
- יצירת אלבומים חדשים
- העלאת תמונות (קובץ או לינק)
- שינוי תמונת קאבר (העלאת קובץ)
- עריכת שם ותיאור אלבום
- עריכת כיתוב תמונה
- החלפת תמונה (קובץ או לינק)
- מחיקת תמונות ואלבומים
- הגדרת תמונה ראשית (כוכב)
- Lightbox לצפייה בתמונות
- מטא-דאטה: תאריך, כמות תמונות, פרטי המפרסם (שם, מקצוע, אווטאר)
- הרשאות: היוצר והאדמין יכולים לנהל

---

## Storage Buckets

| Bucket | ציבורי | שימוש |
|--------|-------|-------|
| `avatars` | כן | תמונות פרופיל |
| `gallery` | כן | תמונות גלריה + קאבר אלבומים |
| `events` | כן | תמונות אירועים |

### מבנה נתיבים:
- Avatars: `{userId}/avatar.{ext}`
- Gallery photos: `{userId}/{albumId}/{uuid}.{ext}`
- Gallery covers: `{userId}/{albumId}/cover.{ext}`

---

## ולידציה

### קבצים (file-validation.ts)
- סוגי קבצים מותרים: JPEG, PNG, WebP, GIF
- גודל מקסימלי: 5MB (2MB לאווטאר)

### הרשמה (Zod schema)
- שם: 2-100 תווים
- טלפון: 9-15 תווים, ספרות בלבד
- כתובת: 3-200 תווים
- מקצוע: 2-100 תווים
- אימייל: כתובת תקינה
- סיסמה: 6-72 תווים
- תאריך לידה: חובה

---

## Edge Functions

### notify-member
- שליחת התראות לחברים
- Secrets נדרשים: `RESEND_API_KEY`, `RESEND_K_Krinitzi_Club`

---

## Database Functions

| פונקציה | תיאור |
|---------|-------|
| `has_role(user_id, role)` | בודק אם למשתמש יש תפקיד מסוים |
| `is_approved_user(user_id)` | בודק אם משתמש מאושר |
| `handle_new_user()` | Trigger – יוצר פרופיל בהרשמה |
| `handle_admin_role()` | Trigger – מוסיף admin role לאימייל ספציפי |
| `update_updated_at_column()` | Trigger – מעדכן שדה updated_at |

---

## הנחיות פיתוח

1. **כל הטקסטים בעברית** (RTL)
2. **אין Light mode** – דארק בלבד
3. **צבעים רק דרך tokens** (לא צבעים ישירים)
4. **קבצים לא נשמרים ב-DB** – רק URLs ל-Storage
5. **אסור לערוך:** `client.ts`, `types.ts`, `.env`, `config.toml`, `package.json`
6. **RLS policies על כל טבלה חדשה**
7. **ולידציה בצד client עם Zod**
8. **פונט Tel Aviv** לכל הטקסטים
9. **shadcn/ui** לקומפוננטות בסיסיות
