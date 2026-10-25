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
  setShopLogin,
  markRestocked,
  addReview,
  setReviewVisible,
  deleteReview,
} from "@/app/actions/owner";
import { SwipeDeck } from "@/components/SwipeDeck";
import { EditRentButton } from "@/components/owner/EditRentButton";
import { ShopTabs } from "@/components/owner/ShopTabs";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatMoney, formatTimestamp, rentStatus, todayInShop } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";
import type { Tables } from "@/lib/database.types";

export const metadata: Metadata = { title: "Owner | Golden Era Barbershop" };

const smallButton =
  "rounded-full border border-ink px-3 py-1.5 text-xs font-semibold transition hover:bg-ink hover:text-paper";

export default async function OwnerPage() {
  const viewer = await requireRole("owner");
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const today = todayInShop();

  const [
    { data: shops },
    { data: barbers },
    { data: invites },
    { data: charges },
    { data: rates },
    { data: lowSupplies },
    { data: reviews },
  ] = await Promise.all([
    supabase.from("shops").select("*").order("sort"),
    supabase.from("barbers").select("*").order("sort").order("display_name"),
    supabase.from("invites").select("*").is("used_at", null).gt("expires_at", new Date().toISOString()),
    supabase.from("rent_charges").select("*").order("due_date", { ascending: false }).limit(100),
    supabase.from("rent_rates").select("barber_id, amount_cents"),
    supabase.from("supplies").select("*").neq("status", "full").order("name"),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }),
  ]);

  const allShops = shops ?? [];
  const allBarbers = barbers ?? [];
  const allCharges = charges ?? [];
  const inviteFor = new Map((invites ?? []).map((i) => [i.barber_id, i]));
  const barberName = new Map(allBarbers.map((b) => [b.id, b.display_name]));
  const shopOf = new Map(allBarbers.map((b) => [b.id, b.shop_id]));
  const rentOf = new Map((rates ?? []).map((r) => [r.barber_id, r.amount_cents]));

  const active = allBarbers.filter((b) => b.active);
  const joined = active.filter((b) => b.profile_id).length;

  return (
    <AppShell viewer={viewer}>
      <SwipeDeck labels={["Booth rent", "Supplies", "Reviews", "Shop"]}>
        {/* Booth rent: who owes, add charges, mark paid. */}
        <div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Booth rent</h1>
          <p className="mt-2 text-ink-2">Charge rent, see who owes, and mark it paid. Tap a shop to switch.</p>

          <div className="mt-6">
            <ShopTabs
              tabs={allShops.map((shop) => ({
                id: shop.id,
                label: shop.name,
                content: (
                  <RentView
                    shop={shop}
                    barbers={active.filter((b) => b.shop_id === shop.id)}
                    charges={allCharges.filter((c) => shopOf.get(c.barber_id) === shop.id)}
                    barberName={barberName}
                    rentOf={rentOf}
                    today={today}
                  />
                ),
              }))}
            />
          </div>
        </div>

        {/* Supplies: what barbers marked Low or Out, so the owner knows what to order. */}
        <div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Supplies</h1>
          <p className="mt-2 text-ink-2">
            What barbers marked Low or Out. Order it, then tap Restocked when it comes in.
          </p>
          <div className="mt-6">
            <ShopTabs
              tabs={allShops.map((shop) => {
                const items = (lowSupplies ?? [])
                  .filter((s) => s.shop_id === shop.id)
                  .sort((a, b) => Number(b.status === "out") - Number(a.status === "out"));
                return {
                  id: shop.id,
                  label: items.length ? `${shop.name} (${items.length})` : shop.name,
                  content: <SupplyOrderList shopName={shop.name} items={items} />,
                };
              })}
            />
          </div>
        </div>

        {/* Reviews: real client reviews the owner adds; visible ones show on the website. */}
        <div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Reviews</h1>
          <p className="mt-2 text-ink-2">Add real client reviews. They show on the website right away.</p>
          <div className="mt-8 space-y-6">
            <Panel title="Add a review">
              <ActionForm action={addReview} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
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
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Stars</span>
                  <select name="rating" className={inputClass} defaultValue="5" required>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Client name" name="author" placeholder="Marcus T." required />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Where it&rsquo;s from</span>
                  <select name="source" className={inputClass} defaultValue="Google">
                    {["Google", "Yelp", "Instagram", "In person", "Other"].map((src) => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold">What they said</span>
                  <textarea
                    name="body"
                    required
                    maxLength={600}
                    rows={4}
                    placeholder="Best fade I've had in Moreno Valley…"
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2">
                  <SubmitButton>Add review</SubmitButton>
                </div>
              </ActionForm>
            </Panel>

            <Panel title="On the website" aside={<span className="text-sm text-muted">{(reviews ?? []).filter((r) => r.visible).length} showing</span>}>
              {(reviews ?? []).length === 0 ? (
                <p className="text-sm text-muted">
                  No reviews yet. Copy a few from Google or Yelp and add them above. The Reviews section on the
                  website shows them as soon as you do.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {(reviews ?? []).map((r) => (
                    <li key={r.id} className={`py-4 ${r.visible ? "" : "opacity-50"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          {r.author} <span className="text-sm">{"★".repeat(r.rating)}</span>
                        </p>
                        {!r.visible && <StatusPill tone="muted">Hidden</StatusPill>}
                      </div>
                      <p className="mt-1 text-sm text-ink-2">&ldquo;{r.body}&rdquo;</p>
                      <p className="mt-1 text-xs text-muted">
                        {allShops.find((s) => s.id === r.shop_id)?.name}
                        {r.source && ` · ${r.source}`} · added {formatTimestamp(r.created_at)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <form action={setReviewVisible.bind(null, r.id, !r.visible)}>
                          <button className={smallButton}>{r.visible ? "Hide" : "Show"}</button>
                        </form>
                        <form action={deleteReview.bind(null, r.id)}>
                          <button className="px-2 text-xs font-semibold text-muted underline hover:text-ink">Delete</button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <div>
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">Shop</h1>
          <p className="mt-2 text-ink-2">Your barbers at each shop. Tap a shop to switch.</p>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-paper-2 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Barbers joined</dt>
              <dd className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                {joined}/{active.length}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <ShopTabs
              tabs={allShops.map((shop) => {
                const seats = allBarbers.filter((b) => b.shop_id === shop.id);
                return {
                  id: shop.id,
                  label: shop.name,
                  content: (
                    <div className="mt-6 space-y-6">
                      {/* Roster */}
                      <Panel title="Barbers">
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
                                    <EditRentButton
                                      barberId={b.id}
                                      name={b.display_name}
                                      amountCents={rentOf.get(b.id) ?? null}
                                      className={smallButton}
                                    />
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
                                <p className="text-xs text-muted">
                                  {rentOf.has(b.id)
                                    ? `Booth rent ${formatMoney(rentOf.get(b.id)!)}`
                                    : "No booth rent set"}
                                </p>
                                {b.active && !b.profile_id && invite && (
                                  <div>
                                    <CopyLink url={`${siteUrl}/join/${invite.token}`} />
                                    <p className="mt-1 text-xs text-muted">
                                      Text this to {b.display_name}. Works once, expires{" "}
                                      {formatTimestamp(invite.expires_at)}.
                                    </p>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        <details className="mt-6 rounded-2xl bg-paper-2 p-4">
                          <summary className="cursor-pointer text-sm font-semibold">+ Add a barber</summary>
                          <ActionForm action={addBarber} resetOnSuccess className="mt-4 grid gap-4 sm:grid-cols-2">
                            <input type="hidden" name="shop_id" value={shop.id} />
                            <Field label="Name" name="display_name" required />
                            <Field label="Phone" name="phone" type="tel" placeholder="(951) 555-0123" />
                            <div className="sm:col-span-2">
                              <Field label="Booking link" name="booking_url" placeholder="book.thecut.co/…" />
                            </div>
                            <div className="sm:col-span-2">
                              <SubmitButton>Add barber to {shop.name}</SubmitButton>
                            </div>
                          </ActionForm>
                        </details>
                      </Panel>

                      <Panel title="Shop booking login">
                        <p className="-mt-2 mb-4 text-sm text-muted">
                          The sign-in page for {shop.name}&rsquo;s booking system (for example
                          app.getsquire.com/login). Every barber sees it as a tab on their Booking page.
                        </p>
                        <ActionForm action={setShopLogin.bind(null, shop.id)} className="space-y-4">
                          <Field
                            label="Login page link"
                            name="staff_login_url"
                            defaultValue={shop.staff_login_url}
                            placeholder="app.getsquire.com/login"
                          />
                          <SubmitButton>Save</SubmitButton>
                        </ActionForm>
                      </Panel>
                    </div>
                  ),
                };
              })}
            />
          </div>
        </div>
      </SwipeDeck>
    </AppShell>
  );
}

// One shop's booth rent: totals, who owes, add a charge, and the charge list.
function RentView({
  shop,
  barbers,
  charges,
  barberName,
  rentOf,
  today,
}: {
  shop: Tables<"shops">;
  barbers: Tables<"barbers">[];
  charges: Tables<"rent_charges">[];
  barberName: Map<string, string>;
  rentOf: Map<string, number>;
  today: string;
}) {
  const unpaid = charges.filter((c) => !c.paid_at);
  const late = unpaid.filter((c) => rentStatus(c, today) === "late");
  const outstanding = unpaid.reduce((sum, c) => sum + c.amount_cents, 0);
  const thisMonth = today.slice(0, 7);
  const collected = charges
    .filter((c) => c.paid_at && todayInShop(new Date(c.paid_at)).startsWith(thisMonth))
    .reduce((sum, c) => sum + c.amount_cents, 0);
  // Who owes what: late first, then biggest balance.
  const balances = barbers
    .map((b) => {
      const mine = unpaid.filter((c) => c.barber_id === b.id);
      return {
        barber: b,
        owed: mine.reduce((sum, c) => sum + c.amount_cents, 0),
        late: mine.some((c) => rentStatus(c, today) === "late"),
      };
    })
    .sort(
      (a, b) =>
        Number(b.late) - Number(a.late) ||
        b.owed - a.owed ||
        a.barber.display_name.localeCompare(b.barber.display_name),
    );
  // Unpaid first (oldest due on top), then paid history.
  const chargeList = [
    ...unpaid.sort((a, b) => a.due_date.localeCompare(b.due_date)),
    ...charges.filter((c) => c.paid_at),
  ];

  return (
    <>
      <dl className="mt-8 grid grid-cols-3 gap-3">
        {[
          { label: "Owed", value: formatMoney(outstanding) },
          {
            label: "Late",
            value: String(late.length),
            alert: late.length > 0,
          },
          { label: "Paid this month", value: formatMoney(collected) },
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
        <Panel title="Who owes">
          {balances.length === 0 && <p className="text-sm text-muted">No barbers at {shop.name} yet.</p>}
          <ul className="divide-y divide-line">
            {balances.map(({ barber, owed, late: isLate }) => (
              <li key={barber.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{barber.display_name}</p>
                  <p className="text-xs text-muted">
                    {rentOf.has(barber.id) ? `Rent ${formatMoney(rentOf.get(barber.id)!)}` : "No rent set"}
                  </p>
                </div>
                {owed === 0 ? (
                  <span className="text-sm text-muted">All paid</span>
                ) : (
                  <>
                    {isLate && <StatusPill tone="alert">late</StatusPill>}
                    <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(owed)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Charges">
          <ActionForm action={addRentCharge} resetOnSuccess className="grid gap-4 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold">Barber</span>
              <select name="barber_id" className={inputClass} required>
                <option value="">Pick a barber</option>
                <option value={`shop:${shop.id}`}>Everyone at {shop.name}</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                    {rentOf.has(b.id) ? ` · ${formatMoney(rentOf.get(b.id)!)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Amount ($)"
              name="amount"
              placeholder="Their rent"
              hint="Leave blank to use each barber's rent."
            />
            <Field label="Due" name="due_date" type="date" defaultValue={today} required />
            <div className="sm:col-span-3">
              <Field label="Note (optional)" name="note" placeholder="Week of Nov 3" />
            </div>
            <div className="flex items-end">
              <SubmitButton className="w-full">Add charge</SubmitButton>
            </div>
          </ActionForm>

          {chargeList.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No rent charges at {shop.name} yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {chargeList.map((c) => {
                const status = rentStatus(c, today);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                    <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                      <p className="flex justify-between gap-3 font-semibold">
                        <span className="truncate">{barberName.get(c.barber_id) ?? "Removed barber"}</span>
                        <span className="tabular-nums">{formatMoney(c.amount_cents)}</span>
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
      </div>
    </>
  );
}

// One shop's order list: Out first, then Low, each with a Restocked button.
function SupplyOrderList({ shopName, items }: { shopName: string; items: Tables<"supplies">[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-3xl border border-line p-5 text-sm text-ink-2">
        Nothing to order at {shopName}. Everything is marked Full.
      </p>
    );
  }
  return (
    <ul className="mt-6 divide-y divide-line rounded-3xl border border-line">
      {items.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-5 py-4">
          <span
            aria-hidden
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.status === "out" ? "bg-red-500" : "bg-amber-400"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{s.name}</p>
            <p className="text-xs text-muted">
              {s.status === "out" ? "Out" : "Low"} · marked {formatTimestamp(s.updated_at)}
            </p>
          </div>
          <form action={markRestocked.bind(null, s.id)}>
            <button className={smallButton}>Restocked</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
