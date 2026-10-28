import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { SCAN_LIMITS } from './xray-formats.js';

export const SCAN_BUCKET = 'owner-xray-scans';
export class ScanError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const storagePath = (job, index) => `${job.owner_id}/${job.id}/${String(index).padStart(4, '0')}.${job.photos[index].type === 'image/png' ? 'png' : 'jpg'}`;

export async function boundedBytes(response, maximum) {
  if (Number(response.headers.get('content-length')) > maximum) { await response.body?.cancel(); throw new ScanError('The result is too large for the mobile viewer. Use a smaller scan or lower mesh quality.', 413); }
  const reader = response.body?.getReader();
  if (!reader) throw new ScanError('The processing server returned an empty file.', 502);
  const parts = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > maximum) { await reader.cancel(); throw new ScanError('The file exceeds the scan size limit.', 413); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts, size);
}

export function createScanServices(env = process.env, network = fetch) {
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const storageReady = Boolean(key && env.SUPABASE_URL === 'https://bjmdtxxlzzhxskxkllvt.supabase.co');
  const db = storageReady ? createClient(env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: network } }) : null;
  let base;
  try {
    base = new URL(env.XRAY_NODEODM_URL);
    const local = env.NODE_ENV !== 'production' && base.protocol === 'http:' && ['127.0.0.1','localhost'].includes(base.hostname);
    if ((!local && base.protocol !== 'https:') || base.username || base.password || base.search || base.hash) base = null;
  } catch { base = null; }
  const configured = Boolean(storageReady && base && env.XRAY_NODEODM_TOKEN);
  const fingerprint = base ? createHash('sha256').update(base.href + (env.XRAY_CONNECTION_ID || '')).digest('hex') : null;
  const check = result => {
    if (result.error) {
      if (result.error.code === '23505') throw new ScanError('Finish or cancel your active scan before starting another.', 409);
      throw new ScanError('Private scan storage is temporarily unavailable. Please try again.', 503);
    }
    return result.data;
  };
  const requireDb = () => { if (!db) throw new ScanError('Private scan storage is not connected yet.', 503); return db; };
  const connections = {
    async get(owner) { return check(await requireDb().from('xray_processor_connections').select('token_encrypted,connected_at').eq('owner_id', owner).maybeSingle()); },
    async save(owner, token) { check(await requireDb().from('xray_processor_connections').upsert({ owner_id: owner, token_encrypted: token, connected_at: new Date().toISOString() }, { onConflict: 'owner_id' })); },
    async hasScans(owner) { return Boolean(check(await requireDb().from('xray_scans').select('id').eq('owner_id', owner).limit(1))?.length); },
  };
  const store = {
    async list(owner) { return check(await requireDb().from('xray_scans').select('*').eq('owner_id', owner).order('created_at', { ascending: false }).limit(40)); },
    async get(id, owner) { return check(await requireDb().from('xray_scans').select('*').eq('id', id).eq('owner_id', owner).maybeSingle()); },
    async insert(job) { return check(await requireDb().from('xray_scans').insert(job).select().single()); },
    async patch(job, changes) { return check(await requireDb().from('xray_scans').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', job.id).eq('owner_id', job.owner_id).select().single()); },
    async lock(job) {
      const now = new Date(); const lease = randomUUID();
      const row = check(await requireDb().from('xray_scans').update({ lease_id: lease, lease_until: new Date(now.getTime() + 90000).toISOString() }).eq('id', job.id).eq('owner_id', job.owner_id).or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`).select().maybeSingle());
      if (!row) throw new ScanError('This scan is handling another request. Try again in a moment.', 409);
      return row;
    },
    async unlock(job) { check(await requireDb().from('xray_scans').update({ lease_id: null, lease_until: null }).eq('id', job.id).eq('lease_id', job.lease_id)); },
    async uploaded(job) {
      const files = check(await requireDb().storage.from(SCAN_BUCKET).list(`${job.owner_id}/${job.id}`, { limit: 300 }));
      const names = new Set(files.filter(f => f.id).map(f => f.name));
      return job.photos.map((_, i) => names.has(storagePath(job, i).split('/').pop()) ? i : -1).filter(i => i >= 0);
    },
    async uploadUrl(job, index) { return check(await requireDb().storage.from(SCAN_BUCKET).createSignedUploadUrl(storagePath(job, index), { upsert: true })).signedUrl; },
    async photo(job, index) {
      const file = check(await requireDb().storage.from(SCAN_BUCKET).download(storagePath(job, index)));
      if (file.size > SCAN_LIMITS.photoBytes) throw new ScanError('A photo exceeds 25 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer()); const expected = job.photos[index];
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      if (bytes.length !== expected.size || createHash('sha256').update(bytes).digest('hex') !== expected.sha256 || !(expected.type === 'image/jpeg' ? jpeg : png)) throw new ScanError('A photo is missing or changed. Re-upload the original photo set.');
      return new Blob([bytes], { type: expected.type });
    },
    async saveModel(job, bytes) {
      const path = `${job.owner_id}/${job.id}/model.glb`;
      check(await requireDb().storage.from(SCAN_BUCKET).upload(path, bytes, { contentType: 'model/gltf-binary', upsert: true, cacheControl: '0' }));
      return path;
    },
    async modelUrl(job) { return check(await requireDb().storage.from(SCAN_BUCKET).createSignedUrl(job.model_path, 600)).signedUrl; },
    async delete(job) {
      const paths = job.photos.map((_, i) => storagePath(job, i));
      paths.push(`${job.owner_id}/${job.id}/model.glb`);
      check(await requireDb().storage.from(SCAN_BUCKET).remove(paths));
      check(await requireDb().from('xray_scans').delete().eq('id', job.id).eq('owner_id', job.owner_id));
    },
  };
  async function call(path, options = {}) {
    if (!configured) throw new ScanError('Photo reconstruction is waiting for a processing server to be connected.', 503);
    const url = new URL(base.href.replace(/\/$/, '') + path); url.searchParams.set('token', env.XRAY_NODEODM_TOKEN);
    let response;
    try { response = await network(url, { ...options, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(45000) }); }
    catch { throw new ScanError('The processing server did not respond. Your saved photos are safe; try again.', 502); }
    if (!response.ok) { await response.body?.cancel(); throw new ScanError('The processing server could not complete that request.', 502); }
    return response;
  }
  async function json(path, options) {
    const response = await call(path, options);
    let result; try { result = JSON.parse((await boundedBytes(response, 256 * 1024)).toString()); } catch { throw new ScanError('The processing server returned an invalid response.', 502); }
    if (result?.error && /invalid uuid|task.*not found/i.test(String(result.error))) throw new ScanError('The processing task no longer exists. Retry using the saved original photos.', 404);
    if (result?.error || result?.success === false) throw new ScanError('The processing server rejected the request. Check its connection and available capacity.', 502);
    return result;
  }
  const provider = {
    async check() {
      const options = await json('/options');
      if (!Array.isArray(options) || !options.some(o => o.name === 'gltf')) throw new ScanError('Connect a NodeODM processor that supports GLB output.', 503);
      return true;
    },
    async init(job) {
      const body = new FormData();
      body.set('name', `JBs ${job.id}`);
      body.set('options', JSON.stringify([{ name: 'gltf', value: true }, { name: 'skip-orthophoto', value: true }, { name: 'pc-quality', value: 'medium' }, { name: 'mesh-size', value: 100000 }, { name: 'feature-quality', value: 'high' }]));
      body.set('skipPostProcessing', 'true');
      // Both georeferenced and local GLBs can be returned by different ODM versions.
      body.set('outputs', JSON.stringify(['odm_texturing']));
      const result = await json('/task/new/init', { method: 'POST', body });
      if (!/^[0-9a-f-]{36}$/i.test(result.uuid || '')) throw new ScanError('The processor did not create a scan.', 502);
      return result.uuid;
    },
    async upload(job, index, photo) {
      const body = new FormData(); body.append('images', photo, storagePath(job, index).split('/').pop());
      await json(`/task/new/upload/${job.provider_task_id}`, { method: 'POST', body });
    },
    async commit(job) { return json(`/task/new/commit/${job.provider_task_id}`, { method: 'POST' }); },
    async info(job) { return json(`/task/${job.provider_task_id}/info`); },
    async cancel(job) { try { return await json('/task/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uuid: job.provider_task_id }) }); } catch (error) { if (error.status !== 404) throw error; return { success: true }; } },
    async remove(job) { try { return await json('/task/remove', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uuid: job.provider_task_id }) }); } catch (error) { if (error.status !== 404) throw error; return { success: true }; } },
    async archive(job) { return boundedBytes(await call(`/task/${job.provider_task_id}/download/all.zip`), 120 * 1024 * 1024); },
  };
  return { configured, storageReady, fingerprint, store, provider, connections };
}
