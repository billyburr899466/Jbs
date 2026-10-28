# JB’s X-Ray House release verification

Date: October 28, 2026. App version: 2.4.0. Continuation of PR #4.

## Integration

The website at `https://jbsuniversalrenos.com/scan-my-project` explains the tool and opens the canonical customer-app workspace at `https://jbs-universal-renovations-app.vercel.app/scan-my-project.html`. Website navigation and the homepage app bar expose the feature. App sign-in, Tools, and Explore expose the same workspace. Returning to `/portal` keeps the existing account session.

Keeping a single origin avoids separate website/app local project stores. Photos, notes, and measurements stay in browser localStorage and are not uploaded or attached to customer accounts. Backup/Restore transfers a project between browsers or devices. Existing project schema version 1 and storage key are preserved.

## Verified

- `npm run verify`: 18 unit/regression tests, Next.js production compilation, complete automated browser suite.
- At 390 px and 1365 px: guest demo, navigation, deck step state and geometry, saved designs, quote handoff, paint photo masking and saved areas, message drafts, search and filters, horizontal overflow checks.
- Mocked authenticated customer: private plan identity, quote preview and identity, failed-message retry, owner UI hidden.
- Mocked owner: preview retains session, no preview writes, schedule-note drafts and original dates preserved.
- X-Ray: four presets, layer toggles, rotation, zoom, reveal, roof proportions, invalid dimensions, flat/partial roof inputs, photo upload and older-browser decode fallback, batch failure, 12-photo limit, save/reopen after reload, JSON backup and restore, invalid backup rejection, unsaved-change cancellation, deletion, PNG download, finite SVG coordinates, no live writes.
- Customer app Tools/Explore entry and return navigation preserve the customer session.
- Quote-response tests: missing auth, malformed/null input, cross-customer denial, server-calculated amounts, signature/consent requirements, change requests, service failure, and signed-response conflicts.
- Public website: production build and 17 existing regression checks, including all 26 sitemap pages, portfolio assets, galleries, estimate drafts, and analytics consent/privacy. Browser inspection confirmed new page layout, search, gallery navigation, full-screen photo viewer, and estimate anchor.
- Supabase project reports ACTIVE_HEALTHY. All 12 public tables have row-level security enabled; relevant customer/owner policies were inspected read-only. No schema migrations or customer-record changes.

## Verification limits

Authenticated browser writes use isolated mocked services so tests cannot send messages, quotes, or notifications to real customers. Live account authentication, real customer writes, payment settlement, native camera permissions, and physical Samsung Internet/iPhone hardware were not exercised. The browser image-decoding fallback was exercised explicitly. The X-Ray model is illustrative and cannot locate concealed structures or utilities.

## Rollback

Previous customer-app production: `dpl_GFbpTCGpbf3uaEt2NLe3hRj7ugMe`, main commit `23dfe9e88bfbe6fbd4d6621cc0db5175e3a76b81`. Previous website source: `da27905f0f351b5f6545c531c047af2565d4d36c`, Site version 39. Revert source or restore the corresponding deployment; local project data stays in the same schema.
