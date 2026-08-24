/**
 * IANA time-zone helpers shared between the live-session scheduling form
 * (client) and the session creation / Zoom meeting routes (server).
 */
import { fromZonedTime, toZonedTime, formatInTimeZone as tzFormatInTimeZone, getTimezoneOffset } from "date-fns-tz";

/**
 * Turns a picked calendar date + "HH:mm" wall-clock time into the UTC
 * instant that represents that wall-clock time in the given IANA zone.
 * Reads year/month/day from `date` via local getters (not toISOString),
 * so the intended calendar day is preserved regardless of the browser's
 * own time zone.
 */
export function zonedWallTimeToUtc(date: Date, time: string, timeZone: string): Date {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const naive = `${year}-${month}-${day}T${time}:00`;
  return fromZonedTime(naive, timeZone);
}

/** Formats a UTC instant as wall-clock time in the given IANA zone. */
export function formatInTimeZone(date: Date | string, timeZone: string, formatStr: string): string {
  return tzFormatInTimeZone(date, timeZone, formatStr);
}

/** UTC instant -> Date whose local getters read as wall-clock time in the given zone. */
export { toZonedTime };

/** Short zone abbreviation (e.g. "EST", "GMT+1") for whatever zone `date` is being viewed in. */
export function getViewerZoneAbbreviation(date: Date = new Date()): string {
  const part = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "";
}

export interface TimezoneOption {
  value: string;
  label: string;
}

const FALLBACK_ZONES = [
  "UTC", "Africa/Accra", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland",
];

/** All supported IANA zones, labeled with their current UTC offset and sorted by it. */
export const COMMON_TIMEZONES: TimezoneOption[] = (() => {
  const zones = typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : FALLBACK_ZONES;
  const now = new Date();

  return zones
    .map((zone) => {
      const offsetLabel = new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
      return {
        value: zone,
        label: `${zone.replace(/_/g, " ")} (${offsetLabel})`,
        offsetMinutes: getTimezoneOffset(zone, now) / 60000,
      };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
    .map(({ value, label }) => ({ value, label }));
})();
