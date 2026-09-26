# WealthOS in StayFlat Implementation Plan

**Goal:** Serve the existing WealthOS app at `/wealth`, using StayFlat sign-in and restricting access to its verified admin.
**Architecture:** Reuse the host Clerk session. Render WealthOS as an isolated client workspace after a server-side owner check. Preserve current local-first storage, with keys scoped to the signed-in user; import/export remains the path for moving data from the old domain.
**Spec:** Existing WealthOS app in `/Users/vivanshigli/Desktop/WealthOS/app` and user's request to put it inside StayFlat.xyz.

- [x] Copy the existing wealth calculation and UI modules into `src/lib/wealth` and `src/components/wealth`. Copy only required accessible UI controls, preserving imports and behavior.
- [x] Scope the compiled WealthOS CSS to `body:has(.wealth-root)` to protect the marketing site and trading journal, including portal dialogs.
- [x] Add `src/app/wealth/page.tsx` with sign-in redirection and verified admin email authorization. Add `/wealth` to protected routes, and add an admin-only account-menu link.
- [x] Replace standalone Convex sign-in messaging with StayFlat account context. Scope localStorage to the authenticated user. Do not copy example history into real data or imply cloud sync.
- [x] Test owner/outsider/signed-out access, core financial arithmetic, route build, styles at desktop/mobile sizes and existing tests. Remove temporary browser fixtures before deployment.
- [ ] Deploy the tested application to the existing Vercel project, verify `/wealth` requires sign-in and the home page still loads.

## Constraints
Do not overwrite the pre-existing modified journal/Convex files. No Convex schema deployment is needed for this integration. Preserve the app's local-storage limitations, exports and clearly labeled demo mode. Do not create a second login system.
