import Link from "next/link";
import { SiteHeader, Wordmark } from "@/components/SiteHeader";
import { HeroMedia } from "@/components/HeroMedia";
import { StaffGrid } from "@/components/StaffGrid";
import { getRoster } from "@/lib/roster";
import { isWorkingNow } from "@/lib/schedule";
import { getSiteUrl } from "@/lib/site-url";
import {
  brand,
  fullAddress,
  locationName,
  mapsUrl,
  telHref,
  clock,
  type Location,
  type Review,
} from "@/lib/shop";

// Barbers and shop info come from the database, so render per request.
export const dynamic = "force-dynamic";


// schema.org data so Google can show both shops as one business with two locations.
const structuredDataFor = (locations: Location[], siteUrl: string) => ({
  "@context": "https://schema.org",
  "@graph": locations.map((l) => ({
    "@type": "BarberShop",
    "@id": `${siteUrl}/#${l.slug}`,
    name: `${brand.name} – ${l.name}`,
    url: siteUrl,
    image: l.photo ? `${siteUrl}${l.photo}` : undefined,
    telephone: l.phone ?? undefined,
    sameAs: l.instagram ? [`https://www.instagram.com/${l.instagram}/`] : undefined,
    openingHoursSpecification: l.schedule.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.open,
      closes: h.close,
    })),
    address: {
      "@type": "PostalAddress",
      streetAddress: l.street,
      addressLocality: l.city,
      addressRegion: l.region,
      postalCode: l.postalCode,
      addressCountry: "US",
    },
  })),
});

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
      <h2 className="font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-ink-2">{children}</p>}
    </div>
  );
}

function LocationCard({
  location,
  index,
  barberCount,
  workingNow,
}: {
  location: Location;
  index: number;
  barberCount: number;
  workingNow: string[];
}) {
  return (
    <article className="relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-ink text-paper">
      {location.photo ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{ backgroundImage: `url(${location.photo})` }}
        />
      ) : (
        <div aria-hidden className="stripes-soft absolute inset-0" />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />

      <div className="relative p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-paper/60">
          Location {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="mt-2 font-display text-3xl font-semibold uppercase tracking-wide sm:text-4xl">
          {location.name}
        </h3>
        <address className="mt-3 not-italic text-paper/80">
          {location.street}
          <br />
          {location.city}, {location.region} {location.postalCode}
        </address>
        {location.schedule.length > 0 && (
          <dl className="mt-4 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
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
        <p className="mt-3 text-sm text-paper/60">
          {barberCount} {barberCount === 1 ? "barber" : "barbers"}
        </p>
        {workingNow.length > 0 && (
          <p className="mt-1 text-sm text-paper/90">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-paper align-middle" aria-hidden />
            Working now: {workingNow.join(", ")}
          </p>
        )}
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={mapsUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper-2"
          >
            Get directions
          </a>
          {location.phone && (
            <a
              href={telHref(location.phone)}
              className="rounded-full border border-paper/40 px-5 py-2.5 text-sm font-semibold text-paper transition hover:border-paper"
            >
              Call {location.phone}
            </a>
          )}
          <a
            href={`#barbers-${location.slug}`}
            className="rounded-full border border-paper/40 px-5 py-2.5 text-sm font-semibold text-paper transition hover:border-paper"
          >
            See barbers
          </a>
        </div>
      </div>
    </article>
  );
}

// Real reviews drifting left to right under the hero. The list is rendered
// twice so the loop is seamless; reduced-motion users get a scrollable row.
function ReviewTicker({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const items = (copy: number) =>
    reviews.map((r, i) => (
      <li
        key={`${copy}-${i}`}
        aria-hidden={copy === 1 || undefined}
        className="w-[19rem] shrink-0 border-l border-paper/15 sm:w-[24rem]"
      >
        <a
          href="#reviews"
          tabIndex={copy === 1 ? -1 : undefined}
          className="flex h-full flex-col gap-2 px-6 py-5 transition hover:bg-paper/5"
        >
          <span className="text-sm tracking-[0.2em] text-paper" aria-label={`${r.rating} out of 5 stars`}>
            {"★".repeat(r.rating)}
          </span>
          <p className="line-clamp-2 text-sm text-paper/85">&ldquo;{r.body}&rdquo;</p>
          <p className="text-xs uppercase tracking-wider text-paper/55">
            {r.author} · {locationName(r.location)}
          </p>
        </a>
      </li>
    ));
  return (
    <section aria-label="What clients say" className="review-ticker overflow-hidden bg-ink text-paper">
      <ul className="review-ticker-track flex w-max">
        {items(0)}
        {items(1)}
      </ul>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={`h-4 w-4 ${i < rating ? "fill-ink" : "fill-line"}`} aria-hidden>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default async function Home() {
  const [roster, siteUrl] = await Promise.all([getRoster(), getSiteUrl()]);
  // Real reviews the owner added in the owner app (visible ones only).
  const { locations, reviews: liveReviews } = roster;
  // "Working now" is worked out per request from each barber's own schedule.
  const now = new Date();
  const barbers = roster.barbers.map((b) => ({ ...b, workingNow: isWorkingNow(b.schedule ?? null, now) }));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataFor(locations, siteUrl)).replace(/</g, "\\u003c") }}
      />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-ink text-paper">
          <HeroMedia />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-12 sm:px-6 sm:pb-32">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-paper/70 sm:tracking-[0.4em]">
              {brand.city} · Two locations
            </p>
            <h1 className="mt-6 max-w-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- the logo traced from the storefront sign */}
              <img src="/brand/logo-white.svg" alt={brand.name} width={2863} height={610} className="h-auto w-full" />
            </h1>
            <p className="mt-6 max-w-xl text-lg text-paper/85">{brand.tagline}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/checkin"
                className="rounded-full bg-paper px-6 py-3 text-sm font-semibold uppercase tracking-wider text-ink transition hover:bg-paper-2"
              >
                Walk-in check in
              </Link>
              <a
                href="#locations"
                className="rounded-full border border-paper/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-paper transition hover:border-paper"
              >
                Find a location
              </a>
              <a
                href="#staff"
                className="rounded-full border border-paper/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-paper transition hover:border-paper"
              >
                Meet the barbers
              </a>
              <a
                href="#social"
                className="rounded-full border border-paper/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-paper transition hover:border-paper"
              >
                Social media
              </a>
            </div>
          </div>
        </section>
        <ReviewTicker reviews={liveReviews} />

        {/* Locations */}
        <section id="locations" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading eyebrow="Two shops" title="Locations">
            Same standard at both chairs. Pick the shop closest to you.
          </SectionHeading>
          <div className="grid gap-6 lg:grid-cols-2">
            {locations.map((l, i) => (
              <LocationCard
                key={l.slug}
                location={l}
                index={i}
                barberCount={barbers.filter((b) => b.location === l.slug).length}
                workingNow={barbers.filter((b) => b.location === l.slug && b.workingNow).map((b) => b.name)}
              />
            ))}
          </div>
        </section>

        {/* Staff */}
        <section id="staff" className="scroll-mt-16 border-y border-line bg-paper-2">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <SectionHeading eyebrow="The team" title="Barbers">
              Every barber runs their own chair. Find your barber and book with them directly.
            </SectionHeading>
            <StaffGrid barbers={barbers} locations={locations} />
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading eyebrow="Word of mouth" title="Reviews">
            {liveReviews.length === 0 && "Been in the chair? Tell people how it went."}
          </SectionHeading>
          {liveReviews.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-3">
              {liveReviews.map((r, i) => (
                <li key={i} className="flex flex-col rounded-2xl border border-line p-6">
                  <Stars rating={r.rating} />
                  <blockquote className="mt-4 flex-1 text-ink-2">&ldquo;{r.body}&rdquo;</blockquote>
                  <p className="mt-6 text-sm font-semibold">{r.author}</p>
                  <p className="text-xs uppercase tracking-wider text-muted">{locationName(r.location)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className={`flex flex-wrap gap-3 ${liveReviews.length > 0 ? "mt-8" : ""}`}>
            {locations.flatMap((l) => [
              <a
                key={`${l.slug}-google`}
                href={mapsUrl(l)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper"
              >
                Review {l.name} on Google
              </a>,
              l.yelpReviewUrl && (
                <a
                  key={`${l.slug}-yelp`}
                  href={l.yelpReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-paper"
                >
                  Review {l.name} on Yelp
                </a>
              ),
            ])}
          </div>
        </section>

        {/* Account CTA */}
        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold uppercase tracking-wide">One account, your chair</h2>
              <p className="mt-2 text-paper/70">
                Clients book and track their cuts. Barbers manage their own chair.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="rounded-full border border-paper/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition hover:border-paper"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-paper px-6 py-3 text-sm font-semibold uppercase tracking-wider text-ink transition hover:bg-paper-2"
              >
                Sign up
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="social" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <Wordmark />
          {locations.map((l) => (
            <div key={l.slug} className="text-sm">
              <p className="font-semibold uppercase tracking-wider">{l.name}</p>
              <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink">
                {fullAddress(l)}
              </a>
              {l.instagram && (
                <a
                  href={`https://www.instagram.com/${l.instagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-fit rounded-full border border-ink px-4 py-2 font-semibold transition hover:bg-ink hover:text-paper"
                >
                  Instagram @{l.instagram}
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted sm:px-6">
            © {brand.name}. Site by ProlificX.
          </p>
        </div>
      </footer>
    </>
  );
}
