import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronRight, ChevronLeft } from "lucide-react";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const HEBREW_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface HebrewDatePickerProps {
  value: string; // yyyy-MM-dd or ""
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
  placeholder?: string;
}

const HebrewDatePicker = ({ value, onChange, error, className, placeholder = "בחר תאריך" }: HebrewDatePickerProps) => {
  const today = new Date();
  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() || 1985);
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() || 0);
  const [open, setOpen] = useState(false);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = today.getFullYear(); y >= 1920; y--) arr.push(y);
    return arr;
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const days = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek]);

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today || d < new Date("1920-01-01");
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day;
  };

  const handleSelect = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const formatDisplay = (val: string) => {
    const parts = val.split("-");
    if (parts.length !== 3) return val;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const goMonth = (dir: number) => {
    let newMonth = viewMonth + dir;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn(
            "w-full justify-start text-right font-normal bg-card border-border",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className,
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {value ? formatDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start" dir="rtl">
        <div className="p-3 space-y-3 min-w-[280px]">
          {/* Year & Month selectors */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goMonth(-1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex-1 flex gap-1.5">
              <Select value={String(viewMonth)} onValueChange={(v) => setViewMonth(Number(v))}>
                <SelectTrigger className="h-8 bg-card text-sm font-body flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {HEBREW_MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(viewYear)} onValueChange={(v) => setViewYear(Number(v))}>
                <SelectTrigger className="h-8 bg-card text-sm font-body w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button type="button" onClick={() => goMonth(1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-0">
            {HEBREW_DAYS.map((d) => (
              <div key={d} className="h-8 flex items-center justify-center text-xs text-muted-foreground font-body">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day, i) => (
              <div key={i} className="h-8 w-8 mx-auto flex items-center justify-center">
                {day !== null ? (
                  <button
                    type="button"
                    disabled={isDisabled(day)}
                    onClick={() => handleSelect(day)}
                    className={cn(
                      "h-8 w-8 rounded-md text-sm font-body transition-colors",
                      isSelected(day) ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                      isDisabled(day) && "text-muted-foreground opacity-50 cursor-not-allowed",
                    )}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HebrewDatePicker;
