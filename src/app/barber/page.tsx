import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, StatusPill } from "@/components/AppShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { updateMyCard } from "@/app/actions/barber";
import { ClockWidget } from "@/components/ClockWidget";
import { ClientList } from "@/components/staff/ClientList";
import { MediaStudio } from "@/components/staff/MediaStudio";
import { CleaningList, SupplyList } from "@/components/staff/ShopOps";
import { ShopChat } from "@/components/staff/ShopChat";
import { WalkinsWidget } from "@/components/staff/WalkinsWidget";
import { MenuSheet } from "@/components/MenuSheet";
import { ScheduleFields } from "@/components/staff/ScheduleFields";
import { asSchedule } from "@/lib/schedule";
import { locations } from "@/lib/shop";
import { bookingProvider, type BookingProvider } from "@/lib/booking-providers";
import { ShopTabs } from "@/components/owner/ShopTabs";
import { SwipeDeck } from "@/components/SwipeDeck";
import { requireRole } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatMoney, formatTimestamp, rentStatus, thisWednesday, todayInShop } from "@/lib/format";

export const metadata: Metadata = { title: "Barber | Golden Era Barbershop" };

export default async function BarberPage() {
  const viewer = await requireRole("barber", "owner");
  const seat = viewer.seat;
  if (!seat) redirect("/owner");

  const supabase = await createClient();
  const today = todayInShop();
  const [
    { data: shop },
    { data: charges },
    { data: walkins },
    { data: shopBarbers },
    { data: messages },
    { data: supplies },
    { data: cleaning },
    { data: clients },
  ] = await Promise.all([
    supabase.from("shops").select("name, slug").eq("id", seat.shop_id).single(),
    supabase.from("rent_charges").select("*").eq("barber_id", seat.id).order("due_date", { ascending: false }),
    supabase.from("walkins").select("*").eq("shop_id", seat.shop_id).eq("status", "waiting").order("created_at"),
    supabase.from("barbers").select("id, display_name").eq("shop_id", seat.shop_id),
    supabase.from("shop_messages").select("*").eq("shop_id", seat.shop_id).order("created_at", { ascending: false }).limit(50),
    supabase.from("supplies").select("*").eq("shop_id", seat.shop_id).order("sort").order("name"),
    supabase.from("cleaning_tasks").select("*").eq("shop_id", seat.shop_id).order("sort"),
    supabase.from("clients").select("*").eq("barber_id", seat.id).order("last_visit_at", { ascending: false }),
  ]);
  const barberNames = Object.fromEntries((shopBarbers ?? []).map((b) => [b.id, b.display_name]));
  const myName = viewer.profile.full_name ?? seat.display_name;
  const siteUrl = await getSiteUrl();
  const rent = charges ?? [];
  const owed = rent.filter((c) => !c.paid_at).reduce((sum, c) => sum + c.amount_cents, 0);
  const nextDue = rent.filter((c) => !c.paid_at).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  // The card is "done" once clients can reach the barber from it.
  const mySchedule = asSchedule(seat.schedule);
  const provider = bookingProvider(seat.booking_url);
  const shopHours = locations.find((l) => l.slug === shop?.slug)?.schedule ?? [];
  const cardDone = Boolean(seat.phone && seat.booking_url && mySchedule);
  const cardForm = (
    <ActionForm action={updateMyCard} className="space-y-4">
      <Field label="Name on the site" name="display_name" defaultValue={seat.display_name} required />
      <Field label="Specialty" name="specialty" defaultValue={seat.specialty} placeholder="Skin fades, beard work…" />
      <Field label="Phone" name="phone" type="tel" defaultValue={seat.phone} />
      <Field
        label="Booking link"
        name="booking_url"
        defaultValue={seat.booking_url}
        placeholder="book.thecut.co/yourname"
        hint="theCut, Booksy, Square, Setmore… Clients tap “Book with you” to open it."
      />
      <Field label="Instagram" name="instagram" defaultValue={seat.instagram} placeholder="@yourhandle" />
      <ScheduleFields schedule={mySchedule} shopHours={shopHours} />
      <SubmitButton>Save</SubmitButton>
    </ActionForm>
  );

  return (
    <AppShell
      viewer={viewer}
      menu={
        <MenuSheet title="Edit my card" dot={!cardDone}>
          {!cardDone && (
            <p className="mb-4 rounded-xl bg-paper-2 px-4 py-3 text-sm">
              Add your phone, booking link and schedule so clients can find and book you from the website.
            </p>
          )}
          {!seat.active && (
            <p className="mb-4 rounded-xl bg-paper-2 px-4 py-3 text-sm">
              Your card is hidden from the website right now. Ask the owner to show it.
            </p>
          )}
          {cardForm}
        </MenuSheet>
      }
    >
      <SwipeDeck labels={["Widgets", "Media", "Shop ops", "Booking", "Clients"]}>
        <div className="mx-auto max-w-md space-y-4">
          <ClockWidget name={myName} />

          <Widget title="Walk-ins" aside={shop?.name}>
            <WalkinsWidget shopId={seat.shop_id} seatId={seat.id} initial={walkins ?? []} barberNames={barberNames} />
          </Widget>


          <Widget title="Shop chat" aside={shop?.name}>
            <ShopChat shopId={seat.shop_id} me={viewer.userId} myName={myName} initial={(messages ?? []).reverse()} />
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
            {rent.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-muted">All charges</summary>
                <ul className="mt-2 divide-y divide-line">
                  {rent.map((c) => {
                    const status = rentStatus(c, today);
                    return (
                      <li key={c.id} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{formatMoney(c.amount_cents)}</p>
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
              </details>
            )}
          </Widget>
        </div>

        {/* Media: post to the shop's Instagram, or send a client their cut. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow={shop?.name} title="Media" />
          <MediaStudio
            barberName={seat.display_name}
            shopName={shop?.name ?? ""}
            bookingUrl={seat.booking_url}
            siteUrl={siteUrl}
            clients={(clients ?? []).flatMap((c) => (c.phone ? [{ name: c.name, phone: c.phone }] : []))}
          />
        </div>

        {/* Shop ops: supplies and the Wednesday cleaning list. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow={shop?.name} title="Shop ops" />
          <Widget title="Supplies">
            <SupplyList supplies={supplies ?? []} />
          </Widget>
          <Widget title="Wednesday clean" aside={`Week of ${formatDay(thisWednesday(today))}`}>
            <CleaningList tasks={cleaning ?? []} weekOf={thisWednesday(today)} />
          </Widget>
        </div>

        {/* Booking: the barber's own booking site, right inside the app. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow={seat.display_name} title="Booking" />
          {seat.booking_url ? (
            <ShopTabs
              tabs={[
                ...(provider
                  ? [
                      {
                        id: "login",
                        label: `${provider.name} login`,
                        content: <ProviderLogin provider={provider} />,
                      },
                    ]
                  : []),
                {
                  id: "page",
                  label: "My booking page",
                  content: <EmbeddedSite url={seat.booking_url} title="My booking page" openLabel="Open full screen" />,
                },
              ]}
            />
          ) : (
            <Widget title="Add your booking link">
              <p className="mb-4 text-sm text-ink-2">Add your theCut, Booksy, Square or Setmore link and your schedule shows up here.</p>
              {cardForm}
            </Widget>
          )}
        </div>

        {/* Client list: walk-ins this barber saved, plus ones added by hand. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow={`${(clients ?? []).length} saved`} title="Clients" />
          <ClientList clients={clients ?? []} />
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

function PageTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="px-1 pt-1">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>}
      <h1 className="font-display text-4xl font-semibold uppercase tracking-wide">{title}</h1>
    </div>
  );
}

// Another site shown inside the app, with a full-screen fallback for sites
// that refuse to be framed (most logins do, and iPhone blocks their cookies).
function EmbeddedSite({ url, title, openLabel }: { url: string; title: string; openLabel: string }) {
  return (
    <div className="mt-4 space-y-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-full bg-ink py-3 text-center text-sm font-semibold text-paper"
      >
        {openLabel}
      </a>
      <div className="overflow-hidden rounded-3xl border border-line bg-paper-2">
        <iframe src={url} title={title} loading="lazy" className="block h-[calc(100dvh-23rem)] min-h-80 w-full" />
      </div>
      <p className="px-1 text-xs text-muted">
        Some sites won&rsquo;t show inside other apps. If it&rsquo;s blank, tap the button above.
      </p>
    </div>
  );
}

// The barber's own booking-system login (Squire, Square, Setmore, Booksy), or
// a note for app-only systems like theCut.
function ProviderLogin({ provider }: { provider: BookingProvider }) {
  if (!provider.loginUrl) {
    return (
      <div className="mt-4 rounded-3xl border border-line p-5">
        <p className="text-sm text-ink-2">{provider.appNote}</p>
        <p className="mt-2 text-sm text-ink-2">Open the {provider.name} app to see your schedule and messages.</p>
      </div>
    );
  }
  return <EmbeddedSite url={provider.loginUrl} title={`${provider.name} login`} openLabel={`Open my ${provider.name} login`} />;
}
