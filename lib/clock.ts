/** 24-hour HH:MM for a given IANA time zone. */
export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
}
