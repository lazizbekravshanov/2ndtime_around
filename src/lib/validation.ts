import { z } from "zod";
import {
  CATEGORIES,
  CONDITIONS,
  LISTING_TYPES,
  MAX_PHOTOS,
  MEETUP_SPOTS,
} from "@/lib/constants";

// Every mutation validates its input with one of these schemas on the
// server — client-side validation is a courtesy, never a guarantee.

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name needs at least 2 characters.")
    .max(40, "Keep it under 40 characters."),
  major: z.string().trim().max(60, "Keep it under 60 characters.").optional(),
  year: z
    .enum(["Freshman", "Sophomore", "Junior", "Senior", "Grad student"])
    .optional(),
});

export const listingSchema = z
  .object({
    type: z.enum(LISTING_TYPES),
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
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS).optional(),
    price: z
      .number()
      .min(0, "Price can't be negative.")
      .max(10000, "Price must be under $10,000.")
      .optional(),
    locationNote: z
      .string()
      .trim()
      .max(120, "Keep the location under 120 characters.")
      .optional(),
    photos: z.array(z.string().min(1)).max(MAX_PHOTOS),
  })
  .superRefine((data, ctx) => {
    if (data.type === "SELL" && data.price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "A sale listing needs a price.",
      });
    }
    if ((data.type === "LOST" || data.type === "FOUND") && !data.locationNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationNote"],
        message:
          data.type === "LOST"
            ? "Where did you last see it?"
            : "Where did you find it?",
      });
    }
  });

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Message can't be empty.")
    .max(2000, "Keep messages under 2000 characters."),
});

export const meetupProposalSchema = z.object({
  conversationId: z.string().min(1),
  spot: z.enum(MEETUP_SPOTS),
  datetime: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date and time.")
    .refine(
      (v) => Date.parse(v) > Date.now(),
      "Pick a time in the future."
    ),
});

export const claimSchema = z.object({
  listingId: z.string().min(1),
  detail: z
    .string()
    .trim()
    .min(10, "Describe a detail only the owner would know (at least 10 characters).")
    .max(500, "Keep it under 500 characters."),
});

export const ratingSchema = z.object({
  listingId: z.string().min(1),
  toUserId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(300, "Keep the comment under 300 characters.")
    .optional(),
});
