import { Panel, StatusPill } from "@/components/AppShell";
import { formatTimestamp } from "@/lib/format";

// The owner's view of client invites: totals, then every invite and where it
// stands. Bonuses pay out by themselves when the invited client's first
// check-in is marked Done.
export function RewardsView({
  referrals,
  totals,
}: {
  totals: { points_given: number; app_reviews: number } | null;
  referrals: { friend: string; inviter: string; barber: string | null; status: "pending" | "earned"; joined: string; earned_at: string | null }[];
}) {
  const earned = referrals.filter((r) => r.status === "earned").length;
  const stats = [
    { label: "Invites joined", value: referrals.length },
    { label: "New clients in the chair", value: earned },
    { label: "App reviews", value: totals?.app_reviews ?? 0 },
    { label: "Points given", value: totals?.points_given ?? earned * 75 },
  ];
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Rewards</h1>
      <p className="mt-2 text-ink-2">
        Clients invite friends. When a friend&rsquo;s first check-in is marked Done, the friend gets 25 points and the
        client who invited them 50, automatically. Clients also get 10 points for a review left in the app after a
        visit; new ones wait on the Reviews page for you to show them.
      </p>
      <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-line p-5">
            <p className="font-display text-4xl font-semibold">{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 max-w-2xl">
        <Panel title="Invites">
          {referrals.length === 0 ? (
            <p className="text-sm text-muted">No invites yet. When clients share their invite link and a friend signs up, it shows here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {referrals.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {r.friend} <span className="font-normal text-muted">invited by {r.inviter}</span>
                    </p>
                    <p className="text-xs text-muted">
                      Joined {formatTimestamp(r.joined)}
                      {r.barber && ` · picked ${r.barber}`}
                      {r.earned_at && ` · first cut ${formatTimestamp(r.earned_at)}`}
                    </p>
                  </div>
                  <StatusPill tone={r.status === "earned" ? "ink" : "muted"}>{r.status === "earned" ? "Paid" : "Waiting"}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
