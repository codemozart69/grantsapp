import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Converts a string into a URL-safe slug.
 */
export function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Checks whether a program slug is available within an org.
 * Programs are scoped to organizations so the same slug can exist
 * across different orgs, but must be unique within one.
 */
export async function isProgramSlugAvailable(
    ctx: QueryCtx | MutationCtx,
    slug: string,
    excludeId?: string
): Promise<boolean> {
    const existing = await ctx.db
        .query("programs")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .collect();

    return existing.every((p) => p._id === excludeId);
}

/**
 * Checks whether a project slug is globally unique.
 */
export async function isProjectSlugAvailable(
    ctx: QueryCtx | MutationCtx,
    slug: string,
    excludeId?: string
): Promise<boolean> {
    const existing = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .collect();

    return existing.every((p) => p._id === excludeId);
}

/**
 * Checks whether an org slug is globally unique.
 */
export async function isOrgSlugAvailable(
    ctx: QueryCtx | MutationCtx,
    slug: string,
    excludeId?: string
): Promise<boolean> {
    const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .collect();

    return existing.every((o) => o._id === excludeId);
}

/**
 * Appends a numeric suffix to a slug until it is unique,
 * e.g. "my-program" → "my-program-2" → "my-program-3"
 */
export async function uniqueProgramSlug(
    ctx: QueryCtx | MutationCtx,
    base: string
): Promise<string> {
    const available = await isProgramSlugAvailable(ctx, base);
    if (available) return base;

    let counter = 2;
    while (true) {
        const candidate = `${base}-${counter}`;
        if (await isProgramSlugAvailable(ctx, candidate)) return candidate;
        counter++;
    }
}

export async function uniqueProjectSlug(
    ctx: QueryCtx | MutationCtx,
    base: string
): Promise<string> {
    const available = await isProjectSlugAvailable(ctx, base);
    if (available) return base;

    let counter = 2;
    while (true) {
        const candidate = `${base}-${counter}`;
        if (await isProjectSlugAvailable(ctx, candidate)) return candidate;
        counter++;
    }
}