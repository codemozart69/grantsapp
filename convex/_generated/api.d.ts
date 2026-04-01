/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as applications from "../applications.js";
import type * as comments from "../comments.js";
import type * as discover from "../discover.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_slugs from "../lib/slugs.js";
import type * as milestones from "../milestones.js";
import type * as notifications from "../notifications.js";
import type * as organizationMembers from "../organizationMembers.js";
import type * as organizations from "../organizations.js";
import type * as profiles from "../profiles.js";
import type * as programs from "../programs.js";
import type * as projects from "../projects.js";
import type * as reviews from "../reviews.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  applications: typeof applications;
  comments: typeof comments;
  discover: typeof discover;
  "lib/auth": typeof lib_auth;
  "lib/slugs": typeof lib_slugs;
  milestones: typeof milestones;
  notifications: typeof notifications;
  organizationMembers: typeof organizationMembers;
  organizations: typeof organizations;
  profiles: typeof profiles;
  programs: typeof programs;
  projects: typeof projects;
  reviews: typeof reviews;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
