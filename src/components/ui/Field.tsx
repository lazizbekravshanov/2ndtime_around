import { cloneElement, isValidElement, type ReactNode } from "react";

/**
 * Form field wrapper: label, control, inline error. Errors render next to
 * the field they belong to (inline validation), announced to screen readers.
 * The hint/error paragraphs get ids derived from `htmlFor`, and the control
 * is linked to them via aria-describedby (WCAG 1.3.1/3.3.1) — so a screen
 * reader user focusing an invalid field hears WHY it's invalid, not just
 * that it is.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  // Link the single wrapped control to its message without changing any
  // call site. Non-element children (rare) render untouched.
  const control =
    describedBy && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": describedBy })
      : children;

  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-faint">
            optional
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

// Placeholders use full --color-faint (no /70 opacity) so they clear WCAG 1.4.3.
export const inputClasses =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-faint transition-colors focus:border-ink";

export const textareaClasses =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint transition-colors focus:border-ink";

// appearance-none strips the native arrow, so we draw our own chevron —
// without it a select is indistinguishable from a text input.
export const selectClasses =
  "h-10 w-full appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-sm transition-colors focus:border-ink " +
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%2357534e%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_0.625rem_center] bg-no-repeat";
