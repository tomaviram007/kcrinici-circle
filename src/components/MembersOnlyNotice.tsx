import { Link } from "react-router-dom";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MembersOnlyVariant =
  | "jobs"
  | "members"
  | "professionals"
  | "deals"
  | "secondhand"
  | "events"
  | "generic";

const COPY: Record<MembersOnlyVariant, { title: string; text: string }> = {
  jobs: {
    title: "פרטי המשרה זמינים לחברי המועדון בלבד",
    text: "כדי לצפות בפרטים המלאים ולפנות למפרסם, יש להתחבר או להירשם למועדון.",
  },
  members: {
    title: "פרטי החברים זמינים לחברי המועדון בלבד",
    text: "כדי לצפות בפרטי החבר וליצור קשר, יש להתחבר או להירשם למועדון.",
  },
  professionals: {
    title: "פרטי יצירת קשר זמינים לחברי המועדון בלבד",
    text: "כדי לצפות בפרטי איש המקצוע וליצור קשר, יש להתחבר או להירשם למועדון.",
  },
  deals: {
    title: "ההטבה זמינה לחברי המועדון בלבד",
    text: "כדי לממש את ההטבה, יש להתחבר או להירשם למועדון.",
  },
  secondhand: {
    title: "יצירת קשר עם המוכר זמינה לחברי המועדון בלבד",
    text: "כדי לצפות בפרטים המלאים וליצור קשר עם המוכר, יש להתחבר או להירשם למועדון.",
  },
  events: {
    title: "פרטי האירוע זמינים לחברי המועדון בלבד",
    text: "כדי לצפות בפרטי האירוע ולהירשם, יש להתחבר או להירשם למועדון.",
  },
  generic: {
    title: "תוכן זה זמין לחברי המועדון בלבד",
    text: "כדי לצפות בפרטים המלאים, ליצור קשר או לבצע פעולה, יש להתחבר או להירשם למועדון.",
  },
};

interface Props {
  variant?: MembersOnlyVariant;
  compact?: boolean;
  className?: string;
}

const MembersOnlyNotice = ({ variant = "generic", compact = false, className = "" }: Props) => {
  const { title, text } = COPY[variant];

  if (compact) {
    return (
      <div
        dir="rtl"
        className={`flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 ${className}`}
      >
        <Lock className="h-4 w-4 shrink-0 text-gold/80" />
        <div className="flex-1 min-w-0">
          <p className="font-body text-xs text-foreground">{title}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs font-body text-gold hover:bg-gold/10">
            <Link to="/login">התחברות</Link>
          </Button>
          <Button asChild size="sm" className="h-7 px-2 text-xs font-body gradient-gold text-primary-foreground">
            <Link to="/register">הרשמה</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={`rounded-2xl border border-gold/20 bg-card/80 backdrop-blur-sm p-6 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-background">
        <Lock className="h-5 w-5 text-gold" />
      </div>
      <h3 className="font-serif text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild className="gradient-gold text-primary-foreground font-body hover:opacity-90">
          <Link to="/register">
            <UserPlus className="ml-2 h-4 w-4" />
            הרשמה למועדון
          </Link>
        </Button>
        <Button asChild variant="outline" className="font-body border-gold/30 text-gold hover:bg-gold/10">
          <Link to="/login">
            <LogIn className="ml-2 h-4 w-4" />
            התחברות
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default MembersOnlyNotice;
