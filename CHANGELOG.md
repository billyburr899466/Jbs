# JB’s app releases

## 2.5.0 — October 28, 2026

- Added an owner-only photo reconstruction workflow with original JPG/PNG uploads, private cloud scan records, progress, pause/resume, retry, cancellation, and deletion.
- Added a NodeODM processing adapter and a real WebGL GLB viewer with orbit, zoom, wireframe, orientation, download, and local reopen. Reconstruction output is kept separate from the illustrative construction concept.
- Preserved existing local projects and customer functionality. Added owner authorization on every scan API, row-level isolation, private signed storage URLs, job leases, and bounded model validation.
- **Automatic photo-to-3D processing is waiting for a processor connection.** The UI clearly shows this and disables scan creation. Opening an existing GLB works now. No compute service or paid credits were provisioned.

Validation: 35 Node tests, production build, existing customer/owner browser checks, reconstruction browser flows on mobile and desktop, live private storage round-trip and RLS checks with disposable test data. Actual house photogrammetry remains pending a real processor and representative photos. See `docs/XRAY_RECONSTRUCTION.md`.

## 2.4.1 — October 28, 2026

- X-Ray House is an owner-only development workspace, opened from the owner’s Customer workspace panel.
- Removed customer/demo/sign-in entry points and public website promotion.
- Server verifies the signed-in account with Supabase before delivering the lab; anonymous users and customer accounts cannot obtain it.
- Model assets moved out of public hosting. Responses are private and uncached. Saved projects and backups keep their existing format and browser storage key.

Validation: 23 Node tests, production compilation, mobile/desktop X-Ray flows, owner return navigation, customer/guest denial, and all existing customer/owner browser workflows.

## 2.4.0 — October 28, 2026

- Scan My Project and X-Ray House, reachable from the sign-in screen, Tools, Explore, and the public website.
- Photo references, measured shell proportions, layer presets, orbit/zoom, and labeled PNG export.
- Local save/reopen, validated JSON backup/restore, explicit saved-project deletion, and unsaved-change protection.
- Fixed the customer app startup syntax error, invalid floor SVG, partial-measurement roof pitch, partial photo batches, and silent project eviction at the storage limit.
- Quote-response API returns clear errors for malformed payloads and service outages.
- Existing customer accounts, records, messaging, and database schema are retained. X-Ray projects remain local to the browser.

Validation: 18 Node tests; production build; mobile and desktop browser workflows, including X-Ray backup/restore and app navigation; mocked customer/owner workflows; unauthenticated API rejection. See `docs/XRAY_RELEASE_QA.md`.

## 2.3.0 — September 14, 2026

An overall workspace refresh built on the September 11 release.

- Consistent owner and customer styling, a desktop customer sidebar, and corrected mobile navigation.
- Dashboard next steps, visual planning cards, and saved design thumbnails.
- Search and filter projects, quotes, plans, and quote requests.
- Message drafts remain available during navigation. Failed sends retain the draft for retry.
- Customer information refreshes preserve active forms, with clearer refresh and save errors.
- Owner customer tools organized into timeline, schedule, photos, changes, and customer input. Schedule-note updates preserve unedited dates.
- Clearer deck view controls and visible mobile planning costs; named paint swatches.
- Consistent version labels, a “What’s new” screen, update checks, and offline status.
- Existing records, permissions, signatures, calculations, and quote handoff remain in place. No database migrations.

Validation: production compilation; geometry and filtering tests; mobile (390 px) and desktop (1365 px) browser flows; simulated customer saves and message failures; owner preview/session preservation and scheduled-date regression; unauthenticated quote-response rejection. Browser writes use mocked requests and do not contact real customers.

Rollback: the `checkpoint-2.2.0-20260914` tag preserves the previous source. The previous production deployment is `dpl_DUvH8S19L4wRx9BnadHjhmHzSKKT`.
