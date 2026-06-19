"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import {
  AlertIcon,
  CalendarIcon,
  CheckIcon,
  PinIcon,
  ShareIcon,
} from "@/components/icons";
import { MEETUP_SPOTS, type ListingType } from "@/lib/constants";
import { meetupTime } from "@/lib/format";
import { hasContactOrPaymentRisk } from "@/lib/safetyScan";
import {
  proposeMeetup,
  respondToClaim,
  respondToMeetup,
  sendMessage,
} from "@/lib/actions/conversations";

export type ThreadMessage = {
  id: string;
  senderId: string;
  body: string;
  kind: string;
  meta: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

type OtherUser = { id: string; displayName: string; email: string };

function Timestamp({ iso }: { iso: string }) {
  return (
    <time
      dateTime={iso}
      // Server renders in UTC, client in the viewer's timezone — an expected,
      // benign difference. Suppress the hydration warning rather than mismatch.
      suppressHydrationWarning
      className="mt-1 block text-[11px] text-faint"
    >
      {new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}
    </time>
  );
}

/** Meetup proposal card — receiver can accept or decline inline. */
function MeetupCard({
  message,
  mine,
  busy,
  otherName,
  onRespond,
}: {
  message: ThreadMessage;
  mine: boolean;
  busy: boolean;
  otherName: string;
  onRespond: (messageId: string, response: "ACCEPTED" | "DECLINED") => void;
}) {
  const meta = message.meta ?? {};
  const spot = String(meta.spot ?? "");
  const datetime = String(meta.datetime ?? "");
  const status = String(meta.status ?? "PENDING");

  async function share() {
    const text = `Meeting ${otherName} at ${spot}${
      datetime ? ` on ${meetupTime(datetime)}` : ""
    } — check on me!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <PinIcon className="h-3.5 w-3.5 text-accent" />
        Meetup proposal
      </p>
      <p className="mt-2 text-sm font-medium">{spot}</p>
      <p className="text-sm text-faint" suppressHydrationWarning>
        {datetime ? meetupTime(datetime) : ""}
      </p>

      {status === "PENDING" && !mine && (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onRespond(message.id, "ACCEPTED")}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onRespond(message.id, "DECLINED")}
          >
            Decline
          </Button>
        </div>
      )}
      {status === "PENDING" && mine && (
        <p className="mt-3 text-xs text-faint">Waiting for a response…</p>
      )}
      {status === "ACCEPTED" && (
        <>
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckIcon className="h-4 w-4" />
            Meetup confirmed — see you there!
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/api/meetups/${message.id}/ics`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-faint transition-colors hover:text-ink"
            >
              <CalendarIcon className="h-4 w-4" />
              Add to calendar
            </a>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-faint transition-colors hover:text-ink"
            >
              <ShareIcon className="h-4 w-4" />
              Share with a friend
            </button>
          </div>
        </>
      )}
      {status === "DECLINED" && (
        <p className="mt-3 text-sm text-faint">
          Declined — propose another time that works.
        </p>
      )}
    </div>
  );
}

/** Ownership claim card — the finder approves or denies. */
function ClaimCard({
  message,
  mine,
  isFinderView,
  otherUser,
  myEmail,
  busy,
  onRespond,
}: {
  message: ThreadMessage;
  mine: boolean;
  isFinderView: boolean;
  otherUser: OtherUser;
  myEmail: string;
  busy: boolean;
  onRespond: (messageId: string, response: "APPROVED" | "DENIED") => void;
}) {
  const status = String(message.meta?.status ?? "PENDING");

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-faint">
        Ownership claim
      </p>
      <p className="mt-2 whitespace-pre-line text-sm">{message.body}</p>

      {status === "PENDING" && isFinderView && !mine && (
        <>
          <p className="mt-3 text-xs text-faint">
            Does this match the item you found?
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onRespond(message.id, "APPROVED")}
            >
              Approve claim
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onRespond(message.id, "DENIED")}
            >
              Deny
            </Button>
          </div>
        </>
      )}
      {status === "PENDING" && mine && (
        <p className="mt-3 text-xs text-faint">
          Waiting for the finder to review your claim…
        </p>
      )}
      {status === "APPROVED" && (
        <div className="mt-3 rounded-lg bg-success/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckIcon className="h-4 w-4" />
            Claim approved — item resolved
          </p>
          <p className="mt-1 text-xs text-ink">
            Contact info exchanged: reach {otherUser.displayName} at{" "}
            <a href={`mailto:${otherUser.email}`} className="font-medium underline">
              {otherUser.email}
            </a>{" "}
            (they can see {myEmail}). Arrange a campus pickup.
          </p>
        </div>
      )}
      {status === "DENIED" && (
        <p className="mt-3 text-sm text-faint">
          The finder didn&apos;t think this matched. If it&apos;s really
          yours, send another claim with more detail.
        </p>
      )}
    </div>
  );
}

export function Thread({
  conversationId,
  currentUserId,
  otherUser,
  myEmail,
  isFinderView,
  listingType,
  initialListingStatus,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  otherUser: OtherUser;
  myEmail: string;
  isFinderView: boolean;
  listingType: ListingType;
  initialListingStatus: string;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [listingStatus, setListingStatus] = useState(initialListingStatus);
  const [pendingSends, setPendingSends] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meetupOpen, setMeetupOpen] = useState(false);
  const [meetupSpot, setMeetupSpot] = useState<string>(MEETUP_SPOTS[0].name);
  const [meetupTimeValue, setMeetupTimeValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(initialMessages.length);
  const spotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow-key navigation for the meetup-spot radio group (WAI-ARIA pattern);
  // only the selected spot is in the tab order (roving tabindex).
  function onSpotKey(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      next = (index + 1) % MEETUP_SPOTS.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      next = (index - 1 + MEETUP_SPOTS.length) % MEETUP_SPOTS.length;
    } else {
      return;
    }
    e.preventDefault();
    setMeetupSpot(MEETUP_SPOTS[next].name);
    spotRefs.current[next]?.focus();
  }

  type ThreadPayload = { messages: ThreadMessage[]; listingStatus?: string };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) return;
      const json = (await res.json()) as ThreadPayload;
      setMessages(json.messages);
      if (json.listingStatus) setListingStatus(json.listingStatus);
    } catch {
      // Network hiccup — the next tick will catch up.
    }
  }, [conversationId]);

  // Near-real-time via Server-Sent Events. The 5s poll is a TRUE fallback: it
  // only runs while SSE is unavailable or disconnected, so a healthy stream
  // isn't doubled by a redundant poll (which previously ran constantly,
  // doubling DB load on every open thread).
  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (pollId === undefined) pollId = setInterval(refresh, 5000);
    };
    const stopPolling = () => {
      if (pollId !== undefined) {
        clearInterval(pollId);
        pollId = undefined;
      }
    };

    if (typeof EventSource === "undefined") {
      // No SSE support — polling is the only mechanism.
      startPolling();
      return stopPolling;
    }

    const es = new EventSource(`/api/conversations/${conversationId}/stream`);
    es.onopen = stopPolling; // stream healthy → no need to poll
    es.onmessage = (e) => {
      try {
        const json = JSON.parse(e.data) as ThreadPayload;
        setMessages(json.messages);
        if (json.listingStatus) setListingStatus(json.listingStatus);
      } catch {
        // ignore malformed frame
      }
    };
    es.onerror = startPolling; // stream dropped → poll until it recovers

    return () => {
      es.close();
      stopPolling();
    };
  }, [conversationId, refresh]);

  // Keep the newest message in view when something arrives.
  const totalCount = messages.length + pendingSends.length;
  useEffect(() => {
    if (totalCount > countRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    countRef.current = totalCount;
  }, [totalCount]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setError(null);
    // Optimistic: the bubble appears instantly, then syncs with the server.
    const temp: ThreadMessage = {
      id: `tmp-${Date.now()}`,
      senderId: currentUserId,
      body,
      kind: "TEXT",
      meta: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setPendingSends((p) => [...p, temp]);
    setDraft("");
    const result = await sendMessage({ conversationId, body });
    if (!result.ok) {
      setPendingSends((p) => p.filter((m) => m.id !== temp.id));
      setDraft(body);
      setError(result.error);
      return;
    }
    await refresh();
    setPendingSends((p) => p.filter((m) => m.id !== temp.id));
  }

  // For the datetime-local min attribute: "now" formatted as the local
  // wall-clock string the input expects (YYYY-MM-DDTHH:mm).
  const minDateTime = (() => {
    const d = new Date(Date.now());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })();

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!meetupTimeValue) {
      setError("Pick a date and time for the meetup.");
      return;
    }
    // Prevent proposing a meetup in the past (the server rejects it too).
    if (new Date(meetupTimeValue).getTime() <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await proposeMeetup({
      conversationId,
      spot: meetupSpot,
      datetime: new Date(meetupTimeValue).toISOString(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMeetupOpen(false);
    setMeetupTimeValue("");
    await refresh();
  }

  async function handleMeetupResponse(
    messageId: string,
    response: "ACCEPTED" | "DECLINED"
  ) {
    setBusy(true);
    setError(null);
    const result = await respondToMeetup({ messageId, response });
    setBusy(false);
    if (!result.ok) setError(result.error);
    await refresh();
  }

  async function handleClaimResponse(
    messageId: string,
    response: "APPROVED" | "DENIED"
  ) {
    setBusy(true);
    setError(null);
    const result = await respondToClaim({ messageId, response });
    setBusy(false);
    if (!result.ok) setError(result.error);
    await refresh();
  }

  const all = [...messages, ...pendingSends];
  // Last message I sent that the other person has read — for the "Seen" line.
  const lastSeenMineId = [...messages]
    .reverse()
    .find((m) => m.senderId === currentUserId && m.readAt)?.id;

  // Announce only the newest *incoming* message to screen readers, instead of
  // marking the whole transcript a live region (which re-reads everything on
  // each SSE/poll snapshot). WCAG 4.1.3.
  const lastMessage = all[all.length - 1];
  const announcement =
    lastMessage && lastMessage.senderId !== currentUserId
      ? lastMessage.kind === "TEXT"
        ? `New message from ${otherUser.displayName}: ${lastMessage.body}`
        : `New update from ${otherUser.displayName}`
      : "";

  return (
    <div className="flex flex-1 flex-col">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="flex-1 space-y-3 py-5">
        {all.length === 0 && (
          <p className="py-10 text-center text-sm text-faint">
            Say hi to {otherUser.displayName} — keep everything in the app
            until you&apos;re ready to meet.
          </p>
        )}

        {all.map((m) => {
          const mine = m.senderId === currentUserId;
          if (m.kind === "MEETUP_PROPOSAL") {
            return (
              <MeetupCard
                key={m.id}
                message={m}
                mine={mine}
                busy={busy}
                otherName={otherUser.displayName}
                onRespond={handleMeetupResponse}
              />
            );
          }
          if (m.kind === "CLAIM") {
            return (
              <ClaimCard
                key={m.id}
                message={m}
                mine={mine}
                isFinderView={isFinderView}
                otherUser={otherUser}
                myEmail={myEmail}
                busy={busy}
                onRespond={handleClaimResponse}
              />
            );
          }
          return (
            <div key={m.id} className="space-y-0.5">
              {hasContactOrPaymentRisk(m.body) && (
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <p
                    role="note"
                    className="flex max-w-[80%] items-start gap-1.5 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      This message contains an external link or contact info.
                      Never send payment before meeting in person.
                    </span>
                  </p>
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2 text-sm ${
                    mine
                      ? "rounded-2xl rounded-br-md bg-ink text-white"
                      : "rounded-2xl rounded-bl-md border border-line bg-surface"
                  } ${m.id.startsWith("tmp-") ? "opacity-60" : ""}`}
                >
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <Timestamp iso={m.createdAt} />
                </div>
              </div>
              {m.id === lastSeenMineId && (
                <p className="pr-1 text-right text-[11px] text-faint">Seen</p>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Live status: updates from SSE/poll without a page reload. */}
      {(listingStatus === "SOLD" || listingStatus === "RESOLVED") && (
        <p
          role="status"
          className="mb-2 rounded-lg border border-line bg-surface px-3 py-2 text-center text-xs text-faint"
        >
          This listing was marked {listingStatus.toLowerCase()}.
        </p>
      )}

      {error && (
        <p role="alert" className="pb-2 text-sm text-accent">
          {error}
        </p>
      )}

      {/* Composer — sticky above the mobile tab bar */}
      <div className="sticky bottom-16 border-t border-line bg-paper pb-3 pt-3 md:bottom-0">
        {meetupOpen && (
          <form
            onSubmit={handlePropose}
            className="mb-3 rounded-xl border border-line bg-surface p-3"
          >
            <p className="text-sm font-medium">Propose a safe meetup</p>
            <p className="mt-0.5 text-xs text-faint">
              Pick a busy, well-lit campus spot.
            </p>
            <div
              role="radiogroup"
              aria-label="Meetup spot"
              className="mt-2 grid grid-cols-2 gap-2"
            >
              {MEETUP_SPOTS.map((s, i) => (
                <button
                  key={s.name}
                  ref={(el) => {
                    spotRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={meetupSpot === s.name}
                  tabIndex={meetupSpot === s.name ? 0 : -1}
                  onKeyDown={(e) => onSpotKey(e, i)}
                  onClick={() => setMeetupSpot(s.name)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    meetupSpot === s.name
                      ? "border-ink"
                      : "border-line hover:bg-paper"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <PinIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    {s.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-faint">
                    {s.blurb}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              aria-label="Meetup time"
              min={minDateTime}
              value={meetupTimeValue}
              onChange={(e) => setMeetupTimeValue(e.target.value)}
              className={`${inputClasses} mt-2`}
            />
            <div className="mt-2 flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Sending…" : "Send proposal"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMeetupOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <p className="mb-2 text-center text-[11px] text-faint">
          Meet at a busy campus spot in daylight. Never share your dorm or
          financial info.
        </p>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {(listingType === "SELL" || listingType === "DONATE") && (
            <button
              type="button"
              title="Propose a meetup spot"
              aria-label="Propose a meetup spot"
              aria-expanded={meetupOpen}
              onClick={() => setMeetupOpen((v) => !v)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                meetupOpen
                  ? "border-accent text-accent"
                  : "border-line bg-surface text-faint hover:text-ink"
              }`}
            >
              <PinIcon className="h-5 w-5" />
            </button>
          )}
          <input
            aria-label="Message"
            placeholder={`Message ${otherUser.displayName}…`}
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            className={inputClasses}
          />
          <Button type="submit" disabled={!draft.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
