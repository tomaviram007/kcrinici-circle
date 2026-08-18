const LAST_UPDATED = "18 באוגוסט 2026";

const Regulations = () => (
  <main className="min-h-screen bg-background" dir="rtl">
    <div className="page-container py-10 sm:py-16 md:py-24">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">תקנון האתר והמועדון</h1>
      <p className="font-body text-sm text-muted-foreground mb-8">עודכן לאחרונה: {LAST_UPDATED}</p>

      <div className="prose prose-invert max-w-none font-body text-muted-foreground space-y-6">
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">1. מטרת המועדון</h2>
          <p>
            מועדון "הגברים של ק.קרניצי" הוקם כדי לחבר בין אנשי עסקים ואנשי מקצוע באזור רמת גן והסביבה, ליצור
            קשרים עסקיים וחברתיים, לקדם שיתופי פעולה ולהפעיל פעילות קהילתית ואירועים לחברי המועדון.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">2. חברות במועדון</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>החברות אישית ואינה ניתנת להעברה לאדם אחר.</li>
            <li>הצטרפות מותנית בהרשמה מלאה באתר, לרבות תמונת פרופיל, ובאישור ידני של ההנהלה.</li>
            <li>ההנהלה רשאית לאשר או לדחות בקשה לפי שיקול דעתה ואינה חייבת בהנמקה.</li>
            <li>חבר מתחייב לעדכן את פרטיו באתר כאשר הם משתנים, כדי שאינדקס החברים יישאר מדויק.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">3. כללי התנהגות</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>שמירה על יחס מכבד כלפי חברי המועדון, ההנהלה, אורחים וספקים.</li>
            <li>איסור על פרסום תוכן פוגעני, מסית, מפלה, מטריד או בלתי חוקי.</li>
            <li>איסור על שימוש בפרטי חברים לצורכי שיווק המוני, ספאם או מסירתם לצד שלישי.</li>
            <li>שמירה על דיסקרטיות ביחס למידע פנימי שנחשף במסגרת פעילות המועדון.</li>
            <li>אין להציג את המועדון כמי שממליץ, מאשר או ערב לעסק, למוצר או לשירות של חבר.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">4. פרסום תכנים באתר</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>לוח הדרושים מיועד למשרות אמיתיות ורלוונטיות. מודעה מתפרסמת מיידית וההנהלה רשאית לערוך, להשבית או להסיר אותה.</li>
            <li>עמוד יד שנייה מיועד למכירה או מסירה של פריטים בין חברים ומגולשים. פריטים שהוגשו על ידי גולשים שאינם רשומים מפורסמים לאחר אישור ההנהלה.</li>
            <li>בעל מודעה בעמוד יד שנייה נדרש לסמן פריט כ"נמכר" או "נמסר" בסיום העסקה, כדי לשמור על לוח מעודכן.</li>
            <li>המלצות על אנשי מקצוע, הטבות ומודעות מכירה עוברות אישור הנהלה לפני פרסום.</li>
            <li>אין לפרסם אותו תוכן שוב ושוב או להעלות מודעות כפולות.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">5. עסקאות בין חברים</h2>
          <p>
            כל עסקה, התקשרות או תשלום בין חברי המועדון או בינם לבין מפרסמים היא באחריותם הבלעדית של הצדדים.
            המועדון משמש כפלטפורמת חיבור בלבד, אינו צד לעסקה, אינו בודק את טיב המוצר או השירות ואינו אחראי
            לנזק, לאיחור או להפרת התחייבות.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">6. אירועי המועדון</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>הרשמה לאירוע נעשית דרך האתר ומהווה התחייבות להגעה.</li>
            <li>באירוע בתשלום, מקום נשמר רק לאחר הסדרת התשלום בהתאם לפרטים המופיעים בעמוד האירוע.</li>
            <li>ביטול הגעה יש לעדכן מוקדם ככל האפשר, כדי לאפשר לחבר אחר להצטרף.</li>
            <li>ההנהלה רשאית לשנות מועד, מיקום או תוכן של אירוע, ולעדכן את הנרשמים בהתאם.</li>
            <li>צילומי סטילס ווידאו מאירועים עשויים להתפרסם בגלריית האתר ובערוצי המועדון. חבר שאינו מעוניין להופיע בתמונות יודיע להנהלה ותמונתו תוסר.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">7. הטבות לחברים</h2>
          <p>
            הטבות המפורסמות באתר ניתנות על ידי בתי עסק חיצוניים ובאחריותם. תנאי ההטבה, תוקפה והמימוש שלה נקבעים
            על ידי נותן ההטבה. ההנהלה רשאית להוסיף, לשנות או להסיר הטבות בכל עת.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">8. תקשורת מהמועדון</h2>
          <p>
            חברי המועדון מקבלים עדכונים בדוא"ל, בקבוצת הוואטסאפ, בהתראות דפדפן ובאתר עצמו. ההתנהלות בקבוצות
            הוואטסאפ כפופה לאותם כללי התנהגות. ניתן להסיר את עצמך מדיוור שיווקי בכל עת, מבלי שהדבר יפגע בחברות.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">9. אכיפה, השעיה וביטול חברות</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>ההנהלה רשאית להסיר תוכן מפר ללא התראה מוקדמת.</li>
            <li>בהפרה חוזרת או חמורה, ההנהלה רשאית להשעות או לבטל חברות לאחר מתן התראה, ובמקרים חמורים גם ללא התראה.</li>
            <li>ביטול חברות אינו מזכה בהחזר תשלומים ששולמו עבור אירועים שכבר התקיימו.</li>
            <li>חבר רשאי לפרוש מהמועדון בכל עת בהודעה להנהלה ולבקש את מחיקת חשבונו.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">10. שינויים בתקנון</h2>
          <p>
            ההנהלה רשאית לעדכן תקנון זה מעת לעת. הנוסח העדכני יפורסם בעמוד זה, והמשך פעילות במועדון לאחר הפרסום
            מהווה הסכמה לו. תקנון זה משלים את תנאי השימוש ואת מדיניות הפרטיות של האתר.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">11. יצירת קשר</h2>
          <p>
            לשאלות, בקשות או פניות בנושא התקנון:{" "}
            <a href="mailto:info@kcrinici.co.il" className="text-gold hover:underline">info@kcrinici.co.il</a>.
          </p>
        </section>
      </div>
    </div>
  </main>
);

export default Regulations;
