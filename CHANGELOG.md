# JB’s app releases

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
