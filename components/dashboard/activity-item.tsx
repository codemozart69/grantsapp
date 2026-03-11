export function ActivityItem({
    icon: Icon,
    text,
    time,
    iconColor = "text-muted-foreground",
}: {
    icon: React.ElementType;
    text: string;
    time: string;
    iconColor?: string;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <div className="bg-muted mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md">
                <Icon size={12} stroke={2} className={iconColor} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs leading-relaxed">{text}</div>
                <div className="text-muted-foreground mt-0.5 text-[10px]">{time}</div>
            </div>
        </div>
    );
}
