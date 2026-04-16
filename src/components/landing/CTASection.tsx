import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";

interface Props {
  isLoggedIn?: boolean;
}

const CTASection = ({ isLoggedIn = false }: Props) => {
  const isPending = isLoggedIn; // logged in but not approved

  return (
    <section className="py-8 px-5 sm:py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-gold/20 bg-card p-6 sm:p-12 md:p-16 glow-gold">
          {isPending ? (
            <>
              <Clock className="mx-auto mb-4 sm:mb-6 h-8 w-8 sm:h-10 sm:w-10 text-gold" />
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                הבקשה שלך <span className="text-gold">בטיפול</span>
              </h2>
              <p className="mt-4 font-body text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                קיבלנו את בקשת ההצטרפות שלך למועדון. צוות המנהלים יבדוק ויאשר אותה בהקדם.
                תקבל עדכון ברגע שתאושר.
              </p>
            </>
          ) : (
            <>
              <Crown className="mx-auto mb-4 sm:mb-6 h-8 w-8 sm:h-10 sm:w-10 text-gold" />
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                הצטרף <span className="text-gold">למועדון</span>
              </h2>
              <p className="mt-4 font-body text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                קהילה סגורה של שכנים, מקצוענים ואנשי עשייה בשכונת ק. קריניצי.
                הירשם עכשיו וקבל גישה מלאה לכל התוכן והאירועים.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gradient-gold text-primary-foreground font-body text-base px-8 py-6 hover:opacity-90 transition-opacity">
                    הרשמה למועדון
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-gold text-gold font-body text-base px-8 py-6 hover:bg-gold/10">
                    כניסת חברים
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default CTASection;
