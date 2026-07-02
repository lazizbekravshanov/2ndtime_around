/**
 * Rough UC semester boundaries — one source of truth for "this semester"
 * (impact stats) and the move-out countdown banner.
 */
export type Semester = {
  name: string;
  /** e.g. "spring-2026" — stable key for per-semester banner dismissal. */
  key: string;
  start: Date;
  /** The residence-hall move-out crunch this semester ends in. */
  moveOut: Date;
};

/**
 * The banner shows this many days ahead of move-out. Generous on purpose:
 * bulk listings need lead time to actually sell before everyone leaves.
 */
export const MOVEOUT_WINDOW_DAYS = 45;

export function currentSemester(now: Date = new Date()): Semester {
  const year = now.getFullYear();
  const spring = new Date(year, 0, 1);
  const summer = new Date(year, 4, 10);
  const fall = new Date(year, 7, 15);
  if (now >= fall) {
    return {
      name: `Fall ${year}`,
      key: `fall-${year}`,
      start: fall,
      moveOut: new Date(year, 11, 13), // mid-December hall closing
    };
  }
  if (now >= summer) {
    return {
      name: `Summer ${year}`,
      key: `summer-${year}`,
      start: summer,
      moveOut: new Date(year, 7, 14), // leases turn over before fall
    };
  }
  return {
    name: `Spring ${year}`,
    key: `spring-${year}`,
    start: spring,
    moveOut: new Date(year, 3, 30), // end-of-April move-out rush
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days until this semester's move-out, or null when it's either
 * further out than the banner window or already past.
 */
export function daysUntilMoveOut(now: Date = new Date()): number | null {
  const { moveOut } = currentSemester(now);
  const days = Math.ceil((moveOut.getTime() - now.getTime()) / DAY_MS);
  if (days < 0 || days > MOVEOUT_WINDOW_DAYS) return null;
  return days;
}
