"use server";

import { revalidateTag } from "next/cache";

/** Bust the cached funnel aggregates so the next render recomputes fresh. */
export async function refreshFunnel(): Promise<void> {
  revalidateTag("funnel");
}
