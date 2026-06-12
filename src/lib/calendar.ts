/**
 * Build a minimal RFC-5545 .ics string for a meetup. No dependencies — a
 * single VEVENT with a 30-minute window at the chosen spot.
 */
export function toIcs(meetup: {
  spot: string;
  datetime: string; // ISO
  uid: string;
  otherName: string;
}): string {
  const start = new Date(meetup.datetime);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//2nd Time Around//Meetup//EN",
    "BEGIN:VEVENT",
    `UID:${meetup.uid}@2ndtimearound`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(`Meetup with ${meetup.otherName}`)}`,
    `LOCATION:${escape(meetup.spot)}`,
    `DESCRIPTION:${escape("Campus meetup arranged on 2nd Time Around. Meet in daylight at a busy spot; never share your dorm or financial info.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
