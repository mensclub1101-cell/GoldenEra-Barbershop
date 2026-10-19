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
  hours: string | null;
  photo: string | null;
};

export type Barber = {
  name: string;
  location: string; // Location slug
  specialty: string | null;
  phone: string | null;
  bookingUrl: string | null; // Each booth-rent barber's own booking page
  instagram?: string | null; // Handle without the @
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
    phone: null,
    hours: null,
    photo: "/shop-pigeon-pass.jpg",
  },
  {
    slug: "moreno-beach",
    name: "Moreno Beach",
    street: "14435 Moreno Beach Dr #105",
    city: "Moreno Valley",
    region: "CA",
    postalCode: "92555",
    phone: null,
    hours: null,
    photo: "/shop-moreno-beach.jpg",
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

export const reviews: Review[] = [
  {
    author: "Sample review",
    body: "Placeholder text. Replace with a real Google or Yelp review the owner approves.",
    rating: 5,
    location: "pigeon-pass",
    sample: true,
  },
  {
    author: "Sample review",
    body: "Placeholder text. Replace with a real Google or Yelp review the owner approves.",
    rating: 5,
    location: "moreno-beach",
    sample: true,
  },
  {
    author: "Sample review",
    body: "Placeholder text. Replace with a real Google or Yelp review the owner approves.",
    rating: 5,
    location: "pigeon-pass",
    sample: true,
  },
];

export function fullAddress(l: Location) {
  return `${l.street}, ${l.city}, ${l.region} ${l.postalCode}`;
}

export function mapsUrl(l: Location) {
  const q = encodeURIComponent(`${brand.name}, ${fullAddress(l)}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function locationName(slug: string) {
  return locations.find((l) => l.slug === slug)?.name ?? slug;
}
