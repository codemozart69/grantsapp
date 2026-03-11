"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
    IconHome,
    IconFileText,
    IconCode,
    IconTarget,
    IconCommand,
    IconUsers,
    IconChartLine,
    IconListSearch,
    IconGridDots,
    IconShield,
    IconChevronRight,
    IconCheck,
    IconDotsVertical,
} from "@tabler/icons-react";

// ─── Nav config ───────────────────────────────────────────────────────────────

const builderNav = [
    { label: "Overview", href: "/dashboard", icon: IconHome, exact: true },
    { label: "Applications", href: "/dashboard/applications", icon: IconFileText },
    { label: "Projects", href: "/dashboard/projects", icon: IconCode },
    { label: "Milestones", href: "/dashboard/milestones", icon: IconTarget },
];

const managerNav = [
    { label: "Overview", href: "/dashboard", icon: IconHome, exact: true },
    { label: "Programs", href: "/dashboard/programs", icon: IconCommand },
    { label: "Applications", href: "/dashboard/applications", icon: IconFileText },
    { label: "Analytics", href: "/dashboard/analytics", icon: IconChartLine },
    { label: "Team", href: "/dashboard/team", icon: IconUsers },
];

const exploreNav = [
    { label: "Browse Grants", href: "/grants", icon: IconListSearch },
    { label: "Explore Projects", href: "/projects", icon: IconGridDots },
];

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({
    href,
    icon: Icon,
    label,
    exact = false,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    exact?: boolean;
}) {
    const pathname = usePathname();
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-100",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon
                size={14}
                stroke={isActive ? 2.5 : 2}
                className={cn(
                    "shrink-0 transition-colors",
                    isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                )}
            />
            {label}
        </Link>
    );
}

// ─── Role Switcher Popover ────────────────────────────────────────────────────

function RoleSwitcherPopover({
    currentUser,
    onAddManagerRole,
}: {
    currentUser: {
        name: string;
        username: string;
        roles: string[];
        activeRole: string;
    };
    onAddManagerRole: () => void;
}) {
    const [open, setOpen] = useState(false);
    const switchRole = useMutation(api.users.switchActiveRole);
    const addBuilderRole = useMutation(api.users.addBuilderRole);

    const hasBothRoles =
        (currentUser.roles || []).includes("builder") &&
        (currentUser.roles || []).includes("manager");

    const isBuilder = currentUser.activeRole === "builder";
    const isManager = currentUser.activeRole === "manager";

    const handleSwitch = async (role: "builder" | "manager") => {
        if (role === currentUser.activeRole) { setOpen(false); return; }
        await switchRole({ role });
        setOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger row */}
            <div
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                onClick={() => setOpen((v) => !v)}
            >
                <UserButton />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium leading-tight">
                        {currentUser.name}
                    </div>
                    <div className="text-muted-foreground truncate text-[10px]">
                        {isBuilder ? "Builder" : "Program Manager"}
                    </div>
                </div>
                <IconDotsVertical
                    size={14}
                    stroke={2}
                    className="text-muted-foreground shrink-0"
                />
            </div>

            {/* Popover */}
            {open ? (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />
                    <div className="bg-popover ring-foreground/10 absolute bottom-full left-0 right-0 z-20 mb-1.5 overflow-hidden rounded-xl shadow-lg ring-1">
                        {/* Current identity */}
                        <div className="border-b px-3 py-2.5">
                            <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                                Active as
                            </div>
                            <div className="mt-1 text-xs font-medium">
                                {isBuilder ? "Builder" : "Program Manager"}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                                @{currentUser.username}
                            </div>
                        </div>

                        {/* Role options */}
                        <div className="p-1">
                            {hasBothRoles ? (
                                <>
                                    {/* Switch to Builder */}
                                    <button
                                        onClick={() => handleSwitch("builder")}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                                            isBuilder
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <IconCode className="size-3.5 shrink-0" />
                                        <span className="flex-1 text-left">Builder</span>
                                        {isBuilder ? (
                                            <IconCheck
                                                size={12}
                                                stroke={2.5}
                                                className="text-primary"
                                            />
                                        ) : null}
                                    </button>
                                    {/* Switch to Manager */}
                                    <button
                                        onClick={() => handleSwitch("manager")}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                                            isManager
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <IconShield className="size-3.5 shrink-0" />
                                        <span className="flex-1 text-left">Program Manager</span>
                                        {isManager ? (
                                            <IconCheck
                                                size={12}
                                                stroke={2.5}
                                                className="text-primary"
                                            />
                                        ) : null}
                                    </button>
                                </>
                            ) : isBuilder ? (
                                /* Builder without manager role — offer upgrade */
                                <button
                                    onClick={() => { setOpen(false); onAddManagerRole(); }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted"
                                >
                                    <div className="bg-primary/10 flex size-5 shrink-0 items-center justify-center rounded-md">
                                        <IconShield
                                            size={11}
                                            stroke={2}
                                            className="text-primary"
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">Become a Program Manager</div>
                                        <div className="text-muted-foreground text-[10px]">
                                            Create and run grant programs
                                        </div>
                                    </div>
                                    <IconChevronRight
                                        size={12}
                                        stroke={2}
                                        className="text-muted-foreground"
                                    />
                                </button>
                            ) : (
                                /* Manager without builder role — offer upgrade */
                                <button
                                    onClick={async () => {
                                        await addBuilderRole({});
                                        setOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-muted"
                                >
                                    <div className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-md">
                                        <IconCode
                                            size={11}
                                            stroke={2}
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="font-medium">Join as a Builder</div>
                                        <div className="text-muted-foreground text-[10px]">
                                            Apply for grants as a project
                                        </div>
                                    </div>
                                    <IconChevronRight
                                        size={12}
                                        stroke={2}
                                        className="text-muted-foreground"
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function DashboardSidebar({
    currentUser,
    onAddManagerRole,
}: {
    currentUser: {
        name: string;
        username: string;
        roles: string[];
        activeRole: string;
    };
    onAddManagerRole: () => void;
}) {
    const nav =
        currentUser.activeRole === "builder" ? builderNav : managerNav;

    return (
        <aside className="border-border bg-card flex w-[216px] shrink-0 flex-col border-r">
            {/* Brand */}
            <div className="border-border flex h-14 shrink-0 items-center border-b px-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="bg-primary/10 flex size-6 items-center justify-center rounded-md">
                        <div className="bg-primary size-2.5 rounded-sm" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">
                        GrantsApp
                    </span>
                </Link>
            </div>

            {/* Scrollable nav area */}
            <div className="flex flex-1 flex-col overflow-y-auto p-3">
                {/* Primary nav */}
                <nav className="flex flex-col gap-0.5">
                    {nav.map((item) => (
                        <NavItem key={item.href} {...item} />
                    ))}
                </nav>

                {/* Divider */}
                <div className="border-border my-3 border-t" />

                {/* Explore section */}
                <div className="mb-1 px-3">
                    <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Explore
                    </span>
                </div>
                <nav className="flex flex-col gap-0.5">
                    {exploreNav.map((item) => (
                        <NavItem key={item.href} {...item} />
                    ))}
                </nav>
            </div>

            {/* Footer — role switcher */}
            <div className="border-border shrink-0 border-t p-3">
                <RoleSwitcherPopover
                    currentUser={currentUser}
                    onAddManagerRole={onAddManagerRole}
                />
            </div>
        </aside>
    );
}
