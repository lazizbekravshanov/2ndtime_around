import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import { MoveoutForm } from "./MoveoutForm";

export const metadata = { title: "Move-out mode" };

export default function MoveoutPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/sell"
        className="inline-flex items-center gap-1 text-sm text-faint hover:text-ink"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to posting
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Move-out mode</h1>
      <p className="mt-1 text-sm text-faint">
        Clearing out your place? List everything at once. Mark anything you're
        giving away as free — it'll post to the campus donations pile.
      </p>
      <div className="mt-6">
        <MoveoutForm />
      </div>
    </div>
  );
}
