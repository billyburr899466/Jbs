import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ownerXrayResponse } from '../lib/owner-xray.js';

const request = (token='test-token') => new Request('https://test.invalid/api/owner/xray', { headers: token ? { authorization: 'Bearer ' + token } : {} });
const user = (email) => async () => Response.json({ id: 'verified-user', email });

test('owner lab rejects missing and invalid sessions before serving the workspace', async () => {
  assert.equal((await ownerXrayResponse(request(''), () => { throw Error('Must not call backend'); })).status, 401);
  assert.equal((await ownerXrayResponse(request(), async () => new Response(null, {status:401}))).status, 401);
  assert.equal((await ownerXrayResponse(request(), async () => Response.json({email:'billyburr89@gmail.com'}))).status, 401);
});

test('a verified customer cannot obtain owner lab HTML even with an owner-looking token', async () => {
  const response = await ownerXrayResponse(request('billyburr89.gmail.com'), user('customer@example.com'));
  assert.equal(response.status, 403);
  assert.doesNotMatch(await response.text(), /id="house"|frameModel|jbs-xray-projects-v1/);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('both verified owner accounts receive the complete self-contained development workspace', async () => {
  for (const email of ['billyburr89@gmail.com', 'jeremiahgrider24@gmail.com']) {
    const response = await ownerXrayResponse(request(), user(email));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.equal(response.headers.get('vary'), 'Authorization');
    const html = await response.text();
    assert.match(html, /OWNER WORKSPACE · IN DEVELOPMENT/);
    assert.match(html, /jbs-xray-projects-v1/);
    assert.match(html, /function frameModel/);
    assert.doesNotMatch(html, /import .*xray-project|src="\/scan-my-project.js"/);
  }
});

test('owner verification errors fail closed without exposing the workspace', async () => {
  for (const backend of [async()=>{throw Error('offline')}, async()=>new Response(null,{status:503}), async()=>new Response('broken')]) {
    const response = await ownerXrayResponse(request(), backend);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /frameModel/);
  }
});

test('model implementation files are no longer publicly served assets', () => {
  for (const file of ['scan-my-project.js', 'xray-project.js']) assert.equal(existsSync(new URL('../public/'+file, import.meta.url)), false);
});
