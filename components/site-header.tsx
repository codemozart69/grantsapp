"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ClerkLoading,
    Show,
    SignInButton,
    SignUpButton,
    UserButton,
} from "@clerk/nextjs";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IconListSearch, IconGridDots, IconBuilding, IconUsers } from "@tabler/icons-react";

const navLinks = [
    { label: "Browse Grants", href: "/grants", icon: IconListSearch },
    { label: "Projects", href: "/projects", icon: IconGridDots },
    { label: "Orgs", href: "/orgs", icon: IconBuilding },
    { label: "Builders", href: "/builders", icon: IconUsers },
];

export function SiteHeader() {
    const pathname = usePathname();

    // Hide entirely on dashboard routes — dashboard has its own sidebar
    if (pathname.startsWith("/dashboard")) return null;

    return (
        <header className="border-border bg-background/80 sticky top-0 z-30 flex h-14 items-center border-b backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6">
                {/* Brand */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <div className="bg-primary/10 flex size-6 items-center justify-center rounded-md">
                        <div className="bg-primary size-2.5 rounded-sm" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">GrantsApp</span>
                </Link>

                {/* Nav links — hidden on small screens */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map(({ label, href }) => (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                pathname === href || pathname.startsWith(href)
                                    ? "bg-muted text-foreground"
                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-2">
                    {/* Subtle loading state while Clerk initializes */}
                    <ClerkLoading>
                        <div className="bg-muted h-7 w-20 animate-pulse rounded-md" />
                    </ClerkLoading>

                    <Show when="signed-out">
                        <SignInButton forceRedirectUrl="/dashboard">
                            <Button variant="outline" size="sm" className="cursor-pointer">
                                Sign in
                            </Button>
                        </SignInButton>
                        <SignUpButton forceRedirectUrl="/onboarding">
                            <Button size="sm" className="cursor-pointer">
                                Get started
                            </Button>
                        </SignUpButton>
                    </Show>

                    <Show when="signed-in">
                        <ConnectButton showBalance={false} chainStatus="icon" />
                        <Link href="/dashboard">
                            <Button variant="outline" size="sm" className="cursor-pointer">
                                Dashboard
                            </Button>
                        </Link>
                        <UserButton />
                    </Show>
                </div>
            </div>
        </header>
    );
}