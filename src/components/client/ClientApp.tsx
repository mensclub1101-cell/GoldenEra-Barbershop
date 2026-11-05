import { AppShell } from "@/components/AppShell";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { CheckInForm } from "@/components/CheckInForm";
import { RewardsPanel, type Rewards } from "@/components/client/RewardsPanel";
import { ShopTabs } from "@/components/owner/ShopTabs";
import { SwipeDeck } from "@/components/SwipeDeck";
import { setMyBarber, updateMyDetails } from "@/app/actions/client";
import type { Viewer } from "@/lib/auth";
import { checkInShops } from "@/lib/checkin";
import type { Tables } from "@/lib/database.types";
import { asSchedule, isWorkingNow, shopStatus, todaysHours } from "@/lib/schedule";
import { clock, locations, mapsUrl, telHref, type Location } from "@/lib/shop";

const solidButton =
  "rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-2";
const outlineButton =
  "rounded-full border border-line px-4 py-2 text-xs font-semibold transition hover:border-ink";

type Seat = Tables<"barbers">;

// Where the barber is today, in a few words: "Working now", "Today 10am–7pm",
// "Off today". Nothing for barbers who haven't set a schedule.
function seatStatus(barber: Seat, now: Date) {
  const schedule = asSchedule(barber.schedule);
  if (!schedule) return null;
  if (isWorkingNow(schedule, now)) return { live: true, label: "Working now" };
  const today = todaysHours(schedule, now);
  return { live: false, label: today ? `Today ${clock(today.open)}–${clock(today.close)}` : "Off today" };
}

// Book / call / Instagram links for one barber. Booking pages are each
// barber's own (theCut, Booksy…), so they open in a new tab.
function BarberLinks({ barber, primary = false }: { barber: Seat; primary?: boolean }) {
  return (
    <>
      {barber.booking_url && (
        <a href={barber.booking_url} target="_blank" rel="noopener noreferrer" className={primary ? solidButton : outlineButton}>
          Book
        </a>
      )}
      {barber.phone && (
        <a href={telHref(barber.phone)} className={outlineButton}>
          Call
        </a>
      )}
      {barber.instagram && (
        <a href={`https://instagram.com/${barber.instagram}`} target="_blank" rel="noopener noreferrer" className={outlineButton}>
          Instagram
        </a>
      )}
    </>
  );
}

// The client app: Home, Barbers, Check in, Shops, Me. The page loads the
// data; this renders it.
export function ClientApp({
  viewer,
  shops: allShops,
  barbers: allBarbers,
  rewards,
  siteUrl,
}: {
  viewer: Viewer;
  shops: Tables<"shops">[];
  barbers: Seat[];
  rewards: Rewards | null; // null until the rewards tables exist
  siteUrl: string;
}) {
  const now = new Date();
  // A hidden barber drops out of the list, so a saved pick can go stale.
  const mine = allBarbers.find((b) => b.id === viewer.profile.favorite_barber_id) ?? null;
  const myShop = mine ? allShops.find((s) => s.id === mine.shop_id) : null;
  const myStatus = mine ? seatStatus(mine, now) : null;
  const firstName = viewer.profile.full_name?.split(" ")[0];
  // Hours, photo and review links live in shop.ts; address and phone in the database.
  const placeOf = (slug: string) => locations.find((l) => l.slug === slug);

  return (
    <AppShell viewer={viewer}>
      <SwipeDeck labels={["Home", "Barbers", "Check in", ...(rewards ? ["Rewards"] : []), "Shops", "Me"]}>
        {/* Home: my barber, ready to book, and whether each shop is open. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow="Golden Era" title={firstName ? `Hey, ${firstName}` : "Welcome"} />

          <Widget title="My barber" aside={myStatus?.label}>
            {mine ? (
              <>
                <p className="font-display text-3xl font-semibold uppercase tracking-wide">{mine.display_name}</p>
                <p className="mb-4 text-sm text-muted">
                  {myShop?.name}
                  {mine.specialty && ` · ${mine.specialty}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <BarberLinks barber={mine} primary />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-2">
                Pick your go-to barber on the <strong>Barbers</strong> tab and they&rsquo;ll show up here, one tap from booking.
              </p>
            )}
          </Widget>

          {rewards && (
            <Widget title="My points" aside="Rewards tab">
              <p className="font-display text-5xl font-semibold">{rewards.points}</p>
              <p className="mt-1 text-sm text-ink-2">
                {rewards.can_review
                  ? "Leave a review of your last visit on the Rewards tab: +10 points."
                  : rewards.my_bonus === "pending"
                    ? "Check in for your first cut from the app to unlock your 25-point welcome bonus."
                    : "Invite a friend: 50 points for you, 25 for them. Review a visit: +10."}
              </p>
            </Widget>
          )}

          <Widget title="Shops">
            <ul className="divide-y divide-line">
              {allShops.map((s) => {
                const status = shopStatus(placeOf(s.slug)?.schedule ?? [], now);
                const inNow = allBarbers.filter((b) => b.shop_id === s.id && seatStatus(b, now)?.live).length;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                    <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.open ? "bg-ink" : "border border-muted"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted">
                        {status.label}
                        {inNow > 0 && ` · ${inNow} ${inNow === 1 ? "barber" : "barbers"} in now`}
                      </p>
                    </div>
                    {s.phone && (
                      <a href={telHref(s.phone)} className={outlineButton}>
                        Call
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </Widget>

          <p className="px-1 text-center text-xs text-muted">Swipe or tap the tabs below to check in or find a barber.</p>
        </div>

        {/* Barbers: every chair at both shops, with who's in today. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow={`${allBarbers.length} barbers`} title="Barbers" />
          <ShopTabs
            tabs={allShops.map((shop) => {
              const seats = allBarbers.filter((b) => b.shop_id === shop.id);
              return {
                id: shop.id,
                label: shop.name,
                content: (
                  <ul className="mt-3 space-y-3">
                    {seats.length === 0 && <li className="rounded-3xl border border-line p-5 text-sm text-muted">No barbers listed yet.</li>}
                    {seats.map((b) => {
                      const status = seatStatus(b, now);
                      return (
                        <li key={b.id} className="rounded-3xl border border-line p-5">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-display text-2xl font-semibold uppercase tracking-wide">{b.display_name}</p>
                              {b.specialty && <p className="text-xs text-muted">{b.specialty}</p>}
                            </div>
                            {status && (
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                                  status.live ? "bg-ink text-paper" : "bg-paper-2 text-muted"
                                }`}
                              >
                                {status.label}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <BarberLinks barber={b} />
                            {b.id === mine?.id ? (
                              <form action={setMyBarber.bind(null, null)}>
                                <button className="rounded-full bg-ink px-3 py-2 text-xs font-semibold text-paper" title="Tap to clear">
                                  My barber ✓
                                </button>
                              </form>
                            ) : (
                              <form action={setMyBarber.bind(null, b.id)}>
                                <button className={outlineButton}>Make my barber</button>
                              </form>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ),
              };
            })}
          />
        </div>

        {/* Check in: the walk-in form, already filled in with their details. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow="Walk-in" title="Check in" />
          <Widget title="Get in line">
            <p className="mb-4 text-sm text-ink-2">Check in from your phone. Your barber gets a heads-up and calls you when it&rsquo;s your turn.</p>
            <CheckInForm
              shops={checkInShops(allShops, allBarbers, now)}
              initialShop={myShop?.slug}
              defaults={{ name: viewer.profile.full_name, phone: viewer.profile.phone, barberId: mine?.id }}
            />
          </Widget>
        </div>

        {/* Rewards: how invites work, then send one. */}
        {rewards && (
          <div className="mx-auto max-w-md">
            <RewardsPanel
              rewards={rewards}
              siteUrl={siteUrl}
              googleReviews={allShops.flatMap((s) => {
                const place = placeOf(s.slug);
                return place ? [{ name: s.name, url: mapsUrl(place) }] : [];
              })}
            />
          </div>
        )}

        {/* Shops: hours, directions, and a place to leave a review. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow="Moreno Valley" title="Shops" />
          {allShops.map((s) => {
            const place = placeOf(s.slug);
            const location: Location = {
              slug: s.slug,
              name: s.name,
              street: s.street,
              city: s.city,
              region: s.region,
              postalCode: s.postal_code,
              phone: s.phone,
              schedule: place?.schedule ?? [],
              photo: s.photo_url ?? place?.photo ?? null,
              yelpReviewUrl: place?.yelpReviewUrl ?? null,
              instagram: place?.instagram ?? null,
            };
            return <ShopCard key={s.id} location={location} status={shopStatus(location.schedule, now)} />;
          })}
        </div>

        {/* Me: name and phone, used to fill in check-in. */}
        <div className="mx-auto max-w-md space-y-4">
          <PageTitle eyebrow="Account" title="Me" />
          <Widget title="My details">
            <ActionForm action={updateMyDetails} className="space-y-4">
              <Field label="Name" name="full_name" autoComplete="name" defaultValue={viewer.profile.full_name} required />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={viewer.profile.phone}
                hint="Fills in walk-in check-in for you."
              />
              <p className="text-sm text-muted">Email: {viewer.email}</p>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Widget>
        </div>
      </SwipeDeck>
    </AppShell>
  );
}

function ShopCard({ location, status }: { location: Location; status: { open: boolean; label: string } }) {
  const button = "rounded-full border border-paper/40 px-4 py-2 text-xs font-semibold text-paper transition hover:border-paper";
  return (
    <article className="relative overflow-hidden rounded-3xl bg-ink text-paper">
      {location.photo && (
        <div aria-hidden className="absolute inset-0 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${location.photo})` }} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/30" />
      <div className="relative p-5 pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-paper/70">
          <span aria-hidden className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${status.open ? "bg-paper" : "border border-paper/60"}`} />
          {status.label}
        </p>
        <h2 className="mt-1 font-display text-3xl font-semibold uppercase tracking-wide">{location.name}</h2>
        <address className="mt-1 text-sm not-italic text-paper/80">
          {location.street}, {location.city}
        </address>
        {location.schedule.length > 0 && (
          <dl className="mt-3 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-0.5 text-sm">
            {location.schedule.map((h) => (
              <div key={h.label} className="contents">
                <dt className="text-paper/60">{h.label}</dt>
                <dd className="text-paper/90">
                  {clock(h.open)} – {clock(h.close)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={mapsUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-paper px-4 py-2 text-xs font-semibold text-ink transition hover:bg-paper-2"
          >
            Directions
          </a>
          {location.phone && (
            <a href={telHref(location.phone)} className={button}>
              Call
            </a>
          )}
          {location.instagram && (
            <a href={`https://instagram.com/${location.instagram}`} target="_blank" rel="noopener noreferrer" className={button}>
              Instagram
            </a>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={mapsUrl(location)} target="_blank" rel="noopener noreferrer" className={button}>
            Review on Google
          </a>
          {location.yelpReviewUrl && (
            <a href={location.yelpReviewUrl} target="_blank" rel="noopener noreferrer" className={button}>
              Review on Yelp
            </a>
          )}
        </div>
      </div>
    </article>
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
