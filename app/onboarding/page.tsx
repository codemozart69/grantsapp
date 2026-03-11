"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
    IconCode,
    IconCheck,
    IconChevronRight,
    IconChevronLeft,
    IconBuilding,
} from "@tabler/icons-react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "builder" | "manager";
type Step = "role" | "profile" | "organization";

interface BuilderData {
    name: string;
    username: string;
    bio: string;
    skills: string[];
    github: string;
    twitter: string;
    website: string;
    walletAddress: string;
}

interface ManagerData {
    name: string;
    username: string;
    orgName: string;
    orgSlug: string;
    orgDescription: string;
    orgWebsite: string;
    orgTwitter: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUILDER_SKILLS = [
    "Frontend",
    "Backend",
    "Smart Contracts",
    "DeFi",
    "NFT",
    "DAO",
    "Research",
    "Design",
    "Content",
    "DevRel",
    "Protocol Dev",
    "Infrastructure",
    "Security",
    "Mobile",
];

function toSlug(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepDots({
    steps,
    current,
}: {
    steps: Step[];
    current: Step;
}) {
    const currentIndex = steps.indexOf(current);
    return (
        <div className="flex items-center justify-center gap-1.5">
            {steps.map((s, i) => (
                <div
                    key={s}
                    className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        i === currentIndex
                            ? "w-6 bg-primary"
                            : i < currentIndex
                                ? "w-6 bg-primary/30"
                                : "w-2 bg-border"
                    )}
                />
            ))}
        </div>
    );
}

function RoleCard({
    role,
    selected,
    onSelect,
    icon: Icon,
    title,
    description,
    features,
}: {
    role: Role;
    selected: boolean;
    onSelect: (role: Role) => void;
    icon: React.ElementType;
    title: string;
    description: string;
    features: string[];
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(role)}
            className={cn(
                "flex flex-col gap-4 rounded-xl border p-5 text-left transition-all duration-150 cursor-pointer w-full",
                selected
                    ? "border-primary bg-primary/4 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
        >
            {/* Icon */}
            <div
                className={cn(
                    "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                    selected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                )}
            >
                <Icon size={18} stroke={2} />
            </div>

            {/* Title + description */}
            <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {description}
                </div>
            </div>

            {/* Features */}
            <ul className="space-y-1.5">
                {features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                        <div
                            className={cn(
                                "flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors",
                                selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            )}
                        >
                            <IconCheck size={8} stroke={2.5} />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{f}</span>
                    </li>
                ))}
            </ul>
        </button>
    );
}

function SkillTag({
    label,
    selected,
    onToggle,
}: {
    label: string;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-100 cursor-pointer",
                selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
        >
            {label}
        </button>
    );
}

// ─── Step Content ─────────────────────────────────────────────────────────────

function RoleStep({
    role,
    onSelect,
}: {
    role: Role | null;
    onSelect: (role: Role) => void;
}) {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Welcome to GrantsApp</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                    How will you be using the platform? You can always explore both sides
                    later.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <RoleCard
                    role="builder"
                    selected={role === "builder"}
                    onSelect={onSelect}
                    icon={IconCode}
                    title="Builder"
                    description="Apply for grants and build your reputation in the ecosystem."
                    features={[
                        "Apply to grant programs",
                        "Build a funding history",
                        "Track milestones & deliverables",
                    ]}
                />
                <RoleCard
                    role="manager"
                    selected={role === "manager"}
                    onSelect={onSelect}
                    icon={IconBuilding}
                    title="Program Manager"
                    description="Create and operate grant programs for your ecosystem or DAO."
                    features={[
                        "Launch grant programs",
                        "Review applications",
                        "Manage funding & teams",
                    ]}
                />
            </div>
        </div>
    );
}

function BuilderProfileStep({
    data,
    onChange,
}: {
    data: BuilderData;
    onChange: (data: BuilderData) => void;
}) {
    const set = (field: keyof BuilderData, value: string | string[]) =>
        onChange({ ...data, [field]: value });

    const toggleSkill = (skill: string) => {
        const next = data.skills.includes(skill)
            ? data.skills.filter((s) => s !== skill)
            : [...data.skills, skill];
        set("skills", next);
    };

    const handleNameChange = (name: string) => {
        const auto = toSlug(name);
        onChange({ ...data, name, username: auto });
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Your Builder Profile</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                    This becomes your public identity on GrantsApp.
                </p>
            </div>

            <FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel>
                            Full Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            placeholder="Ada Lovelace"
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>
                            Username <span className="text-destructive">*</span>
                        </FieldLabel>
                        <div className="relative">
                            <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs">
                                @
                            </span>
                            <Input
                                className="pl-5"
                                placeholder="ada"
                                value={data.username}
                                onChange={(e) => set("username", toSlug(e.target.value))}
                            />
                        </div>
                    </Field>
                </div>

                <Field>
                    <FieldLabel>Bio</FieldLabel>
                    <Textarea
                        placeholder="Tell the ecosystem what you're building..."
                        value={data.bio}
                        onChange={(e) => set("bio", e.target.value)}
                        className="min-h-14 resize-none"
                    />
                </Field>

                <Field>
                    <FieldLabel>Skills</FieldLabel>
                    <FieldDescription>
                        Select skills to get matched with relevant programs.
                    </FieldDescription>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {BUILDER_SKILLS.map((skill) => (
                            <SkillTag
                                key={skill}
                                label={skill}
                                selected={data.skills.includes(skill)}
                                onToggle={() => toggleSkill(skill)}
                            />
                        ))}
                    </div>
                </Field>

                {/* Social links */}
                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel>GitHub</FieldLabel>
                        <div className="relative">
                            <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">
                                github.com/
                            </span>
                            <Input
                                className="pl-22"
                                placeholder="username"
                                value={data.github}
                                onChange={(e) => set("github", e.target.value)}
                            />
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel>Twitter / X</FieldLabel>
                        <div className="relative">
                            <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs">
                                @
                            </span>
                            <Input
                                className="pl-5"
                                placeholder="username"
                                value={data.twitter}
                                onChange={(e) => set("twitter", e.target.value)}
                            />
                        </div>
                    </Field>
                </div>

                <Field>
                    <FieldLabel>Wallet Address</FieldLabel>
                    <FieldDescription>
                        Optional — for receiving grant payments on FVM.
                    </FieldDescription>
                    <Input
                        className="font-mono text-[11px]"
                        placeholder="0x..."
                        value={data.walletAddress}
                        onChange={(e) => set("walletAddress", e.target.value)}
                    />
                </Field>
            </FieldGroup>
        </div>
    );
}

function ManagerProfileStep({
    data,
    onChange,
}: {
    data: ManagerData;
    onChange: (data: ManagerData) => void;
}) {
    const set = (field: keyof ManagerData, value: string) =>
        onChange({ ...data, [field]: value });

    const handleNameChange = (name: string) => {
        const auto = toSlug(name);
        onChange({ ...data, name, username: auto });
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Your Account</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                    First, let&apos;s set up your personal account details.
                </p>
            </div>

            <FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel>
                            Full Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            placeholder="Ada Lovelace"
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>
                            Username <span className="text-destructive">*</span>
                        </FieldLabel>
                        <div className="relative">
                            <span className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs">
                                @
                            </span>
                            <Input
                                className="pl-5"
                                placeholder="ada"
                                value={data.username}
                                onChange={(e) => set("username", toSlug(e.target.value))}
                            />
                        </div>
                    </Field>
                </div>
            </FieldGroup>
        </div>
    );
}

function OrgStep({
    data,
    onChange,
}: {
    data: ManagerData;
    onChange: (data: ManagerData) => void;
}) {
    const set = (field: keyof ManagerData, value: string) =>
        onChange({ ...data, [field]: value });

    const handleOrgNameChange = (name: string) => {
        const auto = toSlug(name);
        onChange({ ...data, orgName: name, orgSlug: auto });
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Your Organization</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                    This is the entity that will run grant programs on GrantsApp.
                </p>
            </div>

            <FieldGroup>
                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel>
                            Organization Name <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                            placeholder="Filecoin Foundation"
                            value={data.orgName}
                            onChange={(e) => handleOrgNameChange(e.target.value)}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>
                            Slug <span className="text-destructive">*</span>
                        </FieldLabel>
                        <FieldDescription>Used in your program URLs.</FieldDescription>
                        <Input
                            placeholder="filecoin-foundation"
                            value={data.orgSlug}
                            onChange={(e) => set("orgSlug", toSlug(e.target.value))}
                        />
                    </Field>
                </div>

                <Field>
                    <FieldLabel>
                        Description <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                        placeholder="Briefly describe your organization and what you fund..."
                        value={data.orgDescription}
                        onChange={(e) => set("orgDescription", e.target.value)}
                        className="min-h-16 resize-none"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                    <Field>
                        <FieldLabel>Website</FieldLabel>
                        <Input
                            placeholder="https://..."
                            value={data.orgWebsite}
                            onChange={(e) => set("orgWebsite", e.target.value)}
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
                                value={data.orgTwitter}
                                onChange={(e) => set("orgTwitter", e.target.value)}
                            />
                        </div>
                    </Field>
                </div>
            </FieldGroup>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const { user, isLoaded } = useUser();
    const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
    const router = useRouter();

    const currentUser = useQuery(
        api.users.getCurrentUser,
        !isAuthenticated ? "skip" : undefined
    );
    const createBuilder = useMutation(api.users.createBuilderProfile);
    const createManager = useMutation(api.users.createManagerProfile);

    const [role, setRole] = useState<Role | null>(null);
    const [step, setStep] = useState<Step>("role");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [builderData, setBuilderData] = useState<BuilderData>({
        name: "",
        username: "",
        bio: "",
        skills: [],
        github: "",
        twitter: "",
        website: "",
        walletAddress: "",
    });

    const [managerData, setManagerData] = useState<ManagerData>({
        name: "",
        username: "",
        orgName: "",
        orgSlug: "",
        orgDescription: "",
        orgWebsite: "",
        orgTwitter: "",
    });

    // Pre-fill from Clerk profile
    useEffect(() => {
        if (user && builderData.name === "" && managerData.name === "") {
            const name = user.fullName || "";
            const username = toSlug(name);
            queueMicrotask(() => {
                setBuilderData((prev) => ({ ...prev, name, username }));
                setManagerData((prev) => ({ ...prev, name, username }));
            });
        }
    }, [user, builderData.name, managerData.name]);

    // If already onboarded, go to dashboard
    useEffect(() => {
        if (currentUser?.onboardingComplete) {
            router.replace("/dashboard");
        }
    }, [currentUser, router]);

    if (currentUser === undefined) return <DashboardSkeleton />;

    if (currentUser === null) return null;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (!isLoaded || isAuthLoading) {
        return (
            <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Loading...
                </div>
            </div>
        );
    }

    if (!user) {
        router.replace("/");
        return null;
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
                <div className="text-sm font-medium text-destructive">
                    Database authentication failed. Please check your Clerk JWT template and environment variables.
                </div>
            </div>
        );
    }

    if (currentUser === undefined) {
        return (
             <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Loading profile...
                </div>
            </div>
        );
    }

    if (currentUser?.onboardingComplete) return null;

    // ── Step logic ────────────────────────────────────────────────────────────
    const getSteps = (): Step[] => {
        if (role === "builder") return ["role", "profile"];
        if (role === "manager") return ["role", "profile", "organization"];
        return ["role"];
    };

    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    const isLastStep = currentIndex === steps.length - 1 && role !== null;

    const canAdvance = (): boolean => {
        if (step === "role") return role !== null;
        if (step === "profile") {
            const d = role === "builder" ? builderData : managerData;
            return d.name.trim().length > 0 && d.username.trim().length >= 3;
        }
        if (step === "organization") {
            return (
                managerData.orgName.trim().length > 0 &&
                managerData.orgSlug.trim().length > 0 &&
                managerData.orgDescription.trim().length > 0
            );
        }
        return false;
    };

    const advance = async () => {
        if (!canAdvance()) return;

        if (isLastStep) {
            await handleSubmit();
            return;
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex < steps.length) {
            setStep(steps[nextIndex]);
        }
    };

    const goBack = () => {
        if (currentIndex > 0) setStep(steps[currentIndex - 1]);
    };

    const handleRoleSelect = (r: Role) => {
        setRole(r);
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);

        try {
            const email = user.primaryEmailAddress?.emailAddress || "";
            const avatar = user.imageUrl || undefined;

            if (role === "builder") {
                await createBuilder({
                    clerkId: user.id,
                    email,
                    name: builderData.name,
                    username: builderData.username,
                    avatar,
                    bio: builderData.bio || undefined,
                    skills: builderData.skills.length ? builderData.skills : undefined,
                    github: builderData.github || undefined,
                    twitter: builderData.twitter || undefined,
                    website: builderData.website || undefined,
                    walletAddress: builderData.walletAddress || undefined,
                });
            } else {
                await createManager({
                    clerkId: user.id,
                    email,
                    name: managerData.name,
                    username: managerData.username,
                    avatar,
                    orgName: managerData.orgName,
                    orgSlug: managerData.orgSlug,
                    orgDescription: managerData.orgDescription,
                    orgWebsite: managerData.orgWebsite || undefined,
                    orgLogo: undefined,
                    orgTwitter: managerData.orgTwitter || undefined,
                    orgGithub: undefined,
                });
            }

            router.replace("/dashboard");
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Something went wrong. Please try again."
            );
            setIsSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="relative flex min-h-[calc(100svh-3.5rem)] items-center justify-center p-6">
            {/* Subtle dot-grid background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, oklch(0.85 0.004 286.32) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            />
            <div className="dark:opacity-40 pointer-events-none absolute inset-0 hidden dark:block"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, oklch(0.32 0.005 286) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                }}
            />

            {/* Card */}
            <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-sm">
                <div className="p-7">
                    {/* Logo */}
                    <div className="mb-7 flex items-center justify-between">
                        <span className="text-sm font-bold tracking-tight">GrantsApp</span>
                        {role ? (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {role === "builder" ? "Builder" : "Program Manager"}
                            </span>
                        ) : null}
                    </div>

                    {/* Animated step content */}
                    <div
                        key={step}
                        className="animate-in fade-in-0 slide-in-from-right-3 duration-200"
                    >
                        {step === "role" ? (
                            <RoleStep role={role} onSelect={handleRoleSelect} />
                        ) : null}
                        {step === "profile" && role === "builder" ? (
                            <BuilderProfileStep data={builderData} onChange={setBuilderData} />
                        ) : null}
                        {step === "profile" && role === "manager" ? (
                            <ManagerProfileStep
                                data={managerData}
                                onChange={setManagerData}
                            />
                        ) : null}
                        {step === "organization" ? (
                            <OrgStep data={managerData} onChange={setManagerData} />
                        ) : null}
                    </div>

                    {/* Error */}
                    {error ? (
                        <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </div>
                    ) : null}

                    {/* Navigation */}
                    <div className="mt-6 flex items-center justify-between gap-2">
                        <div>
                            {step !== "role" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={goBack}
                                    disabled={isSubmitting}
                                    className="gap-1.5"
                                >
                                    <IconChevronLeft size={12} stroke={2.5} />
                                    Back
                                </Button>
                            )}
                        </div>

                        <Button
                            size="sm"
                            onClick={advance}
                            disabled={!canAdvance() || isSubmitting}
                            className="ml-auto gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                    Creating profile...
                                </>
                            ) : isLastStep ? (
                                "Complete setup"
                            ) : (
                                <>
                                    Continue
                                    <IconChevronRight size={12} stroke={2.5} />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Step indicator footer */}
                {role && (
                    <div className="border-t px-7 py-4">
                        <StepDots steps={steps} current={step} />
                    </div>
                )}
            </div>
        </div>
    );
}