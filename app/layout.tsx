import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  applicationName: "Skylora",
  title: { default: "Skylora — Where campus talent gets discovered", template: "%s · Skylora" },
  description: "Discover, back, and battle the next generation of campus talent.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Skylora" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  // Allow zoom for accessibility; cap at a sane max to avoid layout breakage.
  maximumScale: 5,
  viewportFit: "cover", // use the full screen incl. safe areas
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dscreen">
        {/* Skip link — keyboard users land here first. */}
        <a
          href="#main"
          className="sr-only-focusable bg-brand text-brand-fg absolute top-3 left-3 z-50 rounded-md px-3 py-2"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
