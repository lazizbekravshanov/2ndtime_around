"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Mobile-first bottom sheet / desktop centered modal. Focus-trapped,
 * Escape-to-close, backdrop click closes. Used by report, block, save-search,
 * share-meetup, move-out.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Remember the trigger so focus lands back on it when the dialog closes
    // (WCAG 2.4.3 focus order).
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusables = () =>
      panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      ) ?? [];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Trap Tab inside the dialog — cycling, both directions.
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel for keyboard users.
    panelRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      trigger?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink/30 [animation:fade-in_0.2s_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-float outline-none [animation:sheet-in_0.28s_cubic-bezier(0.16,1,0.3,1)] sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
