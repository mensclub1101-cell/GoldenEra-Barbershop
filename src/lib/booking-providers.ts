// Which booking system a barber uses, worked out from their booking link, and
// where that system's barber login lives. Login pages often refuse to load
// inside another site, so the Booking page always offers "Open my login" too.
export type BookingProvider = {
  name: string;
  loginUrl: string | null; // null: no web login (app only)
  appNote?: string;
};

const PROVIDERS: { match: RegExp; provider: BookingProvider }[] = [
  {
    match: /(^|\.)getsquire\.com$|(^|\.)getsqr\.co$/,
    provider: { name: "Squire", loginUrl: "https://app.getsquire.com/login" },
  },
  {
    match: /(^|\.)squareup\.com$|(^|\.)square\.site$/,
    provider: { name: "Square", loginUrl: "https://app.squareup.com/login" },
  },
  {
    match: /(^|\.)setmore\.com$/,
    provider: { name: "Setmore", loginUrl: "https://go.setmore.com/" },
  },
  {
    match: /(^|\.)booksy\.com$/,
    provider: { name: "Booksy", loginUrl: "https://biz.booksy.com/" },
  },
  {
    match: /(^|\.)thecut\.co$/,
    provider: {
      name: "theCut",
      loginUrl: null,
      appNote: "theCut runs your schedule in the theCut app on your phone, not on a website.",
    },
  },
];

export function bookingProvider(bookingUrl: string | null): BookingProvider | null {
  if (!bookingUrl) return null;
  let host: string;
  try {
    host = new URL(bookingUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PROVIDERS.find((p) => p.match.test(host))?.provider ?? null;
}
