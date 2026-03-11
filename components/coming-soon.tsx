import { IconBuilding } from "@tabler/icons-react";

export function ComingSoonPage({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
                <IconBuilding
                    size={22}
                    stroke={1.5}
                    className="text-muted-foreground"
                />
            </div>
            <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1.5 max-w-sm text-sm leading-relaxed">
                    {description}
                </p>
            </div>
            <div className="bg-muted/50 border-border mt-2 rounded-lg border px-4 py-2">
                <span className="text-muted-foreground text-xs">Coming next sprint</span>
            </div>
        </div>
    );
}