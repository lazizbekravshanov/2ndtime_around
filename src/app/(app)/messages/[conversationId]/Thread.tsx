"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { selectClasses, inputClasses } from "@/components/ui/Field";
import { CheckIcon, PinIcon } from "@/components/icons";
import { MEETUP_SPOTS, type ListingType } from "@/lib/constants";
import { meetupTime } from "@/lib/format";
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
  createdAt: string;
};

type OtherUser = { id: string; displayName: string; email: string };

function Timestamp({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} className="mt-1 block text-[11px] text-faint">
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
  onRespond,
}: {
  message: ThreadMessage;
  mine: boolean;
  busy: boolean;
  onRespond: (messageId: string, response: "ACCEPTED" | "DECLINED") => void;
}) {
  const meta = message.meta ?? {};
  const spot = String(meta.spot ?? "");
  const datetime = String(meta.datetime ?? "");
  const status = String(meta.status ?? "PENDING");

  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <PinIcon className="h-3.5 w-3.5 text-accent" />
        Meetup proposal
      </p>
      <p className="mt-2 text-sm font-medium">{spot}</p>
      <p className="text-sm text-faint">{datetime ? meetupTime(datetime) : ""}</p>

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
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckIcon className="h-4 w-4" />
          Meetup confirmed — see you there!
        </p>
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
  const [pendingSends, setPendingSends] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meetupOpen, setMeetupOpen] = useState(false);
  const [meetupSpot, setMeetupSpot] = useState<string>(MEETUP_SPOTS[0]);
  const [meetupTimeValue, setMeetupTimeValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(initialMessages.length);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) return;
      const json = (await res.json()) as { messages: ThreadMessage[] };
      setMessages(json.messages);
    } catch {
      // Network hiccup — the next poll will catch up.
    }
  }, [conversationId]);

  // Poll every 5 seconds — simple and plenty for campus coordination.
  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

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

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    if (!meetupTimeValue) {
      setError("Pick a date and time for the meetup.");
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

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 py-5" aria-live="polite">
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
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
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
          );
        })}
        <div ref={bottomRef} />
      </div>

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
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                aria-label="Meetup spot"
                value={meetupSpot}
                onChange={(e) => setMeetupSpot(e.target.value)}
                className={`${selectClasses} flex-1`}
              >
                {MEETUP_SPOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                aria-label="Meetup time"
                value={meetupTimeValue}
                onChange={(e) => setMeetupTimeValue(e.target.value)}
                className={`${inputClasses} sm:w-56`}
              />
            </div>
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
