import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@/styles/globals.css";
import ConvexClientProvider from "@/components/convex-client-provider";
import { Web3Provider } from "@/components/web3-provider";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrantsApp — Grants infrastructure for ecosystems",
  description:
    "Create and manage grant programs. Apply for funding. Build your on-chain reputation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/*
          afterSignUpUrl → new users always hit onboarding first
          afterSignInUrl → returning users go to dashboard,
          but dashboard will redirect to onboarding if not complete
        */}
        <ClerkProvider
        // afterSignUpUrl="/onboarding"
        // afterSignInUrl="/dashboard"
        >
          <ConvexClientProvider>
            <Web3Provider>
              <SiteHeader />
              {children}
            </Web3Provider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}