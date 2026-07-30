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

/** How long the start of a term counts as move-in. */
export const MOVEIN_WINDOW_DAYS = 14;

export type CampusPhase = "movein" | "term" | "moveout" | "break";

export type CampusMoment = {
  phase: CampusPhase;
  /** Short eyebrow, e.g. "Move-out in 15 days". */
  label: string;
  /** One line about what students actually need right now. */
  lede: string;
  semester: Semester;
  daysToMoveOut: number | null;
};

/**
 * Where campus is in the academic year.
 *
 * The landing page is the only page a stranger sees, and a page that knows
 * whether it is move-in week or finals reads like campus in a way that stock
 * photography never does. It is honest, too: this runs on the same clock as
 * the move-out banner, so the page can't claim a moment that isn't happening.
 *
 * Order matters. Move-out is checked first because its window overlaps the
 * back half of term, and "break" is checked before "move-in" so the days after
 * a hall closing don't read as the start of something.
 */
export function campusMoment(now: Date = new Date()): CampusMoment {
  const semester = currentSemester(now);
  const daysToMoveOut = daysUntilMoveOut(now);
  const base = { semester, daysToMoveOut };

  if (daysToMoveOut !== null) {
    return {
      ...base,
      phase: "moveout",
      label:
        daysToMoveOut === 0
          ? "Move-out is today"
          : `Move-out in ${daysToMoveOut} ${daysToMoveOut === 1 ? "day" : "days"}`,
      lede: "Everything in a room has to go somewhere. Better a classmate than a dumpster.",
    };
  }

  if (now.getTime() > semester.moveOut.getTime()) {
    return {
      ...base,
      phase: "break",
      label: "Between semesters",
      lede: "Campus is quiet, but the listings keep going — get ahead of next term.",
    };
  }

  const sinceStart = Math.floor(
    (now.getTime() - semester.start.getTime()) / DAY_MS
  );
  if (sinceStart <= MOVEIN_WINDOW_DAYS) {
    return {
      ...base,
      phase: "movein",
      label: "Move-in week at UC",
      lede: "Furnish your room from students who just moved out of theirs.",
    };
  }

  return {
    ...base,
    phase: "term",
    label: `${semester.name} at UC`,
    lede: "Textbooks, dorm gear, bikes, tickets — from the people sitting next to you.",
  };
}
