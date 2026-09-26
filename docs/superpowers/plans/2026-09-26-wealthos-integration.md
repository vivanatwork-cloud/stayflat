# WealthOS in StayFlat Implementation Plan

**Goal:** Serve the existing WealthOS app at `/wealth`, using StayFlat sign-in and restricting access to its verified admin.
**Architecture:** Reuse the host Clerk session. Render WealthOS as an isolated client workspace after a server-side owner check. Preserve current local-first storage, with keys scoped to the signed-in user; import/export remains the path for moving data from the old domain.
**Spec:** Existing WealthOS app in `/Users/vivanshigli/Desktop/WealthOS/app` and user's request to put it inside StayFlat.xyz.

- [x] Copy the existing wealth calculation and UI modules into `src/lib/wealth` and `src/components/wealth`. Copy only required accessible UI controls, preserving imports and behavior.
- [x] Scope the compiled WealthOS CSS to `body:has(.wealth-root)` to protect the marketing site and trading journal, including portal dialogs.
- [x] Add `src/app/wealth/page.tsx` with sign-in redirection and verified admin email authorization. Add `/wealth` to protected routes, and add an admin-only account-menu link.
- [x] Replace standalone Convex sign-in messaging with StayFlat account context. Scope localStorage to the authenticated user. Do not copy example history into real data or imply cloud sync.
- [x] Test owner/outsider/signed-out access, core financial arithmetic, route build, styles at desktop/mobile sizes and existing tests. Remove temporary browser fixtures before deployment.
- [x] Deploy the tested application to the existing Vercel project, verify `/wealth` requires sign-in and the home page still loads.

## Constraints
Do not overwrite the pre-existing modified journal/Convex files. No Convex schema deployment is needed for this integration. Preserve the app's local-storage limitations, exports and clearly labeled demo mode. Do not create a second login system.

## Validation and release
156 tests passed; production build passed. All 14 WealthOS screens, local saving/reload, CSV matching, undo, privacy and mobile navigation passed browser checks in a temporary local-only fixture that was removed before deployment. Signed-out production requests to `/wealth` redirect to StayFlat sign-in. Authenticated access is tested at the authorization-policy level; a real admin sign-in was not performed by the agent.

Live address: https://stayflat.xyz/wealth. Current production deployment: dpl_B5egCP71k65tGs9KingkxLNsPSiP. Existing uncommitted journal/Convex changes were compared to the previous live deployment and matched byte-for-byte; those files were not edited or committed in this task.

Financial records remain browser-local and keyed to the authenticated user. Existing records on the original WealthOS domain can be moved with Full backup / Restore backup. No cloud storage migration was performed.
