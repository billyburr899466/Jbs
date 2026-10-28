# JB’s X-Ray House owner-workspace verification

Date: October 28, 2026. App version: 2.4.1. Supersedes the initial public entry points in PR #4.

## Access and development

X-Ray House is available from the owner app’s Customer workspace panel as **X-Ray House · In development**. Customer Tools, Explore, the guest/demo entry screen, website navigation, and the website sitemap no longer promote it.

The old `/scan-my-project.html` address now contains only an owner sign-in gate. `/api/owner/xray` verifies the bearer token through Supabase Auth and checks the verified owner email before returning the workspace. Customer accounts receive 403; absent or invalid sessions receive 401. Service failures fail closed. Responses use `private, no-store`, vary by Authorization, and are excluded from search indexing. The model’s HTML and JavaScript are server assets, not public files. The deployment trace includes all three workspace files.

The same app origin, `jbs-xray-projects-v1` key, and schema version 1 preserve saved work. Photos, measurements, and notes remain local to the browser; Backup/Restore preserves or transfers them. No database migration or customer-record changes were made.

## Verified

- 23 Node regression checks, including owner/customer/guest authorization and invalid-session/service-failure cases.
- Production compilation and complete automated browser suite.
- X-Ray at 390 px and 1365 px: model presets, layers, rotation, zoom, partial/flat roofs, measurements, camera-file decoding fallback, photo batch failures, photo limits, save/reopen/reload, backup/restore, invalid imports, unsaved-change guards, deletion, and PNG export.
- Owner workspace entry and return preserve the existing account session.
- Customer Tools and Explore contain no X-Ray entry; direct customer and guest access cannot render the house model.
- Existing deck, paint, quote, messaging, project, and owner scheduling workflows pass with isolated mocked services.
- Anonymous live-server API calls are denied, removed public model URLs return 404, and the private files are present in the server deployment trace.
- Website: 17 existing checks, 25 sitemap pages, correct garage before-and-after hero and gallery, no public X-Ray page or links.

## Verification limits

Authenticated workflows use isolated mocks. Live owner sign-in, real customer writes, payment settlement, physical Samsung/iPhone hardware, and native camera permissions were not exercised. The model is illustrative and does not locate hidden structural members or utilities.

## Rollback

Previous app deployment: `dpl_6Jo2oyjNHixerHPESjZAWYZKnqcY`, commit `4f9ea3de05af6799c88d043a8eb7d4fc6a140707`. Previous website source: `32ccb97efd93685ddb0f33e188bbf228ddd3b89d`, Site version 40. Restoring those old versions would restore the public X-Ray entry points; use a targeted revert when keeping owner-only access is required.
