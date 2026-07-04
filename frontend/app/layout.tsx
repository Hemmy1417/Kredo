import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LiveBackdrop } from "@/components/LiveBackdrop";

// Font for body text and UI (Switzer alternative per brand guidelines)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Font for titles (Lineca alternative per brand guidelines)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KREDO — Borrow on your reputation",
  description:
    "Undercollateralized lending on GenLayer. Link your real-world identity to an on-chain reputation score; better standing unlocks less collateral and lower rates — automatically, trustlessly.",
  openGraph: {
    title: "KREDO — Borrow on your reputation",
    description:
      "Link your real-world identity to an on-chain reputation score. Better standing, better terms. Powered by GenLayer validators.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#9B6AF6", // GenLayer brand purple
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <LiveBackdrop />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}