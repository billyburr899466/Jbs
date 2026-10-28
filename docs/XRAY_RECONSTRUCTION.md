# Owner photo reconstruction — 2.5.1

The owner app has the capture, original-photo upload, job control, private storage, NodeODM adapter, and real GLB viewer. **WebODM Lightning at `https://spark1.webodm.net` is selected as the hosted processor. The owner must connect a WebODM account token before automatic reconstruction is enabled.** No provider account or paid credits were purchased. The app shows the connection form and disables starting a scan until an account is connected.

Existing GLB models can be opened, rotated, zoomed, inspected in wireframe, downloaded, and reopened from this device immediately. This is a real surface-model viewer. It does not add illustrative framing or utilities to a reconstructed model. The earlier measured concept remains available separately; its saved-project format and browser storage key are unchanged.

## Data path

1. The owner selects 12–240 distinct original JPG/PNG photos, up to 25 MB each and 2 GB per scan. Client SHA-256 checks reject duplicate images. Originals retain EXIF, camera metadata, and resolution.
2. Every app API operation verifies the owner with Supabase Auth. Jobs are scoped to that verified user. Customers and anonymous visitors are denied.
3. The API creates a private database job and short-lived signed upload URLs. The browser sends the original bytes directly to the private `owner-xray-scans` bucket, avoiding Vercel request-body limits.
4. The API downloads and verifies each original's byte count, file signature, and SHA-256. It sends one image per request through NodeODM's documented staged upload API. An expiring database lease prevents competing changes to the same job.
5. After all originals have transferred, one commit queues photogrammetry. Returning to the owner app resumes status checks. Upload/transfer stages still need the app open; Pause and Resume work between files.
6. A completed task's output archive is fetched server-side. Only a valid self-contained GLB is extracted, with a 48 MB model limit and a 120 MB archive limit. The app saves it privately and issues a ten-minute signed download URL. The browser parses the model locally with bundled Three.js.

`xray_scans` has RLS and an owner-only read policy. Browser roles cannot create or update rows. The storage bucket is private with no public access policy. Saved provider credentials are never returned to the browser. Model JSON cannot load external files. All authenticated app responses use `private, no-store`.

## Connect a processor

Open the owner app → Customer workspace → X-Ray House → **Connect reconstruction server**. Create or sign into a [WebODM Lightning account](https://webodm.net/), copy its API token, and paste it into the password field in the owner app. **Connect WebODM** verifies the token and GLB support without creating a processing job. The connection takes effect immediately. **Check connection** can recheck access later. Connecting does not purchase credits; review processing charges and retention in WebODM before submitting house photos.

The token is cleared from the field on submission and is never placed in localStorage, sessionStorage, public bundles, logs, or API responses. It travels only over authenticated HTTPS to JB's API and then to the fixed WebODM endpoint. The API uses AES-256-GCM with a random nonce and owner ID as authenticated additional data. Only ciphertext is saved in `xray_processor_connections`. That table has RLS, no browser grants and no browser policies; the security advisor's “RLS Enabled No Policy” information is intentional deny-by-default behavior. The server scopes all reads/writes to the verified owner. Another owner must connect their own account. Rejected tokens do not replace a working connection. Changing accounts is blocked while scans are saved, because their provider tasks belong to the original credentials; download and remove those scans first. Rechecking the same token is allowed.

Production has `XRAY_CONNECTION_ENCRYPTION_KEY` stored as a sensitive server-only Vercel variable and `XRAY_NODEODM_URL` set to the chosen server. The encryption key must be retained; rotating it requires decrypting and re-encrypting stored credentials, not simply replacing the variable. Preview environments do not receive this production key. Both scan migrations are applied to the existing JB's Supabase project.

An administrator can alternatively use a dedicated, authenticated **NodeODM-compatible processor with the `gltf` option** via the environment configuration below. A saved owner WebODM connection takes precedence. The app does not purchase credits or auto-retry paid processing.

Set these server-only variables in the existing Vercel project, then redeploy:

| Variable | Value |
| --- | --- |
| `XRAY_NODEODM_URL` | The processor's HTTPS API base URL; no credentials or token in the URL |
| `XRAY_NODEODM_TOKEN` | The processor's authentication token, stored as a secret |
| `XRAY_CONNECTION_ENCRYPTION_KEY` | 64 hex characters generated from 32 secure random bytes; required for the in-app WebODM connection form |
| `SUPABASE_URL` | Existing JB's Supabase project URL |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Existing server-only Supabase credential |

Do not put any secret in a `NEXT_PUBLIC_` variable, Git, or chat. The app checks `/options` for `gltf` before accepting a new scan. Processor URLs cannot be supplied by clients. The server rejects cleartext URLs in production and does not follow processor redirects.

For self-hosting, the upstream [NodeODM Docker instructions](https://github.com/OpenDroneMap/NodeODM#readme) describe its supported image, token authentication, and persistent `/var/www/data` volume. A localhost processor on a home computer is not directly reachable from Vercel: it needs an authenticated HTTPS endpoint. Size the machine for the photo sets and restrict processor concurrency. Configure cleanup of abandoned staged uploads as well as completed tasks. This repository does not start or purchase a server automatically.

A new Supabase installation needs both migrations in `supabase/migrations/` applied and `node --env-file=.env.local scripts/setup-scan-storage.mjs` run. The setup script creates only the dedicated private scan bucket.

## Recovery and deletion

- Original uploads can be resumed by reselecting the same photo set. Originals already present in private storage are skipped.
- Transfers to NodeODM resume at the last confirmed photo. If an acknowledgement is lost, the job becomes retryable; the app starts a fresh staging task rather than silently uploading a duplicate. Saved originals are reused.
- Processing is committed once. If a task has expired, its saved originals can be used for an explicit retry. Retrying a submitted task first removes the old provider task.
- Delete removes the saved job, its originals and model from JB's storage, and submitted provider tasks. **Uncommitted staging directories are governed by the processor's retention policy**, because NodeODM's task-removal API only covers committed tasks. Configure and verify that retention before using customer photos.
- Downloaded and locally imported models remain on the device. Browser data removal can delete the locally saved copy. Download GLB is the durable backup path.

## Verified and pending

Verified: 41 Node validation, authorization, encryption, owner-isolation and failure-recovery tests; complete browser workflows at 390 and 1365 pixels; rejected-token recovery and clearing; no token persistence in browser storage; real WebGL GLB display; orbit/zoom/wireframe; invalid model rejection; IndexedDB reopen; photo hashing; pause/resume; upload → processing → model flow against a mock NodeODM processor; production Next.js build; existing customer and owner regressions. The selected live WebODM `/info` and `/options` endpoints return 401 without a token. Production credential-table grants deny both anonymous and signed-in browser reads/writes.

Live Supabase verification used a disposable job: 12 signed uploads, exact-byte retrieval/transfer, job transitions and leases, private model upload and signed download, anonymous denial, and full cleanup. Owner and customer RLS visibility were tested in a rolled-back transaction. No test jobs or assets remain.

**Still required before claiming real house scanning is operational:** connect a real processor and run a representative overlapping house photo set through it. Inspect alignment, missing surfaces, textures, scale, and camera registration. The mocked fixture only tests the integration and viewer; it is not evidence of photogrammetric accuracy. Live owner sign-in and physical phone camera hardware were not exercised.

## Repeatable checks

`npm run verify` runs Node tests, builds the viewer and Next.js app, and runs the existing plus reconstruction browser workflows. It never starts real paid reconstruction. `JBS_ONLY_SCANS=1 JBS_CAPTURE_SCREENSHOTS=1 node tests/browser.mjs` runs just the reconstruction browser checks against an already built app.

`JBS_TEST_OWNER_ID=<owner UUID> node --env-file=.env.local scripts/verify-scan-storage.mjs` explicitly exercises real private Supabase storage using a disposable record. It mocks owner verification and the processor, and removes its test data afterward. It is intentionally excluded from deployment builds.

## Limits of the model

Photogrammetry reconstructs visible, overlapping surfaces. Exterior photos do not reveal rooms, hidden wiring, plumbing, framing, or unphotographed roof surfaces. Separate interior/exterior captures may produce separate coordinate systems. The model is not a measured survey; dimensions require known scale and independent verification. Sparse, reflective, blurred, or poorly overlapping photos can fail or leave holes.

## Rollback

Roll back the app deployment to 2.4.1 to remove the new entry controls. Leave the private bucket and additive scan table intact to preserve originals and results. Do not drop them as part of an app rollback.

## Primary references

- [NodeODM staged upload and task API](https://github.com/OpenDroneMap/NodeODM/blob/master/docs/index.adoc)
- [WebODM Lightning compatible API and server](https://webodm.net/api)
- [WebODM Lightning account registration](https://webodm.net/register)
- [ODM options, including GLB output](https://docs.opendronemap.org/arguments/)
- [Supabase signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader)
