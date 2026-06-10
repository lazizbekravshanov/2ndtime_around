"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, inputClasses, selectClasses } from "@/components/ui/Field";
import { onboardingSchema } from "@/lib/validation";
import { completeOnboarding } from "./actions";

type FormData = z.infer<typeof onboardingSchema>;

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Grad student"];

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(onboardingSchema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const result = await completeOnboarding(data);
    if (!result.ok) {
      // Surface server-side validation next to the fields it belongs to.
      for (const [field, message] of Object.entries(
        result.fieldErrors ?? {}
      )) {
        setError(field as keyof FormData, { message });
      }
      if (!result.fieldErrors) setServerError(result.error);
      return;
    }
    router.push("/browse");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field
        label="Display name"
        htmlFor="displayName"
        error={errors.displayName?.message}
        hint="Shown on your listings and messages."
      >
        <input
          id="displayName"
          autoFocus
          placeholder="e.g. Jordan B."
          aria-invalid={errors.displayName ? true : undefined}
          className={inputClasses}
          {...register("displayName")}
        />
      </Field>

      <Field
        label="Major"
        htmlFor="major"
        optional
        error={errors.major?.message}
      >
        <input
          id="major"
          placeholder="e.g. Information Technology"
          className={inputClasses}
          {...register("major")}
        />
      </Field>

      <Field label="Year" htmlFor="year" optional error={errors.year?.message}>
        <select
          id="year"
          className={selectClasses}
          defaultValue=""
          {...register("year", {
            setValueAs: (v: string) => (v === "" ? undefined : v),
          })}
        >
          <option value="">Choose…</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </Field>

      {serverError && (
        <p role="alert" className="text-sm text-accent">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Start browsing"}
      </Button>
    </form>
  );
}
