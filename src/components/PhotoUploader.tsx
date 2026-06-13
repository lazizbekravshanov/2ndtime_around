"use client";

import { useRef, useState } from "react";
import { PlusIcon, XIcon } from "@/components/icons";
import { MAX_PHOTOS } from "@/lib/constants";

type Slot = { id: number; url?: string; uploading: boolean };

let nextId = 1;

/**
 * Photo picker with optimistic slots: a skeleton tile appears the moment a
 * file is chosen (immediate feedback), then swaps to the stored image.
 */
export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const total = photos.length + pending.length;

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = MAX_PHOTOS - total;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
    }

    for (const file of selected) {
      const slot: Slot = { id: nextId++, uploading: true };
      setPending((p) => [...p, slot]);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "Upload failed. Try again.");
        }
        onChange([...photos, json.url]);
        photos = [...photos, json.url]; // keep local ref in sync for loop
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setPending((p) => p.filter((s) => s.id !== slot.id));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(photos.filter((p) => p !== url))}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        {pending.map((slot) => (
          <div key={slot.id} className="skeleton aspect-square" />
        ))}
        {total < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-surface text-faint hover:border-faint hover:text-ink"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        aria-label="Choose photos"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-2 text-xs text-faint">
        Up to {MAX_PHOTOS} photos, 5 MB each. The first one is the cover.
      </p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
