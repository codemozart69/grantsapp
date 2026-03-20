"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    IconBell,
    IconCircleCheck,
    IconX,
    IconFileText,
    IconTarget,
    IconCheck,
    IconRefresh,
    IconAlertCircle,
} from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notifIcon(type: string): React.ElementType {
    if (type.includes("approved")) return IconCircleCheck;
    if (type.includes("rejected")) return IconX;
    if (type.includes("submitted")) return IconFileText;
    if (type.includes("milestone")) return IconTarget;
    if (type.includes("revision")) return IconRefresh;
    return IconAlertCircle;
}

function notifIconColor(type: string): string {
    if (type.includes("approved")) return "text-emerald-600 dark:text-emerald-400";
    if (type.includes("rejected")) return "text-destructive";
    if (type.includes("revision")) return "text-orange-600 dark:text-orange-400";
    if (type.includes("submitted")) return "text-blue-600 dark:text-blue-400";
    return "text-muted-foreground";
}

function notifHref(notif: any): string | null {
    if (notif.milestoneId) return `/dashboard/milestones/${String(notif.milestoneId)}`;
    if (notif.applicationId) return `/dashboard/applications/${String(notif.applicationId)}`;
    return null;
}

// ─── Single notification item ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotifItem({ notif, onRead }: { notif: any; onRead: (id: Id<"notifications">) => void }) {
    const Icon = notifIcon(notif.type);
    const color = notifIconColor(notif.type);
    const href = notifHref(notif);

    const inner = (
        <div
            className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 cursor-pointer",
                !notif.read && "bg-primary/3"
            )}
            onClick={() => !notif.read && onRead(notif._id)}
        >
            {/* Icon */}
            <div className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                !notif.read ? "bg-primary/10" : "bg-muted"
            )}>
                <Icon size={12} stroke={2} className={notif.read ? "text-muted-foreground" : color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className={cn("text-xs leading-relaxed", !notif.read && "font-medium")}>
                    {notif.message}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(notif.createdAt)}</div>
            </div>

            {/* Unread dot */}
            {!notif.read && (
                <div className="size-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
        </div>
    );

    if (href) return <Link href={href}>{inner}</Link>;
    return inner;
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

export function NotificationsPanel() {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useConvexAuth();
    const pathname = usePathname();

    // Close on route change
    useEffect(() => { setOpen(false); }, [pathname]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifications = useQuery(
        (api as any).notifications.getMyNotifications,
        !isAuthenticated ? "skip" : { limit: 30 }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = useQuery(
        (api as any).notifications.getUnreadCount,
        !isAuthenticated ? "skip" : undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markReadMutation = useMutation((api as any).notifications.markRead);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markAllReadMutation = useMutation((api as any).notifications.markAllRead);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    const handleMarkRead = async (id: Id<"notifications">) => {
        await markReadMutation({ notificationId: id });
    };

    const handleMarkAllRead = async () => {
        await markAllReadMutation({});
    };

    const count = unreadCount ?? 0;

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "relative flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted",
                    open && "bg-muted"
                )}
            >
                <IconBell size={15} stroke={2} className="text-muted-foreground" />
                {count > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                        {count > 9 ? "9+" : count}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl border bg-card shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="text-xs font-semibold">
                            Notifications
                            {count > 0 && (
                                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    {count} new
                                </span>
                            )}
                        </div>
                        {count > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                                <IconCheck size={11} stroke={2.5} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-80 overflow-y-auto divide-y">
                        {!notifications || notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10">
                                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                                    <IconBell size={16} stroke={1.5} className="text-muted-foreground" />
                                </div>
                                <div className="text-xs text-muted-foreground">No notifications yet</div>
                            </div>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            notifications.map((notif: any) => (
                                <NotifItem
                                    key={notif._id}
                                    notif={notif}
                                    onRead={handleMarkRead}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications && notifications.length > 0 && (
                        <div className="border-t px-4 py-2.5 bg-muted/20">
                            <p className="text-[10px] text-muted-foreground">
                                Showing last {notifications.length} notifications
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}