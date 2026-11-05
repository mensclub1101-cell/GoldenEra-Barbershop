"use client";

import { useState } from "react";
import { leaveReview } from "@/app/actions/client";
import { ActionForm, SubmitButton, inputClass } from "@/components/forms";

export type Rewards = {
  code: string;
  points: number;
  my_bonus: "pending" | "earned" | null; // their own welcome bonus, if a friend invited them
  can_review?: boolean; // a finished visit is waiting for a review
  invites: { name: string; status: "pending" | "earned"; joined: string }[];
};

const white =
  "block w-full rounded-full bg-ink py-4 text-center text-base font-semibold text-paper transition hover:bg-ink-2 disabled:opacity-60";
const pill = "flex-1 rounded-full bg-paper-2 py-3.5 text-center text-sm font-semibold transition hover:bg-line";

// The invite flow, like Cash App's: "how it works" first, then Continue to
// send a friend the link. The bonus pays itself once the friend's first
// check-in from the app is marked Done.
export function RewardsPanel({
  rewards,
  siteUrl,
  googleReviews,
}: {
  rewards: Rewards;
  siteUrl: string;
  googleReviews: { name: string; url: string }[]; // optional, no points: Google doesn't allow rewarding reviews
}) {
  const [step, setStep] = useState<"intro" | "invite">("intro");
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/signup?ref=${rewards.code}`;
  const message = `Join me at Golden Era Barbershop. Sign up with my link and check in for your first cut from the app, and we both get points: ${link}`;

  function copy() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Golden Era Barbershop", text: message });
        return;
      } catch {
        // Closed the sheet: fall through to copy.
      }
    }
    copy();
  }

  if (step === "intro") {
    const steps = [
      "Your friend makes an account with your invite.",
      "They check in for their first cut from the app.",
      "When the cut's done, you get 50 points and they get 25. Automatically.",
    ];
    return (
      <div className="space-y-6 px-1 pt-2">
        <div aria-hidden className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-paper-2">
          <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="8" width="17" height="4" rx="1" />
            <path d="M5 12v8h14v-8M12 8v12M12 8S10.5 4 8 4.5 7 8 12 8zM12 8s1.5-4 4-3.5S17 8 12 8z" />
          </svg>
        </div>
        <h1 className="font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
          Get 50 points for you, 25 for a friend
        </h1>
        <p className="text-base">Here&rsquo;s how to get your bonus:</p>
        <ol className="space-y-4">
          {steps.map((t, n) => (
            <li key={t} className="flex items-start gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper-2 text-sm font-semibold">{n + 1}</span>
              <span className="pt-1.5 text-base leading-snug">{t}</span>
            </li>
          ))}
        </ol>
        <button type="button" className={white} onClick={() => setStep("invite")}>
          Continue
        </button>
        <Balance rewards={rewards} />
        <ReviewCard canReview={!!rewards.can_review} googleReviews={googleReviews} />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 pt-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Invite a friend</p>
        <h1 className="font-display text-4xl font-semibold uppercase tracking-wide">Send your invite</h1>
        <p className="mt-2 text-sm text-ink-2">
          When they make an account and check in for their first cut from the app, you get 50 points and they get 25.
        </p>
      </div>
      <div className="rounded-3xl border border-line p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Your invite code</p>
        <p className="mt-2 font-mono text-3xl tracking-[0.2em]">{rewards.code}</p>
      </div>
      <a href={`sms:?&body=${encodeURIComponent(message)}`} className={white}>
        Text a friend
      </a>
      <div className="flex gap-2">
        <button type="button" className={pill} onClick={share}>
          More ways
        </button>
        <button type="button" className={pill} onClick={copy}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      {rewards.invites.length > 0 && (
        <div className="rounded-3xl border border-line p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Your invites</p>
          <ul className="divide-y divide-line">
            {rewards.invites.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <span className="font-semibold">{f.name}</span>
                <span className={`text-xs font-semibold ${f.status === "earned" ? "text-ink" : "text-muted"}`}>
                  {f.status === "earned" ? "+50 points earned" : "Waiting on first cut"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Balance rewards={rewards} />
      <ReviewCard canReview={!!rewards.can_review} googleReviews={googleReviews} />
      <button type="button" onClick={() => setStep("intro")} className="block w-full py-2 text-center text-sm font-semibold text-muted">
        How it works
      </button>
    </div>
  );
}

function Balance({ rewards }: { rewards: Rewards }) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-paper-2 p-5">
      <div>
        <p className="text-sm text-ink-2">Your balance</p>
        {rewards.my_bonus === "pending" && (
          <p className="mt-1 text-xs text-muted">Check in for your first cut from the app to unlock your 25-point welcome bonus.</p>
        )}
      </div>
      <p className="font-display text-4xl font-semibold">{rewards.points}</p>
    </div>
  );
}

// 10 points for a review left here after a visit, good or bad. Reviews on
// Google are welcome too, but can't earn points.
function ReviewCard({ canReview, googleReviews }: { canReview: boolean; googleReviews: { name: string; url: string }[] }) {
  const [stars, setStars] = useState(5);
  return (
    <div className="rounded-3xl border border-line p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Leave a review</p>
        <span className="text-xs font-semibold">+10 points</span>
      </div>
      {canReview ? (
        <ActionForm action={leaveReview} className="mt-3 space-y-3">
          <div role="radiogroup" aria-label="Stars" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer text-3xl leading-none">
                <input type="radio" name="rating" value={n} checked={stars === n} onChange={() => setStars(n)} className="sr-only" />
                <span aria-hidden className={n <= stars ? "text-ink" : "text-line"}>★</span>
                <span className="sr-only">{n} stars</span>
              </label>
            ))}
          </div>
          <textarea
            name="body"
            required
            maxLength={600}
            rows={3}
            placeholder="How was your cut?"
            className={inputClass}
          />
          <p className="text-xs text-muted">Good or bad, you get the points. The shop may show it on the website.</p>
          <SubmitButton className="w-full">Send review</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-2 text-sm text-ink-2">After your next visit (check in from the app), leave a review here for 10 points.</p>
      )}
      {googleReviews.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Want to help even more? Review us on Google:{" "}
          {googleReviews.map((g, i) => (
            <span key={g.name}>
              {i > 0 && " · "}
              <a href={g.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline">
                {g.name}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
