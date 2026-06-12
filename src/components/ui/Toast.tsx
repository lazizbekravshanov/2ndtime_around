"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon } from "@/components/icons";

type Toast = { id: number; message: string };
type ToastContextValue = (message: string) => void;

const ToastContext = createContext<ToastContextValue | null>(null);

/** A single bottom-center toast for confirmations. Auto-dismiss after 3s. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.floor(performance.now());
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm"
          >
            <CheckIcon className="h-4 w-4 text-success" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a `toast(message)` function. No-op if no provider is mounted. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? (() => {});
}
