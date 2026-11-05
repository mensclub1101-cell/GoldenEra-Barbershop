// Barber app widget: invited clients who picked this barber. Their invite
// bonus pays out by itself when their check-in is marked Done.
export function InvitedClients({ clients }: { clients: { friend: string; status: "pending" | "earned" }[] }) {
  return (
    <div className="rounded-3xl border border-line bg-paper p-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">New clients from invites</h2>
        <span className="text-xs font-semibold text-ink-2">{clients.filter((c) => c.status === "pending").length} coming</span>
      </div>
      <p className="mb-2 text-xs text-muted">They picked you. When their check-in is marked Done, their invite bonus pays out by itself.</p>
      <ul className="divide-y divide-line">
        {clients.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-semibold">{c.friend}</span>
            <span className={`text-xs font-semibold ${c.status === "earned" ? "text-ink" : "text-muted"}`}>
              {c.status === "earned" ? "First cut done ✓" : "Waiting on first visit"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
