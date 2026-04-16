

# תיקון מערכת הפרסומות - הצגה חכמה ללא כפילויות

## הבעיה
כרגע יש קמפיין אחד פעיל עם `placement: "sidebar"` ו-`max_appearances: 4`. בדף הבית יש 3 סלוטים של sidebar (slotIndex 0, 1, 2). הפילטר הנוכחי (`slotIndex < max_appearances`) מאפשר לאותה פרסומת להופיע בכל 3 הסלוטים, ולכן היא מוצגת 3 פעמים.

## הפתרון

### 1. שינוי לוגיקת ה-sidebar בדף הבית
במקום 3 קומפוננטות SmartAdBanner נפרדות לסיידבר, ניצור קומפוננטת **SidebarAdStack** שמביאה את כל הפרסומות הזמינות ומחלקת אותן בין הסלוטים - כל פרסומת מוצגת **פעם אחת בלבד**.

- אם יש רק פרסומת אחת - מוצג סלוט אחד בלבד (לא 3 זהים)
- אם יש 3 פרסומות - כל אחת בסלוט נפרד
- `max_appearances` יקבע כמה סלוטים שונים באתר הפרסומת יכולה לתפוס (לא כפילויות באותו עמוד)

### 2. עדכון SmartAdBanner - מניעת כפילויות בעמוד
הוספת prop אופציונלי `excludeIds` כדי שסלוטים באותו עמוד לא יציגו את אותה פרסומת.

### 3. עדכון כל העמודים
- **דף הבית**: החלפת 3 סלוטי sidebar בקומפוננטת SidebarAdStack
- **שאר העמודים** (Events, Members, Deals, Announcements, Recommendations): הסיידבר כבר מציג סלוט בודד - ללא שינוי נדרש

## קבצים שישתנו
- `src/components/ads/SmartAdBanner.tsx` - הוספת `excludeIds` prop
- `src/components/ads/SidebarAdStack.tsx` - קומפוננטה חדשה שמחלקת פרסומות בין סלוטים
- `src/pages/Index.tsx` - החלפת 3 סלוטי sidebar ב-SidebarAdStack

