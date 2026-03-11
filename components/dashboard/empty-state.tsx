import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    action?: { label: string; href: string };
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <div className="bg-muted flex size-10 items-center justify-center rounded-xl">
                <Icon size={18} stroke={1.5} className="text-muted-foreground" />
            </div>
            <div>
                <div className="text-sm font-medium">{title}</div>
                <div className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
                    {description}
                </div>
            </div>
            {action ? (
                <Link href={action.href}>
                    <Button size="sm" variant="outline" className="mt-1 gap-1.5">
                        <IconPlus size={12} stroke={2.5} />
                        {action.label}
                    </Button>
                </Link>
            ) : null}
        </div>
    );
}
