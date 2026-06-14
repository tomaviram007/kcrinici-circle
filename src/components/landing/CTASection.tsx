import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  isLoggedIn?: boolean;
}

const CTASection = ({ isLoggedIn = false }: Props) => {
  const isPending = isLoggedIn;
  const { t } = useLanguage();

  return (
    <section className="py-8 px-5 sm:py-24 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-gold/20 bg-card p-6 sm:p-12 md:p-16 glow-gold">
          {isPending ? (
            <>
              <Clock className="mx-auto mb-4 sm:mb-6 h-8 w-8 sm:h-10 sm:w-10 text-gold" />
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                {t("landing.cta.pendingTitle")} <span className="text-gold">{t("landing.cta.pendingHighlight")}</span>
              </h2>
              <p className="mt-4 font-body text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                {t("landing.cta.pendingDesc")}
                {" "}{t("landing.cta.pendingNote")}
              </p>
            </>
          ) : (
            <>
              <Crown className="mx-auto mb-4 sm:mb-6 h-8 w-8 sm:h-10 sm:w-10 text-gold" />
              <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
                {t("landing.cta.title")} <span className="text-gold">{t("landing.cta.highlight")}</span>
              </h2>
              <p className="mt-4 font-body text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
                {t("landing.cta.subtitle")}
                {" "}{t("landing.cta.desc")}
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gradient-gold text-primary-foreground font-body text-base px-8 py-6 hover:opacity-90 transition-opacity">
                    {t("landing.cta.joinBtn")}
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-gold text-gold font-body text-base px-8 py-6 hover:bg-gold/10">
                    {t("landing.cta.loginBtn")}
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
