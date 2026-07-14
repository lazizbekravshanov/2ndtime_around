"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { HeartIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import { toggleFavorite } from "@/lib/actions/favorites";

const overlayBase =
  "absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/90 transition-colors";
const inlineBase =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-colors hover:bg-paper";

/**
 * Optimistic favorite heart. Ink (never red — red stays reserved for the one
 * accent). Used on cards (overlay) and on the listing detail page (inline).
 */
export function FavoriteButton({
  listingId,
  initial = false,
  variant = "overlay",
  signInHref,
}: {
  listingId: string;
  initial?: boolean;
  variant?: "overlay" | "inline";
  /** When set, the viewer is anonymous: render a sign-in call to action. */
  signInHref?: string;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // Anonymous visitors sign in before saving; keep the same heart affordance so
  // the layout is identical to the authenticated card/detail.
  if (signInHref) {
    const base = variant === "overlay" ? overlayBase : inlineBase;
    return (
      <Link
        href={signInHref}
        aria-label="Sign in to save"
        className={`${base} text-faint hover:text-ink`}
        onClick={(e) => e.stopPropagation()}
      >
        <HeartIcon filled={false} className="h-5 w-5" />
        {variant === "inline" && "Save"}
      </Link>
    );
  }

  // Functional updates keep this correct even when re-invoked from an Undo
  // toast (the server toggles from current state regardless of stale closures).
  function doToggle() {
    setFavorited((v) => !v); // optimistic
    startTransition(async () => {
      const res = await toggleFavorite(listingId);
      if (!res.ok) {
        setFavorited((v) => !v); // revert
        toast(res.error, { type: "error" });
        return;
      }
      setFavorited(res.data.favorited);
      toast(
        res.data.favorited ? "Saved to your wishlist" : "Removed from saved",
        { duration: 2500, action: { label: "Undo", onClick: doToggle } }
      );
    });
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    doToggle();
  }

  const base = variant === "overlay" ? overlayBase : inlineBase;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from saved" : "Save"}
      className={`${base} ${favorited ? "text-ink" : "text-faint hover:text-ink"} disabled:opacity-60`}
    >
      <HeartIcon filled={favorited} className="h-5 w-5" />
      {variant === "inline" && (favorited ? "Saved" : "Save")}
    </button>
  );
}
