import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, Panel, StatusPill } from "@/components/AppShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { updateMyCard } from "@/app/actions/barber";
import { ClockWidget } from "@/components/ClockWidget";
import { SwipeDeck } from "@/components/SwipeDeck";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatMoney, formatTimestamp, rentStatus, todayInShop } from "@/lib/format";

export const metadata: Metadata = { title: "My card | Golden Era Barbershop" };

export default async function BarberPage() {
  const viewer = await requireRole("barber", "owner");
  const seat = viewer.seat;
  if (!seat) redirect("/owner");

  const supabase = await createClient();
  const today = todayInShop();
  const [{ data: shop }, { data: charges }] = await Promise.all([
    supabase.from("shops").select("name").eq("id", seat.shop_id).single(),
    supabase.from("rent_charges").select("*").eq("barber_id", seat.id).order("due_date", { ascending: false }),
  ]);
  const rent = charges ?? [];
  const owed = rent.filter((c) => !c.paid_at).reduce((sum, c) => sum + c.amount_cents, 0);
  const nextDue = rent.filter((c) => !c.paid_at).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  return (
    <AppShell viewer={viewer}>
      <SwipeDeck labels={["Widgets", "Home"]} start={1}>
        {/* Widgets: swipe right from Home, like the iPhone Today View. */}
        <div className="mx-auto max-w-md space-y-4">
          <ClockWidget />
          <Widget title="Walk-ins" aside={shop?.name}>
            <p className="text-sm text-ink-2">Clients who check in at the shop will line up here.</p>
            <p className="mt-2 text-xs text-muted">Walk-in check-in is the next feature being built.</p>
          </Widget>
          <Widget title="Rent" aside={owed > 0 ? `${formatMoney(owed)} owed` : "All paid"}>
            {nextDue ? (
              <p className="text-sm text-ink-2">
                Next: <strong>{formatMoney(nextDue.amount_cents)}</strong>{" "}
                {rentStatus(nextDue, today) === "late" ? "was due" : "due"} {formatDay(nextDue.due_date)}
              </p>
            ) : (
              <p className="text-sm text-ink-2">Nothing due.</p>
            )}
          </Widget>
        </div>

        <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{shop?.name}</p>
      <h1 className="mt-1 font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">
        {seat.display_name}
      </h1>
      {!seat.active && (
        <p className="mt-4 rounded-xl bg-paper-2 px-4 py-3 text-sm">
          Your card is hidden from the website right now. Ask the owner to show it.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="My card">
            <p className="-mt-2 mb-5 text-sm text-muted">This is what clients see on the Golden Era website.</p>
            <ActionForm action={updateMyCard} className="space-y-4">
              <Field label="Name on the site" name="display_name" defaultValue={seat.display_name} required />
              <Field
                label="Specialty"
                name="specialty"
                defaultValue={seat.specialty}
                placeholder="Skin fades, beard work…"
              />
              <Field label="Phone" name="phone" type="tel" defaultValue={seat.phone} />
              <Field
                label="Booking link"
                name="booking_url"
                defaultValue={seat.booking_url}
                placeholder="book.thecut.co/yourname"
                hint="theCut, Booksy, Square, Setmore… Clients tap “Book with you” to open it."
              />
              <Field label="Instagram" name="instagram" defaultValue={seat.instagram} placeholder="@yourhandle" />
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel
            title="My rent"
            aside={<span className="text-sm font-semibold">{owed > 0 ? `${formatMoney(owed)} owed` : "All paid"}</span>}
          >
            {rent.length === 0 ? (
              <p className="text-sm text-muted">No rent charges yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rent.map((c) => {
                  const status = rentStatus(c, today);
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{formatMoney(c.amount_cents)}</p>
                        <p className="text-xs text-muted">
                          Due {formatDay(c.due_date)}
                          {c.paid_at && ` · Paid ${formatTimestamp(c.paid_at)}`}
                          {c.note && ` · ${c.note}`}
                        </p>
                      </div>
                      <StatusPill tone={status === "late" ? "alert" : status === "paid" ? "ink" : "muted"}>
                        {status}
                      </StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
        </div>
      </SwipeDeck>
    </AppShell>
  );
}

function Widget({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-paper p-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">{title}</h2>
        {aside && <span className="text-xs font-semibold text-ink-2">{aside}</span>}
      </div>
      {children}
    </div>
  );
}
