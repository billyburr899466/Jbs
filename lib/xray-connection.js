import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createScanServices, ScanError, boundedBytes } from './xray-services.js';

export const WEBODM_SERVER = 'https://spark1.webodm.net';
const aad = owner => Buffer.from(`jbs-webodm-v1:${owner}`);
function encryptionKey(env) {
  const value = env.XRAY_CONNECTION_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new ScanError('Secure connection setup is temporarily unavailable. Please try again later.', 503);
  return Buffer.from(value, 'hex');
}
export function encryptProcessorToken(token, owner, env) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(env), nonce);
  cipher.setAAD(aad(owner));
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function decryptProcessorToken(value, owner, env) {
  try {
    const [version, nonce, tag, data, extra] = value.split('.');
    if (version !== 'v1' || extra !== undefined) throw Error();
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(env), Buffer.from(nonce, 'base64url'));
    decipher.setAAD(aad(owner)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch { throw new ScanError('The saved processing connection could not be opened. Contact JB’s app support.', 503); }
}

// The browser chooses only a credential. The destination is fixed server-side.
export function createConnectionManager(env = process.env, network = fetch, dependencies = {}) {
  const base = dependencies.base || createScanServices(env, network);
  const connections = dependencies.connections || base.connections;
  const factory = dependencies.factory || (settings => createScanServices(settings, network));
  const setupAvailable = Boolean(base.storageReady && /^[a-f0-9]{64}$/i.test(env.XRAY_CONNECTION_ENCRYPTION_KEY || ''));
  const settings = (owner, token) => ({ ...env, XRAY_NODEODM_URL: WEBODM_SERVER, XRAY_NODEODM_TOKEN: token, XRAY_CONNECTION_ID: createHash('sha256').update(`${owner}:${token}`).digest('hex') });
  const load = owner => setupAvailable ? connections.get(owner) : null;
  return {
    async status(owner) {
      const saved = await load(owner);
      return { provider: saved || !base.configured ? 'WebODM Lightning' : 'Configured processing server', server: saved || !base.configured ? WEBODM_SERVER : null, setupAvailable, connected: Boolean(saved || base.configured), savedConnection: Boolean(saved), connectedAt: saved?.connected_at || null };
    },
    async services(owner) {
      const saved = await load(owner);
      return saved ? factory(settings(owner, decryptProcessorToken(saved.token_encrypted, owner, env))) : base;
    },
    async connect(owner, input) {
      if (!setupAvailable) throw new ScanError('Secure connection setup is temporarily unavailable. Please try again later.', 503);
      const token = typeof input?.token === 'string' ? input.token.trim() : '';
      if (!/^[\x21-\x7e]{16,1024}$/.test(token) || token.includes('://')) throw new ScanError('Paste the API token from your WebODM Lightning dashboard. Do not enter your password or a website address.');
      const saved = await load(owner);
      const sameToken = saved && decryptProcessorToken(saved.token_encrypted, owner, env) === token;
      const ensureCanChange = async () => {
        if (!sameToken && await connections.hasScans(owner)) throw new ScanError('Keep your current processing account while scans are saved. Download and delete existing scans before changing accounts.', 409);
      };
      await ensureCanChange();
      try { await factory(settings(owner, token)).provider.check(); }
      catch { throw new ScanError('WebODM could not verify this token and its 3D output support. Check the API token in your WebODM dashboard and try again.', 422); }
      await ensureCanChange();
      await connections.save(owner, encryptProcessorToken(token, owner, env));
      return { connected: true, provider: 'WebODM Lightning', server: WEBODM_SERVER, setupAvailable: true, savedConnection: true };
    },
  };
}

export async function connectionAction(request, owner, manager = createConnectionManager()) {
  if (request.method === 'GET') return manager.status(owner);
  if (request.method !== 'POST') throw new ScanError('Connection action not found.', 404);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ScanError('Enter the API token using the connection form.');
  let input;
  const bytes = await boundedBytes(request, 4096);
  try { input = JSON.parse(bytes.toString()); } catch { throw new ScanError('The connection request is invalid.'); }
  return manager.connect(owner, input);
}
