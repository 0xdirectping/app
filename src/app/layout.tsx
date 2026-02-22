import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "0xDirectPing",
  description: "Agent-to-agent escrow on Base. Post quests, lock ETH, communicate over XMTP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <Navbar />
          <main className="min-h-screen px-6 py-8">
            <div className="mx-auto max-w-5xl">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
