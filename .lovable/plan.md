## מנגנון הרשאות תוכן: גולש לעומת חבר מחובר

### מטרה
לאפשר לגולשים לא מחוברים לראות תצוגה חלקית של כל סוגי התוכן באתר, תוך חסימה אמיתית (גם בצד השרת) של פרטי קשר, פעולות פנייה ופרטים מלאים – שיהיו זמינים רק לחברים מאושרים ומחוברים.

כיום `ProtectedRoute` חוסם את כל הדפים `/jobs`, `/members`, `/deals`, `/secondhand`, `/recommendations` למשתמשים לא מחוברים עם Teaser Overlay מלא. נשנה את ההתנהגות לכל סוג תוכן כך שהדף יהיה ציבורי-חלקי.

---

### 1. שכבת מסד נתונים (אמת אחת)

**טבלה חדשה `public.content_access_settings`** – הגדרות אדמין לכל סוג תוכן:
- `content_type` (jobs / members / professionals / deals / secondhand / events) – PK
- `public_list_enabled` (bool, default true) – הצגת רשימה לגולש
- `public_card_open_enabled` (bool, default false)
- `public_contact_enabled` (bool, default false)
- `public_action_enabled` (bool, default false)
- `public_images_enabled` (bool, default true)
- `public_price_enabled` (bool, default true)

RLS: קריאה לכולם (anon+authenticated), עדכון רק לאדמינים.

**RPCs ציבוריות (SECURITY DEFINER) שמחזירות תצוגה מסוננת לגולשים:**
- `get_public_jobs()` – id, title, category, area, summary, published_at בלבד. ללא טלפון/אימייל/שם מלא/תיאור מלא.
- `get_public_members()` – first_name, last_name (אם מאושר), avatar, profession בלבד.
- `get_public_recommendations()` – business_name, category, area, logo, short_desc.
- `get_public_deals()` – title, business_name, category, image, short_desc. ללא קוד קופון/קישור.
- `get_public_secondhand()` – title, category, image, price, area, short_desc. ללא פרטי מוכר.

הפונקציות בודקות `auth.uid()` – אם null מחזירות תצוגה חלקית, אם מחובר ומאושר מחזירות את כל השדות.

**עדכון מדיניות RLS לטבלאות הקיימות** – להבטיח שטבלאות `jobs`, `profiles`, `professional_recommendations`, `deals`, `secondhand_items` לא חושפות שדות רגישים ל-anon. אם כיום יש policy שמאפשרת לאנונימי לקרוא את כל השורה – נצמצם אותה ונפנה לפונקציות.

---

### 2. שכבת קוד צד-לקוח

**רכיב משותף חדש `src/components/MembersOnlyNotice.tsx`:**
- props: `variant` ("jobs" | "members" | "professionals" | "deals" | "secondhand" | "generic"), `compact?`
- מציג כותרת "תוכן זה זמין לחברי המועדון בלבד", טקסט מותאם לפי variant, כפתורי "התחברות" + "הרשמה למועדון".
- עיצוב: עוטף כרטיס gold/border בסגנון האתר, אייקון Lock.

**Hook חדש `src/hooks/useContentAccess.ts`:**
- שולף `content_access_settings` עם React Query (staleTime ארוך).
- מחזיר `canOpenCard(type)`, `canSeeContact(type)`, `canAct(type)`, `canSeeImages(type)`, `canSeePrice(type)` – משלב את ההגדרה עם מצב `useAuth` (`user && isApproved`).

**עדכון `ProtectedRoute`:**
- prop חדש `publicPartial?: boolean`. כאשר true, אם אין משתמש מאושר – ה-child עדיין נטען (ללא overlay/blur), והדף עצמו אחראי לסנן ולחסום.
- ב-`App.tsx` נסמן את `/jobs`, `/members`, `/deals`, `/secondhand`, `/recommendations` כ-`publicPartial`.
- `/profile`, `/admin`, `/announcements`, `/gallery`, `/members/:id` יישארו עם החסימה הקיימת.

**עדכון עמודי תוכן:**
לכל עמוד (`Jobs`, `Members`, `Recommendations`, `Deals`, `SecondHand`):
1. אם המשתמש לא מחובר/מאושר – לטעון מה-RPC הציבורית במקום מה-Select הרגיל.
2. כפתורי "פתח", "צור קשר", "וואטסאפ", "מימוש", "טלפון", "אימייל" → מוחלפים ברכיב נעילה קטן (`<LockedAction>`) כשאין הרשאה.
3. דיאלוגים/popups של פרטים מלאים – ייפתחו רק אם יש הרשאה. אחרת `MembersOnlyNotice`.
4. עמוד `/members/:id` – הפניה ל-Login עם הודעה למשתמש לא מחובר (כבר מוגן).

**רכיב משותף `src/components/LockedAction.tsx`** – כפתור עם אייקון Lock + tooltip; בלחיצה פותח `MembersOnlyNotice` כדיאלוג.

---

### 3. פאנל ניהול

**רכיב חדש `src/components/admin/AdminContentAccess.tsx`:**
- טופס עם טאב/אקורדיון לכל סוג תוכן.
- כל סוג תוכן עם Switches לכל הגדרה (רשימה / פתיחת כרטיס / פרטי קשר / פעולה / תמונות / מחיר).
- שמירה ל-`content_access_settings` עם optimistic update.
- כפתור "ברירת מחדל מומלצת" – רשימה לכולם, שאר ההגדרות סגורות.

**הוספה ל-`AdminSidebar` + `AdminDashboard`:**
- טאב חדש "הרשאות תוכן" (אייקון Shield) תחת קטגוריית הגדרות מערכת.

---

### 4. עיצוב

- שמירה על Charcoal/gold/cream של האתר.
- אייקון `Lock` קטן בגווני gold (`text-gold/70`).
- תגית "לחברי מועדון בלבד" כ-Badge עם רקע gold/10 ובורדר gold/30.
- טשטוש עדין (`blur-sm`) רק לטקסט פרטי קשר חסומים (כאסטטיקה – הנתונים עצמם לא נשלחים).
- כל הטקסטים בעברית RTL.

---

### 5. בדיקות

לאחר הבנייה אריץ Playwright כדי לוודא:
1. ב-`/jobs` ללא משתמש – המשרות מופיעות, אך פרטי קשר וכפתור פנייה מוחלפים ב-`MembersOnlyNotice`.
2. בקריאה ישירה ל-PostgREST של `jobs` כ-anon – לא מוחזרים שדות טלפון/אימייל.
3. עם משתמש מחובר ומאושר – הכל זמין.
4. אדמין מכבה "public_list_enabled" לסוג מסוים – הדף מציג רק `MembersOnlyNotice`.

---

### פרטים טכניים (לאדמין/למפתח)

**קבצים חדשים:**
- `src/components/MembersOnlyNotice.tsx`
- `src/components/LockedAction.tsx`
- `src/hooks/useContentAccess.ts`
- `src/components/admin/AdminContentAccess.tsx`
- מיגרציה: `content_access_settings` + 5 RPCs ציבוריות + עדכוני RLS.

**קבצים שיתעדכנו:**
- `src/components/auth/ProtectedRoute.tsx` – הוספת `publicPartial`.
- `src/App.tsx` – סימון הדפים הציבוריים-חלקיים.
- `src/pages/Jobs.tsx`, `Members.tsx`, `Recommendations.tsx`, `Deals.tsx`, `SecondHand.tsx` – שימוש ב-`useContentAccess` ו-RPCs.
- `src/components/admin/AdminSidebar.tsx`, `src/pages/AdminDashboard.tsx` – הוספת הטאב.

**הערה חשובה:** ייתכן שחלק מ-RLS הקיימות צריכות צמצום. אבדוק קודם את ה-policies הנוכחיות של כל טבלה רלוונטית לפני הגדרת ה-RPCs, ואדווח אם נדרשת חסימה אקטיבית של גישה ישירה ל-PostgREST עבור anon.