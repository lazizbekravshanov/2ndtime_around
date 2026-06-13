import type { ReactNode } from "react";

/**
 * Form field wrapper: label, control, inline error. Errors render next to
 * the field they belong to (inline validation), announced to screen readers.
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
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

// Placeholders use full --color-faint (no /70 opacity) so they clear WCAG 1.4.3.
export const inputClasses =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-faint focus:border-ink";

export const textareaClasses =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-faint focus:border-ink";

export const selectClasses =
  "h-10 w-full appearance-none rounded-lg border border-line bg-surface px-3 text-sm focus:border-ink";
