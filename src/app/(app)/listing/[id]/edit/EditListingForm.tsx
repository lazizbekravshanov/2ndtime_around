"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Button } from "@/components/ui/Button";
import {
  Field,
  inputClasses,
  selectClasses,
  textareaClasses,
} from "@/components/ui/Field";
import {
  CATEGORIES,
  CONDITIONS,
  type ListingType,
} from "@/lib/constants";
import { updateListing } from "@/lib/actions/listings";

type EditableListing = {
  id: string;
  type: ListingType;
  status: string;
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  locationNote: string | null;
  photos: string[];
};

type FormData = {
  title: string;
  description: string;
  category: string;
  condition: string;
  price?: number;
  locationNote: string;
};

export function EditListingForm({ listing }: { listing: EditableListing }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>(listing.photos);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isLostFound = listing.type === "LOST" || listing.type === "FOUND";
  const isDraft = listing.status === "DRAFT";

  // Client-side validation for parity with the Sell wizard — catch problems
  // before a server round-trip (Nielsen #5: error prevention). The server
  // still re-validates with the full schema; this is the first line of defense.
  const schema = z
    .object({
      title: z
        .string()
        .trim()
        .min(3, "Title needs at least 3 characters.")
        .max(80, "Keep the title under 80 characters."),
      description: z
        .string()
        .trim()
        .min(10, "Add a little more detail (at least 10 characters).")
        .max(2000, "Keep the description under 2000 characters."),
      category: z.string().min(1, "Pick a category."),
      condition: z.string().optional(),
      price: z.number().min(0.5, "Price must be between $0.50 and $9,999.").max(9999.99, "Price must be between $0.50 and $9,999.").optional(),
      locationNote: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (listing.type === "SELL" && (val.price === undefined || Number.isNaN(val.price))) {
        ctx.addIssue({ path: ["price"], code: "custom", message: "A sale listing needs a price." });
      }
      if (isLostFound && (!val.locationNote || val.locationNote.trim().length < 3)) {
        ctx.addIssue({
          path: ["locationNote"],
          code: "custom",
          message: listing.type === "LOST" ? "Where did you last see it?" : "Where did you find it?",
        });
      }
    });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: listing.title,
      description: listing.description,
      category: listing.category,
      condition: listing.condition ?? "",
      price: listing.price ?? undefined,
      locationNote: listing.locationNote ?? "",
    },
  });

  function makeSubmit(publish: boolean) {
    return handleSubmit(async (data) => {
      setServerError(null);
      setSaved(false);
      // The server action runs the full Zod schema; its field errors are
      // mapped back onto the inputs they belong to.
      const result = await updateListing(
        listing.id,
        {
          type: listing.type,
          title: data.title,
          description: data.description,
          category: data.category,
          condition: data.condition || undefined,
          price:
            listing.type === "SELL" && data.price !== undefined && !Number.isNaN(data.price)
              ? data.price
              : undefined,
          locationNote: data.locationNote || undefined,
          photos,
        },
        publish
      );
      if (!result.ok) {
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          if (field in data) {
            setError(field as keyof FormData, { message });
          }
        }
        setServerError(result.error);
        return;
      }
      if (publish || !isDraft) {
        router.push(`/listing/${listing.id}`);
        router.refresh();
      } else {
        setSaved(true); // stay on the draft, confirm visibly
      }
    });
  }

  return (
    <form onSubmit={makeSubmit(false)} noValidate className="space-y-5">
      <div>
        <p className="mb-1.5 block text-sm font-medium">Photos</p>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </div>

      <Field label="Title" htmlFor="title" error={errors.title?.message}>
        <input
          id="title"
          aria-required
          aria-invalid={errors.title ? true : undefined}
          className={inputClasses}
          {...register("title")}
        />
      </Field>

      <Field label="Category" htmlFor="category" error={errors.category?.message}>
        <select id="category" aria-required className={selectClasses} {...register("category")}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {!isLostFound && (
        <Field
          label="Condition"
          htmlFor="condition"
          error={errors.condition?.message}
        >
          <select id="condition" className={selectClasses} {...register("condition")}>
            <option value="">Not specified</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      )}

      {listing.type === "SELL" && (
        <Field label="Price" htmlFor="price" error={errors.price?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
              $
            </span>
            <input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              aria-required
              aria-invalid={errors.price ? true : undefined}
              className={`${inputClasses} pl-7`}
              {...register("price", { valueAsNumber: true })}
            />
          </div>
        </Field>
      )}

      {isLostFound && (
        <Field
          label={listing.type === "LOST" ? "Where you last saw it" : "Where you found it"}
          htmlFor="locationNote"
          error={errors.locationNote?.message}
        >
          <input
            id="locationNote"
            aria-required
            aria-invalid={errors.locationNote ? true : undefined}
            className={inputClasses}
            {...register("locationNote")}
          />
        </Field>
      )}

      <Field
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <textarea
          id="description"
          rows={4}
          aria-required
          aria-invalid={errors.description ? true : undefined}
          className={textareaClasses}
          {...register("description")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="text-sm text-accent">
          {serverError}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-success">
          Draft saved.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isDraft ? "Save draft" : "Save changes"}
        </Button>
        {isDraft && (
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => makeSubmit(true)()}
          >
            Publish
          </Button>
        )}
      </div>
    </form>
  );
}
