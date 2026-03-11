import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@tabler/icons-react";

export function StatCard({
    label,
    value,
    icon: Icon,
    description,
    href,
    accent = false,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    description: string;
    href?: string;
    accent?: boolean;
}) {
    const inner = (
        <div
            className={cn(
                "group flex flex-col gap-3 rounded-xl border p-5 transition-all duration-150",
                href ? "hover:border-primary/30 hover:bg-primary/2 cursor-pointer" : "",
                accent ? "border-primary/20 bg-primary/3" : "border-border bg-card"
            )}
        >
            <div className="flex items-start justify-between">
                <div className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                    <Icon size={16} stroke={2} />
                </div>
                {href ? (
                    <IconChevronRight
                        size={14}
                        stroke={2}
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                ) : null}
            </div>
            <div>
                <div className={cn(
                    "text-2xl font-semibold tracking-tight",
                    accent ? "text-primary" : "text-foreground"
                )}>
                    {value}
                </div>
                <div className="mt-0.5 text-xs font-medium">{label}</div>
                <div className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    {description}
                </div>
            </div>
        </div>
    );

    if (href) return <Link href={href}>{inner}</Link>;
    return inner;
}
