

## תוכנית: אחידות גודל כותרות הסקשנים בדף הבית

### הבעיה
הכותרת של סקשן ימי ההולדת (`BirthdaysPreviewSection`) קטנה יותר מהשאר:
- **ימי הולדת**: `text-2xl sm:text-3xl md:text-4xl`
- **כל השאר** (מכירות, דרושים, אירועים, מודעות): `text-2xl sm:text-4xl md:text-5xl`

### הפתרון
שינוי שורה 119 ב-`BirthdaysPreviewSection.tsx` כך שגודל הפונט יהיה זהה לשאר הסקשנים:

```
sm:text-3xl md:text-4xl  →  sm:text-4xl md:text-5xl
```

בנוסף, אאחד את הרווחים (`mb-6 sm:mb-10` → `mb-8 sm:mb-16`) כך שגם המרווח מעל הכותרת יהיה עקבי.

### קובץ לעדכון
- `src/components/landing/BirthdaysPreviewSection.tsx` — שורות 115-122

