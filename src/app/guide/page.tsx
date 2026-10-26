import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ShopTabs } from "@/components/owner/ShopTabs";

export const metadata: Metadata = {
  title: "How the app works | Golden Era Barbershop",
  description: "Step-by-step setup for Golden Era barbers and the shop owner.",
};

type Step = { title: string; body: React.ReactNode };

const addToHome: Step = {
  title: "Put it on your home screen",
  body: (
    <>
      <strong>iPhone:</strong> open the site in Safari, tap Share, then <em>Add to Home Screen</em>.{" "}
      <strong>Android:</strong> tap ⋮ in Chrome, then <em>Install app</em>. It opens like a normal app from then on.
    </>
  ),
};

const barberSteps: Step[] = [
  {
    title: "Open the invite link the owner texted you",
    body: "Enter your name, email and a password, then tap Create account. The link is only for you and works once.",
  },
  addToHome,
  {
    title: "Finish your card",
    body: (
      <>
        Tap <strong>☰</strong> at the top, then <em>Edit my card</em>. Add your phone, your booking link, your
        Instagram and the days and hours you work. The red dot goes away when it&rsquo;s done. Your card on the
        website and the walk-in list both use this.
      </>
    ),
  },
  {
    title: "Swipe through your pages",
    body: (
      <ul className="mt-2 space-y-1.5">
        <li>
          <strong>Widgets</strong> &mdash; the clock, when rent is due, walk-ins waiting, shop chat and your rent.
        </li>
        <li>
          <strong>Media</strong> &mdash; build a post for the shop&rsquo;s Instagram.
        </li>
        <li>
          <strong>Shop ops</strong> &mdash; mark supplies Full, Low or Out, and check off Wednesday cleaning.
        </li>
        <li>
          <strong>Booking</strong> &mdash; sign in to your booking app (Squire, Square, Booksy, Setmore) right
          there.
        </li>
        <li>
          <strong>Clients</strong> &mdash; your client list. Walk-ins you save land here, or add one by hand.
        </li>
        <li>
          <strong>Events</strong> &mdash; what the shop has coming up.
        </li>
      </ul>
    ),
  },
  {
    title: "Take a walk-in",
    body: "Clients check in from the website and pop up on your Widgets page. Tap Done when you finish, No-show if they left, or Save to client list to keep their number.",
  },
];

const ownerSteps: Step[] = [
  {
    title: "Open your owner invite link",
    body: "Enter your name, email and a password, then tap Create account. You land in the owner app.",
  },
  addToHome,
  {
    title: "Invite your barbers",
    body: (
      <>
        Swipe to <strong>Shop</strong>, pick a shop, tap <em>Invite</em> next to a barber, then copy the link and text
        it to them. Each link works once. Tap <em>New link</em> if one expires.
      </>
    ),
  },
  {
    title: "Set booth rent",
    body: (
      <>
        Swipe to <strong>Booth rent</strong>, tap <em>Edit</em> next to each barber and enter their weekly rent. Add
        charges for one barber or the whole shop, and mark them paid when the money comes in.
      </>
    ),
  },
  {
    title: "Run the shop from your phone",
    body: (
      <ul className="mt-2 space-y-1.5">
        <li>
          <strong>Widgets</strong> &mdash; shop chat with your barbers. Tap a shop to switch.
        </li>
        <li>
          <strong>Supplies</strong> &mdash; what barbers marked Low or Out. Tap Restocked when it comes in.
        </li>
        <li>
          <strong>Reviews</strong> &mdash; add real client reviews. They show on the website right away.
        </li>
        <li>
          <strong>Events</strong> &mdash; post events for one shop or both. Barbers see them in their app.
        </li>
        <li>
          <strong>Shop</strong> &mdash; add, hide or invite barbers, and set the shop&rsquo;s booking login.
        </li>
      </ul>
    ),
  },
];

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-3xl border border-line p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-paper">
            {i + 1}
          </span>
          <div className="min-w-0 text-ink-2">
            <h2 className="font-semibold text-ink">{s.title}</h2>
            <div className="mt-1 text-sm">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const forOwner = (await searchParams).for === "owner";
  const tabs = [
    { id: "barber", label: "Barbers", content: <Steps steps={barberSteps} /> },
    { id: "owner", label: "Owner", content: <Steps steps={ownerSteps} /> },
  ];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Staff app</p>
        <h1 className="mt-2 font-display text-4xl font-semibold uppercase tracking-wide sm:text-5xl">How it works</h1>
        <p className="mt-3 text-ink-2">Five minutes to set up. Pick who you are.</p>
        <div className="mt-8">
          <ShopTabs tabs={forOwner ? tabs.reverse() : tabs} />
        </div>
        <p className="mt-10 text-sm text-muted">
          Already set up?{" "}
          <Link href="/login" className="font-semibold text-ink underline">
            Log in
          </Link>
        </p>
      </main>
    </>
  );
}
