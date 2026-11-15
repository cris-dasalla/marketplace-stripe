import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Marketplace", template: "%s · Marketplace" },
  description: "Buy and sell locally: browse listings by category, search, and message sellers.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
          Marketplace · Built with React 19, Next.js, Supabase and Tailwind CSS
        </footer>
      </body>
    </html>
  );
}
