import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { brand } from "@/lib/shop";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const oswald = Oswald({ variable: "--font-oswald", subsets: ["latin"] });

const title = `${brand.name} | ${brand.city}`;
const description = `${brand.tagline} Book with your barber at ${brand.name}.`;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await getSiteUrl()),
    title,
    description,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description,
      url: "/",
    },
    twitter: { card: "summary_large_image", title, description },
    appleWebApp: { capable: true, title: brand.wordmark, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
