"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertIcon, CheckIcon, XIcon } from "@/components/icons";

type ToastType = "success" | "error";
/** An optional inline action, e.g. "Undo" on a destructive change. */
type ToastAction = { label: string; onClick: () => void };
type ToastOptions = {
  type?: ToastType;
  action?: ToastAction;
  duration?: number;
};
type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
};
type ToastContextValue = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ToastContextValue | null>(null);

// Errors linger longer than confirmations and need to be read (WCAG 2.2.1).
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
};

/**
 * Toasts for confirmations and errors. Success messages go to a polite
 * live region; errors to an assertive one (WCAG 4.1.3) so a screen reader
 * interrupts to read a failure. Every toast can be dismissed manually and
 * may carry one action button (e.g. "Undo").
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback<ToastContextValue>((message, options = {}) => {
    const id = Date.now() + Math.floor(performance.now());
    const type = options.type ?? "success";
    setToasts((t) => [...t, { id, message, type, action: options.action }]);
    const duration = options.duration ?? DEFAULT_DURATION[type];
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const successes = toasts.filter((t) => t.type === "success");
  const errors = toasts.filter((t) => t.type === "error");

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {/*
         * Two always-present live regions (never display:none, so the screen
         * reader keeps watching them): errors are assertive and interrupt;
         * confirmations are polite and wait their turn.
         */}
        <div
          role="alert"
          aria-live="assertive"
          className="flex w-full flex-col items-center gap-2"
        >
          {errors.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div
          role="status"
          aria-live="polite"
          className="flex w-full flex-col items-center gap-2"
        >
          {successes.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const isError = toast.type === "error";
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface py-2 pl-4 pr-2 text-sm font-medium shadow-float [animation:toast-in_0.25s_cubic-bezier(0.16,1,0.3,1)]">
      {isError ? (
        <AlertIcon className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <CheckIcon className="h-4 w-4 shrink-0 text-success" />
      )}
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="ml-1 rounded-full px-2 py-0.5 text-sm font-semibold text-accent hover:bg-paper"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint hover:bg-paper hover:text-ink"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Returns a `toast(message, options?)` function. No-op if no provider is mounted. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? (() => {});
}
