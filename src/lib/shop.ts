import type { WeekSchedule } from "@/lib/schedule";

// Single source of truth for shop content shown on the public site.
// Anything marked `sample: true` is placeholder copy and must be replaced
// with real data before launch.

export type Location = {
  slug: string;
  name: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string | null;
  schedule: OpenHours[];
  photo: string | null;
  yelpReviewUrl: string | null;
  instagram: string | null;
};

// One line of a shop's weekly hours, in 24h time ("10:00"), with the full
// day names schema.org expects.
export type OpenHours = { label: string; days: string[]; open: string; close: string };

const MON_THU = ["Monday", "Tuesday", "Wednesday", "Thursday"];

export type Barber = {
  name: string;
  location: string; // Location slug
  specialty: string | null;
  phone: string | null;
  bookingUrl: string | null; // Each booth-rent barber's own booking page
  instagram?: string | null; // Handle without the @
  schedule?: WeekSchedule | null; // Their own weekly hours, from their card
  workingNow?: boolean; // Worked out per request on the home page
  sample?: boolean;
};

export type Review = {
  author: string;
  body: string;
  rating: 1 | 2 | 3 | 4 | 5;
  location: string; // Location slug
  sample?: boolean;
};

// Public address of the live site. Used for link previews and Google data.
// Fallback only: pages use the address each request came in on (lib/site-url.ts).
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const brand = {
  name: "Golden Era Barbershop",
  wordmark: "Golden Era",
  tagline: "Classic cuts. Clean fades. Two shops in Moreno Valley.",
  city: "Moreno Valley, CA",
};

export const locations: Location[] = [
  {
    slug: "pigeon-pass",
    name: "Pigeon Pass",
    street: "12220 Pigeon Pass Rd B",
    city: "Moreno Valley",
    region: "CA",
    postalCode: "92557",
    phone: "(951) 867-9418",
    schedule: [
      { label: "Sun", days: ["Sunday"], open: "10:00", close: "17:00" },
      { label: "Mon–Fri", days: [...MON_THU, "Friday"], open: "10:00", close: "19:00" },
      { label: "Sat", days: ["Saturday"], open: "10:00", close: "20:00" },
    ],
    photo: "/shop-pigeon-pass.jpg",
    yelpReviewUrl: "https://www.yelp.com/writeareview/biz/PZWGTEQbXm-pjliHd8y6CA",
    instagram: "goldenera_barbershop1",
  },
  {
    slug: "moreno-beach",
    name: "Moreno Beach",
    street: "14435 Moreno Beach Dr #105",
    city: "Moreno Valley",
    region: "CA",
    postalCode: "92555",
    phone: "(951) 208-1102",
    schedule: [
      { label: "Sun", days: ["Sunday"], open: "10:00", close: "16:00" },
      { label: "Mon–Thu", days: MON_THU, open: "10:00", close: "19:00" },
      { label: "Fri", days: ["Friday"], open: "10:00", close: "20:00" },
      { label: "Sat", days: ["Saturday"], open: "09:00", close: "20:00" },
    ],
    photo: "/shop-moreno-beach.jpg",
    yelpReviewUrl: "https://www.yelp.com/writeareview/biz/wmtDvccyvRZIPNNjRwpoVA",
    instagram: "goldenera_barbershop2",
  },
];

export const barbers: Barber[] = [
  {
    name: "Frio Fadez",
    location: "pigeon-pass",
    specialty: null,
    phone: "(323) 244-0211",
    bookingUrl: "https://book.thecut.co/FrioFadez",
  },
  {
    name: "Eshaud Gibson",
    location: "pigeon-pass",
    specialty: null,
    phone: "(951) 287-1258",
    bookingUrl: "https://book.thecut.co/Dro--Gibson-dgf052w",
  },
  {
    name: "Jonathan the Barber",
    location: "pigeon-pass",
    specialty: null,
    phone: "(951) 378-1206",
    bookingUrl: "https://jonathanthebarberr.booksy.com/a/",
  },
  {
    name: "Ramón Blendz",
    location: "pigeon-pass",
    specialty: null,
    phone: "(951) 705-3117",
    bookingUrl: "https://raymondbn1s.setmore.com/raymondreyes",
  },
  {
    name: "Norm Barber",
    location: "pigeon-pass",
    specialty: null,
    phone: "(323) 715-8982",
    bookingUrl: "https://book.thecut.co/AllHairNoGrease",
  },
  {
    name: "Jozey Barber",
    location: "pigeon-pass",
    specialty: null,
    phone: "(951) 419-7695",
    bookingUrl: "https://getsqr.co/jozey-the-barber-1",
  },
  {
    name: "HarleyStylez",
    location: "moreno-beach",
    specialty: null,
    phone: "(909) 653-3499",
    bookingUrl: "https://harleystylezcuts.setmore.com",
  },
  {
    name: "Joel Barber",
    location: "moreno-beach",
    specialty: null,
    phone: "(562) 619-7623",
    bookingUrl: "https://squareup.com/appointments/book/LEYATRK2XH1W1",
  },
  {
    name: "G Blendz",
    location: "moreno-beach",
    specialty: null,
    phone: "(909) 725-1741",
    bookingUrl: "https://book.thecut.co/g__blendz247",
  },
];

export function fullAddress(l: Location) {
  return `${l.street}, ${l.city}, ${l.region} ${l.postalCode}`;
}

export function mapsUrl(l: Location) {
  const q = encodeURIComponent(`${brand.name}, ${fullAddress(l)}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// "17:00" -> "5pm", "09:30" -> "9:30am"
export function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function locationName(slug: string) {
  return locations.find((l) => l.slug === slug)?.name ?? slug;
}
