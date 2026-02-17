import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

const CTASection = () => (
  <section className="py-24 px-6">
    <div className="mx-auto max-w-3xl text-center">
      <div className="rounded-2xl border border-gold/20 bg-card p-12 md:p-16 glow-gold">
        <Crown className="mx-auto mb-6 h-10 w-10 text-gold" />
        <h2 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
          הצטרף <span className="text-gold">למועדון</span>
        </h2>
        <p className="mt-4 font-body text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          קהילה סגורה של שכנים, מקצוענים ואנשי עשייה בשכונת ק. קריניצי.
          הירשם עכשיו וקבל גישה מלאה לכל התוכן והאירועים.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="gradient-gold text-primary-foreground font-body text-base px-8 py-6 hover:opacity-90 transition-opacity">
              הרשמה למועדון
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="border-gold text-gold font-body text-base px-8 py-6 hover:bg-gold/10">
              כניסת חברים
            </Button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default CTASection;
