import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

const PendingApproval = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-card border border-gold/20 glow-gold">
          <Clock className="h-10 w-10 text-gold" />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-foreground">
          ממתין <span className="text-gold">לאישור</span>
        </h1>
        
        <p className="mt-4 font-body text-lg leading-relaxed text-muted-foreground">
          בקשתך נשלחה להנהלת המועדון.
          <br />
          תקבל הודעה במייל ברגע שהגישה תאושר.
        </p>
        
        <div className="mt-6 mx-auto h-px w-16 gradient-gold opacity-30" />
        
        <Link
          to="/"
          className="mt-8 inline-block font-body text-sm text-gold hover:underline"
        >
          חזרה לעמוד הראשי
        </Link>
      </div>
    </div>
  );
};

export default PendingApproval;
