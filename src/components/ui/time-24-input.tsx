import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Time24InputProps {
  value: string; // "HH:mm" or ""
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const pad = (n: number) => n.toString().padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

export const Time24Input = ({ value, onChange, className, placeholder }: Time24InputProps) => {
  const [hh = "", mm = ""] = (value || "").split(":");

  const update = (newHh: string, newMm: string) => {
    if (!newHh && !newMm) {
      onChange("");
      return;
    }
    onChange(`${newHh || "00"}:${newMm || "00"}`);
  };

  return (
    <div
      dir="ltr"
      className={cn(
        "flex h-10 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm",
        className,
      )}
      title={placeholder}
    >
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={hh}
        onChange={(e) => update(e.target.value, mm || "00")}
        className="bg-transparent outline-none cursor-pointer text-foreground font-mono"
      >
        <option value="" disabled>--</option>
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-foreground">:</span>
      <select
        value={mm}
        onChange={(e) => update(hh || "00", e.target.value)}
        className="bg-transparent outline-none cursor-pointer text-foreground font-mono"
      >
        <option value="" disabled>--</option>
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
};
