const Privacy = () => (
  <main className="min-h-screen bg-background" dir="rtl">
    <div className="page-container py-10 sm:py-16 md:py-24">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-8">מדיניות פרטיות</h1>
      <div className="prose prose-invert max-w-none font-body text-muted-foreground space-y-6">
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">1. איסוף מידע</h2>
          <p>אנו אוספים מידע אישי שאתה מספק בעת ההרשמה למועדון, כגון שם מלא, כתובת דוא"ל, מספר טלפון, מקצוע וכתובת מגורים.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">2. שימוש במידע</h2>
          <p>המידע שנאסף משמש לצורך ניהול חשבונך, שיפור השירות, שליחת עדכונים והתראות רלוונטיות, ויצירת קשר בין חברי המועדון.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">3. שיתוף מידע</h2>
          <p>איננו מוכרים או משתפים את המידע האישי שלך עם צדדים שלישיים, למעט במקרים הנדרשים על פי חוק.</p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-bold text-foreground">4. אבטחת מידע</h2>
          <p>אנו נוקטים באמצעי אבטחה מתקדמים כדי להגן על המידע האישי שלך מפני גישה בלתי מורשית, שימוש לרעה או חשיפה.</p>
        </section>
      </div>
    </div>
  </main>
);

export default Privacy;
