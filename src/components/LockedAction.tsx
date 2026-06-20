import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MembersOnlyNotice, { type MembersOnlyVariant } from "@/components/MembersOnlyNotice";

interface Props {
  variant?: MembersOnlyVariant;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
}

const LockedAction = ({ variant = "generic", label = "לחברי מועדון בלבד", className = "", size = "sm", fullWidth = false }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`font-body border-gold/30 text-gold hover:bg-gold/10 ${fullWidth ? "w-full" : ""} ${className}`}
      >
        <Lock className="h-3.5 w-3.5 ml-1" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none" dir="rtl">
          <MembersOnlyNotice variant={variant} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LockedAction;
