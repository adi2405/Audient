import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";
import Background from "@/components/custom/background";
import Navbar from "@/components/custom/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Audient",
  description: "Real-Time AI Customer Support Platform",
  icons: {
    icon: "/images/logo-metadata.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased relative min-h-screen`}
        >
          <Background />
          <Navbar />
          <main className="relative z-10">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
