import type { Metadata } from "next";
import { AppShell, Panel, StatusPill } from "@/components/AppShell";
import { ActionForm, CopyLink, Field, SubmitButton, inputClass } from "@/components/forms";
import {
  addBarber,
  addRentCharge,
  createInvite,
  deleteRentCharge,
  setBarberActive,
  setRentPaid,
  updateShop,
} from "@/app/actions/owner";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatMoney, formatTimestamp, rentStatus, todayInShop } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Owner | Golden Era Barbershop" };

const smallButton =
  "rounded-full border border-ink px-3 py-1.5 text-xs font-semibold transition hover:bg-ink hover:text-paper";

export default async function OwnerPage() {
  const viewer = await requireRole("owner");
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const today = todayInShop();

  const [{ data: shops }, { data: barbers }, { data: invites }, { data: charges }] = await Promise.all([
    supabase.from("shops").select("*").order("sort"),
    supabase.from("barbers").select("*").order("sort").order("display_name"),
    supabase.from("invites").select("*").is("used_at", null).gt("expires_at", new Date().toISOString()),
    supabase.from("rent_charges").select("*").order("due_date", { ascending: false }).limit(100),
  ]);

  const allShops = shops ?? [];
  const allBarbers = barbers ?? [];
  const allCharges = charges ?? [];
  const inviteFor = new Map((invites ?? []).map((i) => [i.barber_id, i]));
  const barberName = new Map(allBarbers.map((b) => [b.id, b.display_name]));

  const active = allBarbers.filter((b) => b.active);
  const joined = active.filter((b) => b.profile_id).length;
  const unpaid = allCharges.filter((c) => !c.paid_at);
  const late = unpaid.filter((c) => rentStatus(c, today) === "late");
  const outstanding = unpaid.reduce((sum, c) => sum + c.amount_cents, 0);

  return (
    <AppShell viewer={viewer}>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Shop</h1>
      <p className="mt-2 text-ink-2">Both locations, your barbers and booth rent in one place.</p>

      <dl className="mt-8 grid grid-cols-3 gap-3">
        {[
          { label: "Barbers joined", value: `${joined}/${active.length}` },
          { label: "Rent owed", value: formatMoney(outstanding) },
          { label: "Late", value: String(late.length), alert: late.length > 0 },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.alert ? "bg-red-50" : "bg-paper-2"}`}>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{s.label}</dt>
            <dd className={`mt-1 font-display text-2xl font-semibold sm:text-3xl ${s.alert ? "text-red-800" : ""}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 space-y-6">
        {/* Roster */}
        <Panel title="Barbers">
          <div className="space-y-8">
            {allShops.map((shop) => {
              const seats = allBarbers.filter((b) => b.shop_id === shop.id);
              return (
                <div key={shop.id}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{shop.name}</h3>
                  {seats.length === 0 && <p className="text-sm text-muted">No barbers yet.</p>}
                  <ul className="divide-y divide-line rounded-2xl border border-line">
                    {seats.map((b) => {
                      const invite = inviteFor.get(b.id);
                      return (
                        <li key={b.id} className="space-y-3 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`font-semibold ${b.active ? "" : "text-muted line-through"}`}>
                              {b.display_name}
                            </span>
                            {!b.active ? (
                              <StatusPill tone="muted">Hidden</StatusPill>
                            ) : b.profile_id ? (
                              <StatusPill tone="ink">Joined</StatusPill>
                            ) : invite ? (
                              <StatusPill tone="muted">Invited</StatusPill>
                            ) : (
                              <StatusPill tone="muted">Not invited</StatusPill>
                            )}
                            <div className="ml-auto flex gap-2">
                              {b.active && !b.profile_id && (
                                <form action={createInvite.bind(null, b.id)}>
                                  <button className={smallButton}>{invite ? "New link" : "Invite"}</button>
                                </form>
                              )}
                              <form action={setBarberActive.bind(null, b.id, !b.active)}>
                                <button className={smallButton}>{b.active ? "Hide" : "Show"}</button>
                              </form>
                            </div>
                          </div>
                          {b.active && !b.profile_id && invite && (
                            <div>
                              <CopyLink url={`${siteUrl}/join/${invite.token}`} />
                              <p className="mt-1 text-xs text-muted">
                                Text this to {b.display_name}. Works once, expires {formatTimestamp(invite.expires_at)}.
                              </p>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <details className="mt-8 rounded-2xl bg-paper-2 p-4">
            <summary className="cursor-pointer text-sm font-semibold">+ Add a barber</summary>
            <ActionForm action={addBarber} resetOnSuccess className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Name" name="display_name" required />
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Shop</span>
                <select name="shop_id" className={inputClass} required>
                  {allShops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Phone" name="phone" type="tel" placeholder="(951) 555-0123" />
              <Field label="Booking link" name="booking_url" placeholder="book.thecut.co/…" />
              <div className="sm:col-span-2">
                <SubmitButton>Add barber</SubmitButton>
              </div>
            </ActionForm>
          </details>
        </Panel>

        {/* Booth rent */}
        <Panel title="Booth rent">
          <ActionForm action={addRentCharge} resetOnSuccess className="grid gap-4 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold">Barber</span>
              <select name="barber_id" className={inputClass} required>
                <option value="">Pick a barber</option>
                {active.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Amount ($)" name="amount" placeholder="250" required />
            <Field label="Due" name="due_date" type="date" defaultValue={today} required />
            <div className="sm:col-span-3">
              <Field label="Note (optional)" name="note" placeholder="Week of Nov 3" />
            </div>
            <div className="flex items-end">
              <SubmitButton className="w-full">Add charge</SubmitButton>
            </div>
          </ActionForm>

          {allCharges.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No rent charges yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {allCharges.map((c) => {
                const status = rentStatus(c, today);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {barberName.get(c.barber_id) ?? "Removed barber"} · {formatMoney(c.amount_cents)}
                      </p>
                      <p className="text-xs text-muted">
                        Due {formatDay(c.due_date)}
                        {c.note && ` · ${c.note}`}
                        {c.paid_at && ` · Paid ${formatTimestamp(c.paid_at)}`}
                      </p>
                    </div>
                    <StatusPill tone={status === "late" ? "alert" : status === "paid" ? "ink" : "muted"}>
                      {status}
                    </StatusPill>
                    <form action={setRentPaid.bind(null, c.id, !c.paid_at)}>
                      <button className={smallButton}>{c.paid_at ? "Undo" : "Mark paid"}</button>
                    </form>
                    {!c.paid_at && (
                      <form action={deleteRentCharge.bind(null, c.id)}>
                        <button className="text-xs font-semibold text-muted underline hover:text-ink">Delete</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Shop info */}
        <Panel title="Shop info">
          <p className="-mt-2 mb-5 text-sm text-muted">Shown on the website&rsquo;s location cards.</p>
          <div className="grid gap-6 md:grid-cols-2">
            {allShops.map((shop) => (
              <ActionForm key={shop.id} action={updateShop.bind(null, shop.id)} className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{shop.name}</h3>
                <Field label="Phone" name="phone" type="tel" defaultValue={shop.phone} />
                <Field label="Hours" name="hours" defaultValue={shop.hours} placeholder="Tue–Sat 9am–7pm" />
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
