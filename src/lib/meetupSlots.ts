/**
 * Quick "between classes" time suggestions for the meetup composer.
 * Pure date math so it's unit-testable; the UI just renders the result.
 */
export type QuickSlot = {
  label: string; // "Today 12 pm"
  value: string; // datetime-local input format, local time: YYYY-MM-DDTHH:MM
};

/** A slot must be at least this far away to be proposable in good faith. */
const MIN_LEAD_MS = 45 * 60 * 1000;

// Natural between-class times: lunch, mid-afternoon, after last class.
const TODAY_HOURS = [12, 15, 17];
const TOMORROW_HOURS = [10, 12, 15];

/** Format a Date as a datetime-local input value (local time, no seconds). */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hourLabel(hour: number): string {
  if (hour === 12) return "12 pm";
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
}

/** Up to 4 upcoming slots: today's remaining between-class times, then tomorrow's. */
export function quickMeetupSlots(now: Date = new Date()): QuickSlot[] {
  const slots: QuickSlot[] = [];

  for (const hour of TODAY_HOURS) {
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    if (d.getTime() - now.getTime() >= MIN_LEAD_MS) {
      slots.push({ label: `Today ${hourLabel(hour)}`, value: toLocalInputValue(d) });
    }
  }
  for (const hour of TOMORROW_HOURS) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    slots.push({ label: `Tomorrow ${hourLabel(hour)}`, value: toLocalInputValue(d) });
  }

  return slots.slice(0, 4);
}
