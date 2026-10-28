import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnectionManager, decryptProcessorToken, encryptProcessorToken, WEBODM_SERVER } from '../lib/xray-connection.js';
import { scansResponse } from '../lib/xray-scans.js';
import { owner } from './scan-fixtures.mjs';

const env = { XRAY_CONNECTION_ENCRYPTION_KEY: 'ab'.repeat(32) };
const token = 'private-provider-token-for-tests';
function fixture() {
  const rows = new Map(), calls = [], flags = { scans: false, reject: false };
  const manager = createConnectionManager(env, undefined, {
    base: { storageReady: true, configured: false },
    connections: {
      get: async id => rows.get(id),
      save: async (id, value) => rows.set(id, { token_encrypted: value, connected_at: new Date().toISOString() }),
      hasScans: async () => flags.scans,
    },
    factory: settings => ({ configured: true, settings, provider: { check: async () => { calls.push(settings); if (flags.reject) throw Error('secret upstream message ' + token); } } }),
  });
  const request = async (method, body, actor = owner, auth = 'valid-token') => {
    const response = await scansResponse(new Request('https://example.test/api/owner/scans/processor', { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + auth } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }), ['processor'], { connection: manager, fetchUser: async () => Response.json(actor) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
  return { manager, rows, calls, flags, request };
}
test('processor credentials use authenticated encryption bound to the owner and encryption key', () => {
  const value = encryptProcessorToken(token, owner.id, env);
  assert.notEqual(value, encryptProcessorToken(token, owner.id, env));
  assert.equal(decryptProcessorToken(value, owner.id, env), token);
  assert.doesNotMatch(value, /private-provider/);
  assert.throws(() => decryptProcessorToken(value, 'other-owner', env));
  assert.throws(() => decryptProcessorToken(value, owner.id, { XRAY_CONNECTION_ENCRYPTION_KEY: 'cd'.repeat(32) }));
  const parts=value.split('.');const damaged=Buffer.from(parts[3],'base64url');damaged[0]^=1;parts[3]=damaged.toString('base64url');
  assert.throws(() => decryptProcessorToken(parts.join('.'), owner.id, env));
});
test('connection API rejects guests and customers before touching credentials', async () => {
  const f = fixture();
  for (const method of ['GET', 'POST', 'DELETE']) {
    assert.equal((await f.request(method, method==='POST'?{token}:undefined, owner, '')).status,401);
    assert.equal((await f.request(method, method==='POST'?{token}:undefined, {...owner,email:'customer@example.com'})).status,403);
  }
  assert.equal(f.calls.length,0);assert.equal(f.rows.size,0);
});
test('verified connection is private, encrypted and immediately used only by its owner', async () => {
  const f = fixture(); assert.equal((await f.request('GET')).body.connected,false);
  const result = await f.request('POST',{token,server:'https://attacker.invalid'});
  assert.equal(result.status,200);assert.equal(result.body.connected,true);
  assert.equal(f.calls[0].XRAY_NODEODM_URL,WEBODM_SERVER);
  assert.doesNotMatch(JSON.stringify(result.body), /token|encrypted/);
  assert.match(result.headers.get('cache-control'), /private, no-store/);
  assert.notEqual(f.rows.get(owner.id).token_encrypted,token);
  assert.equal((await f.manager.services(owner.id)).settings.XRAY_NODEODM_TOKEN,token);
  assert.equal((await f.manager.services('another-owner')).configured,false);
  assert.equal((await f.manager.status('another-owner')).connected,false);
});
test('invalid tokens never replace a working connection or disclose provider responses', async () => {
  const f=fixture();await f.request('POST',{token});const original=f.rows.get(owner.id).token_encrypted;
  f.flags.reject=true;const response=await f.request('POST',{token:'different-token-for-tests'});
  assert.equal(response.status,422);assert.doesNotMatch(JSON.stringify(response.body), /secret upstream|private-provider/);
  assert.equal(f.rows.get(owner.id).token_encrypted,original);
  for(const input of [{token:'short'},{token:'https://example.com/account'},{token:token+'\ninside'},{token:'x'.repeat(5000)},{}]) assert.ok((await f.request('POST',input)).status>=400);
});
test('saved scans prevent account switches; the same credential can be rechecked safely', async () => {
  const f=fixture();await f.request('POST',{token});f.flags.scans=true;
  assert.equal((await f.request('POST',{token:'another-account-token-1234'})).status,409);
  assert.equal((await f.request('POST',{token})).status,200);
});
test('missing encryption configuration disables secure setup and does not fetch secrets',async()=>{
 const manager=createConnectionManager({},undefined,{base:{storageReady:true,configured:false},connections:{get:()=>{throw Error('should not read');}}});
 assert.equal((await manager.status(owner.id)).setupAvailable,false);
 await assert.rejects(()=>manager.connect(owner.id,{token}),/temporarily unavailable/);
});
