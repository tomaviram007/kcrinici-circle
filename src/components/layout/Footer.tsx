import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import { useSiteLogo } from "@/hooks/useSiteLogo";

const Footer = () => {
  const { logoUrl } = useSiteLogo();
  const currentYear = new Date().getFullYear();

  const sitemapLinks = [
    { to: "/", label: "דף הבית" },
    { to: "/announcements", label: "לוח מודעות" },
    { to: "/jobs", label: "דרושים" },
    { to: "/events", label: "לוח אירועים" },
    { to: "/members", label: "חברי המועדון" },
    { to: "/recommendations", label: "אנשי מקצוע" },
    { to: "/deals", label: "הטבות" },
    { to: "/gallery", label: "גלריה" },
  ];

  const legalLinks = [
    { to: "/terms", label: "תנאי שימוש" },
    { to: "/privacy", label: "מדיניות פרטיות" },
    { to: "/regulations", label: "תקנון האתר" },
  ];

  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* About */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoUrl} alt="לוגו המועדון" className="h-12 w-12 rounded-full object-contain" />
              <h3 className="font-serif text-lg font-bold text-foreground">
                הגברים של ק. קריניצי
              </h3>
            </Link>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              מועדון חברים אקסקלוסיבי המחבר בין אנשי עסקים ואנשי מקצוע מובילים. נטוורקינג, אירועים והזדמנויות עסקיות.
            </p>
            <div className="flex items-start gap-2 text-muted-foreground pt-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="font-body text-sm">רמת גן, ישראל</span>
            </div>
          </div>

          {/* Sitemap */}
          <div className="space-y-3">
            <h3 className="font-serif text-base font-bold text-foreground">מפת האתר</h3>
            <nav className="flex flex-col gap-1.5">
              {sitemapLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="font-body text-sm text-muted-foreground hover:text-gold transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-serif text-base font-bold text-foreground">מסמכים משפטיים</h3>
            <nav className="flex flex-col gap-1.5">
              {legalLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="font-body text-sm text-muted-foreground hover:text-gold transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="font-serif text-base font-bold text-foreground">יצירת קשר</h3>
            <div className="flex flex-col gap-2">
              <a href="mailto:info@kcrinici.co.il" className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold transition-colors">
                <Mail className="h-4 w-4 shrink-0" />
                info@kcrinici.co.il
              </a>
              <a href="tel:+972500000000" className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold transition-colors">
                <Phone className="h-4 w-4 shrink-0" />
                צור קשר
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-muted-foreground">
            © {currentYear} הגברים של ק. קריניצי — כל הזכויות שמורות
          </p>
          <p className="font-body text-xs text-muted-foreground/60">
            עוצב ופותח על ידי{" "}
            <span className="text-muted-foreground/80 font-medium">תום אבירם</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
