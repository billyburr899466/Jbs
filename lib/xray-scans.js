import { randomUUID } from 'node:crypto';
import { unzipSync } from 'fflate';
import { verifyOwner, privateHeaders } from './owner-xray.js';
import { SCAN_LIMITS, inspectGlb, validateManifest } from './xray-formats.js';
import { ScanError } from './xray-services.js';
import { createConnectionManager, connectionAction } from './xray-connection.js';

const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const response = (value, status = 200) => Response.json(value, { status, headers: privateHeaders });
const publicJob = job => ({ id: job.id, name: job.name, status: job.status, photos: job.photos, forwarded: job.forwarded, progress: job.progress, error: job.error, hasModel: Boolean(job.model_path), createdAt: job.created_at });
const requireConfigured = services => { if (!services.configured) throw new ScanError('Photo reconstruction is waiting for a processing server to be connected.', 503); };
const sameProcessor = (job, services) => { requireConfigured(services); if (job.provider_fingerprint !== services.fingerprint) throw new ScanError('This scan belongs to the previous processing server. Reconnect it to continue.', 409); };

export function extractModel(archive) {
  let selected = false;
  let files;
  try {
    files = unzipSync(archive, { filter: entry => {
      if (!/\.glb$/i.test(entry.name) || selected) return false;
      if (entry.originalSize > SCAN_LIMITS.modelBytes) throw new ScanError('The model is larger than 48 MB. Reconstruct a smaller area.', 413);
      selected = true; return true;
    } });
  } catch (error) { if (error instanceof ScanError) throw error; throw new ScanError('The processor returned an invalid model archive.', 502); }
  const bytes = Object.values(files)[0];
  if (!bytes) throw new ScanError('The processor finished without a GLB model. Check photo overlap and the processing settings.', 422);
  try { inspectGlb(bytes); } catch (error) { throw new ScanError(error.message, 422); }
  return bytes;
}

async function readInput(request) {
  if (Number(request.headers.get('content-length')) > 100000) throw new ScanError('The scan request is too large.', 413);
  const text = await request.text();
  if (text.length > 100000) throw new ScanError('The scan request is too large.', 413);
  try { return JSON.parse(text || '{}'); } catch { throw new ScanError('The scan request is invalid.'); }
}

export async function scansResponse(request, segments = [], dependencies = {}) {
  const identity = await verifyOwner(request, dependencies.fetchUser || fetch);
  if (identity instanceof Response) return identity;
  const owner = identity.user.id;
  let lease, store;
  try {
    const connection = dependencies.connection || createConnectionManager();
    if (segments.length === 1 && segments[0] === 'processor') return response(await connectionAction(request, owner, connection));
    const services = dependencies.services || await connection.services(owner);
    store = services.store;
    const { provider } = services;
    const method = request.method;
    if (!segments.length && method === 'GET') {
      const scans = services.storageReady ? await store.list(owner) : [];
      return response({ configured: services.configured, limits: SCAN_LIMITS, scans: scans.map(publicJob) });
    }
    if (segments[0] === 'connection' && method === 'GET' && segments.length === 1) {
      requireConfigured(services); await provider.check(); return response({ ready: true });
    }
    if (!segments.length && method === 'POST') {
      requireConfigured(services);
      const input = await readInput(request); let manifest;
      try { manifest = validateManifest(input); } catch (error) { throw new ScanError(error.message); }
      if (!uuid(input.id)) throw new ScanError('The scan ID is invalid.');
      const previous = await store.get(input.id, owner);
      if (previous) {
        if (JSON.stringify(previous.photos) !== JSON.stringify(manifest.photos) || previous.name !== manifest.name) throw new ScanError('This scan ID is already in use.', 409);
        return response({ scan: publicJob(previous) });
      }
      await provider.check();
      const scan = await store.insert({ id: input.id, owner_id: owner, ...manifest, status: 'uploading', forwarded: 0, progress: 0 });
      return response({ scan: publicJob(scan) }, 201);
    }
    const [id, action] = segments;
    if (!uuid(id) || segments.length > 2) throw new ScanError('Scan not found.', 404);
    let job = await store.get(id, owner);
    if (!job) throw new ScanError('Scan not found.', 404);
    if (method === 'GET' && !action) {
      if (['queued','running'].includes(job.status)) {
        lease = await store.lock(job); job = lease;
        if (!['queued','running'].includes(job.status)) return response({ scan: publicJob(job), uploaded: [] });
        sameProcessor(job, services);
        let info;
        try { info = await provider.info(job); }
        catch (error) {
          if (error.status !== 404) throw error;
          job = await store.patch(job, { status: 'failed', error: 'The processing task expired or could not start. Retry reconstruction with the saved original photos.' });
          return response({ scan: publicJob(job), uploaded: [] });
        }
        const status = { 10: 'queued', 20: 'running', 30: 'failed', 40: 'completed', 50: 'canceled' }[info.status?.code];
        if (!status) throw new ScanError('The processor returned an unknown scan status.', 502);
        job = await store.patch(job, { status, progress: status === 'completed' ? 100 : Math.max(0, Math.min(99, Number(info.progress) || 0)), error: status === 'failed' ? 'Reconstruction failed. Check for sharp, overlapping photos of the same area, then retry.' : null });
      }
      return response({ scan: publicJob(job), uploaded: job.status === 'uploading' ? await store.uploaded(job) : [] });
    }
    if (!['POST','DELETE'].includes(method)) throw new ScanError('Method not allowed.', 405);
    // Each scan has one expiring database lease, shared by uploads, retries and deletion.
    lease = await store.lock(job); job = lease;
    const input = method === 'POST' ? await readInput(request) : {};
    if (method === 'DELETE' && !action) {
      if (job.provider_task_id && job.submitted) { sameProcessor(job, services); await provider.remove(job); }
      await store.delete(job); return response({ deleted: true });
    }
    if (action === 'upload' && method === 'POST') {
      if (job.status !== 'uploading') throw new ScanError('This scan is no longer accepting photos.', 409);
      if (!Number.isInteger(input.index) || !job.photos[input.index]) throw new ScanError('The photo index is invalid.');
      return response({ url: await store.uploadUrl(job, input.index) });
    }
    if (action === 'start' && method === 'POST') {
      requireConfigured(services);
      if (['sending','queued','running','completed'].includes(job.status)) return response({ scan: publicJob(job) });
      if ((await store.uploaded(job)).length !== job.photos.length) throw new ScanError('Upload all of the selected photos before reconstruction.', 409);
      await provider.check();
      if (job.provider_task_id && job.submitted) { sameProcessor(job, services); await provider.remove(job); }
      const task = await provider.init(job);
      job = await store.patch(job, { provider_task_id: task, provider_fingerprint: services.fingerprint, status: 'sending', submitted: false, forwarded: 0, inflight: null, error: null, progress: 0 });
      return response({ scan: publicJob(job) });
    }
    if (action === 'forward' && method === 'POST') {
      sameProcessor(job, services);
      if (job.status !== 'sending') throw new ScanError('This scan is not ready to send photos.', 409);
      if (job.inflight !== null && job.inflight !== undefined) {
        job = await store.patch(job, { status: 'failed', error: 'A photo transfer was interrupted. Retry reconstruction to use a fresh processing task. Your original photos are saved.' });
        return response({ scan: publicJob(job) }, 409);
      }
      if (job.forwarded === job.photos.length) return response({ scan: publicJob(job) });
      const index = job.forwarded;
      const photo = await store.photo(job, index);
      await store.patch(job, { inflight: index });
      try {
        await provider.upload(job, index, photo);
        job = await store.patch(job, { forwarded: index + 1, inflight: null });
      } catch {
        job = await store.patch(job, { status: 'failed', error: 'A photo transfer was interrupted. Retry reconstruction to use a fresh processing task. Your original photos are saved.' });
        return response({ scan: publicJob(job), error: job.error }, 502);
      }
      return response({ scan: publicJob(job) });
    }
    if (action === 'commit' && method === 'POST') {
      sameProcessor(job, services);
      if (['queued','running','completed'].includes(job.status)) return response({ scan: publicJob(job) });
      if (job.status !== 'sending' || job.forwarded !== job.photos.length || job.inflight !== null) throw new ScanError('All photos must finish transferring before processing starts.', 409);
      // A lost commit response must never create a second paid processing job.
      job = await store.patch(job, { status: 'queued', submitted: true, error: null });
      await provider.commit(job); return response({ scan: publicJob(job) });
    }
    if (action === 'cancel' && method === 'POST') {
      if (['queued','running'].includes(job.status)) { sameProcessor(job, services); await provider.cancel(job); }
      if (job.status === 'completed') throw new ScanError('This scan is complete. Use Delete scan to remove it.', 409);
      job = await store.patch(job, { status: 'canceled', inflight: null }); return response({ scan: publicJob(job) });
    }
    if (action === 'model' && method === 'POST') {
      if (job.status !== 'completed') throw new ScanError('The reconstructed model is not ready yet.', 409);
      if (!job.model_path) {
        sameProcessor(job, services);
        const bytes = extractModel(await provider.archive(job));
        const path = await store.saveModel(job, bytes);
        job = await store.patch(job, { model_path: path, model_bytes: bytes.length });
      }
      return response({ url: await store.modelUrl(job), bytes: job.model_bytes, scan: publicJob(job) });
    }
    throw new ScanError('Scan action not found.', 404);
  } catch (error) {
    return response({ error: error instanceof ScanError ? error.message : 'The scan request could not be completed. Please try again.' }, error instanceof ScanError ? error.status : 503);
  } finally {
    if (lease) await store.unlock(lease).catch(() => {});
  }
}
