/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as exchangeRequests from "../exchangeRequests.js";
import type * as journalValidators from "../journalValidators.js";
import type * as journals from "../journals.js";
import type * as onboarding from "../onboarding.js";
import type * as onboardingValidators from "../onboardingValidators.js";
import type * as payments from "../payments.js";
import type * as reportValidators from "../reportValidators.js";
import type * as trades from "../trades.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  exchangeRequests: typeof exchangeRequests;
  journalValidators: typeof journalValidators;
  journals: typeof journals;
  onboarding: typeof onboarding;
  onboardingValidators: typeof onboardingValidators;
  payments: typeof payments;
  reportValidators: typeof reportValidators;
  trades: typeof trades;
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
