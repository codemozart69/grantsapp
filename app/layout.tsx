import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@/styles/globals.css";
import { Button } from "@/components/ui/button";
import ConvexClientProvider from '@/components/convex-client-provider'

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
  title: "GrantsApp",
  description: "Grants management infrastructure for ecosystems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
              <span className="text-sm font-semibold tracking-tight">
                GrantsApp
              </span>
              <div className="flex items-center gap-2">
                <Show when="signed-out">
                  <SignInButton forceRedirectUrl="/onboarding">
                    <Button
                      variant="outline"
                      type="button"
                      className="h-8 cursor-pointer px-3 text-xs"
                    >
                      Sign in
                    </Button>
                  </SignInButton>

                  <SignUpButton forceRedirectUrl="/onboarding">
                    <Button
                      variant="default"
                      type="button"
                      className="h-8 cursor-pointer px-3 text-xs"
                    >
                      Sign up
                    </Button>
                  </SignUpButton>
                </Show>

                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </header>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}