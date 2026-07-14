# Public Marketplace Browsing — Design Spec

**Date:** 2026-07-14 · **Target:** anonymous marketplace discovery

## Goal

Allow anyone to discover the marketplace and view active listings without an
account. Keep all marketplace participation—posting, messaging, claiming,
saving, favoriting, and reporting—behind the existing authenticated and
UC-verification boundary.

Real UC email registration is a separate follow-up. This pass sends anonymous
users to the current sign-in flow.

## Route Architecture

Move `/browse` and the read-only `/listing/[id]` route from the authenticated
`(app)` route group to the existing `(public)` route group without changing
their URLs.

The public layout already supports both states:

- signed-in users receive the full application header, unread counts, account
  navigation, and mobile navigation;
- anonymous users receive the minimal public header with a sign-in action.

Keep all mutation and account routes inside `(app)`, including:

- `/sell`;
- `/listing/[id]/edit`;
- `/messages` and conversation threads;
- `/saved`, `/notifications`, `/my-items`, and `/impact`;
- moderation and funnel routes.

The authenticated group remains secure by default through its layout-level
`requireUser()` guard.

## Browse Behavior

Anonymous visitors can:

- open `/browse`;
- switch among Marketplace, Donations, Lost & Found, and Wanted;
- search, filter, sort, paginate, and use category shortcuts;
- open active listing cards;
- view empty states and marketplace campaign content.

User-specific browse data is optional. Blocked-user filtering and favorite
state are applied only when a session exists. Anonymous searches may still be
recorded with a null user ID, matching the existing search-event model.

Authenticated-only browse actions use sign-in calls to action:

- Save search;
- Post an item or want ad;
- Favorite an item.

Each sign-in link includes the current browse URL as its return destination.

## Listing Detail Behavior

Replace the listing page's mandatory `requireUser()` call with optional
`getSessionUser()`.

Anonymous visitors can view the complete public content of an active listing:

- photos, title, type, price, condition, description, and view count;
- seller or reporter display name, profile link, public profile fields,
  ratings, and completed-exchange count;
- lost/found location notes;
- suggested campus meetup spots.

Anonymous listing views increment `viewCount`. Authenticated owners continue to
be excluded from their own view count.

Listing-state visibility remains strict:

- `ACTIVE`: visible to everyone;
- `DRAFT`, `SOLD`, and `RESOLVED`: visible only to the authenticated owner;
- `DELETED` or missing: not found.

An anonymous request for a non-active listing receives the existing generic
unavailable state and must not reveal whether the listing is a draft, sold, or
resolved.

## Interactive Actions

For signed-in users, existing owner and non-owner controls remain unchanged.

For anonymous visitors, protected controls render as sign-in calls to action
instead of invoking server actions:

- Message seller/finder/reporter;
- Claim found item;
- Favorite;
- Report;
- Save search;
- Post item or want ad.

The primary listing action reads `Sign in to message` and links to sign-in with
the listing URL as the callback. Secondary protected actions use the same
return destination.

This conditional rendering is only a UX layer. Existing server actions remain
responsible for authentication, ownership, and authorization.

## Return URL Safety

Sign-in accepts a `callbackUrl` only when it is a same-origin relative path:

- it must begin with exactly one `/`;
- it must not begin with `//`;
- it must not contain a scheme or external host.

Invalid callback values fall back to `/browse`. The validated callback is
preserved through the current sign-in flow so a successful future
UC-registration implementation can return users to their original listing or
browse state without redesigning this boundary.

## Metadata and Discovery

Public browse and active listing pages remain server-rendered and crawlable.
Listing metadata continues to expose title, price, description, and the first
photo for social previews. Non-active listings use generic metadata and are not
included in public discovery.

No new public API endpoint is introduced. Pages continue to query Prisma on the
server.

## Error Handling

- Missing or deleted listings use `notFound()`.
- Anonymous non-active listing requests receive the generic unavailable state.
- Protected server actions keep their existing unauthenticated result.
- Invalid callback URLs fall back to `/browse`.
- Optional session lookup or user-specific decoration must not prevent the
  public catalog itself from rendering.

## Testing

Focused tests cover:

- anonymous access to browse, filters, pagination, and active listing details;
- anonymous inability to access non-active listing content;
- authenticated owner access to draft, sold, and resolved listings;
- signed-in non-owner behavior remaining unchanged;
- anonymous protected controls linking to sign-in;
- safe callback acceptance and external/open-redirect rejection;
- protected edit, message, saved, posting, and account routes retaining their
  authentication guard;
- anonymous view counting and owner-view exclusion.

Existing tests must continue to pass. TypeScript typecheck and the production
build must also pass.

## Acceptance Criteria

- `/browse` is usable without authentication.
- Active `/listing/[id]` pages are usable without authentication.
- Anonymous users can see the approved complete public listing and seller
  information.
- Every participation action requires authentication and offers a safe return
  path.
- Private and mutation routes remain guarded.
- Non-active listing information is not exposed to anonymous visitors.
- Signed-in marketplace behavior does not regress.
- Documentation describes public browsing and states that real UC registration
  remains a separate follow-up.

