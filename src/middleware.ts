import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Stash the request path (+ search) so server components can build a safe
 * sign-in return URL when `requireUser()` redirects anonymous visitors.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    request.nextUrl.pathname + request.nextUrl.search
  );
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
