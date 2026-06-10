import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";

// Even dead ends get a designed state and a clear way out.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <LogoMark className="h-8 w-8" />
      <h1 className="mt-6 text-2xl font-semibold">
        This page wandered off
      </h1>
      <p className="mt-2 max-w-sm text-sm text-faint">
        The listing may have been sold, resolved, or removed — or the link is
        just wrong. Either way, there&apos;s plenty more to browse.
      </p>
      <Link href="/browse" className={`${buttonClasses("primary")} mt-8`}>
        Back to browsing
      </Link>
    </main>
  );
}
