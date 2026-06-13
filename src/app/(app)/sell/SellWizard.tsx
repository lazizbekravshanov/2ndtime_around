"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  TYPE_LABELS,
  type ListingType,
} from "@/lib/constants";
import { createListing } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";
import { PriceHint } from "./PriceHint";

const STEPS = ["Type", "Photos", "Details", "Review"] as const;

const TYPE_OPTIONS: {
  type: ListingType;
  title: string;
  body: string;
}[] = [
  { type: "SELL", title: "Sell something", body: "Set a price, meet on campus, get paid." },
  { type: "DONATE", title: "Donate it", body: "Give it away free to another Bearcat." },
  { type: "WANTED", title: "Looking for something", body: "Post what you need and let sellers find you." },
  { type: "LOST", title: "I lost something", body: "Post it so the finder can reach you." },
  { type: "FOUND", title: "I found something", body: "Help it get back to its owner." },
];

// Details validated per-field as you type; the server action re-validates
// the assembled listing with the full schema before anything is saved.
function makeDetailsSchema(type: ListingType) {
  return z.object({
    title: z.string().trim().min(3, "Title needs at least 3 characters.").max(80, "Keep the title under 80 characters."),
    description: z.string().trim().min(10, "Add a little more detail (at least 10 characters).").max(2000, "Keep the description under 2000 characters."),
    category: z.enum(CATEGORIES, { message: "Pick a category." }),
    condition:
      type === "SELL" || type === "DONATE"
        ? z.enum(CONDITIONS, { message: "Pick a condition." })
        : z.enum(CONDITIONS).optional(),
    price:
      type === "SELL"
        ? z
            .number({ message: "A sale listing needs a price." })
            .min(0, "Price can't be negative.")
            .max(10000, "Price must be under $10,000.")
        : z.number().optional(),
    locationNote:
      type === "LOST" || type === "FOUND"
        ? z
            .string()
            .trim()
            .min(3, type === "LOST" ? "Where did you last see it?" : "Where did you find it?")
            .max(120, "Keep the location under 120 characters.")
        : z.string().trim().max(120).optional(),
  });
}

type Details = z.infer<ReturnType<typeof makeDetailsSchema>>;

function ProgressBar({ step }: { step: number }) {
  return (
    <ol aria-label="Progress" className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-1.5">
          <span
            className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`}
          />
          <span
            className={`text-xs ${
              i === step ? "font-medium text-ink" : "text-faint"
            }`}
            aria-current={i === step ? "step" : undefined}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SellWizard({ initialType }: { initialType?: ListingType }) {
  const router = useRouter();
  const [step, setStep] = useState(initialType ? 1 : 0);
  const [type, setType] = useState<ListingType | null>(initialType ?? null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [details, setDetails] = useState<Details | null>(null);
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () => makeDetailsSchema(type ?? "SELL"),
    [type]
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Details>({ resolver: zodResolver(schema) });
  const watchedCategory = watch("category");

  const isLostFound = type === "LOST" || type === "FOUND";

  // Warn before a refresh/close/tab-away once there's real work in the wizard
  // (a type chosen, photos added, or details entered) — prevents silent loss
  // of an in-progress post. Cleared while actually submitting.
  useEffect(() => {
    const hasWork =
      submitting === null &&
      (step > 0 || photos.length > 0 || details !== null);
    if (!hasWork) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, photos.length, details, submitting]);

  async function submit(asDraft: boolean) {
    if (!type || !details) return;
    setSubmitting(asDraft ? "draft" : "publish");
    setServerError(null);
    const result = await createListing(
      {
        type,
        title: details.title,
        description: details.description,
        category: details.category,
        condition: details.condition,
        price: type === "SELL" ? details.price : undefined,
        locationNote: details.locationNote || undefined,
        photos,
      },
      asDraft
    );
    if (!result.ok) {
      setSubmitting(null);
      setServerError(result.error);
      return;
    }
    router.push(asDraft ? "/my-items?tab=drafts" : `/listing/${result.data.id}`);
  }

  return (
    <div>
      <ProgressBar step={step} />

      {/* Step 1 — what kind of post is this? */}
      {step === 0 && (
        <fieldset className="mt-8">
          <legend className="text-2xl font-semibold">
            What would you like to post?
          </legend>
          <div className="mt-5 grid gap-3">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  setType(opt.type);
                  setStep(1);
                }}
                className={`rounded-xl border p-4 text-left transition-colors hover:border-faint ${
                  type === opt.type ? "border-accent" : "border-line bg-surface"
                }`}
              >
                <span className="block text-sm font-semibold">{opt.title}</span>
                <span className="mt-0.5 block text-sm text-faint">
                  {opt.body}
                </span>
              </button>
            ))}
          </div>
          <Link
            href="/sell/moveout"
            className="mt-4 block rounded-xl border border-dashed border-line p-4 text-left transition-colors hover:border-faint"
          >
            <span className="block text-sm font-semibold">
              Moving out? Post in bulk →
            </span>
            <span className="mt-0.5 block text-sm text-faint">
              List everything at once and share one move-out sale page.
            </span>
          </Link>
        </fieldset>
      )}

      {/* Step 2 — photos */}
      {step === 1 && type && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold">
            {type === "LOST"
              ? "Got a photo of it?"
              : type === "WANTED"
                ? "Add a reference photo?"
                : "Add some photos"}
          </h1>
          <p className="mt-1 text-sm text-faint">
            {type === "LOST"
              ? "A photo makes your item much easier to recognize. Skip if you don't have one."
              : type === "WANTED"
                ? "A photo of something similar helps sellers know what you're after. Totally optional."
                : "Listings with photos get far more replies. You can skip for now."}
          </p>
          <div className="mt-5">
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" type="button" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              {photos.length > 0 ? "Continue" : "Skip for now"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — details */}
      {step === 2 && type && (
        <form
          className="mt-8"
          noValidate
          onSubmit={handleSubmit((data) => {
            setDetails(data);
            setStep(3);
          })}
        >
          <h1 className="text-2xl font-semibold">The details</h1>
          <div className="mt-5 space-y-5">
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <input
                id="title"
                autoFocus
                placeholder={
                  isLostFound
                    ? "e.g. Black Hydro Flask, 32oz"
                    : "e.g. IKEA desk lamp"
                }
                aria-required
                aria-invalid={errors.title ? true : undefined}
                className={inputClasses}
                {...register("title")}
              />
            </Field>

            <Field
              label="Category"
              htmlFor="category"
              error={errors.category?.message}
            >
              <select
                id="category"
                defaultValue=""
                aria-required
                aria-invalid={errors.category ? true : undefined}
                className={selectClasses}
                {...register("category")}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            {(type === "SELL" || type === "DONATE") && (
              <Field
                label="Condition"
                htmlFor="condition"
                error={errors.condition?.message}
              >
                <select
                  id="condition"
                  defaultValue=""
                  aria-required
                  aria-invalid={errors.condition ? true : undefined}
                  className={selectClasses}
                  {...register("condition")}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {type === "SELL" && (
              <Field
                label="Price"
                htmlFor="price"
                error={errors.price?.message}
                hint="In dollars. You can haggle in chat."
              >
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
                    placeholder="25"
                    aria-required
                    aria-invalid={errors.price ? true : undefined}
                    className={`${inputClasses} pl-7`}
                    {...register("price", { valueAsNumber: true })}
                  />
                </div>
                <PriceHint
                  category={watchedCategory}
                  onUse={(v) =>
                    setValue("price", v, { shouldValidate: true })
                  }
                />
              </Field>
            )}

            {isLostFound && (
              <Field
                label={type === "LOST" ? "Where you last saw it" : "Where you found it"}
                htmlFor="locationNote"
                error={errors.locationNote?.message}
              >
                <input
                  id="locationNote"
                  placeholder="e.g. Langsam Library, 4th floor study room"
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
                placeholder={
                  isLostFound
                    ? "Describe it: color, brand, stickers, anything distinctive. When did you lose/find it?"
                    : "What is it, how old, any flaws? Honest details build trust."
                }
                aria-required
                aria-invalid={errors.description ? true : undefined}
                className={textareaClasses}
                {...register("description")}
              />
            </Field>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" type="button" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit">Review</Button>
          </div>
        </form>
      )}

      {/* Step 4 — review & publish */}
      {step === 3 && type && details && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold">Ready to post?</h1>
          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
            {photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photos[0]}
                alt="Cover photo"
                className="aspect-[4/3] w-full object-cover"
              />
            )}
            <div className="space-y-2 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                {TYPE_LABELS[type]} · {details.category}
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold">{details.title}</h2>
                {type === "SELL" && details.price !== undefined && (
                  <span className="font-semibold">{formatPrice(details.price)}</span>
                )}
                {type === "DONATE" && (
                  <span className="font-semibold text-success">Free</span>
                )}
              </div>
              {details.condition && (
                <p className="text-sm text-faint">Condition: {details.condition}</p>
              )}
              {details.locationNote && (
                <p className="text-sm text-faint">
                  {type === "LOST" ? "Last seen: " : "Found at: "}
                  {details.locationNote}
                </p>
              )}
              <p className="whitespace-pre-line text-sm">{details.description}</p>
            </div>
          </div>

          {serverError && (
            <p role="alert" className="mt-3 text-sm text-accent">
              {serverError}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" type="button" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                disabled={submitting !== null}
                onClick={() => submit(true)}
              >
                {submitting === "draft" ? "Saving…" : "Save as draft"}
              </Button>
              <Button
                type="button"
                disabled={submitting !== null}
                onClick={() => submit(false)}
              >
                {submitting === "publish" ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
