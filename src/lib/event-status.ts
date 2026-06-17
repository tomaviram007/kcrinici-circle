// Israel timezone-aware helpers to determine if an event has ended.
// An event is considered "ended" only after its end time has passed.
// If no explicit end time is stored, we fall back to the end of the event's
// calendar day in Asia/Jerusalem (UTC+2/+3 with DST).

const IL_TZ = "Asia/Jerusalem";

function israelDateParts(d: Date): { y: string; m: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return {
    y: parts.find((p) => p.type === "year")!.value,
    m: parts.find((p) => p.type === "month")!.value,
    day: parts.find((p) => p.type === "day")!.value,
  };
}

function endOfIsraelDay(d: Date): Date {
  const { y, m, day } = israelDateParts(d);
  // Determine Israel offset (+2 or +3) for this calendar day using a noon UTC probe.
  const noonUTC = new Date(`${y}-${m}-${day}T12:00:00Z`);
  const israelHourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(noonUTC);
  const israelHour = parseInt(israelHourStr, 10);
  const offsetHours = israelHour - 12; // 2 (winter) or 3 (summer)
  const sign = offsetHours >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  return new Date(`${y}-${m}-${day}T23:59:59.999${sign}${pad(offsetHours)}:00`);
}

export function getEventEndTime(event: {
  event_date?: string | null;
  end_date?: string | null;
  end_time?: string | null;
}): Date | null {
  if (!event?.event_date) return null;
  const start = new Date(event.event_date);
  if (isNaN(start.getTime())) return null;

  const explicitEnd = event.end_date || event.end_time;
  if (explicitEnd) {
    const ed = new Date(explicitEnd);
    if (!isNaN(ed.getTime())) return ed;
  }

  return endOfIsraelDay(start);
}

export function isEventEnded(event: {
  event_date?: string | null;
  end_date?: string | null;
  end_time?: string | null;
}): boolean {
  const end = getEventEndTime(event);
  if (!end) return false;
  return Date.now() > end.getTime();
}
