import { BadgeIcon } from "@/components/icons";
import type { Badge } from "@/lib/badges";

/**
 * Earned badges as quiet chips. On the owner's own profile, locked badges
 * show with a faint progress line so there's something to work toward.
 */
export function BadgeShelf({
  badges,
  showLocked,
}: {
  badges: Badge[];
  showLocked: boolean;
}) {
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  if (earned.length === 0 && !showLocked) return null;

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {earned.map((b) => (
            <span
              key={b.key}
              title={b.hint}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium"
            >
              <BadgeIcon className="h-4 w-4 text-ink" />
              {b.label}
            </span>
          ))}
        </div>
      )}

      {showLocked && locked.length > 0 && (
        <div className="space-y-1.5">
          {locked.map((b) => (
            <div key={b.key} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-faint">{b.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-faint/60"
                  style={{ width: `${Math.round(b.progress * 100)}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-xs text-faint">
                {b.progressLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
