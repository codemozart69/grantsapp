"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    IconX,
    IconShield,
    IconCheck,
} from "@tabler/icons-react";

function toSlug(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

interface AddManagerRoleModalProps {
    open: boolean;
    onClose: () => void;
}

export function AddManagerRoleModal({
    open,
    onClose,
}: AddManagerRoleModalProps) {
    const addManagerRole = useMutation(api.users.addManagerRole);

    const [orgName, setOrgName] = useState("");
    const [orgSlug, setOrgSlug] = useState("");
    const [orgDescription, setOrgDescription] = useState("");
    const [orgWebsite, setOrgWebsite] = useState("");
    const [orgTwitter, setOrgTwitter] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOrgNameChange = (name: string) => {
        setOrgName(name);
        setOrgSlug(toSlug(name));
    };

    const canSubmit =
        orgName.trim().length > 0 &&
        orgSlug.trim().length > 0 &&
        orgDescription.trim().length > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await addManagerRole({
                orgName: orgName.trim(),
                orgSlug: orgSlug.trim(),
                orgDescription: orgDescription.trim(),
                orgWebsite: orgWebsite.trim() || undefined,
                orgTwitter: orgTwitter.trim() || undefined,
            });
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
                <div className="bg-card ring-foreground/10 animate-in fade-in-0 zoom-in-95 rounded-2xl p-6 shadow-xl ring-1 duration-150">
                    {/* Header */}
                    <div className="mb-5 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <IconShield
                                    size={17}
                                    stroke={2}
                                    className="text-primary"
                                />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">
                                    Become a Program Manager
                                </h2>
                                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                    Set up your organization to create and run grant programs.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
                        >
                            <IconX size={16} stroke={2} />
                        </button>
                    </div>

                    {/* What you get */}
                    <div className="bg-muted/50 mb-5 rounded-xl p-3">
                        <div className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
                            What you&apos;ll unlock
                        </div>
                        <ul className="space-y-1.5">
                            {[
                                "Create and publish grant programs",
                                "Review and approve applications",
                                "Manage team members and reviewers",
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-2">
                                    <div className="bg-primary/10 flex size-3.5 shrink-0 items-center justify-center rounded-full">
                                        <IconCheck
                                            size={8}
                                            stroke={2.5}
                                            className="text-primary"
                                        />
                                    </div>
                                    <span className="text-xs">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Form */}
                    <FieldGroup>
                        <div className="grid grid-cols-2 gap-3">
                            <Field>
                                <FieldLabel>
                                    Organization Name <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    placeholder="Filecoin Foundation"
                                    value={orgName}
                                    onChange={(e) => handleOrgNameChange(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>
                                    Slug <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Input
                                    placeholder="filecoin-foundation"
                                    value={orgSlug}
                                    onChange={(e) => setOrgSlug(toSlug(e.target.value))}
                                />
                            </Field>
                        </div>

                        <Field>
                            <FieldLabel>
                                Description <span className="text-destructive">*</span>
                            </FieldLabel>
                            <Textarea
                                placeholder="Briefly describe your organization..."
                                value={orgDescription}
                                onChange={(e) => setOrgDescription(e.target.value)}
                                className="min-h-14 resize-none"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field>
                                <FieldLabel>Website</FieldLabel>
                                <Input
                                    placeholder="https://..."
                                    value={orgWebsite}
                                    onChange={(e) => setOrgWebsite(e.target.value)}
                                />
                            </Field>
                            <Field>
                                <FieldLabel>Twitter / X</FieldLabel>
                                <div className="relative">
                                    <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs">
                                        @
                                    </span>
                                    <Input
                                        className="pl-5"
                                        placeholder="handle"
                                        value={orgTwitter}
                                        onChange={(e) => setOrgTwitter(e.target.value)}
                                    />
                                </div>
                            </Field>
                        </div>
                    </FieldGroup>

                    {error ? (
                        <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-5 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-1.5">
                                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                    Setting up...
                                </span>
                            ) : (
                                "Create Organization"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}